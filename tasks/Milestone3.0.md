# Milestone 3.0 - Columnar Parquet Telemetry & pgvector Store

**Version:** 3.0.0.0 (Starting version)  
**Date Created:** 2026-10-12  
**Date Started:** 2026-10-19  
**Date Completed:** Pending (when all tasks complete)  
**Status:** In Progress  
**Based on:** `docs/modules/03_ETL_AND_TELEMETRY.md`  

Capture instantaneous seat transitions detected by Module 02 into partitioned Apache Parquet datasets (`zstd` compression, dictionary encoding) and define PostgreSQL / pgvector schema for 12-dimensional occupancy trajectory similarity search.

---

## Version Information

**Current Version (at milestone start):**
- **prime-seat (api):** `2.0.0.3`

**Target Version (after milestone completion):**
- **prime-seat (api):** `3.0.0.3`

**Task-Level Versioning:**
Each task completion increments the BUILD number (4th digit) by 1:
- Task 0 complete: `3.0.0.0` (Milestone Initialization & Branch Setup)
- Task 1 complete: `3.0.0.1` (PyArrow Schema & pgvector Trajectory DDL)
- Task 2 complete: `3.0.0.2` (Thread-Safe Buffered ParquetTelemetrySink)
- Task 3 complete: `3.0.0.3` (Pytest Verification Gates & Partition Conformity)

**Git Branch:**
- **prime-seat:** `vishnu-101226-3.0-parquet-telemetry`

---

## Progress Summary

**Completion:** 2 of 4 tasks complete (50%)

| Task | Priority | Status | Version | Deployed / Verified |
| :--- | :--- | :--- | :--- | :--- |
| **Task 0: Milestone Initialization & Branch Setup** | SETUP | ✅ Complete | `3.0.0.0` | 2026-10-19 |
| **Task 1: PyArrow Schema & pgvector Trajectory DDL** | HIGH | ✅ Complete | `3.0.0.1` | 2026-10-19 |
| **Task 2: Thread-Safe Buffered ParquetTelemetrySink** | CRITICAL | ⏳ Pending | `3.0.0.2` | - |
| **Task 3: Pytest Verification Gates & Partition Conformity** | CRITICAL | ⏳ Pending | `3.0.0.3` | - |

**Status Legend:**
- ⏳ Pending: not started
- 🚧 In Progress: currently being worked on
- 🔍 Verifying: running verification gates
- ✅ Complete: implementation finished and verified

---

## Overview

**Objective:**  
Implement the high-throughput columnar time-series telemetry persistence engine and historical vector similarity schema specified in `docs/modules/03_ETL_AND_TELEMETRY.md`. Every seat reclamation drop ($M_{t-1}: 1 \to M_t: 0$) and booking fill ($M_{t-1}: 0 \to M_t: 1$) is captured with microsecond UTC precision into Hive-partitioned Apache Parquet files (`year=YYYY/month=MM/date=YYYY-MM-DD/showtime_id=<id>/`) with dictionary encoding and `zstd` level 7 compression.

**Scope:**
- Define canonical PyArrow columnar schema (`TELEMETRY_ARROW_SCHEMA`) and strongly-typed `TelemetryEvent` struct.
- Author PostgreSQL / pgvector schema DDL (`pgvector_schema.sql`) for 12-dimensional occupancy trajectory embedding vectors and HNSW cosine distance indexing (`<=>`).
- Implement thread-safe buffered `ParquetTelemetrySink` with memory ring buffering, automatic batch flushing ($K=500$ events), and manual flush capability.
- Implement automated verification gates in `apps/api/tests/test_telemetry.py` covering partition hierarchy, schema conformity, manual flushing, and zstd/dictionary encoding.

**Estimated Effort:** 2 hours  
**Dependencies:** Milestone 2.0 (`docs/modules/02_NUMPY_STATE_ENGINE.md`, `apps/api/src/sentinel/diff_engine.py`)

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

**Purpose:** Verify starting environment, checkout feature branch `vishnu-101226-3.0-parquet-telemetry`.  
**Estimated Time:** 5 minutes  
**Status:** ✅ Complete  
**Version:** `3.0.0.0`  

### Step 0.1: Check Current Version
Confirmed starting version `2.0.0.3` in `TASKS.md`. ✅

### Step 0.2: Create Feature Branch
```bash
git checkout -b vishnu-101226-3.0-parquet-telemetry
```

### Verification Gate
- [x] Working branch is `vishnu-101226-3.0-parquet-telemetry`
- [x] Working tree clean and verified

---

## Task 1: PyArrow Schema & pgvector Trajectory DDL (HIGH)

**Purpose:** Define columnar Arrow schema and pgvector DDL for trajectory matching.  
**Estimated Time:** 25 minutes  
**Status:** ✅ Complete  
**Version:** `3.0.0.1`  
**Dependencies:** Task 0  

### Description
1. Create `apps/api/src/analytics/__init__.py` and `apps/api/src/analytics/telemetry.py`.
2. Define `TELEMETRY_ARROW_SCHEMA` with dictionary-encoded categories (`screen_format`, `event_type`) and microsecond UTC timestamps.
3. Define `TelemetryEvent` struct with `__slots__` for zero-overhead memory footprint.
4. Create `apps/api/src/analytics/pgvector_schema.sql` defining `showtime_trajectories` table with 12-dimensional vector (`vector(12)`) and HNSW index.

### Affected Files
- `apps/api/src/analytics/__init__.py`
- `apps/api/src/analytics/telemetry.py`
- `apps/api/src/analytics/pgvector_schema.sql`
- `apps/api/requirements.txt` (added `pyarrow==26.0.0`)

### Verification Gates & Testing
- [x] Schema types strictly match PyArrow specifications
- [x] `pgvector_schema.sql` provides valid PostgreSQL DDL with HNSW indexing

---

## Task 2: Thread-Safe Buffered ParquetTelemetrySink (CRITICAL)

**Purpose:** Implement thread-safe buffered Parquet sink with Hive partitioning.  
**Estimated Time:** 40 minutes  
**Status:** ⏳ Pending  
**Version:** `3.0.0.2`  
**Dependencies:** Task 1  

### Description
Implement `ParquetTelemetrySink` in `apps/api/src/analytics/telemetry.py`:
- `record_event(event: TelemetryEvent) -> None`
- `record_events(events: List[TelemetryEvent]) -> None`
- `flush() -> int`
- Thread synchronization via `threading.Lock()`
- Automatic flushing when buffer size reaches `batch_flush_size` ($K=500$)
- Partition hierarchy: `year=YYYY/month=MM/date=YYYY-MM-DD/showtime_id=<id>/`
- Serialized using `pq.write_table` with `zstd` level 7 compression and dictionary encoding.

### Affected Files
- `apps/api/src/analytics/telemetry.py`

### Verification Gates & Testing
- [ ] Event buffering and thread-safe batch flushing validated
- [ ] Correct Hive partition directories created on disk
- [ ] Output files compressed using `zstd` with dictionary encoding

---

## Task 3: Pytest Verification Gates & Partition Conformity (CRITICAL)

**Purpose:** Implement automated test suite in `apps/api/tests/test_telemetry.py`.  
**Estimated Time:** 30 minutes  
**Status:** ⏳ Pending  
**Version:** `3.0.0.3`  
**Dependencies:** Task 2  

### Description
Implement comprehensive test gates in `apps/api/tests/test_telemetry.py`:
- `test_gate_01_telemetry_batch_flushing_and_partitioning`: Tests automatic flush, Hive directory structure, row counts, and schema equality.
- `test_gate_02_manual_flush_behavior`: Tests manual flush clearing buffer.
- `test_gate_03_zstd_compression_and_dictionary_encoding`: Tests zstd compression and dictionary-encoded columns.

### Affected Files
- `apps/api/tests/test_telemetry.py`

### Verification Gates & Testing
- [ ] 100% pytest pass rate (`pytest apps/api/tests/test_telemetry.py`)
- [ ] No regressions across existing test suite (`pytest apps/api/tests`)

---

**End of Milestone 3.0 Specification**
