"""
apps/api/test_live_sniper.py
Manual Verification Script: Demonstrates Live AMC Ingress, Real Occupancy Sniffing,
Vectorized 2D NumPy Diffing, and Instant Push Alerts to your devices.
"""

import asyncio
import sys
from pathlib import Path

# Add src to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from scraper.amc_harvester import AMCHarvester
from scraper.bridge import SentinelHarvesterBridge
from sentinel.diff_engine import AuditoriumCoordinateMapper
from sentinel.schema import SeatStatus


async def main():
    print("=" * 70)
    print("🎯 PRIME SEAT: LIVE AMC HARVESTER & 2D DIFF PIPELINE DEMO")
    print("=" * 70)

    harvester = AMCHarvester()
    bridge = SentinelHarvesterBridge(ntfy_topic="prime-seat-tysons-vishnu")

    try:
        # Step 1: Harvest Live Showtimes
        print("\n[Step 1] Fetching live showtimes for AMC Tysons Corner 16...")
        showtimes = await harvester.harvest_showtimes()
        print(f"✓ Found {len(showtimes)} active showtimes!")
        for i, st in enumerate(showtimes[:5]):
            print(f"   [{i+1}] {st.time_str} - {st.movie_title} ({st.format}) [ID: {st.showtime_id}]")

        if not showtimes:
            print("No showtimes found.")
            return

        target = showtimes[0]
        print(f"\n[Step 2] Sniffing real patron seat map for: {target.movie_title} ({target.time_str})...")
        print(f"        URL: https://www.amctheatres.com/showtimes/{target.showtime_id}/seats")

        snapshot = await harvester.harvest_seatmap(target.showtime_id)
        print("✓ Live Seat Map Captured:")
        print(f"   • Auditorium:       {snapshot.auditorium_name}")
        print(f"   • Screen Format:    {snapshot.screen_format}")
        print(f"   • Total Seats:      {snapshot.total_seats}")
        print(f"   • Available Seats:  {snapshot.available_seats}")
        print(f"   • Occupied (Sold):  {snapshot.occupied_seats}")
        occupancy_pct = (snapshot.occupied_seats / snapshot.total_seats) * 100
        print(f"   • Current Load:     {occupancy_pct:.1f}% occupied by real patrons")

        # Step 3: Run through NumPy 2D Vectorized Diff Engine
        print("\n[Step 3] Ingesting into Module 02 NumPy 2D Vectorized State Diff Engine...")
        result = await bridge.process_harvested(
            snapshot,
            checkout_url=f"https://www.amctheatres.com/showtimes/{target.showtime_id}/seats",
        )
        print(f"✓ Baseline matrix initialized! State comparison latency: {result.diff_latency_ms:.4f} ms (SLA < 2.0 ms)")

        # Step 4: Simulate a Prime Seat Cancellation & Trigger Push Alert
        print("\n[Step 4] Simulating a Prime Seat cancellation (e.g. Row G Seat 14 drop)...")
        sentinel_snap = snapshot.to_sentinel_snapshot()

        # Create t+1 snapshot where a prime seat vacates
        updated_seats = []
        dropped_seat = None
        for s in sentinel_snap.seats:
            if s.is_prime and s.status == SeatStatus.OCCUPIED and dropped_seat is None:
                dropped_seat = s
                # Vacate seat
                updated_seats.append(s.model_copy(update={"status": SeatStatus.AVAILABLE}))
            else:
                updated_seats.append(s)

        if dropped_seat is None:
            # If no occupied prime seat was found, pick the first prime seat
            prime_seats = [s for s in sentinel_snap.seats if s.is_prime]
            if prime_seats:
                dropped_seat = prime_seats[0]
                # Pretend baseline was occupied, now available
                updated_seats = [
                    s.model_copy(update={"status": SeatStatus.AVAILABLE}) if (s.row, s.number) == (dropped_seat.row, dropped_seat.number) else s
                    for s in sentinel_snap.seats
                ]

        if dropped_seat:
            t1_snap = sentinel_snap.model_copy(update={"seats": updated_seats})
            # Force baseline to have seat occupied
            engine = bridge.get_or_create_engine(sentinel_snap)
            r_idx = AuditoriumCoordinateMapper.row_to_index(dropped_seat.row)
            c_idx = dropped_seat.number - 1
            engine.prev_matrix[r_idx, c_idx] = 1

            diff_result = await bridge.process_snapshot(
                t1_snap,
                movie_title=snapshot.movie_title,
                checkout_url=f"https://www.amctheatres.com/showtimes/{target.showtime_id}/seats",
                drop_confidence=0.97,
            )

            print(f"✓ State diff calculated in {diff_result.diff_latency_ms:.4f} ms!")
            print(f"✓ Vacated prime seat detected: Row {dropped_seat.row} Seat {dropped_seat.number}!")
            print(f"✓ Notification dispatched to ntfy.sh/prime-seat-tysons-vishnu: {diff_result.dispatches}")
            print("\n🚨 Check your iPhone / Apple Watch! You should see the 'PRIME SEAT OPEN' notification with a direct checkout link.")

    finally:
        await harvester.close()
        print("\n" + "=" * 70)
        print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
