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
