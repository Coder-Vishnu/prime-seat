# Milestone 5.0 - Adversarial Boundaries & Secure AI Protections

**Version:** 5.0.0.0 (Starting version)  
**Date Created:** 2026-10-20  
**Date Started:** 2026-10-20  
**Date Completed:** 2026-10-20  
**Status:** Complete  
**Based on:** `docs/modules/05_ADVERSARIAL_SECURITY.md`  

Implements defensive boundary sanitization and secure AI protections for the numerical state engine (NumPy) and deep learning models (PyTorch) to prevent heap exhaustion attacks, stale replay injections, coordinate out-of-bounds tampering, and mass-drop API anomaly storms.

---

## Version Information

**Current Version (at milestone start):**
- **prime-seat (api):** `4.0.0.3`

**Target Version (after milestone completion):**
- **prime-seat (api):** `5.0.0.3`

**Task-Level Versioning:**
Each task completion increments the BUILD number (4th digit) by 1:
- Task 0 complete: `5.0.0.0` (Milestone Initialization & Branch Setup)
- Task 1 complete: `5.0.0.1` (Security Exception Hierarchy & Structural Snapshot Sanitizer)
- Task 2 complete: `5.0.0.2` (Transition Integrity Anomaly Gating & Alert Eligibility Filter)
- Task 3 complete: `5.0.0.3` (Pytest Adversarial Verification Gates & Regression Suite)

**Git Branch:**
- **prime-seat:** `vishnu-102026-5.0-adversarial-security`

---

## Progress Summary

**Completion:** 4 of 4 tasks complete (100%)

| Task | Priority | Status | Version | Deployed / Verified |
| :--- | :--- | :--- | :--- | :--- |
| **Task 0: Milestone Initialization & Branch Setup** | SETUP | ✅ Complete | `5.0.0.0` | 2026-10-20 |
| **Task 1: Security Exception Hierarchy & Structural Snapshot Sanitizer** | HIGH | ✅ Complete | `5.0.0.1` | 2026-10-20 |
| **Task 2: Transition Integrity Anomaly Gating & Alert Eligibility Filter** | HIGH | ✅ Complete | `5.0.0.2` | 2026-10-20 |
| **Task 3: Pytest Adversarial Verification Gates & Regression Suite** | CRITICAL | ✅ Complete | `5.0.0.3` | 2026-10-20 |

**Status Legend:**
- ⏳ Pending: not started
- 🚧 In Progress: currently being worked on
- 🔍 Verifying: running verification gates
- ✅ Complete: implementation finished and verified

---

## Overview

**Objective:**  
Implement the rigorous defensive boundary sanitization and secure AI protections pipeline specified in `docs/modules/05_ADVERSARIAL_SECURITY.md`. External network responses and API payloads cannot be assumed benign; the sanitizer acts as an input firewall rejecting dimension injection exploits, replay attacks, coordinate tampering, and network partition drop storms before arrays or PyTorch tensors are allocated.

**Scope:**
- Create `apps/api/src/security/__init__.py` and `apps/api/src/security/sanitizer.py`.
- Define security exceptions: `SecurityViolationError` and `AnomalyDetectedWarning`.
- Implement `AdversarialInputSanitizer` class configured with AMC Tysons Corner 16 PLF architectural ceilings:
  - Max dimensions: $R \le 30, C \le 40$
  - Max capacity: $N \le 450$ seats (Dolby Cinema Auditoriums 9 & 11, IMAX Auditorium 3)
  - Max timestamp drift: $\Delta t \le 300\text{ seconds}$ (5-minute replay window)
  - Max permissible drop ratio: $15\%$ of valid seats in a single poll interval
- Implement `sanitize_snapshot(snapshot: SeatMapSnapshot)` to enforce dimension, capacity, freshness, and coordinate validity.
- Implement `validate_transition_integrity(prev_matrix, curr_matrix, valid_mask)` to detect and suppress API bit-flip drop storms.
- Implement `assert_seat_alert_eligibility(seat: SeatRecord)` to bar blocked, ADA wheelchair, and companion seats from alert dispatch.
- Implement automated verification gates in `apps/api/tests/test_security.py` covering tensor shape injection rejection, capacity overflow, replay freshness enforcement, mass-drop suppression, and ADA eligibility gating.

**Estimated Effort:** 2 hours  
**Dependencies:** Milestone 1.0 (`sentinel.schema`), Milestone 2.0 (`sentinel.diff_engine`), Milestone 4.0 (`analytics.model`)

---

## Git Workflow Policy

**CRITICAL: The agent must NOT commit or push code directly to main.**

**Antigravity Agent Responsibilities:**
- Write and modify code files using targeted tools
- Run type checks, linting, and tests to verify changes
- Prepare clean diffs and code for developer review
- Create feature branches ONLY (`git checkout -b`, `git push -u origin`)

**Developer Responsibilities:**
- Review code changes in their preferred git client
- Create commits with appropriate messages
- Push commits to feature branch
- Create and merge pull requests
- Deploy to environments

---

## Task 0: Milestone Initialization & Branch Setup (SETUP)

**Purpose:** Verify starting environment, checkout feature branch `vishnu-102026-5.0-adversarial-security`, and prepare milestone state.  
**Estimated Time:** 5 minutes  
**Status:** ✅ Complete  
**Version:** `5.0.0.0`  

### Step 0.1: Check Current Version
Confirm starting version `4.0.0.3` in `TASKS.md`. ✅

### Step 0.2: Create Feature Branch
```bash
git checkout -b vishnu-102026-5.0-adversarial-security
```
Checked out branch `vishnu-102026-5.0-adversarial-security`. ✅

### Step 0.3: Update Milestone Header
Update this document with confirmed version and record `Date Started: 2026-10-20`. ✅

### Verification Gate
- [x] Working branch is `vishnu-102026-5.0-adversarial-security`
- [x] Working tree clean and verified

---

## Task 1: Security Exception Hierarchy & Structural Snapshot Sanitizer (HIGH)

**Purpose:** Create security module and implement snapshot-level hardware boundary invariants and replay defenses.  
**Estimated Time:** 30 minutes  
**Status:** ✅ Complete  
**Version:** `5.0.0.1`  
**Dependencies:** Task 0  

### Description
1. Create `apps/api/src/security/__init__.py`.
2. Create `apps/api/src/security/sanitizer.py`.
3. Define `SecurityViolationError(Exception)` and `AnomalyDetectedWarning(UserWarning)`.
4. Implement `AdversarialInputSanitizer` class with hardware constants:
   - `MAX_ROWS: int = 30`
   - `MAX_COLS: int = 40`
   - `MAX_CAPACITY: int = 450`
   - `MAX_TIMESTAMP_DRIFT_SECONDS: float = 300.0`
   - `MAX_PERMISSIBLE_DROP_RATIO: float = 0.15`
5. Implement `AdversarialInputSanitizer.sanitize_snapshot(cls, snapshot: SeatMapSnapshot) -> None`:
   - Rejects dimensions outside $[1, 30] \times [1, 40]$ with `SecurityViolationError`.
   - Rejects seat counts exceeding 450 with `SecurityViolationError`.
   - Rejects timestamps with absolute clock drift $> 300.0\text{s}$ relative to system UTC time.
   - Rejects individual seat numbers outside $[1, \text{MAX\_COLS}]$.

### Affected Files
- `apps/api/src/security/__init__.py`
- `apps/api/src/security/sanitizer.py`

### Verification Gates & Testing
- [x] Python syntax and static typing pass cleanly
- [x] Malformed dimensions and overflow seat counts trigger `SecurityViolationError`
- [x] Stale timestamps ($> 300\text{s}$) trigger `SecurityViolationError`

---

## Task 2: Transition Integrity Anomaly Gating & Alert Eligibility Filter (HIGH)

**Purpose:** Implement matrix-level state transition integrity validation and ADA/companion alert suppression.  
**Estimated Time:** 30 minutes  
**Status:** ✅ Complete  
**Version:** `5.0.0.2`  
**Dependencies:** Task 1  

### Description
1. Implement `AdversarialInputSanitizer.validate_transition_integrity(...)` in `apps/api/src/security/sanitizer.py`:
   - Computes simultaneous drops `(prev_matrix == 1) & (curr_matrix == 0) & valid_mask`.
   - Calculates drop ratio $\frac{\Delta_{\text{drops}}}{N_{\text{valid}}}$.
   - If drop ratio $> 0.15$ and drop count $> 10$, returns `(False, reason)` suppressing alert dispatch.
   - Returns `(True, "Transition satisfies integrity invariants")` for benign changes.
2. Implement `AdversarialInputSanitizer.assert_seat_alert_eligibility(cls, seat: SeatRecord) -> bool`:
   - Returns `False` for `SeatStatus.BLOCKED`.
   - Returns `False` for `SeatType.WHEELCHAIR` and `SeatType.COMPANION`.
   - Returns `True` only if `seat.is_prime` is `True`.
3. Re-export public security symbols in `apps/api/src/security/__init__.py`.

### Affected Files
- `apps/api/src/security/sanitizer.py`
- `apps/api/src/security/__init__.py`

### Verification Gates & Testing
- [x] Matrix drop ratio $>15\%$ flagged as network anomaly and suppressed
- [x] Blocked, wheelchair, and companion seats strictly filtered from alert eligibility

---

## Task 3: Pytest Adversarial Verification Gates & Regression Suite (CRITICAL)

**Purpose:** Implement automated fuzzing and adversarial security test suite in `apps/api/tests/test_security.py`.  
**Estimated Time:** 30 minutes  
**Status:** ✅ Complete  
**Version:** `5.0.0.3`  
**Dependencies:** Task 2  

### Description
Implement comprehensive test gates in `apps/api/tests/test_security.py` based on Section 4 of `docs/modules/05_ADVERSARIAL_SECURITY.md`:
- `test_gate_01_tensor_dimension_injection_rejection`: Asserts $100 \times 100$ malformed snapshot triggers `SecurityViolationError`.
- `test_gate_02_capacity_overflow_rejection`: Asserts $460$-seat snapshot triggers `SecurityViolationError`.
- `test_gate_03_replay_attack_freshness_enforcement`: Asserts snapshot with $400\text{s}$ clock drift triggers `SecurityViolationError`.
- `test_gate_04_mass_drop_anomaly_suppression`: Asserts $25\%$ drop spike in 200-seat auditorium is suppressed (`is_valid is False`).
- `test_gate_05_ada_companion_alert_exclusion`: Asserts wheelchair seats return `False` and prime recliners return `True`.

### Affected Files
- `apps/api/tests/test_security.py`

### Verification Gates & Testing
- [x] 100% pytest pass rate (`pytest apps/api/tests/test_security.py`) — 5/5 gates passed
- [x] 0 regressions across entire test suite (`pytest apps/api/tests`) — 28/28 passed (23 existing + 5 new)

---

**End of Milestone 5.0 Specification**
