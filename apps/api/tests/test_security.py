"""
apps/api/tests/test_security.py
Adversarial Security Gates & Fuzzing Verification Suite.
"""

from datetime import datetime, timezone, timedelta
import numpy as np
import pytest

from security.sanitizer import (
    AdversarialInputSanitizer,
    SecurityViolationError,
)
from sentinel.schema import (
    SeatMapSnapshot,
    SeatRecord,
    SeatStatus,
    SeatType,
    ScreenFormat,
)


class TestAdversarialSecurityGates:
    """Gate 05: Secure AI Boundaries & Input Sanitization Suite."""

    @pytest.fixture
    def baseline_seat(self) -> SeatRecord:
        return SeatRecord(
            row="F",
            number=14,
            status=SeatStatus.OCCUPIED,
            seat_type=SeatType.RECLINER,
            is_prime=True,
        )

    def test_gate_01_tensor_dimension_injection_rejection(self, baseline_seat: SeatRecord):
        """Verify immediate rejection when dimensions exceed physical hardware boundaries."""
        # Malformed snapshot declaring 100 rows x 100 cols (threat: memory heap exhaustion)
        malformed = SeatMapSnapshot.model_construct(
            showtime_id="amc-attack-001",
            auditorium_name="Dolby Cinema",
            screen_format=ScreenFormat.DOLBY_CINEMA,
            captured_at=datetime.now(timezone.utc),
            total_rows=100,  # Exceeds MAX_ROWS (30)
            total_cols=24,
            seats=[baseline_seat],
        )

        with pytest.raises(SecurityViolationError, match="exceed physical hardware ceiling"):
            AdversarialInputSanitizer.sanitize_snapshot(malformed)

    def test_gate_02_capacity_overflow_rejection(self, baseline_seat: SeatRecord):
        """Verify rejection when seat count exceeds physical auditorium capacity (450)."""
        seats = [
            SeatRecord(
                row=chr(ord("A") + (i // 20)),
                number=(i % 20) + 1,
                status=SeatStatus.AVAILABLE,
            )
            for i in range(460)  # Exceeds 450 capacity limit
        ]

        malformed = SeatMapSnapshot.model_construct(
            showtime_id="amc-attack-002",
            auditorium_name="Dolby Cinema",
            screen_format=ScreenFormat.DOLBY_CINEMA,
            captured_at=datetime.now(timezone.utc),
            total_rows=25,
            total_cols=25,
            seats=seats,
        )

        with pytest.raises(SecurityViolationError, match="exceeds auditorium physical capacity"):
            AdversarialInputSanitizer.sanitize_snapshot(malformed)

    def test_gate_03_replay_attack_freshness_enforcement(self, baseline_seat: SeatRecord):
        """Verify rejection when payload timestamp is stale (> 300 seconds)."""
        stale_time = datetime.now(timezone.utc) - timedelta(seconds=400)

        stale_snapshot = SeatMapSnapshot(
            showtime_id="amc-attack-003",
            auditorium_name="Dolby Cinema",
            screen_format=ScreenFormat.DOLBY_CINEMA,
            captured_at=stale_time,
            total_rows=12,
            total_cols=24,
            seats=[baseline_seat],
        )

        with pytest.raises(SecurityViolationError, match="Stale or forward-dated snapshot detected"):
            AdversarialInputSanitizer.sanitize_snapshot(stale_snapshot)

    def test_gate_04_mass_drop_anomaly_suppression(self):
        """
        Verify that a sudden mass drop (>15% of auditorium) is flagged as an
        API anomaly and suppressed to prevent notification flooding.
        """
        rows, cols = 10, 20
        total_seats = 200
        valid_mask = np.ones((rows, cols), dtype=bool)

        # Baseline: All 200 seats occupied
        prev_matrix = np.ones((rows, cols), dtype=np.int8)

        # Anomaly scenario: 50 seats drop simultaneously (25% drop rate)
        curr_matrix = prev_matrix.copy()
        curr_matrix[0:5, :] = 0  # 5 rows x 10 cols = 50 seats dropped

        is_valid, reason = AdversarialInputSanitizer.validate_transition_integrity(
            prev_matrix=prev_matrix,
            curr_matrix=curr_matrix,
            valid_mask=valid_mask,
        )

        assert is_valid is False
        assert "Abnormal drop spike detected" in reason

    def test_gate_05_ada_companion_alert_exclusion(self):
        """Verify wheelchair and companion seats are strictly excluded from prime alerts."""
        wheelchair_seat = SeatRecord(
            row="A",
            number=1,
            status=SeatStatus.AVAILABLE,
            seat_type=SeatType.WHEELCHAIR,
            is_prime=False,
        )
        assert AdversarialInputSanitizer.assert_seat_alert_eligibility(wheelchair_seat) is False

        prime_recliner = SeatRecord(
            row="F",
            number=14,
            status=SeatStatus.AVAILABLE,
            seat_type=SeatType.RECLINER,
            is_prime=True,
        )
        assert AdversarialInputSanitizer.assert_seat_alert_eligibility(prime_recliner) is True
