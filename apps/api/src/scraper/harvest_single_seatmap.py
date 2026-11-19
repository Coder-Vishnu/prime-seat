"""
apps/api/src/scraper/harvest_single_seatmap.py
CLI tool and sub-process utility to harvest real-time patron seatmap
for a single AMC showtime ID and output canonical JSON for Next.js.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scraper.amc_harvester import AMCHarvester


async def harvest_single(showtime_id: str) -> None:
    harvester = AMCHarvester()
    try:
        snapshot = await harvester.harvest_seatmap(showtime_id)
        # Convert to JSON serializable output
        raw = snapshot.to_raw_payload()
        # Also build UI-ready SeatData format
        ui_seats = []
        for s in snapshot.seats:
            is_prime = False
            # Prime calculation for Tysons
            if "IMAX" in snapshot.auditorium_name:
                is_prime = s.row in {"F", "G", "H", "J", "K"} and 9 <= s.number <= 19
            elif "Dolby" in snapshot.auditorium_name:
                is_prime = s.row in {"E", "F", "G", "H"} and 8 <= s.number <= 19
            elif "4DX" in snapshot.auditorium_name:
                is_prime = s.row in {"E", "F", "G"} and 5 <= s.number <= 12
            else:
                is_prime = s.row in {"E", "F", "G"} and 5 <= s.number <= 10

            ui_seats.append({
                "row": s.row,
                "number": s.number,
                "status": "OCCUPIED" if s.is_occupied else "AVAILABLE",
                "seat_type": s.seat_type,
                "is_prime": is_prime,
                "drop_probability": 0.45 if s.is_occupied and is_prime else None,
            })

        output = {
            "showtimeId": snapshot.showtime_id,
            "movieTitle": snapshot.movie_title,
            "auditoriumName": snapshot.auditorium_name,
            "screenFormat": snapshot.screen_format,
            "totalSeats": snapshot.total_seats,
            "occupiedSeats": snapshot.occupied_seats,
            "availableSeats": snapshot.available_seats,
            "seats": ui_seats,
            "capturedAt": snapshot.captured_at.isoformat(),
        }
        print(json.dumps(output))
    finally:
        await harvester.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--showtime-id", type=str, required=True)
    args = parser.parse_args()

    asyncio.run(harvest_single(args.showtime_id))
