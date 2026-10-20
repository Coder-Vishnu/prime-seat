# Milestone 6.0 - Adaptive Poller & Dual-Dispatch Pipeline

**Version:** 6.0.0.0 (Starting version)  
**Date Created:** 2026-10-20  
**Date Started:** 2026-10-20  
**Date Completed:** 2026-10-20  
**Status:** Complete  
**Based on:** `docs/modules/06_ALERT_AND_DISPATCH.md`  

Engineers an adaptive, rate-limit compliant polling engine with stochastic jitter ($\pm 20\%$) and a sub-200ms dual-dispatch alert router transmitting concurrent notifications across local FastAPI Server-Sent Events (SSE) and instant mobile push webhooks (`ntfy.sh`).

---

## Version Information

**Current Version (at milestone start):**
- **prime-seat (api):** `5.0.0.3`

**Target Version (after milestone completion):**
- **prime-seat (api):** `6.0.0.3`

**Task-Level Versioning:**
Each task completion increments the BUILD number (4th digit) by 1:
- Task 0 complete: `6.0.0.0` (Milestone Initialization & Branch Setup)
- Task 1 complete: `6.0.0.1` (Networking Dependencies & Adaptive Polling Policy)
- Task 2 complete: `6.0.0.2` (Dual Alert Dispatcher & SSE Connection Manager)
- Task 3 complete: `6.0.0.3` (Pytest Dispatcher Verification Gates & Sub-200ms Latency SLA)

**Git Branch:**
- **prime-seat:** `vishnu-102026-6.0-alert-dispatch`

---

## Progress Summary

**Completion:** 4 of 4 tasks complete (100%)

| Task | Priority | Status | Version | Deployed / Verified |
| :--- | :--- | :--- | :--- | :--- |
| **Task 0: Milestone Initialization & Branch Setup** | SETUP | ✅ Complete | `6.0.0.0` | 2026-10-20 |
| **Task 1: Networking Dependencies & Adaptive Polling Policy** | HIGH | ✅ Complete | `6.0.0.1` | 2026-10-20 |
| **Task 2: Dual Alert Dispatcher & SSE Connection Manager** | HIGH | ✅ Complete | `6.0.0.2` | 2026-10-20 |
| **Task 3: Pytest Dispatcher Verification Gates & Sub-200ms Latency SLA** | CRITICAL | ✅ Complete | `6.0.0.3` | 2026-10-20 |

**Status Legend:**
- ⏳ Pending: not started
- 🚧 In Progress: currently being worked on
- 🔍 Verifying: running verification gates
- ✅ Complete: implementation finished and verified

---

## Overview

**Objective:**  
Implement the rate-limit compliant adaptive polling scheduler and zero-cost dual-dispatch alert router specified in `docs/modules/06_ALERT_AND_DISPATCH.md`. Solves the critical seat reclamation bottleneck of capturing single-seat drops in the tight 180-minute pre-showtime window without triggering AMC WAF rate-limits or Akamai Bot Manager challenges, while delivering notifications to desktop and mobile within 200ms.

**Scope:**
- Install networking dependencies (`httpx`, `respx`, `pytest-asyncio`) in API environment.
- Implement `AdaptivePollingPolicy` in `apps/api/src/sentinel/poller.py` with 4 operational time-to-showtime regimes (Dormant 120m, Background 15m, Accelerated 2m, Critical Burst 30s) and $\pm 20\%$ continuous uniform stochastic jitter.
- Implement `SSEConnectionManager` managing active browser subscriber queues and async broadcast.
- Implement `DualAlertDispatcher` in `apps/api/src/sentinel/dispatcher.py` executing concurrent dispatch via `asyncio.gather` across SSE and urgent mobile webhooks (`ntfy.sh`).
- Re-export poller and dispatcher symbols in `apps/api/src/sentinel/__init__.py`.
- Implement automated verification gates in `apps/api/tests/test_dispatcher.py` covering interval scaling bounds and mock sub-200ms dual dispatch latency SLA.

**Estimated Effort:** 2 hours  
**Dependencies:** Milestone 1.0 (`sentinel.schema`), Milestone 2.0 (`sentinel.diff_engine`), Milestone 5.0 (`security.sanitizer`)

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

**Purpose:** Verify starting environment, checkout feature branch `vishnu-102026-6.0-alert-dispatch`, and prepare milestone state.  
**Estimated Time:** 5 minutes  
**Status:** ✅ Complete  
**Version:** `6.0.0.0`  

### Step 0.1: Check Current Version
Confirm starting version `5.0.0.3` in `TASKS.md`. ✅

### Step 0.2: Create Feature Branch
```bash
git checkout -b vishnu-102026-6.0-alert-dispatch
```
Checked out branch `vishnu-102026-6.0-alert-dispatch`. ✅

### Step 0.3: Update Milestone Header
Update this document with confirmed version and record `Date Started: 2026-10-20`. ✅

### Verification Gate
- [x] Working branch is `vishnu-102026-6.0-alert-dispatch`
- [x] Working tree clean and verified

---

## Task 1: Networking Dependencies & Adaptive Polling Policy (HIGH)

**Purpose:** Configure async HTTP dependencies and implement `AdaptivePollingPolicy` with stochastic jitter.  
**Estimated Time:** 30 minutes  
**Status:** ✅ Complete  
**Version:** `6.0.0.1`  
**Dependencies:** Task 0  

### Description
1. Update `apps/api/requirements.txt` with `httpx`, `respx`, and `pytest-asyncio`.
2. Install packages in `apps/api/.venv`.
3. Create `apps/api/src/sentinel/poller.py`.
4. Implement `AdaptivePollingPolicy` class:
   - `DORMANT_INTERVAL = 7200.0` ($> 24\text{h}$)
   - `BACKGROUND_INTERVAL = 900.0` ($2\text{h} < \Delta t \le 24\text{h}$)
   - `ACCELERATED_INTERVAL = 120.0` ($30\text{m} < \Delta t \le 2\text{h}$)
   - `CRITICAL_INTERVAL = 30.0` ($0 < \Delta t \le 30\text{m}$)
   - `JITTER_RATIO = 0.20` ($\pm 20\%$ uniform random jitter)
   - `calculate_interval(cls, showtime: datetime, now: datetime) -> float`: calculates sleep duration with jitter, enforces 5.0s floor, returns `-1.0` if showtime has started.

### Affected Files
- `apps/api/requirements.txt`
- `apps/api/src/sentinel/poller.py`

### Verification Gates & Testing
- [x] `httpx`, `respx`, `pytest-asyncio` import successfully in `.venv`
- [x] Calculated intervals strictly fall within $\pm 20\%$ mathematical boundaries across all 4 regimes

---

## Task 2: Dual Alert Dispatcher & SSE Connection Manager (HIGH)

**Purpose:** Implement concurrent dual-dispatch alert router for desktop SSE and mobile ntfy.sh push.  
**Estimated Time:** 30 minutes  
**Status:** ✅ Complete  
**Version:** `6.0.0.2`  
**Dependencies:** Task 1  

### Description
1. Create `apps/api/src/sentinel/dispatcher.py`.
2. Implement `SSEConnectionManager`:
   - Active queue subscription via async generator `subscribe()`
   - Thread-safe async `broadcast(payload: Dict[str, Any])`
   - Instantiation of singleton `sse_manager = SSEConnectionManager()`.
3. Implement `DualAlertDispatcher`:
   - Initialization with `ntfy_topic` and optional `httpx.AsyncClient`
   - `dispatch_reclamation(seat, movie_title, showtime_id, drop_confidence, checkout_url)`
   - Concurrent execution via `asyncio.gather(sse_broadcast, ntfy_post)`
   - Return `{ "sse_dispatched": bool, "ntfy_dispatched": bool }`.
4. Re-export public symbols in `apps/api/src/sentinel/__init__.py`.

### Affected Files
- `apps/api/src/sentinel/dispatcher.py`
- `apps/api/src/sentinel/__init__.py`

### Verification Gates & Testing
- [x] Async queue broadcast delivers payloads to subscribers
- [x] Dual dispatch executes concurrently without blocking

---

## Task 3: Pytest Dispatcher Verification Gates & Sub-200ms Latency SLA (CRITICAL)

**Purpose:** Implement automated verification suite in `apps/api/tests/test_dispatcher.py` enforcing interval bounds and sub-200ms dispatch SLA.  
**Estimated Time:** 30 minutes  
**Status:** ✅ Complete  
**Version:** `6.0.0.3`  
**Dependencies:** Task 2  

### Description
Implement verification gates in `apps/api/tests/test_dispatcher.py` based on Section 6 of `docs/modules/06_ALERT_AND_DISPATCH.md`:
- `test_gate_01_adaptive_interval_schedule_and_jitter`: Validates dynamically calculated intervals across Dormant $[5760\text{s}, 8640\text{s}]$, Background $[720\text{s}, 1080\text{s}]$, Accelerated $[96\text{s}, 144\text{s}]$, and Critical $[24\text{s}, 36\text{s}]$.
- `test_gate_02_dual_dispatch_sub_200ms_latency`: Uses `respx.mock` to mock `ntfy.sh` and asserts concurrent dual-dispatch executes under 200ms.

### Affected Files
- `apps/api/tests/test_dispatcher.py`

### Verification Gates & Testing
- [x] 100% pytest pass rate (`pytest apps/api/tests/test_dispatcher.py`) — 2/2 gates passed
- [x] Dual dispatch latency $<200\text{ms}$ verified with mock HTTP
- [x] 0 regressions across full test suite (`pytest apps/api/tests`) — 30/30 passed (28 existing + 2 new)

---

**End of Milestone 6.0 Specification**
