"""
apps/api/src/security/sanitizer.py
Defensive Boundary Sanitization & Adversarial Protections.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional, Tuple
import numpy as np

from sentinel.schema import SeatMapSnapshot, SeatRecord, SeatStatus, SeatType


class SecurityViolationError(Exception):
    """Raised when an incoming payload violates defensive security invariants."""
    pass


class AnomalyDetectedWarning(UserWarning):
    """Raised when state transition statistics indicate upstream network/API corruption."""
    pass


class AdversarialInputSanitizer:
    """
    Defensive input firewall protecting numerical matrix engines and PyTorch inference.
    Enforces hardware bounds, replay prevention, and anomaly rate limits.
    """

    # Static architectural limits for AMC Tysons Corner 16 PLF Auditoriums
    MAX_ROWS: int = 30
    MAX_COLS: int = 40
    MAX_CAPACITY: int = 450  # Hardware seating limit for Dolby (Auditoriums 9 & 11) & IMAX (Auditorium 3)
    MAX_TIMESTAMP_DRIFT_SECONDS: float = 300.0  # 5 minutes replay threshold
    MAX_PERMISSIBLE_DROP_RATIO: float = 0.15  # Max 15% simultaneous seat drop

    @classmethod
    def sanitize_snapshot(cls, snapshot: SeatMapSnapshot) -> None:
        """
        Validates structural invariants of an incoming snapshot before numerical processing.
        Raises SecurityViolationError on any violation.
        """
        # Invariant 1: Dimensional Bounds Gating
        if snapshot.total_rows > cls.MAX_ROWS or snapshot.total_cols > cls.MAX_COLS:
            raise SecurityViolationError(
                f"Grid dimensions ({snapshot.total_rows}x{snapshot.total_cols}) exceed "
                f"physical hardware ceiling ({cls.MAX_ROWS}x{cls.MAX_COLS})."
            )

        if snapshot.total_rows < 1 or snapshot.total_cols < 1:
            raise SecurityViolationError(
                f"Invalid zero or negative grid dimensions: ({snapshot.total_rows}x{snapshot.total_cols})."
            )

        # Invariant 2: Physical Capacity Gating
        if len(snapshot.seats) > cls.MAX_CAPACITY:
            raise SecurityViolationError(
                f"Seat count ({len(snapshot.seats)}) exceeds auditorium physical "
                f"capacity ({cls.MAX_CAPACITY}). Potential buffer overflow exploit."
            )

        # Invariant 3: Replay Attack Defense (Timestamp Freshness)
        now_utc = datetime.now(timezone.utc)
        drift = abs((now_utc - snapshot.captured_at).total_seconds())
        if drift > cls.MAX_TIMESTAMP_DRIFT_SECONDS:
            raise SecurityViolationError(
                f"Stale or forward-dated snapshot detected. Clock drift: {drift:.1f}s "
                f"(max allowed: {cls.MAX_TIMESTAMP_DRIFT_SECONDS}s). Possible replay attack."
            )

        # Invariant 4: Coordinate Sanitization
        for s in snapshot.seats:
            if s.number < 1 or s.number > cls.MAX_COLS:
                raise SecurityViolationError(
                    f"Seat number {s.number} exceeds physical column bounds [1, {cls.MAX_COLS}]."
                )

    @classmethod
    def validate_transition_integrity(
        cls,
        prev_matrix: np.ndarray,
        curr_matrix: np.ndarray,
        valid_mask: np.ndarray,
    ) -> Tuple[bool, str]:
        """
        Verifies transition legality between consecutive time steps.
        Detects upstream network glitches that simulate impossible massive drops.
        
        Returns:
            Tuple of (is_valid: bool, reason_message: str)
        """
        total_valid_seats = int(np.count_nonzero(valid_mask))
        if total_valid_seats == 0:
            return False, "Auditorium contains zero valid physical seats"

        # Calculate simultaneous drops: (prev == 1) & (curr == 0)
        drops = (prev_matrix == 1) & (curr_matrix == 0) & valid_mask
        drop_count = int(np.count_nonzero(drops))

        drop_ratio = drop_count / float(total_valid_seats)

        # Gating: If > 15% of auditorium dropped at once, suppress as API/network anomaly
        if drop_ratio > cls.MAX_PERMISSIBLE_DROP_RATIO and drop_count > 10:
            return False, (
                f"Abnormal drop spike detected: {drop_count} seats ({drop_ratio:.1%}) "
                f"dropped in a single poll. Exceeds safety threshold of {cls.MAX_PERMISSIBLE_DROP_RATIO:.1%}. "
                f"Suppressing alerts to prevent notification storm."
            )

        return True, "Transition satisfies integrity invariants"

    @classmethod
    def assert_seat_alert_eligibility(cls, seat: SeatRecord) -> bool:
        """
        Ensures that special ADA/companion or blocked seats are strictly barred
        from triggering prime reclamation alert dispatches.
        """
        # Blocked seats are ineligible
        if seat.status == SeatStatus.BLOCKED:
            return False

        # ADA wheelchair or companion seats are ineligible for prime alerts
        if seat.seat_type in {SeatType.WHEELCHAIR, SeatType.COMPANION}:
            return False

        # Must be marked prime
        return seat.is_prime

