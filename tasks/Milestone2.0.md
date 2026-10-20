# Milestone 2.0 - Vectorized 2D NumPy State Diff Engine & Sub-2ms Latency SLA

**Version:** 2.0.0.3 (Final version)  
**Date Created:** 2026-10-12  
**Date Started:** 2026-10-12  
**Date Completed:** 2026-10-12  
**Status:** Complete  
**Based on:** `docs/modules/02_NUMPY_STATE_ENGINE.md`  

Transform discrete physical auditorium snapshots into contiguous two-dimensional NumPy arrays and evaluate real-time seat vacancy transitions ($M_{t-1}: 1 \to M_t: 0$) with guaranteed sub-2 millisecond latency.

---

## Version Information

**Current Version (at milestone start):**
- **prime-seat (api):** `1.0.0.3`

**Target Version (after milestone completion):**
- **prime-seat (api):** `2.0.0.3`

**Task-Level Versioning:**
Each task completion increments the BUILD number (4th digit) by 1:
- Task 0 complete: `2.0.0.0` (Milestone Initialization & Branch Setup)
- Task 1 complete: `2.0.0.1` (Coordinate Bijection & Grid Layout Mapping)
- Task 2 complete: `2.0.0.2` (Vectorized 2D NumPy State Diff Engine Core)
- Task 3 complete: `2.0.0.3` (Deterministic Pytest Verification Gates & Benchmark)

**Git Branch:**
- **prime-seat:** `vishnu-101226-2.0-api`

---

## Progress Summary

**Completion:** 4 of 4 tasks complete (100%)

| Task | Priority | Status | Version | Deployed / Verified |
| :--- | :--- | :--- | :--- | :--- |
| **Task 0: Milestone Initialization & Branch Setup** | SETUP | ✅ Complete | `2.0.0.0` | Verified on `vishnu-101226-2.0-api` |
| **Task 1: Coordinate Bijection & Grid Layout Mapping** | HIGH | ✅ Complete | `2.0.0.1` | Verified in `apps/api/src/sentinel/diff_engine.py` |
| **Task 2: Vectorized 2D NumPy State Diff Engine Core** | CRITICAL | ✅ Complete | `2.0.0.2` | Verified in `apps/api/src/sentinel/diff_engine.py` |
| **Task 3: Deterministic Pytest Gates & Sub-2ms Benchmark** | CRITICAL | ✅ Complete | `2.0.0.3` | Verified in `apps/api/tests/test_diff_engine.py` (0.015ms latency) |

**Status Legend:**
- ⏳ Pending: not started
- 🚧 In Progress: currently being worked on
- 🔍 Verifying: running verification gates
- ✅ Complete: implementation finished and verified

---

## Overview

**Objective:**  
Implement the SIMD-vectorized 2D NumPy state diffing engine specified in `docs/modules/02_NUMPY_STATE_ENGINE.md`. This engine operates on C-contiguous memory arrays (`np.int8`), maps non-rectangular PLF seating geometries with sentinel masking (`-1` for aisles/spacers), and computes drop/fill masks in $< 2.0\text{ms}$.

**Scope:**
- Implement coordinate bijection mapper: `AuditoriumCoordinateMapper` (`(row, number) <-> (r, c)`).
- Implement 2D state diff engine: `AuditoriumStateEngine` (`compute_diff`, `extract_dropped_seats`, `get_occupancy_ratio`).
- Implement 5 automated verification gates in `apps/api/tests/test_diff_engine.py`.
- Benchmark execution latency on $25 \times 30$ grid to guarantee $< 2.0\text{ms}$ SLA.

**Estimated Effort:** 2 hours  
**Dependencies:** Milestone 1.0 (`docs/modules/01_INGESTION_AND_FIXTURES.md`, `apps/api/src/sentinel/schema.py`)

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

**Purpose:** Verify starting environment, checkout feature branch `vishnu-101226-2.0-api`.  
**Estimated Time:** 5 minutes  
**Status:** ✅ Complete  
**Version:** `2.0.0.0`  

### Step 0.1: Check Current Version
Confirm starting version `1.0.0.3` in `TASKS.md`.

### Step 0.2: Create Feature Branch
```bash
git checkout -b vishnu-101226-2.0-api
```

### Verification Gate
- [x] Working branch is `vishnu-101226-2.0-api`
- [x] Working tree clean and verified

---

## Task 1: Coordinate Bijection & Grid Layout Mapping (HIGH)

**Purpose:** Implement physical-to-matrix coordinate bijection in `apps/api/src/sentinel/diff_engine.py`.  
**Estimated Time:** 25 minutes  
**Status:** ✅ Complete  
**Version:** `2.0.0.1`  
**Dependencies:** Task 0  

### Description
Implement `AuditoriumCoordinateMapper` translating between alphanumeric seat strings (e.g. `'G'`, `14`) and zero-indexed matrix coordinates `(r, c)`. Handles both single-letter rows (`'A'`..`'Z'`) and double-letter rows (`'AA'`..`'ZZ'`).

### Affected Files
- `apps/api/src/sentinel/diff_engine.py`

### Implementation Steps
1. Implement `CoordinateMappingError(ValueError)`.
2. Implement `AuditoriumCoordinateMapper.row_to_index(row: str) -> int`.
3. Implement `AuditoriumCoordinateMapper.index_to_row(idx: int) -> str`.
4. Implement `AuditoriumCoordinateMapper.seat_to_coord(row: str, number: int) -> Tuple[int, int]`.
5. Implement `AuditoriumCoordinateMapper.coord_to_seat(r_idx: int, c_idx: int) -> Tuple[str, int]`.

### Verification Gates & Testing
- [x] Strict bidirectional bijection verified: `coord_to_seat(*seat_to_coord(r, c)) == (r, c)`
- [x] Negative seat numbers or invalid row strings raise `CoordinateMappingError`

---

## Task 2: Vectorized 2D NumPy State Diff Engine Core (CRITICAL)

**Purpose:** Implement C-contiguous state diffing and sentinel masking in `apps/api/src/sentinel/diff_engine.py`.  
**Estimated Time:** 45 minutes  
**Status:** ✅ Complete  
**Version:** `2.0.0.2`  
**Dependencies:** Task 1  

### Description
Implement `AuditoriumStateEngine`:
- Memory: Contiguous `np.int8` arrays (`np.ascontiguousarray`).
- Sentinel masking: `-1` for physical aisles/empty space.
- `snapshot_to_matrix(snapshot: SeatMapSnapshot) -> Tuple[np.ndarray, np.ndarray]`.
- `compute_diff(current_matrix: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]` calculating $D_t$, $F_t$, $D_t^{\text{prime}}$.
- `extract_dropped_seats(drop_mask: np.ndarray) -> List[Tuple[str, int]]`.
- `get_occupancy_ratio(matrix: Optional[np.ndarray]) -> float`.

### Affected Files
- `apps/api/src/sentinel/diff_engine.py`
- `apps/api/src/sentinel/__init__.py`

### Verification Gates & Testing
- [x] Post-fix reclamation mask isolates $1 \to 0$ drops exclusively
- [x] Pre-sale fill mask isolates $0 \to 1$ bookings without contaminating drop alerts
- [x] Prime mask filter isolates actionable sweet-spot drops

---

## Task 3: Deterministic Pytest Gates & Sub-2ms Benchmark (CRITICAL)

**Purpose:** Implement automated test suite and benchmark gate in `apps/api/tests/test_diff_engine.py`.  
**Estimated Time:** 30 minutes  
**Status:** ✅ Complete  
**Version:** `2.0.0.3`  
**Dependencies:** Task 2  

### Description
Implement comprehensive test suite in `apps/api/tests/test_diff_engine.py`:
- `test_gate_01_coordinate_mapping_bidirectional`
- `test_gate_02_post_fix_reclamation_detection`
- `test_gate_03_pre_sale_fill_rejection`
- `test_gate_04_sub_2ms_latency_sla_benchmark` (1000 passes on $25 \times 30$ grid $< 2.0\text{ms}$)
- `test_gate_05_shape_mismatch_exception`

### Affected Files
- `apps/api/tests/test_diff_engine.py`

### Verification Gates & Testing
- [x] 100% pytest pass rate (`pytest apps/api/tests/test_diff_engine.py`)
- [x] Average diff latency on $25 \times 30$ grid strictly under $2.0\text{ms}$ (measured: 0.0154ms)

---

**End of Milestone 2.0 Specification**
