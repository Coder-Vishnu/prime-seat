# Milestone 4.0 - PyTorch Deep Learning Churn Predictor

**Version:** 4.0.0.0 (Starting version)  
**Date Created:** 2026-10-19  
**Date Started:** 2026-10-19  
**Date Completed:** 2026-10-20  
**Status:** Complete  
**Based on:** `docs/modules/04_PYTORCH_CHURN_PREDICTOR.md`  

Engineers a production-grade PyTorch deep learning classifier that evaluates spatial acoustics, physical prime-tier placement, time-to-showtime $\Delta t$, and occupancy to predict cancellation probability $P(\text{Drop} \mid X)$ with sub-5ms CPU latency and weighted BCE class imbalance handling.

---

## Version Information

**Current Version (at milestone start):**
- **prime-seat (api):** `3.0.0.3`

**Target Version (after milestone completion):**
- **prime-seat (api):** `4.0.0.3`

**Task-Level Versioning:**
Each task completion increments the BUILD number (4th digit) by 1:
- Task 0 complete: `4.0.0.0` (Milestone Initialization & Branch Setup)
- Task 1 complete: `4.0.0.1` (PyTorch Dependencies & Model Backbone)
- Task 2 complete: `4.0.0.2` (16-Dim FeatureVectorBuilder & TorchScript Exporter)
- Task 3 complete: `4.0.0.3` (Pytest Verification Gates & Latency SLA)

**Git Branch:**
- **prime-seat:** `vishnu-101926-4.0-pytorch-churn`

---

## Progress Summary

**Completion:** 4 of 4 tasks complete (100%)

| Task | Priority | Status | Version | Deployed / Verified |
| :--- | :--- | :--- | :--- | :--- |
| **Task 0: Milestone Initialization & Branch Setup** | SETUP | ✅ Complete | `4.0.0.0` | 2026-10-19 |
| **Task 1: PyTorch Dependencies & Model Backbone** | HIGH | ✅ Complete | `4.0.0.1` | 2026-10-19 |
| **Task 2: 16-Dim FeatureVectorBuilder & TorchScript Exporter** | HIGH | ✅ Complete | `4.0.0.2` | 2026-10-19 |
| **Task 3: Pytest Verification Gates & Latency SLA** | CRITICAL | ✅ Complete | `4.0.0.3` | 2026-10-20 |

**Status Legend:**
- ⏳ Pending: not started
- 🚧 In Progress: currently being worked on
- 🔍 Verifying: running verification gates
- ✅ Complete: implementation finished and verified

---

## Overview

**Objective:**  
Implement the predictive deep learning seat churn classification pipeline specified in `docs/modules/04_PYTORCH_CHURN_PREDICTOR.md`. By evaluating auditorium acoustics, physical seat coordinates, time remaining $\Delta t$, and historical screening velocity, the model predicts cancellation probability $P(\text{Drop} \mid X)$ before drops happen, enabling proactive targeting rather than passive scraping.

**Scope:**
- Install and configure PyTorch CPU runtime in API virtual environment.
- Author `SeatChurnClassifier` MLP architecture: `Linear(16, 64) -> BatchNorm1d -> ReLU -> Dropout(0.20) -> Linear(64, 32) -> ReLU -> Linear(32, 1)` with `predict_probability` inference helper.
- Implement numerically stable weighted Binary Cross-Entropy loss criterion (`pos_weight = 45.0`) to handle severe 45:1 class imbalance.
- Implement `FeatureVectorBuilder.extract_features(...)` mapping spatial, temporal, and historical domain features into a normalized 16-dimensional continuous tensor $\mathbf{x} \in \mathbb{R}^{16}$.
- Implement TorchScript JIT tracing and standalone `.pt` serialization via `export_torchscript(...)`.
- Implement automated verification gates in `apps/api/tests/test_model.py` covering tensor shapes, sub-5ms CPU latency SLA on full 300-seat auditorium grids, gradient scaling, and TorchScript roundtrips.

**Estimated Effort:** 2 hours  
**Dependencies:** Milestone 3.0 (`docs/modules/03_ETL_AND_TELEMETRY.md`, `apps/api/src/analytics/telemetry.py`)

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

**Purpose:** Verify starting environment, checkout feature branch `vishnu-101926-4.0-pytorch-churn`.  
**Estimated Time:** 5 minutes  
**Status:** ✅ Complete  
**Version:** `4.0.0.0`  

### Step 0.1: Check Current Version
Confirmed starting version `3.0.0.3` in `TASKS.md`. ✅

### Step 0.2: Create Feature Branch
```bash
git checkout -b vishnu-101926-4.0-pytorch-churn
```

### Verification Gate
- [x] Working branch is `vishnu-101926-4.0-pytorch-churn`
- [x] Working tree clean and verified

---

## Task 1: PyTorch Dependencies & Model Backbone (HIGH)

**Purpose:** Add PyTorch to dependencies and implement `SeatChurnClassifier` MLP with weighted BCE loss.  
**Estimated Time:** 25 minutes  
**Status:** ✅ Complete  
**Version:** `4.0.0.1`  
**Dependencies:** Task 0  

### Description
1. Update `apps/api/requirements.txt` with PyTorch CPU wheel.
2. Create `apps/api/src/analytics/model.py`.
3. Implement `SeatChurnClassifier` (`nn.Module`) with batch normalization, dropout, forward logits pass, and `predict_probability` inference method.
4. Implement `build_loss_criterion(pos_weight_value=45.0)` returning `nn.BCEWithLogitsLoss`.
5. Re-export model symbols in `apps/api/src/analytics/__init__.py`.

### Affected Files
- `apps/api/requirements.txt`
- `apps/api/src/analytics/model.py`
- `apps/api/src/analytics/__init__.py`

### Verification Gates & Testing
- [x] PyTorch imports successfully in `.venv`
- [x] Forward pass of shape $(B, 16)$ returns raw logits of shape $(B, 1)$
- [x] Loss criterion handles 45:1 positive class weighting

---

## Task 2: 16-Dim FeatureVectorBuilder & TorchScript Exporter (HIGH)

**Purpose:** Implement domain feature vector extraction and TorchScript JIT artifact serialization.  
**Estimated Time:** 30 minutes  
**Status:** ✅ Complete  
**Version:** `4.0.0.2`  
**Dependencies:** Task 1  

### Description
1. Implement `FeatureVectorBuilder.extract_features` in `apps/api/src/analytics/model.py`:
   - Normalized spatial coordinates ($r/R, c/C$, optical center distance)
   - Prime row/column indicators
   - One-hot PLF format flags (`DOLBY_CINEMA`, `IMAX_LASER`)
   - Temporal features ($\Delta t$ normalized, inverse time proximity, cyclical sin/cos hour and day of week)
   - Instantaneous occupancy load and historical cancellation similarity
2. Implement `export_torchscript(model, output_path)` using `torch.jit.trace`.

### Affected Files
- `apps/api/src/analytics/model.py`
- `apps/api/src/analytics/__init__.py`

### Verification Gates & Testing
- [x] Extracted feature list strictly contains 16 float values bounded in specified mathematical domains
- [x] `export_torchscript` creates valid `.pt` model artifact loadable via `torch.jit.load`

---

## Task 3: Pytest Verification Gates & Latency SLA (CRITICAL)

**Purpose:** Implement automated test suite in `apps/api/tests/test_model.py` and enforce sub-5ms CPU latency SLA.  
**Estimated Time:** 30 minutes  
**Status:** ✅ Complete  
**Version:** `4.0.0.3`  
**Dependencies:** Task 2  

### Description
Implement comprehensive test gates in `apps/api/tests/test_model.py`:
- `test_gate_01_tensor_shapes_and_probability_bounds`: Tests batch sizes (1, 16, 64, 300) and probability bounds $[0.0, 1.0]$.
- `test_gate_02_cpu_inference_latency_sla`: Benchmarks 300-seat grid over 500 forward passes, asserting $<5.0\text{ms}$ CPU SLA.
- `test_gate_03_loss_gradient_scaling_on_imbalance`: Validates pos_weight=45.0 scaling ratio.
- `test_gate_04_feature_builder_dimension_and_bounds`: Validates 16-dim feature extraction output.
- `test_gate_05_torchscript_serialization_roundtrip`: Verifies JIT trace and output parity.

### Affected Files
- `apps/api/tests/test_model.py`

### Verification Gates & Testing
- [x] 100% pytest pass rate (`pytest apps/api/tests/test_model.py`) — 5/5 passed
- [x] CPU inference latency $<5.0\text{ms}$ verified on 300-seat batch
- [x] No regressions across existing test suite (`pytest apps/api/tests`) — 23/23 passed

---

**End of Milestone 4.0 Specification**
