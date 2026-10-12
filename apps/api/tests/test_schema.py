"""
apps/api/tests/test_schema.py
Deterministic Verification Gates for Ingestion Schema & Invariants.
"""

import json
from pathlib import Path
import pytest

from sentinel.schema import (
    SeatStatus,
    SeatType,
    ScreenFormat,
    SeatRecord,
    SeatMapSnapshot,
    SchemaValidationError,
    parse_raw_amc_payload,
)


@pytest.fixture
def fixtures_dir() -> Path:
    return Path(__file__).parent / "fixtures"


@pytest.fixture
def valid_fixture_path(fixtures_dir: Path) -> Path:
    return fixtures_dir / "tysons_seatmap_sample.json"


@pytest.fixture
def valid_raw_json(valid_fixture_path: Path) -> dict:
    with open(valid_fixture_path, "r", encoding="utf-8") as f:
        return json.load(f)


class TestIngestionSchemaVerificationGates:
    """Gate 01: Ingestion & Fixture Contract Verification Suite."""

    def test_gate_01_parse_valid_fixture(self, valid_raw_json: dict):
        """Verify successful normalization of authentic AMC Tysons 16 fixture."""
        snapshot = parse_raw_amc_payload(valid_raw_json)

        assert snapshot.showtime_id == "amc-tysons-20261011-dolby-2000"
        assert snapshot.screen_format == ScreenFormat.DOLBY_CINEMA
        assert snapshot.total_rows == 12
        assert snapshot.total_cols == 24
        assert len(snapshot.seats) == 7

        # Verify status mapping
        available_seat = next(s for s in snapshot.seats if s.row == "D" and s.number == 10)
        assert available_seat.status == SeatStatus.AVAILABLE
        assert not available_seat.is_prime  # Row D is not prime in Dolby (E-H is prime)

        # Verify prime calculation on Row F, Seat 14
        prime_seat = next(s for s in snapshot.seats if s.row == "F" and s.number == 14)
        assert prime_seat.status == SeatStatus.OCCUPIED
        assert prime_seat.seat_type == SeatType.RECLINER
        assert prime_seat.is_prime is True

        # Verify ADA wheelchair mapping
        wheelchair_seat = next(s for s in snapshot.seats if s.row == "A" and s.number == 1)
        assert wheelchair_seat.status == SeatStatus.BLOCKED
        assert wheelchair_seat.seat_type == SeatType.WHEELCHAIR
        assert wheelchair_seat.is_prime is False

    def test_gate_02_fail_closed_on_unmapped_status(self, valid_raw_json: dict):
        """Verify immediate rejection when raw status is unknown."""
        corrupted = dict(valid_raw_json)
        corrupted["seats"] = [
            {"row": "F", "number": 12, "status": "UNKNOWN_EXTERNAL_STATE", "seat_type": "Standard"}
        ]

        with pytest.raises(SchemaValidationError, match="Unmapped raw seat status encountered"):
            parse_raw_amc_payload(corrupted)

    def test_gate_03_fail_closed_on_invalid_row_regex(self, valid_raw_json: dict):
        """Verify rejection of lower-case or malformed row strings."""
        corrupted = dict(valid_raw_json)
        corrupted["seats"] = [
            {"row": "row_f", "number": 12, "status": "Available", "seat_type": "Standard"}
        ]

        with pytest.raises(SchemaValidationError, match="Invalid row format"):
            parse_raw_amc_payload(corrupted)

    def test_gate_04_fail_closed_on_out_of_bounds_seat_number(self, valid_raw_json: dict):
        """Verify rejection when seat number exceeds upper bound of 50 or is negative."""
        corrupted_negative = dict(valid_raw_json)
        corrupted_negative["seats"] = [
            {"row": "F", "number": -1, "status": "Available"}
        ]
        with pytest.raises(SchemaValidationError, match="out of bounds"):
            parse_raw_amc_payload(corrupted_negative)

        corrupted_overflow = dict(valid_raw_json)
        corrupted_overflow["seats"] = [
            {"row": "F", "number": 99, "status": "Available"}
        ]
        with pytest.raises(SchemaValidationError, match="out of bounds"):
            parse_raw_amc_payload(corrupted_overflow)

    def test_gate_05_duplicate_coordinate_rejection(self, valid_raw_json: dict):
        """Verify rejection when duplicate (row, seat) tuples appear in a single payload."""
        corrupted = dict(valid_raw_json)
        corrupted["seats"] = [
            {"row": "F", "number": 10, "status": "Available"},
            {"row": "F", "number": 10, "status": "Reserved"},
        ]
        with pytest.raises(SchemaValidationError, match="Duplicate seat coordinate detected"):
            parse_raw_amc_payload(corrupted)

    def test_gate_06_unsupported_screen_format_rejection(self, valid_raw_json: dict):
        """Verify standard auditorium formats are rejected under PLF focus constraint."""
        corrupted = dict(valid_raw_json)
        corrupted["screen_format"] = "STANDARD_DIGITAL"

        with pytest.raises(SchemaValidationError, match="Unsupported screen format"):
            parse_raw_amc_payload(corrupted)

    def test_gate_07_auditorium_9_dolby_fixture(self, fixtures_dir: Path):
        """Verify full 161-seat Auditorium 9 Dolby Cinema ground-truth fixture."""
        fixture_path = fixtures_dir / "tysons_auditorium_9_dolby.json"
        with open(fixture_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        snapshot = parse_raw_amc_payload(data)
        assert snapshot.showtime_id == "amc-tysons-streetfighter-auditorium9-dolby"
        assert snapshot.screen_format == ScreenFormat.DOLBY_CINEMA
        assert snapshot.total_rows == 9
        assert snapshot.total_cols == 20
        assert len(snapshot.seats) == 161

        available_count = sum(1 for s in snapshot.seats if s.status == SeatStatus.AVAILABLE)
        occupied_count = sum(1 for s in snapshot.seats if s.status == SeatStatus.OCCUPIED)
        wheelchair_count = sum(1 for s in snapshot.seats if s.seat_type == SeatType.WHEELCHAIR)
        companion_count = sum(1 for s in snapshot.seats if s.seat_type == SeatType.COMPANION)

        assert available_count == 152
        assert occupied_count == 9
        assert wheelchair_count == 5
        assert companion_count == 6

    def test_gate_08_auditorium_11_dolby_fixture(self, fixtures_dir: Path):
        """Verify full 262-seat Auditorium 11 Dolby Cinema ground-truth fixture."""
        fixture_path = fixtures_dir / "tysons_auditorium_11_dolby.json"
        with open(fixture_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        snapshot = parse_raw_amc_payload(data)
        assert snapshot.showtime_id == "amc-tysons-clayface-auditorium11-dolby"
        assert snapshot.screen_format == ScreenFormat.DOLBY_CINEMA
        assert snapshot.total_rows == 11
        assert snapshot.total_cols == 26
        assert len(snapshot.seats) == 262

        available_count = sum(1 for s in snapshot.seats if s.status == SeatStatus.AVAILABLE)
        occupied_count = sum(1 for s in snapshot.seats if s.status == SeatStatus.OCCUPIED)
        wheelchair_count = sum(1 for s in snapshot.seats if s.seat_type == SeatType.WHEELCHAIR)
        companion_count = sum(1 for s in snapshot.seats if s.seat_type == SeatType.COMPANION)

        assert available_count == 190
        assert occupied_count == 72
        assert wheelchair_count == 7
        assert companion_count == 8
