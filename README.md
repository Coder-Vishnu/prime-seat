# Prime Seat

> **High-Throughput PLF Seat Vacancy Reclamation Monitor, Vectorized 2D Diff Engine & Predictive Churn Analytics Pipeline**  
> **Author:** Vishnu Venkatesan  
> **Target Scope:** AMC Tysons Corner 16 (Auditorium 10: Dolby Cinema, Auditorium 1: IMAX with Laser)  
> **Monorepo Structure:** `apps/api` (FastAPI / NumPy / PyTorch / PyArrow) & `apps/web` (Next.js 15 / React 19 PWA)  
> **Version:** `2.0.0-PROD` (Definitive Edition)

---

## 1. Operational Intent & The Post-Fix Philosophy

Conventional ticket monitoring bots concentrate exclusively on **prefix booking windows** (alerting users when a ticket block initially goes on sale). In competitive metropolitan markets like AMC Tysons Corner 16, prime center rows in Premium Large Format (PLF) auditoriums sell out within seconds of schedule publication.

**Prime Seat operates exclusively in post-fix mode:**
- It actively tracks seats that are **already booked** by patrons.
- It continuously evaluates dynamic churn probabilities using an imbalanced deep learning classifier.
- It detects the exact split-second an AMC A-List member cancels their reservation in the final 60–180 minutes prior to showtime ($M_{t-1}: 1 \to M_t: 0$), reclaiming high-value center-line inventory (Rows E–H, 8–18 in Dolby Cinema; Rows F–K, 10–22 in IMAX with Laser).

```
                      +------------------------------------------+
                      |   Untrusted AMC Ingress (XHR / Mock)     |
                      +------------------------------------------+
                                           |
                                           v
                      +------------------------------------------+
                      | Module 01: Pydantic v2 Ingestion Boundary|
                      | Fail-closed regex, bounds & type parsing |
                      +------------------------------------------+
                                           |
                                           v
                      +------------------------------------------+
                      | Module 02: NumPy 2D State Engine         |
                      | D_t = M_(t-1) ⊙ (1 - M_t)   (< 2ms SLA)  |
                      +------------------------------------------+
                                           |
                   +-----------------------+-----------------------+
                   |                                               |
                   v                                               v
+------------------------------------+   +------------------------------------+
| Module 03: Columnar Telemetry      |   | Module 04: PyTorch Churn Predictor |
| PyArrow Parquet + pgvector         |   | Weighted BCE (pos_weight = 45.0)   |
| Hive Partitions (zstd level 7)     |   | P(Drop | X) Scoring (< 5ms CPU)    |
+------------------------------------+   +------------------------------------+
                   |                                               |
                   +-----------------------+-----------------------+
                                           |
                                           v
                      +------------------------------------------+
                      | Module 05: Adversarial AI Security       |
                      | Dimension clamping, replay & mass drops  |
                      +------------------------------------------+
                                           |
                                           v
                      +------------------------------------------+
                      | Module 06: Adaptive Polling & Dispatch   |
                      | Dynamic jitter (+/-20%), SSE + ntfy push |
                      +------------------------------------------+
                                           |
                                           v
                      +------------------------------------------+
                      | Module 07: Next.js 15 PWA Dashboard      |
                      | 2D SVG canvas, real-time SSE & heatmap   |
                      +------------------------------------------+
```

### Overcoming Scraper Anti-Patterns (SeatDrop Comparison)
Unguided, vibe-coded scrapers suffer from severe design regressions:
1. **DOM Fragility:** Direct HTML parsing crashes upon minor AMC frontend layout refactors. Prime Seat treats the auditorium as a static numerical coordinate system and isolates data ingestion from UI rendering via strict Pydantic v2 contracts.
2. **Vendor IP Bans:** Unthrottled multi-tenant requests trigger Akamai Bot Manager challenges and WAF IP blacklisting. Prime Seat enforces a single-tenant local daemon policy, persistent session cookie caching, and adaptive polling with $\pm 20\%$ stochastic jitter.
3. **Irregular Seating Geometries:** Imperative nested loops choke on curved rows and missing aisle spaces. Prime Seat models auditoriums as contiguous 2D bitmasks with sentinel masking ($-1$), diffing states in $< 2\text{ms}$.

---

## 2. Core Mathematical Formulations

### Coordinate Translation Contract
Let row character $r \in \{A, B, \dots, Z, AA, \dots\}$ and seat number $n \in [1, 50]$. The bijection $(\phi(r), \psi(n))$ maps physical labels to zero-indexed array coordinates $(r_{\text{idx}}, c_{\text{idx}})$:

$$\phi(r) = \begin{cases} \text{ord}(r[0]) - 65 & \text{if } |r| = 1 \\ 26 \times (\text{ord}(r[0]) - 64) + (\text{ord}(r[1]) - 65) & \text{if } |r| = 2 \end{cases}$$

$$\psi(n) = n - 1$$

### Vectorized State Diff Arithmetic
Given baseline occupancy matrix $M_{t-1} \in \{0, 1\}^{R \times C}$ and current occupancy matrix $M_t \in \{0, 1\}^{R \times C}$:

* **Post-Fix Reclamation Drop Mask ($D_t$):** Isolates seats transitioning from Occupied ($1$) to Vacant ($0$):
  $$D_t = M_{t-1} \odot (1 - M_t) = \mathbb{I}\left(M_{t-1} = 1 \land M_t = 0\right)$$

* **Pre-Sale Booking Fill Mask ($F_t$):** Isolates new bookings ($0 \to 1$), explicitly discarded from reclamation alerts:
  $$F_t = (1 - M_{t-1}) \odot M_t = \mathbb{I}\left(M_{t-1} = 0 \land M_t = 1\right)$$

* **Prime Drop Mask ($D_t^{\text{prime}}$):** Filtered against the static prime indicator matrix $P \in \{0, 1\}^{R \times C}$:
  $$D_t^{\text{prime}} = D_t \odot P$$

* **Instantaneous Auditorium Load ($\rho_t$):** Evaluated over physical seat mask $\Omega$:
  $$\rho_t = \frac{\sum (M_t \odot \Omega)}{\sum \Omega}$$

### Extreme Class Imbalance Loss Formulation
With seat cancellations representing $<2\%$ of total reservations, standard BCE produces severe false-negative bias. We penalize missed drops using Weighted Binary Cross-Entropy with a positive class weight $\omega_{\text{pos}} = 45.0$:

$$\mathcal{L}_n = - \left[ \omega_{\text{pos}} \cdot y_n \cdot \log\left(\sigma(z_n)\right) + (1 - y_n) \cdot \log\left(1 - \sigma(z_n)\right) \right]$$

---

## 3. Production Monorepo Topology

```
prime-seat/
├── docs/
│   └── modules/                      # Publication-Grade Domain Specifications
│       ├── 01_INGESTION_AND_FIXTURES.md       # AMC Ingestion, Pydantic v2 Models
│       ├── 02_NUMPY_STATE_ENGINE.md           # 2D Bitmask Diff Engine (< 2ms)
│       ├── 03_ETL_AND_TELEMETRY.md            # Columnar Parquet & pgvector Similarity
│       ├── 04_PYTORCH_CHURN_PREDICTOR.md      # PyTorch MLP & Weighted BCE Loss
│       ├── 05_ADVERSARIAL_SECURITY.md         # Adversarial ML Firewall & Sanitizer
│       ├── 06_ALERT_AND_DISPATCH.md           # Adaptive Poller & Dual Webhooks
│       └── 07_AUDITORIUM_UI_DASHBOARD.md      # Next.js 15 PWA & SVG Canvas
├── tasks/                            # Milestone-Driven Execution Contracts
│   ├── MilestoneTemplate.md          # Standard Milestone Blueprint Template
│   └── Milestone1.0.md               # Active Milestone 1.0 Specification
├── apps/
│   ├── api/                          # Python Analytics & Core Engine
│   │   ├── src/
│   │   │   ├── sentinel/             # Ingestion, Diff Engine, Poller & Dispatcher
│   │   │   │   ├── schema.py         # Pydantic v2 Models & Raw Parsers
│   │   │   │   ├── diff_engine.py    # SIMD-Accelerated 2D NumPy Engine
│   │   │   │   ├── poller.py         # Adaptive Poller with Stochastic Jitter
│   │   │   │   └── dispatcher.py     # SSE Broadcaster & ntfy.sh Router
│   │   │   ├── analytics/            # Machine Learning & Columnar Stores
│   │   │   │   ├── model.py          # PyTorch SeatChurnClassifier MLP
│   │   │   │   ├── telemetry.py      # PyArrow Micro-Batched Parquet Sink
│   │   │   │   └── pgvector_schema.sql # 12-Dim Trajectory Cosine Retrieval
│   │   │   └── security/             # Defensive AI Invariants & Bounds Gating
│   │   │       └── sanitizer.py      # AdversarialInputSanitizer
│   │   └── tests/                    # Deterministic Verification Gates
│   │       ├── fixtures/
│   │       │   └── tysons_seatmap_sample.json # Offline PLF Fixture
│   │       ├── test_schema.py        # Gate 01: Ingestion & Model Tests
│   │       ├── test_diff_engine.py   # Gate 02: < 2ms Latency & Diff Tests
│   │       ├── test_telemetry.py     # Gate 03: PyArrow Schema & Parquet Tests
│   │       ├── test_model.py         # Gate 04: PyTorch Latency & BCE Tests
│   │       ├── test_security.py      # Gate 05: Adversarial Fuzzing & Gating
│   │       └── test_dispatcher.py    # Gate 06: Dual Dispatch Latency Tests
│   └── web/                          # Next.js 15 / React 19 Frontend PWA
│       ├── public/
│       │   ├── manifest.json         # Standalone PWA Manifest
│       │   └── sw.js                 # Background Push Notification Handler
│       ├── src/
│       │   ├── components/
│       │   │   └── AuditoriumCanvas.tsx # 2D SVG Seating Canvas & Heatmap
│       │   └── hooks/
│       │       ├── useAuditoriumStream.ts # Real-Time SSE Stream Hook
│       │       └── useDesktopNotification.ts # Native OS Notification API
│       └── tests/
│           └── AuditoriumCanvas.test.tsx # Gate 07: Component Vitest Suite
├── data/
│   └── telemetry/                    # Hive-Partitioned Parquet Storage (zstd)
├── TASKS.md                          # Master Project Roadmap & Milestone Tracker
└── README.md                         # Monorepo Documentation
```

---

## 4. Module Architecture Catalog

| Module | Specification Blueprint | System Layer | Core SLA / Contract | Verification Gate |
| :--- | :--- | :--- | :--- | :--- |
| **01** | [`01_INGESTION_AND_FIXTURES.md`](file:///C:/Users/vrviv/Projects/personal/prime-seat/docs/modules/01_INGESTION_AND_FIXTURES.md) | Ingestion Boundary | Fail-closed Pydantic v2 parsing | `test_schema.py` (100% pass) |
| **02** | [`02_NUMPY_STATE_ENGINE.md`](file:///C:/Users/vrviv/Projects/personal/prime-seat/docs/modules/02_NUMPY_STATE_ENGINE.md) | State Diffing Core | SIMD bitmask diffing in contiguous C-memory | `< 2.0ms` on $25 \times 30$ grid |
| **03** | [`03_ETL_AND_TELEMETRY.md`](file:///C:/Users/vrviv/Projects/personal/prime-seat/docs/modules/03_ETL_AND_TELEMETRY.md) | Time-Series Store | PyArrow Parquet (`zstd`) + pgvector trajectories | Hive partition round-trips |
| **04** | [`04_PYTORCH_CHURN_PREDICTOR.md`](file:///C:/Users/vrviv/Projects/personal/prime-seat/docs/modules/04_PYTORCH_CHURN_PREDICTOR.md) | Deep Learning | MLP with Weighted BCE (`pos_weight = 45.0`) | `< 5.0ms` CPU forward pass |
| **05** | [`05_ADVERSARIAL_SECURITY.md`](file:///C:/Users/vrviv/Projects/personal/prime-seat/docs/modules/05_ADVERSARIAL_SECURITY.md) | Secure AI Boundary | Hardware capacity limits & mass drop suppression | Adversarial fuzzing pass |
| **06** | [`06_ALERT_AND_DISPATCH.md`](file:///C:/Users/vrviv/Projects/personal/prime-seat/docs/modules/06_ALERT_AND_DISPATCH.md) | Network Dispatch | Adaptive poller ($\pm 20\%$ jitter), Dual dispatch | `< 200ms` dispatch latency |
| **07** | [`07_AUDITORIUM_UI_DASHBOARD.md`](file:///C:/Users/vrviv/Projects/personal/prime-seat/docs/modules/07_AUDITORIUM_UI_DASHBOARD.md) | Client-Side PWA | Next.js 15 SVG Canvas with live SSE sync | Vitest node rendering |

---

## 5. Development & Execution Directives

### Antigravity Agent Milestone Workflow
Development follows deterministic milestone cycles backed by verification gates:

```bash
# 1. Initialize session context
/session-start

# 2. Scaffold new milestone specification
/milestone-new

# 3. Start milestone task execution and checkout feature branch
/milestone-start

# 4. Complete and close verified milestone
/task-complete
/milestone-complete
```

### Git Branch Naming Convention
All milestone feature branches follow the standard developer-tagged format:
```
vishnu-MMDDYY-[VERSION]-[suffix]
```
* **Example:** `vishnu-101126-1.0-api` (Milestone 1.0 on October 11, 2026).
