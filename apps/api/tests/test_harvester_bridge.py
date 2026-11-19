"""
apps/api/tests/test_harvester_bridge.py
Verification suite for Ingestion Bridge to NumPy 2D Diff Engine & Push Validation (Task 8).
"""

import time
import httpx
import pytest
import respx
from scraper.bridge import BridgeDiffResult, SentinelHarvesterBridge
from sentinel.dispatcher import DualAlertDispatcher
from sentinel.schema import (
    ScreenFormat,
    SeatMapSnapshot,
    SeatRecord,
    SeatStatus,
    SeatType,
)

TARGET_NTFY_TOPIC = "prime-seat-tysons-vishnu"


def _build_test_snapshot(showtime_id: str, g14_status: SeatStatus) -> SeatMapSnapshot:
    """Constructs a deterministic PLF snapshot with known prime seat coordinates."""
    seats = [
        SeatRecord(
            row="F",
            number=12,
            status=SeatStatus.OCCUPIED,
            seat_type=SeatType.STANDARD,
            is_prime=True,
        ),
        SeatRecord(
            row="G",
            number=14,
            status=g14_status,
            seat_type=SeatType.STANDARD,
            is_prime=True,
        ),
        SeatRecord(
            row="A",
            number=1,
            status=SeatStatus.AVAILABLE,
            seat_type=SeatType.STANDARD,
            is_prime=False,
        ),
    ]
    return SeatMapSnapshot(
        showtime_id=showtime_id,
        auditorium_name="Auditorium 11 (Dolby Cinema)",
        screen_format=ScreenFormat.DOLBY_CINEMA,
        total_rows=15,
        total_cols=26,
        seats=seats,
    )


@pytest.mark.asyncio
async def test_bridge_matrix_diff_sub_2ms_sla():
    """
    Verification Gate:
    1. Matrix diff correctly identifies live state transitions in < 2ms SLA.
    2. Correctly flags vacated prime seat (G14: OCCUPIED -> AVAILABLE).
    """
    bridge = SentinelHarvesterBridge(ntfy_topic=TARGET_NTFY_TOPIC)

    # Initial snapshot at t0: G14 is occupied
    snap_t0 = _build_test_snapshot("showtime-101", SeatStatus.OCCUPIED)
    res_t0 = await bridge.process_snapshot(snap_t0)
    assert len(res_t0.vacated_seats) == 0  # Initial baseline has no drops

    # Subsequent snapshot at t1: G14 vacates (cancellation / drop event)
    snap_t1 = _build_test_snapshot("showtime-101", SeatStatus.AVAILABLE)
    res_t1 = await bridge.process_snapshot(
        snap_t1,
        movie_title="The Hunger Games: Sunrise on the Reaping",
    )

    # Performance Gate: Matrix diff latency < 2.0ms
    assert res_t1.diff_latency_ms < 2.0, (
        f"Diff latency SLA violated: {res_t1.diff_latency_ms:.4f}ms >= 2.0ms"
    )

    # State Transition Gates
    assert len(res_t1.vacated_seats) == 1
    assert res_t1.vacated_seats[0].row == "G"
    assert res_t1.vacated_seats[0].number == 14

    assert len(res_t1.prime_vacated_seats) == 1
    assert res_t1.prime_vacated_seats[0].row == "G"
    assert res_t1.prime_vacated_seats[0].number == 14
    assert res_t1.prime_vacated_seats[0].is_prime is True


@pytest.mark.asyncio
async def test_bridge_push_alert_dispatch_mock():
    """
    Verifies that when a prime seat vacates, the dispatcher formats and dispatches
    the urgent notification payload with correct tags, priority, click, and actions.
    """
    async with respx.mock(base_url="https://ntfy.sh") as respx_mock:
        route = respx_mock.post(f"/{TARGET_NTFY_TOPIC}").respond(200, text="OK")

        dispatcher = DualAlertDispatcher(ntfy_topic=TARGET_NTFY_TOPIC)
        bridge = SentinelHarvesterBridge(
            ntfy_topic=TARGET_NTFY_TOPIC,
            dispatcher=dispatcher,
        )

        snap_t0 = _build_test_snapshot("showtime-202", SeatStatus.OCCUPIED)
        await bridge.process_snapshot(snap_t0)

        snap_t1 = _build_test_snapshot("showtime-202", SeatStatus.AVAILABLE)
        checkout_url = "https://www.amctheatres.com/showtimes/showtime-202/seats"
        res_t1 = await bridge.process_snapshot(
            snap_t1,
            movie_title="Avatar: Fire and Ash",
            checkout_url=checkout_url,
            drop_confidence=0.96,
        )

        assert route.called
        request = route.calls.last.request
        assert request.headers["Priority"] == "urgent"
        assert "PRIME SEAT OPEN: Avatar: Fire and Ash!" in request.headers["Title"]
        assert request.headers["Click"] == checkout_url
        assert "tada,movie_camera" in request.headers["Tags"]
        body = request.content.decode("utf-8")
        assert "Row G Seat 14 (Prime) reopened at Tysons 16!" in body
        assert "96%" in body


@pytest.mark.asyncio
async def test_bridge_live_end_to_end_push():
    """
    Verification Gate:
    End-to-end push alert triggers to Apple Watch and iPhone via ntfy.sh (HTTP 200).
    """
    dispatcher = DualAlertDispatcher(ntfy_topic=TARGET_NTFY_TOPIC)
    bridge = SentinelHarvesterBridge(
        ntfy_topic=TARGET_NTFY_TOPIC,
        dispatcher=dispatcher,
    )

    snap_t0 = _build_test_snapshot("tysons-live-gate", SeatStatus.OCCUPIED)
    await bridge.process_snapshot(snap_t0)

    snap_t1 = _build_test_snapshot("tysons-live-gate", SeatStatus.AVAILABLE)
    res = await bridge.process_snapshot(
        snap_t1,
        movie_title="The Hunger Games: Sunrise on the Reaping (Dolby)",
        checkout_url="https://www.amctheatres.com/showtimes/148208152/seats",
        drop_confidence=0.98,
    )

    assert len(res.prime_vacated_seats) == 1
    assert len(res.dispatches) == 1
    # Live ntfy.sh network delivery gate
    assert res.dispatches[0]["ntfy_dispatched"] is True, "Live ntfy.sh push failed to deliver"
    assert res.dispatches[0]["sse_dispatched"] is True
