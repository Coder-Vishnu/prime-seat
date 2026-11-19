"""
apps/api/src/scraper/amc_harvester.py
Real-Time AMC Showtime & Seat Map Harvester.
Captures live patron reservation states and extracts architectural seating layouts.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from playwright.async_api import Page

from scraper.stealth_engine import (
    CloudflareChallengeDetected,
    StealthBrowserSession,
    StealthIngressError,
)
from sentinel.diff_engine import AuditoriumCoordinateMapper
from sentinel.schema import (
    RAW_STATUS_MAP,
    RAW_TYPE_MAP,
    ScreenFormat,
    SeatMapSnapshot,
    SeatRecord,
    SeatStatus,
    SeatType,
    is_tysons_prime_seat,
    parse_raw_amc_payload,
)

AMC_TYSONS_SHOWTIMES_URL = (
    "https://www.amctheatres.com/movie-theatres/washington-d-c/amc-tysons-corner-16/showtimes"
)


class AMCHarvesterError(Exception):
    """Base exception for AMC harvester failures."""
    pass


@dataclass(frozen=True)
class HarvestedSeatItem:
    """Represents a single physical seat extracted from the AMC live DOM."""
    row: str
    number: int
    raw_name: str
    raw_aria: str
    is_occupied: bool
    seat_type: str
    status_str: str

    def to_raw_dict(self) -> Dict[str, Any]:
        return {
            "row": self.row,
            "number": self.number,
            "status": self.status_str,
            "seat_type": self.seat_type,
        }


@dataclass(frozen=True)
class HarvestedShowtime:
    """Represents an active showtime option at AMC Tysons Corner 16."""
    showtime_id: str
    url: str
    time_str: str
    movie_title: str
    format: str


@dataclass
class HarvestedSeatMapSnapshot:
    """Complete captured seating snapshot for an active AMC screening."""
    showtime_id: str
    movie_title: str
    auditorium_name: str
    screen_format: str
    total_rows: int
    total_cols: int
    total_seats: int
    available_seats: int
    occupied_seats: int
    seats: List[HarvestedSeatItem]
    captured_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_raw_payload(self) -> Dict[str, Any]:
        """Converts the harvested snapshot into the fail-closed raw AMC JSON structure."""
        return {
            "showtime_id": self.showtime_id,
            "auditorium_name": self.auditorium_name,
            "screen_format": self.screen_format,
            "rows": self.total_rows,
            "cols": self.total_cols,
            "seats": [s.to_raw_dict() for s in self.seats],
            "captured_at": self.captured_at.isoformat(),
        }

    def to_sentinel_snapshot(self) -> SeatMapSnapshot:
        """Translates the harvested payload into a validated, immutable SeatMapSnapshot."""
        raw_payload = self.to_raw_payload()
        return parse_raw_amc_payload(raw_payload)


class AMCHarvester:
    """
    High-fidelity harvester that navigates AMC Tysons Corner 16,
    extracts real-time showtime listings, and sniffs physical seat states.
    """

    def __init__(self, session: Optional[StealthBrowserSession] = None) -> None:
        self._session = session
        self._owns_session = session is None

    async def _get_session(self) -> StealthBrowserSession:
        if self._session is None:
            self._session = StealthBrowserSession()
            await self._session.start()
        return self._session

    async def close(self) -> None:
        if self._owns_session and self._session is not None:
            await self._session.close()
            self._session = None

    async def harvest_showtimes(
        self,
        theatre_url: str = AMC_TYSONS_SHOWTIMES_URL,
    ) -> List[HarvestedShowtime]:
        """Harvests all active live showtimes for AMC Tysons Corner 16."""
        session = await self._get_session()
        page = await session.new_page()

        try:
            await session.navigate_with_clearance(
                page,
                theatre_url,
                wait_until="domcontentloaded",
                settle_ms=3000,
            )

            # Evaluate showtime anchors
            raw_showtimes = await page.evaluate("""() => {
                const links = Array.from(document.querySelectorAll("a[href*='/showtimes/']"));
                return links.map(link => {
                    const href = link.getAttribute('href') || '';
                    const idMatch = href.match(/\\/showtimes\\/(\\d+)/);
                    const showtimeId = idMatch ? idMatch[1] : '';
                    const timeText = (link.innerText || '').split('\\n')[0].trim();
                    
                    // Format or experience context
                    let formatText = '';
                    let parent = link.parentElement;
                    while (parent && parent.tagName !== 'BODY') {
                        const fmtH = parent.querySelector("h3, h4, span[class*='badge'], [class*='format']");
                        if (fmtH && fmtH.innerText && fmtH.innerText.length < 50) {
                            formatText = fmtH.innerText.trim();
                            break;
                        }
                        parent = parent.parentElement;
                    }
                    
                    // Movie heading context
                    let movieHeading = '';
                    let movieParent = link.closest("section, article, div[class*='movie'], div[class*='Movie']");
                    if (movieParent) {
                        const h = movieParent.querySelector("h2, h3, h4, a[class*='movie-title']");
                        if (h) movieHeading = h.innerText.trim();
                    }
                    
                    return {
                        showtime_id: showtimeId,
                        url: href.startsWith('http') ? href : `https://www.amctheatres.com${href}`,
                        time_str: timeText,
                        movie_title: movieHeading,
                        format: formatText
                    };
                }).filter(s => s.showtime_id.length > 0);
            }""")

            return [
                HarvestedShowtime(
                    showtime_id=item["showtime_id"],
                    url=item["url"],
                    time_str=item["time_str"],
                    movie_title=item["movie_title"] or "Featured Film",
                    format=item["format"] or "Standard",
                )
                for item in raw_showtimes
            ]
        finally:
            await page.close()

    async def harvest_seatmap(
        self,
        showtime_url_or_id: str,
        referer_url: str = AMC_TYSONS_SHOWTIMES_URL,
    ) -> HarvestedSeatMapSnapshot:
        """
        Navigates to the showtime seating grid, extracts all physical seats,
        and parses real occupancy and ADA hardware classifications.
        """
        session = await self._get_session()
        page = await session.new_page()

        if showtime_url_or_id.isdigit():
            target_url = f"https://www.amctheatres.com/showtimes/{showtime_url_or_id}/seats"
            showtime_id = showtime_url_or_id
        else:
            target_url = showtime_url_or_id
            if not target_url.endswith("/seats"):
                target_url = f"{target_url.rstrip('/')}/seats"
            m = re.search(r"/showtimes/(\d+)", showtime_url_or_id)
            showtime_id = m.group(1) if m else "unknown"

        try:
            # 1. Establish natural session and cookies on theatre page first if needed
            if referer_url:
                await session.navigate_with_clearance(
                    page,
                    referer_url,
                    wait_until="domcontentloaded",
                    settle_ms=2000,
                )

            # 2. Navigate to showtime ticketing URL
            await session.navigate_with_clearance(
                page,
                target_url,
                wait_until="domcontentloaded",
                settle_ms=4000,
            )

            # Wait for seat map container to populate
            try:
                await page.wait_for_selector(
                    "div[aria-label='Seat Selection Map'] input",
                    timeout=15000,
                )
            except Exception as exc:
                raise AMCHarvesterError(
                    f"Seat Selection Map container did not load for showtime {showtime_id}: {exc}"
                )

            # 3. Extract seat data, movie title, and headings
            extraction = await page.evaluate("""() => {
                const map = document.querySelector("div[aria-label='Seat Selection Map']");
                const inputs = map ? Array.from(map.querySelectorAll("input")) : [];
                
                const rawSeats = inputs.map(input => {
                    const label = input.closest('label');
                    return {
                        name: input.getAttribute('name') || '',
                        aria: input.getAttribute('aria-label') || '',
                        disabled: input.disabled,
                        labelClass: label ? label.className : ''
                    };
                });
                
                // Headings for metadata detection
                const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4"))
                    .map(h => h.innerText.trim())
                    .filter(t => t.length > 0 && t.length < 80);
                    
                return {
                    seats: rawSeats,
                    headings: headings
                };
            }""")

            raw_seats = extraction["seats"]
            headings = extraction["headings"]

            if not raw_seats:
                raise AMCHarvesterError(f"Zero seat elements found for showtime {showtime_id}")

            parsed_items: List[HarvestedSeatItem] = []
            max_row_idx = 0
            max_col_num = 0

            for seat in raw_seats:
                name = seat["name"].strip().upper()
                match = re.match(r"^([A-Z]+)(\d+)$", name)
                if not match:
                    continue

                row = match.group(1)
                num = int(match.group(2))
                r_idx = AuditoriumCoordinateMapper.row_to_index(row)
                if r_idx > max_row_idx:
                    max_row_idx = r_idx
                if num > max_col_num:
                    max_col_num = num

                aria = seat["aria"]
                disabled = seat["disabled"]
                aria_lower = aria.lower()

                # Physical seat type detection
                if "wheelchair" in aria_lower:
                    stype = "Wheelchair"
                elif "companion" in aria_lower:
                    stype = "Companion"
                elif "recliner" in aria_lower:
                    stype = "Recliner"
                else:
                    stype = "Standard"

                # Status detection
                status_str = "Reserved" if disabled else "Available"

                parsed_items.append(
                    HarvestedSeatItem(
                        row=row,
                        number=num,
                        raw_name=name,
                        raw_aria=aria,
                        is_occupied=disabled,
                        seat_type=stype,
                        status_str=status_str,
                    )
                )

            total_seats = len(parsed_items)
            occupied_count = sum(1 for s in parsed_items if s.is_occupied)
            available_count = total_seats - occupied_count

            # Determine auditorium and format from seat capacity & heading cues
            aud_name, screen_fmt = self._resolve_auditorium_metadata(total_seats, headings)

            # Calculate bounding grid ensuring capacity invariant
            total_rows = max(max_row_idx + 1, 15)
            total_cols = max(max_col_num, 26)
            if (total_rows * total_cols) < total_seats:
                total_rows = (total_seats // total_cols) + 2

            # Extract movie title from headings
            movie_title = "Featured Film"
            for h in headings:
                if h not in {"Select Seats", "Showtime Information", "Seat Map", "Screen", "Seat Information"}:
                    movie_title = h
                    break

            return HarvestedSeatMapSnapshot(
                showtime_id=showtime_id,
                movie_title=movie_title,
                auditorium_name=aud_name,
                screen_format=screen_fmt,
                total_rows=total_rows,
                total_cols=total_cols,
                total_seats=total_seats,
                available_seats=available_count,
                occupied_seats=occupied_count,
                seats=parsed_items,
            )

        finally:
            await page.close()

    @staticmethod
    def _resolve_auditorium_metadata(total_seats: int, headings: List[str]) -> Tuple[str, str]:
        """
        Maps physical seat capacity to known PLF auditoriums at AMC Tysons Corner 16.
        Exact architectural capacity matches:
        - 350 seats -> Auditorium 3 (IMAX with Laser)
        - 262 seats -> Auditorium 11 (Dolby Cinema)
        - 161 seats -> Auditorium 9 (Dolby Cinema)
        - 125 seats -> Auditorium 2 (4DX)
        """
        headings_text = " ".join(headings).upper()

        if total_seats == 350 or "IMAX" in headings_text:
            return "Auditorium 3 (IMAX)", "IMAX_LASER"
        elif total_seats == 262:
            return "Auditorium 11 (Dolby Cinema)", "DOLBY_CINEMA"
        elif total_seats == 161:
            return "Auditorium 9 (Dolby Cinema)", "DOLBY_CINEMA"
        elif total_seats == 125 or "4DX" in headings_text:
            return "Auditorium 2 (4DX)", "IMAX_LASER"
        elif "DOLBY" in headings_text:
            return "Dolby Cinema", "DOLBY_CINEMA"
        else:
            return "Auditorium 3 (IMAX)", "IMAX_LASER"
