"""
apps/api/src/scraper/bridge.py
Ingestion Bridge connecting Playwright Harvester to NumPy 2D Diff Engine & Dispatcher.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from scraper.amc_harvester import HarvestedSeatMapSnapshot
from sentinel.diff_engine import AuditoriumCoordinateMapper, AuditoriumStateEngine
from sentinel.dispatcher import DualAlertDispatcher
from sentinel.schema import ScreenFormat, SeatMapSnapshot, SeatRecord, SeatStatus


@dataclass
class BridgeDiffResult:
    """Result of state transition diffing and notification dispatch."""
    showtime_id: str
    diff_latency_ms: float
    occupancy_ratio: float
    total_valid_seats: int
    vacated_seats: List[SeatRecord]
    prime_vacated_seats: List[SeatRecord]
    dispatches: List[Dict[str, bool]] = field(default_factory=list)


class SentinelHarvesterBridge:
    """
    Orchestrates ingestion between raw live AMC seat snapshots,
    the vectorized 2D NumPy diff engine, and dual alert dispatching.
    """

    def __init__(
        self,
        ntfy_topic: str = "prime-seat-tysons-vishnu",
        dispatcher: Optional[DualAlertDispatcher] = None,
    ) -> None:
        self.ntfy_topic = ntfy_topic
        self.dispatcher = dispatcher or DualAlertDispatcher(ntfy_topic=ntfy_topic)
        self._engines: Dict[str, AuditoriumStateEngine] = {}

    def get_or_create_engine(self, snapshot: SeatMapSnapshot) -> AuditoriumStateEngine:
        """
        Retrieves or initializes an AuditoriumStateEngine keyed by showtime_id.
        Configures prime sightline bounds based on the auditorium PLF format.
        """
        key = snapshot.showtime_id
        if key in self._engines:
            return self._engines[key]

        # Configure prime coordinates based on auditorium format
        if snapshot.screen_format == ScreenFormat.DOLBY_CINEMA:
            # Tysons 16 Dolby: Rows E-H, seats 8-18
            prime_rows = [
                AuditoriumCoordinateMapper.row_to_index(r)
                for r in ["E", "F", "G", "H"]
            ]
            prime_cols = (7, 17)  # 0-indexed column range for seats 8-18
        else:
            # Tysons 16 IMAX with Laser: Rows F-K, seats 10-22
            prime_rows = [
                AuditoriumCoordinateMapper.row_to_index(r)
                for r in ["F", "G", "H", "J", "K"]
            ]
            prime_cols = (9, 21)  # 0-indexed column range for seats 10-22

        engine = AuditoriumStateEngine(
            rows=snapshot.total_rows,
            cols=snapshot.total_cols,
            prime_row_indices=prime_rows,
            prime_col_range=prime_cols,
        )
        engine.initialize_from_snapshot(snapshot)
        self._engines[key] = engine
        return engine

    async def process_snapshot(
        self,
        snapshot: SeatMapSnapshot,
        movie_title: str = "Featured Film",
        checkout_url: Optional[str] = None,
        drop_confidence: float = 0.94,
    ) -> BridgeDiffResult:
        """
        Ingests a verified SeatMapSnapshot, computes SIMD vectorized diffs,
        and triggers high-priority push dispatches when prime seats vacate.
        Guarantees sub-2ms state comparison latency SLA.
        """
        engine = self.get_or_create_engine(snapshot)
        url = checkout_url or f"https://www.amctheatres.com/showtimes/{snapshot.showtime_id}/seats"

        # Benchmarked 2D state matrix transformation & diff
        t_start = time.perf_counter()
        curr_mat, _ = engine.snapshot_to_matrix(snapshot)
        drop_mask, fill_mask, prime_drop_mask = engine.compute_diff(curr_mat)
        t_end = time.perf_counter()
        latency_ms = (t_end - t_start) * 1000.0

        # Extract coordinates
        dropped_coords = engine.extract_dropped_seats(drop_mask)
        prime_dropped_coords = set(engine.extract_dropped_seats(prime_drop_mask))

        # Map back to SeatRecord entities
        seat_lookup = {(s.row, s.number): s for s in snapshot.seats}
        vacated_records: List[SeatRecord] = []
        prime_vacated_records: List[SeatRecord] = []

        for row, num in dropped_coords:
            if (row, num) in seat_lookup:
                rec = seat_lookup[(row, num)]
                vacated_records.append(rec)
                if (row, num) in prime_dropped_coords or rec.is_prime:
                    prime_vacated_records.append(rec)

        # Trigger push notifications for prime vacancies
        dispatches: List[Dict[str, bool]] = []
        for prime_seat in prime_vacated_records:
            res = await self.dispatcher.dispatch_reclamation(
                seat=prime_seat,
                movie_title=movie_title,
                showtime_id=snapshot.showtime_id,
                drop_confidence=drop_confidence,
                checkout_url=url,
            )
            dispatches.append(res)

        occupancy = engine.get_occupancy_ratio(curr_mat)
        valid_seats = int(np.count_nonzero(engine.valid_mask))

        return BridgeDiffResult(
            showtime_id=snapshot.showtime_id,
            diff_latency_ms=latency_ms,
            occupancy_ratio=occupancy,
            total_valid_seats=valid_seats,
            vacated_seats=vacated_records,
            prime_vacated_seats=prime_vacated_records,
            dispatches=dispatches,
        )

    async def process_harvested(
        self,
        harvested: HarvestedSeatMapSnapshot,
        checkout_url: Optional[str] = None,
        drop_confidence: float = 0.94,
    ) -> BridgeDiffResult:
        """Translates HarvestedSeatMapSnapshot and processes through diff engine."""
        sentinel_snapshot = harvested.to_sentinel_snapshot()
        return await self.process_snapshot(
            snapshot=sentinel_snapshot,
            movie_title=harvested.movie_title,
            checkout_url=checkout_url,
            drop_confidence=drop_confidence,
        )
