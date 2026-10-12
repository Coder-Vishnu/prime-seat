"""
apps/api/tests/test_diff_engine.py
Verification Gates for High-Performance 2D NumPy State Diff Engine.
"""

from __future__ import annotations

import json
from pathlib import Path
import time
import numpy as np
import pytest

from sentinel.diff_engine import (
    AuditoriumCoordinateMapper,
    AuditoriumStateEngine,
    CoordinateMappingError,
)
from sentinel.schema import (
    SeatMapSnapshot,
    SeatRecord,
    SeatStatus,
    SeatType,
    ScreenFormat,
    parse_raw_amc_payload,
)

FIXTURES_DIR = Path(__file__).parent / "fixtures"


class TestDiffEngineVerificationGates:
    """Gate 02: NumPy Vectorized Diff Engine Verification Suite."""

    def test_gate_01_coordinate_mapping_bidirectional(self):
        """Verify perfect bijection between physical seat labels and array indices."""
        mapper = AuditoriumCoordinateMapper()

        # Single-letter conversions
        assert mapper.row_to_index("A") == 0
        assert mapper.row_to_index("Z") == 25
        assert mapper.index_to_row(0) == "A"
        assert mapper.index_to_row(25) == "Z"

        # Double-letter conversions
        assert mapper.row_to_index("AA") == 26
        assert mapper.row_to_index("AB") == 27
        assert mapper.row_to_index("AZ") == 51
        assert mapper.row_to_index("BA") == 52
        assert mapper.index_to_row(26) == "AA"
        assert mapper.index_to_row(27) == "AB"
        assert mapper.index_to_row(51) == "AZ"
        assert mapper.index_to_row(52) == "BA"

        # Specific seat mapping (Dolby sweet-spot G14)
        r, c = mapper.seat_to_coord("G", 14)
        assert r == 6
        assert c == 13

        row_str, seat_num = mapper.coord_to_seat(6, 13)
        assert row_str == "G"
        assert seat_num == 14

        # Roundtrip bijection across a comprehensive grid
        for test_row in ["A", "B", "M", "Z", "AA", "AB", "AZ", "BA"]:
            for test_num in [1, 5, 14, 25, 40]:
                r_idx, c_idx = mapper.seat_to_coord(test_row, test_num)
                rev_row, rev_num = mapper.coord_to_seat(r_idx, c_idx)
                assert rev_row == test_row
                assert rev_num == test_num

        # Error cases
        with pytest.raises(CoordinateMappingError):
            mapper.row_to_index("")

        with pytest.raises(CoordinateMappingError):
            mapper.row_to_index("1")

        with pytest.raises(CoordinateMappingError):
            mapper.row_to_index("AAA")

        with pytest.raises(CoordinateMappingError):
            mapper.index_to_row(-1)

        with pytest.raises(CoordinateMappingError):
            mapper.seat_to_coord("A", 0)

        with pytest.raises(CoordinateMappingError):
            mapper.seat_to_coord("A", -5)

        with pytest.raises(CoordinateMappingError):
            mapper.coord_to_seat(0, -1)

    def test_gate_02_post_fix_reclamation_detection(self):
        """
        Verify post-fix formula: D_t = M_(t-1) ⊙ (1 - M_t).
        Transitions M_(t-1) = 1 -> M_t = 0 must produce 1 in drop mask.
        """
        engine = AuditoriumStateEngine(
            rows=10,
            cols=20,
            prime_row_indices=[5, 6],  # Rows F, G
            prime_col_range=(8, 15),
        )

        # Baseline: Seat (6, 13) [Row G, Seat 14] is OCCUPIED
        m_prev = np.zeros((10, 20), dtype=np.int8)
        m_prev[6, 13] = 1
        # Also mark an occupied non-prime seat: (2, 2) [Row C, Seat 3]
        m_prev[2, 2] = 1
        engine.prev_matrix = m_prev.copy()

        # Current: Both dropped to VACANT (1 -> 0)
        m_curr = np.zeros((10, 20), dtype=np.int8)

        drop_mask, fill_mask, prime_drop_mask = engine.compute_diff(m_curr)

        # Both seats in drop mask
        assert drop_mask[6, 13] == 1
        assert drop_mask[2, 2] == 1
        assert np.count_nonzero(drop_mask) == 2

        # Neither in fill mask
        assert fill_mask[6, 13] == 0
        assert fill_mask[2, 2] == 0
        assert np.count_nonzero(fill_mask) == 0

        # Only G14 is in prime drop mask
        assert prime_drop_mask[6, 13] == 1
        assert prime_drop_mask[2, 2] == 0
        assert np.count_nonzero(prime_drop_mask) == 1

        # Coordinate extraction
        dropped_seats = engine.extract_dropped_seats(drop_mask)
        assert ("G", 14) in dropped_seats
        assert ("C", 3) in dropped_seats
        assert len(dropped_seats) == 2

    def test_gate_03_pre_sale_fill_rejection(self):
        """
        Verify pre-sale formula: F_t = (1 - M_(t-1)) ⊙ M_t.
        New bookings must register in fill_mask, NOT drop_mask.
        """
        engine = AuditoriumStateEngine(rows=10, cols=20)

        # Baseline: All seats vacant
        engine.prev_matrix = np.zeros((10, 20), dtype=np.int8)

        # Current: Seat (4, 10) booked (0 -> 1)
        m_curr = np.zeros((10, 20), dtype=np.int8)
        m_curr[4, 10] = 1

        drop_mask, fill_mask, prime_drop_mask = engine.compute_diff(m_curr)

        assert drop_mask[4, 10] == 0
        assert fill_mask[4, 10] == 1
        assert prime_drop_mask[4, 10] == 0
        assert np.count_nonzero(drop_mask) == 0
        assert np.count_nonzero(fill_mask) == 1

    def test_gate_04_sub_2ms_latency_sla_benchmark(self):
        """
        Benchmark Gate: Compute diff operations on 25x30 grid must average < 2.0ms.
        """
        rows, cols = 25, 30
        engine = AuditoriumStateEngine(
            rows=rows,
            cols=cols,
            prime_row_indices=[10, 11, 12, 13, 14],
            prime_col_range=(10, 20),
        )

        # Pre-fill pseudo-random occupancy state
        np.random.seed(42)
        state_t0 = (np.random.rand(rows, cols) > 0.3).astype(np.int8)
        engine.prev_matrix = state_t0.copy()

        # Simulate 5 seat cancellations
        state_t1 = state_t0.copy()
        drop_indices = [(5, 10), (6, 11), (7, 12), (8, 13), (9, 14)]
        for r, c in drop_indices:
            state_t1[r, c] = 0

        # Benchmark 1000 diff passes
        iterations = 1000
        start = time.perf_counter()
        for _ in range(iterations):
            _ = engine.compute_diff(state_t1)
            # Reset prev_matrix for next iteration to keep diff meaningful
            engine.prev_matrix = state_t0.copy()
        elapsed_total = time.perf_counter() - start

        avg_latency_ms = (elapsed_total / iterations) * 1000.0

        print(f"\n[BENCHMARK] 25x30 Grid Diff Latency: {avg_latency_ms:.4f} ms per evaluation")
        assert avg_latency_ms < 2.0, f"Diff latency {avg_latency_ms:.4f}ms exceeded 2.0ms SLA"

    def test_gate_05_shape_mismatch_exception(self):
        """Verify engine raises ValueError on mismatched matrix dimensions."""
        engine = AuditoriumStateEngine(rows=10, cols=10)
        invalid_shape_matrix = np.zeros((12, 12), dtype=np.int8)

        with pytest.raises(ValueError, match="Shape mismatch"):
            engine.compute_diff(invalid_shape_matrix)

    def test_snapshot_to_matrix_and_reclamation_flow(self):
        """
        Test end-to-end integration:
        SeatMapSnapshot -> snapshot_to_matrix -> initialize -> mutate state -> compute_diff.
        """
        fixture_path = FIXTURES_DIR / "tysons_seatmap_sample.json"
        with open(fixture_path, "r", encoding="utf-8") as f:
            raw_payload = json.load(f)

        snapshot_t0 = parse_raw_amc_payload(raw_payload)

        # Sample fixture has rows A-H, cols up to 15. Engine grid 12x24 matches fixture dimensions.
        engine = AuditoriumStateEngine(
            rows=12,
            cols=24,
            prime_row_indices=[4, 5, 6, 7],  # Rows E, F, G, H
            prime_col_range=(7, 17),  # seats 8-18 (0-indexed cols 7-17)
        )

        engine.initialize_from_snapshot(snapshot_t0)
        assert engine.prev_matrix[6, 13] == 1  # G14 was OCCUPIED (Sold)
        assert engine.prev_matrix[3, 9] == 0   # D10 was AVAILABLE
        assert engine.prev_matrix[0, 0] == -1  # A1 was Unavailable/Blocked (-1)
        assert engine.prev_matrix[1, 1] == -1  # Unmapped aisle position

        # Check occupancy ratio
        total_valid = np.count_nonzero(engine.valid_mask)
        assert total_valid == 7
        occupied_t0 = np.count_nonzero(engine.prev_matrix == 1)
        assert occupied_t0 == 4  # E12, F14, G14, H15
        assert pytest.approx(engine.get_occupancy_ratio(), rel=1e-3) == (4 / 7)

        # Create mutated snapshot t1 where G14 becomes AVAILABLE (seat drop!)
        mutated_seats = []
        for s in snapshot_t0.seats:
            if s.row == "G" and s.number == 14:
                mutated_seats.append(
                    SeatRecord(
                        row=s.row,
                        number=s.number,
                        status=SeatStatus.AVAILABLE,
                        seat_type=s.seat_type,
                        is_prime=s.is_prime,
                    )
                )
            else:
                mutated_seats.append(s)

        snapshot_t1 = SeatMapSnapshot(
            showtime_id=snapshot_t0.showtime_id,
            auditorium_name=snapshot_t0.auditorium_name,
            screen_format=snapshot_t0.screen_format,
            total_rows=snapshot_t0.total_rows,
            total_cols=snapshot_t0.total_cols,
            seats=mutated_seats,
        )

        m_t1, _ = engine.snapshot_to_matrix(snapshot_t1)
        drop_mask, fill_mask, prime_drop_mask = engine.compute_diff(m_t1)

        assert drop_mask[6, 13] == 1
        assert prime_drop_mask[6, 13] == 1
        assert np.count_nonzero(drop_mask) == 1
        assert np.count_nonzero(fill_mask) == 0

        dropped = engine.extract_dropped_seats(drop_mask)
        assert dropped == [("G", 14)]

        # Occupancy ratio should now be 3/7
        assert pytest.approx(engine.get_occupancy_ratio(), rel=1e-3) == (3 / 7)

    def test_snapshot_bounds_error(self):
        """Verify CoordinateMappingError if snapshot contains a seat exceeding engine grid dimensions."""
        engine = AuditoriumStateEngine(rows=5, cols=5)
        seats = [
            SeatRecord(
                row="Z",  # Row Z is index 25, exceeds rows=5
                number=1,
                status=SeatStatus.AVAILABLE,
                seat_type=SeatType.STANDARD,
                is_prime=False,
            )
        ]
        snapshot = SeatMapSnapshot(
            showtime_id="test-bounds",
            auditorium_name="Auditorium Test",
            screen_format=ScreenFormat.DOLBY_CINEMA,
            total_rows=5,
            total_cols=5,
            seats=seats,
        )

        with pytest.raises(CoordinateMappingError, match="exceeding engine shape"):
            engine.snapshot_to_matrix(snapshot)
