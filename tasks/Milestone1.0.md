# Milestone 1.0 - Ingestion Contracts, Pydantic v2 Models & Fail-Closed Fixture Testing

**Version:** 1.0.0.0 (Starting version)  
**Date Created:** 2026-10-11  
**Date Started:** 2026-10-11  
**Date Completed:** 2026-10-12  
**Status:** Complete  
**Based on:** `docs/modules/01_INGESTION_AND_FIXTURES.md`  

Establish an offline-first, fail-closed ingestion boundary that isolates untrusted remote AMC network responses and normalizes them into strongly-typed Pydantic v2 domain models for AMC Tysons Corner 16 PLF auditoriums.

---

## Version Information

**Current Version (at milestone start):**
- **prime-seat (api):** `1.0.0.0`

**Target Version (after milestone completion):**
- **prime-seat (api):** `1.0.0.3`

**Task-Level Versioning:**
Each task completion increments the BUILD number (4th digit) by 1:
- Task 0 complete: `1.0.0.0` (Setup & branch creation)
- Task 1 complete: `1.0.0.1` (Offline PLF fixture scaffolding)
- Task 2 complete: `1.0.0.2` (Pydantic v2 schema & normalization engine)
- Task 3 complete: `1.0.0.3` (100% pytest test gates verification)

**Git Branch:**
- **prime-seat:** `vishnu-101126-1.0-api`

---

## Progress Summary

**Completion:** 4 of 4 tasks complete (100%)

| Task | Priority | Status | Version | Deployed / Verified |
| :--- | :--- | :--- | :--- | :--- |
| **Task 0: Milestone Initialization & Branch Setup** | SETUP | ✅ Complete | `1.0.0.0` | Verified on `vishnu-101126-1.0-api` |
| **Task 1: Offline PLF Test Fixture Scaffolding** | HIGH | ✅ Complete | `1.0.0.1` | Verified (Aud 9: 161 seats, Aud 11: 262 seats) |
| **Task 2: Pydantic v2 Domain Models & Parser** | HIGH | ✅ Complete | `1.0.0.2` | Verified (Pydantic v2 strict models & parser) |
| **Task 3: Deterministic Pytest Verification Gates** | CRITICAL | ✅ Complete | `1.0.0.3` | Verified (8/8 tests pass, 100% exit code 0) |

**Status Legend:**
- ⏳ Pending: not started
- 🚧 In Progress: currently being worked on
- 🔍 Verifying: running verification gates
- ✅ Complete: implementation finished and verified

---

## Overview

**Objective:**  
Implement the type-safe ingestion boundary specified in `docs/modules/01_INGESTION_AND_FIXTURES.md`. This boundary normalizes raw AMC seatmap JSON payloads into immutable, validated Pydantic v2 models (`SeatRecord`, `SeatMapSnapshot`) and enforces fail-closed rejection on any unmapped status codes, malformed geometries, or out-of-bounds coordinates.

**Scope:**
- Create offline test fixture: `apps/api/tests/fixtures/tysons_seatmap_sample.json`.
- Implement domain schemas and parsing logic: `apps/api/src/sentinel/schema.py`.
- Implement full test suite: `apps/api/tests/test_schema.py`.
- Mandate 100% pass verification across 6 deterministic pytest verification gates.

**Estimated Effort:** 2 hours  
**Actual Effort:** -  

**Dependencies:**
- `docs/modules/01_INGESTION_AND_FIXTURES.md`

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

**Purpose:** Verify starting environment, initialize required directories, and checkout the milestone feature branch.  
**Estimated Time:** 5 minutes  
**Status:** ✅ Complete  
**Version:** `1.0.0.0`  

### Step 0.1: Check Current Version
Confirm starting version `1.0.0.0` in session state.

### Step 0.2: Create Feature Branch
```bash
git checkout main
git checkout -b vishnu-101126-1.0-api
```

### Step 0.3: Directory Scaffolding
Ensure required directory hierarchy exists:
- `apps/api/src/sentinel/`
- `apps/api/tests/fixtures/`

### Verification Gate
- [x] Working branch is `vishnu-101126-1.0-api`
- [x] Target directories created

---

## Task 1: Offline PLF Test Fixture Scaffolding (HIGH)

**Purpose:** Scaffold authentic offline fixtures representing AMC Tysons Corner 16 Dolby Cinema auditoriums (Auditorium 9 & Auditorium 11).  
**Estimated Time:** 15 minutes  
**Status:** ✅ Complete  
**Version:** `1.0.0.1`  
**Dependencies:** Task 0  

### Description
Create `apps/api/tests/fixtures/tysons_seatmap_sample.json`, `apps/api/tests/fixtures/tysons_auditorium_9_dolby.json`, and `apps/api/tests/fixtures/tysons_auditorium_11_dolby.json` adhering strictly to the schema in `docs/modules/01_INGESTION_AND_FIXTURES.md`.
- **Auditorium 9 (Dolby Cinema):** Authentic 161-seat physical geometry (Rows A–J, 9 rows $\times$ 20 cols) with 152 `Available`, 9 `Reserved`, and ADA spaces (Wheelchair / Companion).
- **Auditorium 11 (Dolby Cinema):** Authentic 262-seat physical geometry (Rows A–L, 11 rows $\times$ 26 cols) with 190 `Available`, 72 `Reserved`, 7 `Wheelchair`, and 8 `Companion` spaces captured from live showtime screenshot.

### Affected Files
- `apps/api/tests/fixtures/tysons_seatmap_sample.json`
- `apps/api/tests/fixtures/tysons_auditorium_9_dolby.json`
- `apps/api/tests/fixtures/tysons_auditorium_11_dolby.json`
- `apps/api/tests/fixtures/auditorium_11_annotated_overlay.png`

### Implementation Steps
1. Create `apps/api/tests/fixtures/tysons_seatmap_sample.json` and `tysons_auditorium_9_dolby.json` with valid JSON structure.
2. Model authentic Tysons 16 Auditorium 9 Dolby Cinema geometry (Rows A–J, 161 physical seats).
3. Analyze live screenshot of Auditorium 11 Dolby Cinema, perform pixel-level seat identification, and scaffold `tysons_auditorium_11_dolby.json` (Rows A–L, 262 physical seats).
4. Validate JSON formatting with `json.load`.

### Verification Gates & Testing
- [x] Valid JSON syntax with 0 parsing errors across all fixtures
- [x] All 161 physical seats populated with valid coordinates from live Tysons 16 Auditorium 9 Dolby layout
- [x] All 262 physical seats populated with valid coordinates from live Tysons 16 Auditorium 11 Dolby layout (190 Available, 72 Reserved, 7 Wheelchair, 8 Companion)

---

## Task 2: Pydantic v2 Domain Models & Parser (HIGH)

**Purpose:** Implement strongly-typed domain models and fail-closed normalization parser in `apps/api/src/sentinel/schema.py`.  
**Estimated Time:** 45 minutes  
**Status:** ✅ Complete  
**Version:** `1.0.0.2`  
**Dependencies:** Task 1  

### Description
Implement the complete type definitions, custom validators, and fail-closed parsing function:
- `SeatStatus(str, Enum)`: `AVAILABLE`, `OCCUPIED`, `BLOCKED`.
- `SeatType(str, Enum)`: `STANDARD`, `RECLINER`, `WHEELCHAIR`, `COMPANION`.
- `ScreenFormat(str, Enum)`: `DOLBY_CINEMA`, `IMAX_LASER`.
- `SeatRecord(BaseModel)`: Row regex `^[A-Z]{1,2}$`, seat number `1 <= number <= 50`, `is_prime` computation.
- `SeatMapSnapshot(BaseModel)`: Spatial integrity validator preventing duplicate coordinates and capacity overflow.
- `parse_raw_amc_payload(raw_json: dict) -> SeatMapSnapshot`: Fail-closed parsing engine raising `SchemaValidationError` on unmapped states.

### Affected Files
- `apps/api/src/sentinel/__init__.py`
- `apps/api/src/sentinel/schema.py`

### Implementation Steps
1. Create `apps/api/src/sentinel/__init__.py`.
2. Implement Pydantic v2 models and `parse_raw_amc_payload` in `apps/api/src/sentinel/schema.py`.
3. Add `is_tysons_prime_seat` helper for Dolby (E-H, 8-18) and IMAX (F-K, 10-22).

### Verification Gates & Testing
- [x] Type check clean with zero syntax or typing errors
- [x] Strict immutable configuration (`frozen=True`, `extra="forbid"`)

---

## Task 3: Deterministic Pytest Verification Gates (CRITICAL)

**Purpose:** Implement and verify the 6 automated test gates in `apps/api/tests/test_schema.py`.  
**Estimated Time:** 30 minutes  
**Status:** ✅ Complete  
**Version:** `1.0.0.3`  
**Dependencies:** Task 2  

### Description
Implement the comprehensive pytest verification suite asserting valid fixture normalization and intentional rejection on corrupted or adversarial inputs.

### Affected Files
- `apps/api/tests/__init__.py`
- `apps/api/tests/conftest.py`
- `apps/api/tests/test_schema.py`

### Verification Gates & Testing
- [x] **Gate 01:** Authentic fixture parsed successfully with correct prime flags and status mappings
- [x] **Gate 02:** Immediate `SchemaValidationError` raised on unmapped raw seat status
- [x] **Gate 03:** Immediate `SchemaValidationError` raised on lowercase or invalid row regex
- [x] **Gate 04:** Immediate `SchemaValidationError` raised on negative or out-of-bounds seat numbers
- [x] **Gate 05:** Immediate `SchemaValidationError` raised on duplicate seat coordinates
- [x] **Gate 06:** Immediate `SchemaValidationError` raised on unsupported screen formats
- [x] **Overall Gate:** 100% pytest pass rate (`pytest apps/api/tests/test_schema.py` - 8/8 tests passed)

---

**End of Milestone 1.0 Specification**
