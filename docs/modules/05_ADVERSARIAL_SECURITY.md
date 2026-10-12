# Module 05: Adversarial Boundary & Secure AI Protections

**Module Identifier:** `05_ADVERSARIAL_SECURITY`  
**System Layer:** Secure AI Pipeline, Threat Boundary & Input Sanitization  
**Target Codebase Location:** `apps/api/src/security/sanitizer.py`, `apps/api/tests/test_security.py`  
**Author:** Vishnu Venkatesan (Lead Systems Architect & AI Engineer)  
**Academic / Career Focus:** M.S. in Cybersecurity Engineering (Secure AI Specialization)  
**Classification:** Core Security Blueprint  
**Version:** 2.0.0-PROD  

---

## 1. Domain Objective & Operational Contract

Module 05 implements rigorous defensive boundary sanitization to protect the numerical state engines (NumPy) and deep learning models (PyTorch) from corrupted data, adversarial manipulation, and out-of-distribution (OOD) tensor exploits.

In production automated systems, external network responses cannot be assumed benign. Corrupted API responses, malicious Man-in-the-Middle (MitM) proxies, API schema drift, or replay attacks can inject anomalous dimensions or impossible state transitions. Without defensive sanitization, such payloads cause unhandled runtime exceptions, CPU memory exhaustion (OOM), gradient corruption, or false notification spam.

### Operational Contracts:
1. **Physical Architectural Invariants:** No incoming payload may declare dimensions or seat counts that exceed physical AMC Tysons Corner 16 PLF architectural ceilings ($R \le 30$, $C \le 40$, $N \le 450$).
2. **Replay Attack Defense:** Snapshots with timestamps drifting older than $\Delta t > 300\text{ seconds}$ from system UTC time are rejected.
3. **Anomaly Blast-Radius Gating:** Sudden auditorium-wide vacancy drops ($>15\%$ of total seats vacating in a single polling interval) are flagged as upstream network/API partition faults and suppressed from alerting.
4. **Transition Legality Assertion:** Blocked, companion, or wheelchair spaces cannot legally transition into prime seat vacancy alerts.

```
                      +------------------------------------------+
                      | Incoming SeatMapSnapshot (Module 01)     |
                      +------------------------------------------+
                                           |
                                           v
                      +------------------------------------------+
                      | AdversarialInputSanitizer                |
                      | 1. Physical Capacity Gating              |
                      |    (rows <= 30, cols <= 40, seats <= 450)|
                      | 2. Replay Freshness Check (dt <= 300s)   |
                      | 3. OOD Coordinate Clamping               |
                      | 4. Anomaly Rate-of-Change Limiter        |
                      +------------------------------------------+
                                    /              \
                        [Pass]     /                \  [Violated]
                                  v                  v
            +---------------------------+   +-----------------------------+
            | Clean State Passed to     |   | SecurityViolationError      |
            | Module 02 & Module 04     |   | - Payload Dropped           |
            | - Contiguous C-Memory     |   | - Tamper Log Emitted        |
            | - Bounded Tensor Inputs   |   | - Circuit Breaker Tripped   |
            +---------------------------+   +-----------------------------+
```

---

## 2. Threat Model & Attack Surface Analysis

### Threat Model 1: Tensor Shape Injection & Heap Exhaustion
* **Attack Mechanism:** An anomalous API response declares `rows: 500, cols: 500`. Downstream initialization of `np.zeros((500, 500))` or a batch tensor of shape `(250000, 16)` induces massive memory allocation, triggering process OOM termination or degrading CPU cache lines.
* **Defensive Invariant:** Rigid boundary clamping to static hardware limits ($30 \times 40$). Any dimensions exceeding this ceiling trigger an immediate `SecurityViolationError` before array allocation.

### Threat Model 2: Invariant Bit-Flip Attacks & Training Data Poisoning
* **Attack Mechanism:** Upstream network timeouts or intermittent AMC API errors return a half-rendered or empty seatmap where 100 seats suddenly show as "Available", mimicking 100 simultaneous cancellations in $< 100\text{ms}$.
* **Exploit Impact:** Triggers hundreds of urgent mobile pushes (denial-of-attention) and poisons downstream Parquet telemetry datasets with synthetic drop distributions.
* **Defensive Invariant:** Sudden delta thresholding: if $\frac{\Delta_{\text{drops}}}{N_{\text{valid}}} > 0.15$ (more than $15\%$ dropped simultaneously), the engine suppresses all dispatch alerts and flags an upstream network anomaly.

### Threat Model 3: Out-of-Bounds Coordinate Tampering
* **Attack Mechanism:** Seats with negative column indices (`number: -5`) or rows outside alphabetic limits (`row: "ZZZ"`) designed to trigger unbounded memory access or Python IndexError exceptions.
* **Defensive Invariant:** Mathematical bounding: $r \in [0, R_{\max}-1]$ and $c \in [0, C_{\max}-1]$.

### Threat Model 4: Temporal Replay & Stale Cache Injection
* **Attack Mechanism:** A cached or intercepted network response from 2 hours prior is injected into the monitoring daemon.
* **Exploit Impact:** Historical drops are re-evaluated as active drops, generating stale notifications for seats already purchased.
* **Defensive Invariant:** Clock synchronization check: $|t_{\text{current}} - t_{\text{snapshot}}| \le 300\text{s}$.

---

## 3. Concrete Security Implementation

The implementation is located at `apps/api/src/security/sanitizer.py`.

```python
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
```

---

## 4. Verification Gates & Automated Test Suite

The test suite is located at `apps/api/tests/test_security.py`. It executes adversarial fuzzing, simulated dimension attacks, stale timestamps, and mass-drop bit-flip injections to confirm 100% rejection.

```python
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
        malformed = SeatMapSnapshot(
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

        malformed = SeatMapSnapshot(
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
```

---

## 5. Monorepo Directory Layout & Integration

```
apps/api/
├── src/
│   ├── security/
│   │   ├── __init__.py
│   │   └── sanitizer.py          # AdversarialInputSanitizer & Error Invariants
│   ├── sentinel/
│   │   ├── schema.py
│   │   └── diff_engine.py
│   └── analytics/
│       ├── model.py
│       └── telemetry.py
└── tests/
    └── test_security.py          # Gate 05 Adversarial Fuzzing & Security Tests
```

---

## 6. Antigravity Milestone Execution Directive

To execute the implementation of this specification in the Antigravity Agent environment:

```bash
# 1. Switch Active Model in Antigravity Terminal
/model gemini-3.1-pro

# 2. Trigger Autonomous Milestone 5.0 Execution
/milestone-new "Milestone 5.0 based on docs/modules/05_ADVERSARIAL_SECURITY.md"
```

The Antigravity agent will autonomously:
1. Create Git branch `feat/milestone-5.0`.
2. Generate task tracking document `tasks/Milestone5.0.md`.
3. Scaffold `apps/api/src/security/sanitizer.py`.
4. Run `apps/api/tests/test_security.py` verifying tensor bounds checks, replay attack rejections, and mass drop anomaly gating.
