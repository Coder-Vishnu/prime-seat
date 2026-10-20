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
