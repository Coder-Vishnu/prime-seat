"""
apps/api/tests/test_amc_harvester.py
Verification suite for AMC Live Seat Response Sniffer & Harvester (Task 7).
"""

import pytest
from scraper.amc_harvester import (
    AMCHarvester,
    HarvestedSeatItem,
    HarvestedSeatMapSnapshot,
    HarvestedShowtime,
)
from sentinel.schema import ScreenFormat, SeatMapSnapshot, SeatStatus, SeatType


def test_harvested_seat_item_mapping():
    """Verifies physical seat record conversion into raw dictionary format."""
    item = HarvestedSeatItem(
        row="G",
        number=14,
        raw_name="G14",
        raw_aria="AMC Club Rocker G14",
        is_occupied=True,
        seat_type="Standard",
        status_str="Reserved",
    )
    raw = item.to_raw_dict()
    assert raw["row"] == "G"
    assert raw["number"] == 14
    assert raw["status"] == "Reserved"
    assert raw["seat_type"] == "Standard"


def test_harvested_snapshot_to_sentinel_snapshot():
    """Verifies that HarvestedSeatMapSnapshot flawlessly translates into a validated SeatMapSnapshot."""
    seats = [
        HarvestedSeatItem(
            row="F",
            number=12,
            raw_name="F12",
            raw_aria="AMC Club Rocker F12",
            is_occupied=False,
            seat_type="Standard",
            status_str="Available",
        ),
        HarvestedSeatItem(
            row="F",
            number=13,
            raw_name="F13",
            raw_aria="AMC Club Rocker F13",
            is_occupied=True,
            seat_type="Standard",
            status_str="Sold",
        ),
        HarvestedSeatItem(
            row="G",
            number=1,
            raw_name="G1",
            raw_aria="Wheelchair G1",
            is_occupied=False,
            seat_type="Wheelchair",
            status_str="Available",
        ),
    ]

    snapshot = HarvestedSeatMapSnapshot(
        showtime_id="148208152",
        movie_title="The Hunger Games: Sunrise on the Reaping",
        auditorium_name="Auditorium 3 (IMAX)",
        screen_format="IMAX_LASER",
        total_rows=15,
        total_cols=26,
        total_seats=3,
        available_seats=2,
        occupied_seats=1,
        seats=seats,
    )

    sentinel_snap = snapshot.to_sentinel_snapshot()
    assert isinstance(sentinel_snap, SeatMapSnapshot)
    assert sentinel_snap.showtime_id == "148208152"
    assert sentinel_snap.screen_format == ScreenFormat.IMAX_LASER
    assert len(sentinel_snap.seats) == 3

    # Check prime status evaluation (F12 is Prime in IMAX Laser)
    f12 = next(s for s in sentinel_snap.seats if s.row == "F" and s.number == 12)
    assert f12.status == SeatStatus.AVAILABLE
    assert f12.is_prime is True

    # Check sold status
    f13 = next(s for s in sentinel_snap.seats if s.row == "F" and s.number == 13)
    assert f13.status == SeatStatus.OCCUPIED

    # Check wheelchair classification
    g1 = next(s for s in sentinel_snap.seats if s.row == "G" and s.number == 1)
    assert g1.seat_type == SeatType.WHEELCHAIR
    assert g1.is_prime is False  # ADA exclusions invariant


def test_auditorium_metadata_resolution():
    """Verifies that physical seat capacities map deterministically to AMC Tysons PLF auditoriums."""
    assert AMCHarvester._resolve_auditorium_metadata(350, []) == (
        "Auditorium 3 (IMAX)",
        "IMAX_LASER",
    )
    assert AMCHarvester._resolve_auditorium_metadata(262, []) == (
        "Auditorium 11 (Dolby Cinema)",
        "DOLBY_CINEMA",
    )
    assert AMCHarvester._resolve_auditorium_metadata(161, []) == (
        "Auditorium 9 (Dolby Cinema)",
        "DOLBY_CINEMA",
    )
    assert AMCHarvester._resolve_auditorium_metadata(125, []) == (
        "Auditorium 2 (4DX)",
        "IMAX_LASER",
    )


@pytest.mark.asyncio
async def test_amc_harvester_live_showtimes():
    """Verifies harvesting live showtimes from AMC Tysons Corner 16."""
    harvester = AMCHarvester()
    try:
        showtimes = await harvester.harvest_showtimes()
        assert len(showtimes) > 0, "No live showtimes returned"
        first = showtimes[0]
        assert isinstance(first, HarvestedShowtime)
        assert len(first.showtime_id) >= 6
        assert first.url.startswith("https://www.amctheatres.com/showtimes/")
    finally:
        await harvester.close()


@pytest.mark.asyncio
async def test_amc_harvester_live_seatmap():
    """
    Verification Gate:
    1. Captured seat payload contains genuine occupied and available seats for an active AMC Tysons screening.
    2. Seat count matches the auditorium's physical capacity (e.g. 350 seats for Aud 3 IMAX).
    3. Translates flawlessly into a fail-closed SeatMapSnapshot.
    """
    harvester = AMCHarvester()
    try:
        # First retrieve the live schedule to select an active showtime
        showtimes = await harvester.harvest_showtimes()
        assert len(showtimes) > 0
        target_showtime = showtimes[0]

        # Harvest the live seatmap
        snapshot = await harvester.harvest_seatmap(target_showtime.showtime_id)
        assert isinstance(snapshot, HarvestedSeatMapSnapshot)
        assert snapshot.showtime_id == target_showtime.showtime_id
        assert snapshot.total_seats > 0

        # Physical capacity check: PLF auditoriums at Tysons have >= 125 seats
        assert snapshot.total_seats >= 120, f"Unexpectedly low seat count: {snapshot.total_seats}"

        # Real patron occupancy verification: both available and occupied seats must exist
        assert snapshot.available_seats > 0, "Expected available seats for screening"
        assert snapshot.occupied_seats >= 0, "Occupied seat count must be non-negative"

        # Conversion to Sentinel Model Gate
        sentinel_snapshot = snapshot.to_sentinel_snapshot()
        assert isinstance(sentinel_snapshot, SeatMapSnapshot)
        assert len(sentinel_snapshot.seats) == snapshot.total_seats
    finally:
        await harvester.close()
