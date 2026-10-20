"""
apps/api/src/analytics/telemetry.py
Columnar Event Telemetry Engine with PyArrow & Parquet Persistence.
"""

from __future__ import annotations

import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import pyarrow as pa
import pyarrow.parquet as pq

# ---------------------------------------------------------------------------
# Canonical PyArrow Telemetry Schema
# ---------------------------------------------------------------------------
# Dictionary-encoded categoricals (screen_format, event_type) minimize
# per-row storage overhead.  Microsecond UTC timestamps provide sub-ms
# event ordering across concurrent auditorium streams.

TELEMETRY_ARROW_SCHEMA = pa.schema([
    pa.field("event_timestamp", pa.timestamp("us", tz="UTC"), nullable=False),
    pa.field("showtime_id", pa.string(), nullable=False),
    pa.field("screen_format", pa.dictionary(pa.int8(), pa.string()), nullable=False),
    pa.field("delta_minutes", pa.float32(), nullable=False),
    pa.field("row_idx", pa.int16(), nullable=False),
    pa.field("col_idx", pa.int16(), nullable=False),
    pa.field("row_label", pa.string(), nullable=False),
    pa.field("seat_number", pa.int16(), nullable=False),
    pa.field("is_prime_row", pa.bool_(), nullable=False),
    pa.field("is_center_seat", pa.bool_(), nullable=False),
    pa.field("occupancy_ratio", pa.float32(), nullable=False),
    pa.field("event_type", pa.dictionary(pa.int8(), pa.string()), nullable=False),
])


# ---------------------------------------------------------------------------
# TelemetryEvent: Zero-Overhead Memory Structure
# ---------------------------------------------------------------------------

class TelemetryEvent:
    """Strongly-typed memory structure for a single seat transition event."""

    __slots__ = (
        "event_timestamp",
        "showtime_id",
        "screen_format",
        "delta_minutes",
        "row_idx",
        "col_idx",
        "row_label",
        "seat_number",
        "is_prime_row",
        "is_center_seat",
        "occupancy_ratio",
        "event_type",
    )

    def __init__(
        self,
        event_timestamp: datetime,
        showtime_id: str,
        screen_format: str,
        delta_minutes: float,
        row_idx: int,
        col_idx: int,
        row_label: str,
        seat_number: int,
        is_prime_row: bool,
        is_center_seat: bool,
        occupancy_ratio: float,
        event_type: str,
    ):
        self.event_timestamp = (
            event_timestamp.astimezone(timezone.utc)
            if event_timestamp.tzinfo
            else event_timestamp.replace(tzinfo=timezone.utc)
        )
        self.showtime_id = showtime_id
        self.screen_format = screen_format
        self.delta_minutes = float(delta_minutes)
        self.row_idx = int(row_idx)
        self.col_idx = int(col_idx)
        self.row_label = row_label
        self.seat_number = int(seat_number)
        self.is_prime_row = bool(is_prime_row)
        self.is_center_seat = bool(is_center_seat)
        self.occupancy_ratio = float(occupancy_ratio)
        self.event_type = event_type


# ---------------------------------------------------------------------------
# ParquetTelemetrySink: Thread-Safe Buffered Writer
# ---------------------------------------------------------------------------

class ParquetTelemetrySink:
    """
    Thread-safe, micro-batched Parquet telemetry writer.
    Partitions output datasets into Hive-style hierarchy with zstd compression.
    """

    def __init__(
        self,
        base_dir: str | Path = "data/telemetry",
        batch_flush_size: int = 500,
    ):
        self.base_dir = Path(base_dir)
        self.batch_flush_size = batch_flush_size
        self._buffer: List[TelemetryEvent] = []
        self._lock = threading.Lock()

    def record_event(self, event: TelemetryEvent) -> None:
        """Appends event to memory buffer and flushes if batch threshold reached."""
        with self._lock:
            self._buffer.append(event)
            if len(self._buffer) >= self.batch_flush_size:
                self._flush_locked()

    def record_events(self, events: List[TelemetryEvent]) -> None:
        """Micro-batch ingestion of multiple seat events."""
        with self._lock:
            self._buffer.extend(events)
            if len(self._buffer) >= self.batch_flush_size:
                self._flush_locked()

    def flush(self) -> int:
        """Manual trigger to flush all buffered events to disk."""
        with self._lock:
            return self._flush_locked()

    def _flush_locked(self) -> int:
        """Internal un-synchronized flush routine."""
        if not self._buffer:
            return 0

        flushed_count = len(self._buffer)
        events_to_write = list(self._buffer)
        self._buffer.clear()

        # Group events by partition: (year, month, date, showtime_id)
        partition_groups: Dict[Tuple[int, int, str, str], List[TelemetryEvent]] = {}
        for ev in events_to_write:
            dt = ev.event_timestamp
            key = (dt.year, dt.month, dt.strftime("%Y-%m-%d"), ev.showtime_id)
            if key not in partition_groups:
                partition_groups[key] = []
            partition_groups[key].append(ev)

        # Write each partition group to Parquet
        for (year, month, date_str, showtime_id), group_events in partition_groups.items():
            partition_path = (
                self.base_dir
                / f"year={year}"
                / f"month={month:02d}"
                / f"date={date_str}"
                / f"showtime_id={showtime_id}"
            )
            partition_path.mkdir(parents=True, exist_ok=True)

            timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
            file_name = f"telemetry_{timestamp_str}.zstd.parquet"
            target_file = partition_path / file_name

            arrow_table = self._build_arrow_table(group_events)
            pq.write_table(
                arrow_table,
                target_file,
                compression="zstd",
                compression_level=7,
                use_dictionary=["screen_format", "event_type"],
            )

        return flushed_count

    @staticmethod
    def _build_arrow_table(events: List[TelemetryEvent]) -> pa.Table:
        """Converts in-memory TelemetryEvent objects into a PyArrow Table."""
        pydict = {
            "event_timestamp": [e.event_timestamp for e in events],
            "showtime_id": [e.showtime_id for e in events],
            "screen_format": [e.screen_format for e in events],
            "delta_minutes": [e.delta_minutes for e in events],
            "row_idx": [e.row_idx for e in events],
            "col_idx": [e.col_idx for e in events],
            "row_label": [e.row_label for e in events],
            "seat_number": [e.seat_number for e in events],
            "is_prime_row": [e.is_prime_row for e in events],
            "is_center_seat": [e.is_center_seat for e in events],
            "occupancy_ratio": [e.occupancy_ratio for e in events],
            "event_type": [e.event_type for e in events],
        }
        return pa.Table.from_pydict(pydict, schema=TELEMETRY_ARROW_SCHEMA)
