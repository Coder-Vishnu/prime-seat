# TASKS.md: prime-seat Milestone Dashboard

> High-level project tracker and milestone dashboard for prime-seat (Prime Seat).  
> All low-level task execution details live inside `./tasks/Milestone*.md`.

**Current Version**: `1.0.0.2`  
**Last Updated**: `2026-10-12`  
**Active Milestone**: [1.0.0.0 (Milestone 1.0)](./tasks/Milestone1.0.md)

---

## Active & In-Progress Milestones

| Milestone | Priority | Status | Target Date | Description |
| :--- | :--- | :--- | :--- | :--- |
| [Milestone 1.0](./tasks/Milestone1.0.md) | CRITICAL | 🚧 Planning / In Progress | 2026-10-11 | Ingestion Contracts, Pydantic v2 Models & Fail-Closed Fixture Testing (`01_INGESTION_AND_FIXTURES`) |

---

## Planned / Pending Milestones

| Milestone | Priority | Status | Dependencies | Description |
| :--- | :--- | :--- | :--- | :--- |
| Milestone 2.0 | CRITICAL | ⏳ Pending | Milestone 1.0 | Vectorized 2D NumPy State Diff Engine (`02_NUMPY_STATE_ENGINE`) |
| Milestone 3.0 | HIGH | ⏳ Pending | Milestone 2.0 | Columnar Parquet Telemetry & pgvector Store (`03_ETL_AND_TELEMETRY`) |
| Milestone 4.0 | HIGH | ⏳ Pending | Milestone 3.0 | PyTorch Deep Learning Churn Predictor (`04_PYTORCH_CHURN_PREDICTOR`) |
| Milestone 5.0 | CRITICAL | ⏳ Pending | Milestone 4.0 | Adversarial Boundaries & Secure AI Protections (`05_ADVERSARIAL_SECURITY`) |
| Milestone 6.0 | HIGH | ⏳ Pending | Milestone 5.0 | Adaptive Poller & Dual-Dispatch Pipeline (`06_ALERT_AND_DISPATCH`) |
| Milestone 7.0 | HIGH | ⏳ Pending | Milestone 6.0 | Next.js 15 / React 19 PWA Auditorium Canvas (`07_AUDITORIUM_UI_DASHBOARD`) |

---

## Completed Milestones

| Milestone | Date Completed | Final Version | Tasks Count | Deliverables & PR Links |
| :--- | :--- | :--- | :--- | :--- |
| *(none yet)* | — | — | — | Architecture Blueprints established (Modules 01–07) |

---

## Versioning Rules Quick Reference
- **BUILD bump** (`1.0.0.0` -> `1.0.0.1`): Automatically bumped on each task completion via `/task-complete`.
- **PATCH bump** (`1.0.0.x` -> `1.0.1.0`): Bumped on patch releases.
- **MINOR bump** (`1.0.x.x` -> `1.1.0.0`): Milestone completion across major subsystems.
- **MAJOR bump** (`1.x.x.x` -> `2.0.0.0`): Production release.
