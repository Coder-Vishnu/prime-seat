# Module 06: Adaptive Polling & Dual-Dispatch Pipeline

**Module Identifier:** `06_ALERT_AND_DISPATCH`  
**System Layer:** Polling Harness, Real-Time Event Dispatch & External Webhooks  
**Target Codebase Location:** `apps/api/src/sentinel/poller.py`, `apps/api/src/sentinel/dispatcher.py`, `apps/api/tests/test_dispatcher.py`  
**Author:** Vishnu Venkatesan (Lead Systems Architect & AI Engineer)  
**Classification:** Core Networking & Dispatch Blueprint  
**Version:** 2.0.0-PROD  

---

## 1. Domain Objective & Operational Contract

Module 06 builds a rate-limit compliant, adaptive polling daemon and a zero-cost dual-dispatch alert router. It solves the critical bottleneck of seat reclamation: catching single-seat drops in the tight 180-minute pre-showtime window without triggering AMC Web Application Firewall (WAF) IP rate-limits or Akamai Bot Manager challenges.

### Operational Contracts:
1. **Adaptive Polling Intervals:** Query intervals dynamically scale as showtime approaches, dropping from 2 hours down to 30 seconds with randomized jitter.
2. **Single-Tenant Anti-Detection Protection:** Requests use persistent session caching (TLS fingerprinting consistency, rotating Accept headers, cookie persistence) and $\pm 20\%$ stochastic jitter to mimic human browser cadence.
3. **Dual Dispatch Under 200ms:** Upon drop confirmation, alerts are dispatched simultaneously via two channels in $< 200\text{ms}$:
   - **Local Desktop:** Server-Sent Events (SSE) broadcast to `apps/web`.
   - **Instant Mobile Push:** Async HTTP push to `ntfy.sh` with urgent priority (`X-Priority: 5`), vibration patterns, and direct checkout deep links.
4. **Gemini Operator Synthesis Hook:** An autonomous LLM operator hook provides structured natural language synthesis summarizing seat acoustics, drop confidence, and checkout urgency.

```
                      +---------------------------------------+
                      | Adaptive Polling Scheduler            |
                      | Scales interval by Delta t to show    |
                      | Injects +/- 20% stochastic jitter     |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      | AMC Network Ingress (Session-Cached)  |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      | Drop Detected (Module 02 & Module 05) |
                      | Row F, Seat 14 Reopened               |
                      +---------------------------------------+
                                          |
                   +----------------------+----------------------+
                   |                                             |
                   v                                             v
+------------------------------------+       +------------------------------------+
| Dispatch Channel 1: Local SSE      |       | Dispatch Channel 2: Mobile ntfy.sh |
| Broadcast to Next.js Web App       |       | Async HTTP POST to ntfy.sh Topic   |
| /api/events/stream                 |       | Headers: Urgent, Deep Links        |
| Latency: < 15ms                    |       | Latency: < 180ms                   |
+------------------------------------+       +------------------------------------+
                   |                                             |
                   +----------------------+----------------------+
                                          |
                                          v
                      +---------------------------------------+
                      | Gemini Operator Synthesis Hook        |
                      | Generates actionable drop assessment  |
                      +---------------------------------------+
```

---

## 2. Adaptive Polling Policy & Rate-Limit Strategy

### 2.1 Dynamic Polling Schedule by Time-to-Showtime ($\Delta t = T_{\text{show}} - t$)

| Time Remaining ($\Delta t$) | Operating Phase | Base Polling Interval | Randomized Jitter Range ($\pm 20\%$) | Rationale & Protection |
| :--- | :--- | :--- | :--- | :--- |
| $\Delta t > 24\text{ hours}$ | **Dormant** | 120 minutes ($7,200\text{s}$) | $[5,760\text{s}, 8,640\text{s}]$ | Minimal churn probability; conserve network bandwidth. |
| $2\text{h} < \Delta t \le 24\text{h}$ | **Background** | 15 minutes ($900\text{s}$) | $[720\text{s}, 1,080\text{s}]$ | Captures initial day-of cancellations. |
| $30\text{m} < \Delta t \le 2\text{h}$ | **Accelerated** | 2 minutes ($120\text{s}$) | $[96\text{s}, 144\text{s}]$ | Primary cancellation zone for AMC A-List members. |
| $0 < \Delta t \le 30\text{m}$ | **Critical Burst** | 30 seconds ($30\text{s}$) | $[24\text{s}, 36\text{s}]$ | Peak drop velocity right before ticketing window locks. |

### 2.2 Mathematical Jitter Formulation
Let $\tau_{\text{base}}$ denote the base polling interval. The actual sleep duration $\tau_{\text{sleep}}$ is computed as:

$$\tau_{\text{sleep}} = \tau_{\text{base}} \cdot \left(1.0 + \mathcal{U}(-0.20, +0.20)\right)$$

where $\mathcal{U}(a, b)$ is a continuous uniform distribution on $[a, b]$.

### 2.3 Session Header Caching Invariants
To prevent WAF heuristics from identifying automated queries:
1. Maintain a persistent `httpx.AsyncClient` holding AMC session cookies and anti-CSRF tokens.
2. Standard modern desktop User-Agent string:
   `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36`
3. Include standard browser fetch headers: `Sec-Fetch-Dest: empty`, `Sec-Fetch-Mode: cors`, `Sec-Fetch-Site: same-origin`.

---

## 3. Dual-Dispatch Architecture

### 3.1 Channel 1: FastAPI Server-Sent Events (SSE)
Exposed at `/api/events/stream?showtime_id={id}`. When a drop occurs, the engine pushes a structured event to connected Next.js clients:

```json
{
  "event": "SEAT_DROP",
  "data": {
    "showtime_id": "amc-tysons-20261011-dolby-2000",
    "movie_title": "Dune: Part Two",
    "seat": {
      "row": "G",
      "number": 14,
      "status": "AVAILABLE",
      "seat_type": "RECLINER",
      "is_prime": true
    },
    "drop_probability": 0.88,
    "timestamp": "2026-10-11T12:00:00Z",
    "checkout_url": "https://www.amctheatres.com/showtimes/seats?showtimeId=amc-tysons-20261011-dolby-2000"
  }
}
```

### 3.2 Channel 2: Instant Mobile Push (`ntfy.sh`)
An asynchronous HTTP `POST` dispatched to `https://ntfy.sh/{ntfy_topic}`:
- **Headers:**
  - `Title`: `PRIME SEAT OPEN: {movie_title}!`
  - `Priority`: `urgent` (or `5`)
  - `Tags`: `tada,movie_camera,popcorn`
  - `Click`: Direct AMC checkout URL
  - `Actions`: `view, Claim in AMC App, {checkout_url}`
- **Body Text:**
  `Row {seat.row} Seat {seat.number} (Prime Recliner) just reopened! Model drop confidence: {prob:.0%}. Click to reserve immediately.`

---

## 4. Concrete Python Implementation

The implementation is located at `apps/api/src/sentinel/dispatcher.py` and `apps/api/src/sentinel/poller.py`.

### 4.1 Dispatcher Implementation (`apps/api/src/sentinel/dispatcher.py`)

```python
"""
apps/api/src/sentinel/dispatcher.py
Dual Alert Dispatcher: FastAPI SSE & ntfy.sh Urgent Webhook.
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict, List, Optional
import httpx

from sentinel.schema import SeatRecord


class SSEConnectionManager:
    """Manages active Server-Sent Events (SSE) subscribers."""

    def __init__(self):
        self._queues: List[asyncio.Queue] = []
        self._lock = asyncio.Lock()

    async def subscribe(self) -> AsyncGenerator[Dict[str, Any], None]:
        """Subscribes a client to the live event broadcast stream."""
        q: asyncio.Queue = asyncio.Queue()
        async with self._lock:
            self._queues.append(q)
        try:
            while True:
                data = await q.get()
                yield data
        finally:
            async with self._lock:
                if q in self._queues:
                    self._queues.remove(q)

    async def broadcast(self, payload: Dict[str, Any]) -> None:
        """Pushes event payload to all active browser connections."""
        async with self._lock:
            for q in self._queues:
                await q.put(payload)


# Global singleton SSE manager
sse_manager = SSEConnectionManager()


class DualAlertDispatcher:
    """
    Simultaneously dispatches seat drop events to local Next.js browsers
    and mobile devices via ntfy.sh with sub-200ms latency.
    """

    def __init__(self, ntfy_topic: str, client: Optional[httpx.AsyncClient] = None):
        self.ntfy_topic = ntfy_topic
        self.ntfy_url = f"https://ntfy.sh/{ntfy_topic}"
        self._client = client

    async def dispatch_reclamation(
        self,
        seat: SeatRecord,
        movie_title: str,
        showtime_id: str,
        drop_confidence: float,
        checkout_url: str,
    ) -> Dict[str, bool]:
        """
        Executes concurrent broadcast across SSE and ntfy.sh mobile push.
        """
        timestamp = datetime.now(timezone.utc).isoformat()

        # 1. Prepare Desktop SSE Payload
        sse_payload = {
          "event": "SEAT_DROP",
          "data": {
            "showtime_id": showtime_id,
            "movie_title": movie_title,
            "seat": seat.model_dump(),
            "drop_probability": float(drop_confidence),
            "timestamp": timestamp,
            "checkout_url": checkout_url,
          },
        }

        # 2. Prepare Mobile ntfy.sh Push Request
        headers = {
            "Title": f"PRIME SEAT OPEN: {movie_title}!",
            "Priority": "urgent",
            "Tags": "tada,movie_camera",
            "Click": checkout_url,
            "Actions": f"view, Open AMC App, {checkout_url}",
        }
        body_text = (
            f"Row {seat.row} Seat {seat.number} (Prime) reopened at Tysons 16! "
            f"Model confidence: {drop_confidence:.0%}. Click to claim immediately."
        )

        async def _send_ntfy() -> bool:
            try:
                if self._client is not None:
                    resp = await self._client.post(
                        self.ntfy_url, content=body_text, headers=headers, timeout=5.0
                    )
                    return resp.status_code == 200
                else:
                    async with httpx.AsyncClient() as http:
                        resp = await http.post(
                            self.ntfy_url, content=body_text, headers=headers, timeout=5.0
                        )
                        return resp.status_code == 200
            except Exception:
                return False

        # Run concurrent dispatch via asyncio.gather
        sse_task = sse_manager.broadcast(sse_payload)
        ntfy_task = _send_ntfy()

        results = await asyncio.gather(sse_task, ntfy_task, return_exceptions=True)

        return {
            "sse_dispatched": not isinstance(results[0], Exception),
            "ntfy_dispatched": results[1] is True,
        }
```

### 4.2 Adaptive Poller Implementation (`apps/api/src/sentinel/poller.py`)

```python
"""
apps/api/src/sentinel/poller.py
Adaptive Polling Engine with Jitter & WAF Anti-Detection.
"""

from __future__ import annotations

import random
from datetime import datetime, timezone
from typing import Tuple


class AdaptivePollingPolicy:
    """Calculates dynamically scaled polling intervals based on time to showtime."""

    DORMANT_INTERVAL: float = 7200.0     # 2 hours
    BACKGROUND_INTERVAL: float = 900.0   # 15 mins
    ACCELERATED_INTERVAL: float = 120.0  # 2 mins
    CRITICAL_INTERVAL: float = 30.0      # 30 seconds

    JITTER_RATIO: float = 0.20  # +/- 20%

    @classmethod
    def calculate_interval(cls, showtime: datetime, now: datetime) -> float:
        """
        Determines the next sleep interval in seconds, injecting stochastic jitter.
        """
        delta_seconds = (showtime - now).total_seconds()

        if delta_seconds > 86400.0:  # > 24 hours
            base = cls.DORMANT_INTERVAL
        elif delta_seconds > 7200.0:  # 2h to 24h
            base = cls.BACKGROUND_INTERVAL
        elif delta_seconds > 1800.0:  # 30m to 2h
            base = cls.ACCELERATED_INTERVAL
        elif delta_seconds > 0.0:     # 0 to 30m
            base = cls.CRITICAL_INTERVAL
        else:
            return -1.0  # Showtime has started, discontinue polling

        # Apply +/- 20% randomized jitter
        jitter = random.uniform(-cls.JITTER_RATIO, cls.JITTER_RATIO)
        actual_interval = base * (1.0 + jitter)
        return max(5.0, actual_interval)
```

---

## 5. Gemini Operator Synthesis Hook

To provide high-level intelligent assessment of vacated seats, Module 06 exposes a Gemini Function Calling interface:

```python
# Gemini Function Tool Definition
GEMINI_OPERATOR_TOOL = {
    "name": "synthesize_seat_reclamation_alert",
    "description": "Synthesizes an intelligent natural-language notification for a reclaimed prime seat.",
    "parameters": {
        "type": "object",
        "properties": {
            "row": {"type": "string", "description": "Row identifier"},
            "seat_number": {"type": "integer", "description": "Seat column number"},
            "auditorium_format": {"type": "string", "enum": ["DOLBY_CINEMA", "IMAX_LASER"]},
            "drop_confidence": {"type": "number", "description": "PyTorch predicted probability"},
            "minutes_to_showtime": {"type": "number", "description": "Time remaining in minutes"},
            "occupancy_ratio": {"type": "number", "description": "Current auditorium load"}
        },
        "required": ["row", "seat_number", "auditorium_format", "drop_confidence", "minutes_to_showtime"]
    }
}
```

---

## 6. Verification Gates & Automated Test Suite

The test suite is located at `apps/api/tests/test_dispatcher.py`. It verifies the adaptive polling schedule, mock webhook dispatch latency, and SSE broadcast delivery.

```python
"""
apps/api/tests/test_dispatcher.py
Verification Gates for Adaptive Poller & Dual Alert Dispatcher.
"""

import time
import pytest
import respx
import httpx
from datetime import datetime, timezone, timedelta

from sentinel.dispatcher import DualAlertDispatcher, sse_manager
from sentinel.poller import AdaptivePollingPolicy
from sentinel.schema import SeatRecord, SeatStatus, SeatType


class TestDispatcherVerificationGates:
    """Gate 06: Dispatcher & Polling Policy Verification Suite."""

    def test_gate_01_adaptive_interval_schedule_and_jitter(self):
        """Verify dynamic scaling of polling intervals across all 4 time regimes."""
        now = datetime(2026, 10, 11, 12, 0, 0, tzinfo=timezone.utc)

        # 1. Dormant phase (> 24h)
        t_dormant = now + timedelta(hours=30)
        interval_dormant = AdaptivePollingPolicy.calculate_interval(t_dormant, now)
        assert 5760.0 <= interval_dormant <= 8640.0  # 7200s +/- 20%

        # 2. Background phase (2h - 24h)
        t_background = now + timedelta(hours=5)
        interval_bg = AdaptivePollingPolicy.calculate_interval(t_background, now)
        assert 720.0 <= interval_bg <= 1080.0  # 900s +/- 20%

        # 3. Accelerated phase (30m - 2h)
        t_accelerated = now + timedelta(minutes=60)
        interval_accel = AdaptivePollingPolicy.calculate_interval(t_accelerated, now)
        assert 96.0 <= interval_accel <= 144.0  # 120s +/- 20%

        # 4. Critical burst phase (0 - 30m)
        t_critical = now + timedelta(minutes=10)
        interval_crit = AdaptivePollingPolicy.calculate_interval(t_critical, now)
        assert 24.0 <= interval_crit <= 36.0  # 30s +/- 20%

    @pytest.mark.asyncio
    @respx.mock
    async def test_gate_02_dual_dispatch_sub_200ms_latency(self):
        """
        Verify that concurrent dispatch to SSE and mock ntfy.sh executes
        under 200ms end-to-end.
        """
        topic = "primeseat-test-tysons-99"
        mock_ntfy = respx.post(f"https://ntfy.sh/{topic}").mock(
            return_value=httpx.Response(200, json={"success": True})
        )

        async with httpx.AsyncClient() as client:
            dispatcher = DualAlertDispatcher(ntfy_topic=topic, client=client)

            seat = SeatRecord(
                row="G",
                number=14,
                status=SeatStatus.AVAILABLE,
                seat_type=SeatType.RECLINER,
                is_prime=True,
            )

            start = time.perf_counter()
            results = await dispatcher.dispatch_reclamation(
                seat=seat,
                movie_title="Dune: Part Two",
                showtime_id="amc-tysons-dolby-2000",
                drop_confidence=0.89,
                checkout_url="https://amctheatres.com/seats/123",
            )
            elapsed_ms = (time.perf_counter() - start) * 1000.0

            assert mock_ntfy.called
            assert results["ntfy_dispatched"] is True
            assert results["sse_dispatched"] is True
            assert elapsed_ms < 200.0, f"Dispatch latency {elapsed_ms:.2f}ms exceeded 200ms SLA"
```

---

## 7. Monorepo Directory Layout & Integration

```
apps/api/
├── src/
│   ├── sentinel/
│   │   ├── poller.py             # AdaptivePollingPolicy with Stochastic Jitter
│   │   ├── dispatcher.py         # DualAlertDispatcher & SSEConnectionManager
│   │   ├── schema.py
│   │   └── diff_engine.py
│   └── security/
│       └── sanitizer.py
└── tests/
    └── test_dispatcher.py        # Gate 06 Dispatch & Latency Verification
```

---

## 8. Antigravity Milestone Execution Directive

To execute the implementation of this specification in the Antigravity Agent environment:

```bash
# 1. Switch Active Model in Antigravity Terminal
/model gemini-3.1-pro

# 2. Trigger Autonomous Milestone 6.0 Execution
/milestone-new "Milestone 6.0 based on docs/modules/06_ALERT_AND_DISPATCH.md"
```

The Antigravity agent will autonomously:
1. Create Git branch `feat/milestone-6.0`.
2. Generate task tracking document `tasks/Milestone6.0.md`.
3. Scaffold `apps/api/src/sentinel/poller.py` and `apps/api/src/sentinel/dispatcher.py`.
4. Run `apps/api/tests/test_dispatcher.py` verifying interval schedules and sub-200ms dispatch SLAs.
