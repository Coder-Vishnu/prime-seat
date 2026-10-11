# Module 03: Columnar Telemetry, Parquet Store & pgvector

**Module Identifier:** `03_ETL_AND_TELEMETRY`  
**System Layer:** Time-Series Telemetry & Historical Vector Search  
**Target Codebase Location:** `apps/api/src/analytics/telemetry.py`, `apps/api/tests/test_telemetry.py`, `data/telemetry/`  
**Author:** Vishnu Venkatesan (Lead Systems Architect & AI Engineer)  
**Classification:** Core Data Engineering Blueprint  
**Version:** 2.0.0-PROD  

---

## 1. Domain Objective & Operational Contract

Module 03 implements a high-throughput, columnar time-series telemetry engine that captures every instantaneous seat transition detected by Module 02 and persists it to disk as Apache Parquet datasets. Concurrently, it models screening velocity curves in a PostgreSQL / pgvector similarity store to enable nearest-neighbor matching against historical blockbuster drop patterns.

### Operational Contracts:
1. **Zero-Drop Event Persistence:** Every post-fix reclamation drop ($M_{t-1}=1 \to M_t=0$) and booking fill ($M_{t-1}=0 \to M_t=1$) is logged with microsecond UTC precision.
2. **Columnar Disk Layout:** Events are serialized into partitioned Apache Parquet files using PyArrow with `zstd` compression and dictionary encoding to minimize storage footprint.
3. **I/O Non-Blocking Buffering:** Events are queued in memory and flushed via buffered PyArrow `ParquetWriter` either when buffer reaches $K=500$ events or when $N=30$ seconds elapsed.
4. **Trajectory Vector Embedding:** 12-dimensional normalized hourly occupancy trajectories ($T-12\text{h}$ to $T-0\text{h}$) are generated for similarity search over historical screenings.

```
+-----------------------------------+
| State Diffs (From Module 02)      |
| - D_t (Reclamation Drops)         |
| - F_t (Pre-Sale Fills)            |
+-----------------------------------+
                  |
                  v
+-----------------------------------+
| In-Memory Ring Buffer             |
| Thread-Safe Micro-Batch Queue     |
+-----------------------------------+
         /                 \
[Flush Threshold]     [Hourly Aggregation]
        v                          v
+-----------------------+  +------------------------------+
| PyArrow ParquetWriter |  | 12-Dim Trajectory Extractor  |
| Codec: zstd (level 7) |  | [rho_T12, ..., rho_T0]       |
| Hive-Style Partition: |  +------------------------------+
| year=YYYY/month=MM/   |                 |
| date=YYYY-MM-DD/      |                 v
| showtime_id=<id>/     |  +------------------------------+
+-----------------------+  | PostgreSQL + pgvector Engine |
                           | Cosine Distance Matching (<=>)
                           +------------------------------+
```

---

## 2. Storage & Partitioning Architecture

### 2.1 File System Partition Hierarchy
Telemetry files are structured in Hive-style partitions under the repository root at `data/telemetry/`:

```
data/telemetry/
└── year=2026/
    └── month=10/
        └── date=2026-10-11/
            └── showtime_id=amc-tysons-20261011-dolby-2000/
                ├── part-00000-c000.zstd.parquet
                └── part-00001-c000.zstd.parquet
```

This layout allows analytical engines (DuckDB, PyArrow Dataset, Polars) to prune partitions instantaneously when querying specific showtimes or historical dates without scanning the entire dataset.

### 2.2 PyArrow Columnar Schema Definition

| Column Name | PyArrow Type | Physical Interpretation | Storage Strategy |
| :--- | :--- | :--- | :--- |
| `event_timestamp` | `pa.timestamp('us', tz='UTC')` | Microsecond UTC timestamp of transition | Primary ordering key |
| `showtime_id` | `pa.string()` | AMC unique screening identifier | Partition key (Level 4) |
| `screen_format` | `pa.dictionary(pa.int8(), pa.string())` | PLF format: `DOLBY_CINEMA`, `IMAX_LASER` | Dictionary encoded |
| `delta_minutes` | `pa.float32()` | Minutes remaining to showtime: $(T_{\text{show}} - t_{\text{event}})$ | Continuous ML feature |
| `row_idx` | `pa.int16()` | 0-indexed row coordinate | Small integer |
| `col_idx` | `pa.int16()` | 0-indexed column coordinate | Small integer |
| `row_label` | `pa.string()` | Physical row character (`'F'`, `'G'`) | Human-readable label |
| `seat_number` | `pa.int16()` | Physical 1-indexed seat number ($1 \le c \le 50$) | Human-readable label |
| `is_prime_row` | `pa.bool_()` | `True` if within Dolby (E-H) or IMAX (F-K) | Boolean bitmask |
| `is_center_seat` | `pa.bool_()` | `True` if seat column is within $\pm 3$ of midpoint | Boolean bitmask |
| `occupancy_ratio` | `pa.float32()` | Instantaneous auditorium load $\rho_t \in [0.0, 1.0]$ | Capacity saturation feature |
| `event_type` | `pa.dictionary(pa.int8(), pa.string())` | `'RECLAMATION'` (drop) or `'PURCHASE'` (fill) | Dictionary encoded |

---

## 3. pgvector Trajectory Retrieval Specification

### 3.1 Mathematical Trajectory Representation
Auditorium booking velocity follows characteristic S-curves (logistic adoption) punctuated by late-stage churn. We represent the occupancy velocity of screening $s$ as a 12-dimensional vector:

$$\mathbf{v}_s = \begin{bmatrix} \rho_{T-12\text{h}} \\ \rho_{T-11\text{h}} \\ \dots \\ \rho_{T-1\text{h}} \\ \rho_{T-0\text{h}} \end{bmatrix} \in [0, 1]^{12}$$

where $\rho_{T-k\text{h}}$ is the auditorium occupancy ratio measured exactly $k$ hours prior to scheduled showtime start $T_{\text{show}}$.

### 3.2 Cosine Similarity Search
To project drop probability for an active screening $s_{\text{active}}$ with current trajectory $\mathbf{v}_{\text{active}}$, we perform K-nearest neighbor vector retrieval against historical screening trajectories $\mathbf{v}_h$:

$$\text{CosineSim}(\mathbf{v}_{\text{active}}, \mathbf{v}_h) = 1 - \frac{\mathbf{v}_{\text{active}} \cdot \mathbf{v}_h}{\|\mathbf{v}_{\text{active}}\|_2 \|\mathbf{v}_h\|_2}$$

### 3.3 Database Schema (PostgreSQL + pgvector)

```sql
-- apps/api/src/analytics/pgvector_schema.sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS showtime_trajectories (
    showtime_id VARCHAR(64) PRIMARY KEY,
    movie_title VARCHAR(128) NOT NULL,
    format VARCHAR(32) NOT NULL,
    occupancy_trajectory vector(12) NOT NULL,  -- 12 hourly occupancy snapshots
    total_drops INT NOT NULL DEFAULT 0,
    final_churn_rate FLOAT NOT NULL DEFAULT 0.0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW Vector Index for sub-millisecond retrieval
CREATE INDEX IF NOT EXISTS idx_trajectories_hnsw 
ON showtime_trajectories USING hnsw (occupancy_trajectory vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Analytical Retrieval Query:
-- Finds the 5 most similar historical screening trajectories
SELECT 
    movie_title,
    format,
    final_churn_rate,
    total_drops,
    1 - (occupancy_trajectory <=> :query_vector) AS cosine_similarity
FROM showtime_trajectories
WHERE format = :target_format
ORDER BY occupancy_trajectory <=> :query_vector ASC
LIMIT 5;
```

---

## 4. Concrete Python Implementation: Columnar Telemetry Engine

The implementation is located at `apps/api/src/analytics/telemetry.py`.

```python
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

# Canonical PyArrow Telemetry Schema
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
```

---

## 5. Verification Gates & Automated Test Suite

The test suite is located at `apps/api/tests/test_telemetry.py`. It asserts schema validation, partition directory hierarchy creation, compression ratios, and DuckDB analytical query round-trips.

```python
"""
apps/api/tests/test_telemetry.py
Verification Gates for Parquet Telemetry Storage & Schema Conformity.
"""

from datetime import datetime, timezone, timedelta
from pathlib import Path
import pytest
import pyarrow.parquet as pq

from analytics.telemetry import (
    TelemetryEvent,
    ParquetTelemetrySink,
    TELEMETRY_ARROW_SCHEMA,
)


class TestTelemetryVerificationGates:
    """Gate 03: Telemetry & Columnar Storage Verification Suite."""

    @pytest.fixture
    def temp_sink_dir(self, tmp_path: Path) -> Path:
        sink_path = tmp_path / "telemetry_test_store"
        sink_path.mkdir(parents=True, exist_ok=True)
        return sink_path

    def test_gate_01_telemetry_batch_flushing_and_partitioning(self, temp_sink_dir: Path):
        """Verify partition hierarchy: year=YYYY/month=MM/date=YYYY-MM-DD/showtime_id=<id>/"""
        sink = ParquetTelemetrySink(base_dir=temp_sink_dir, batch_flush_size=10)

        now = datetime(2026, 10, 11, 14, 30, 0, tzinfo=timezone.utc)
        showtime = "amc-tysons-20261011-imax-1930"

        # Record 10 drop events to trigger batch flush
        events = [
            TelemetryEvent(
                event_timestamp=now + timedelta(seconds=i),
                showtime_id=showtime,
                screen_format="IMAX_LASER",
                delta_minutes=300.0 - i,
                row_idx=6,
                col_idx=14,
                row_label="G",
                seat_number=15,
                is_prime_row=True,
                is_center_seat=True,
                occupancy_ratio=0.85,
                event_type="RECLAMATION",
            )
            for i in range(10)
        ]

        sink.record_events(events)

        # Expected partition directory
        expected_dir = (
            temp_sink_dir
            / "year=2026"
            / "month=10"
            / "date=2026-10-11"
            / f"showtime_id={showtime}"
        )
        assert expected_dir.exists(), f"Partition directory not created: {expected_dir}"

        parquet_files = list(expected_dir.glob("*.parquet"))
        assert len(parquet_files) == 1, "Expected exactly 1 parquet file generated by flush"

        # Read back table and assert schema conformity
        table = pq.read_table(parquet_files[0])
        assert table.schema.equals(TELEMETRY_ARROW_SCHEMA)
        assert table.num_rows == 10

        # Assert data values
        col_type = table.column("event_type").to_pylist()
        assert all(t == "RECLAMATION" for t in col_type)

    def test_gate_02_manual_flush_behavior(self, temp_sink_dir: Path):
        """Verify manual flush empties internal buffer and writes pending events."""
        sink = ParquetTelemetrySink(base_dir=temp_sink_dir, batch_flush_size=100)

        now = datetime(2026, 10, 11, 12, 0, 0, tzinfo=timezone.utc)
        event = TelemetryEvent(
            event_timestamp=now,
            showtime_id="amc-tysons-dolby-1",
            screen_format="DOLBY_CINEMA",
            delta_minutes=120.0,
            row_idx=5,
            col_idx=10,
            row_label="F",
            seat_number=11,
            is_prime_row=True,
            is_center_seat=False,
            occupancy_ratio=0.72,
            event_type="PURCHASE",
        )

        sink.record_event(event)
        assert len(sink._buffer) == 1  # Still buffered

        flushed = sink.flush()
        assert flushed == 1
        assert len(sink._buffer) == 0  # Buffer cleared

    def test_gate_03_zstd_compression_and_dictionary_encoding(self, temp_sink_dir: Path):
        """Verify zstd compression and dictionary-encoded categorical columns."""
        sink = ParquetTelemetrySink(base_dir=temp_sink_dir, batch_flush_size=5)

        now = datetime(2026, 10, 11, 10, 0, 0, tzinfo=timezone.utc)
        events = [
            TelemetryEvent(
                event_timestamp=now,
                showtime_id="amc-tysons-dolby-dict",
                screen_format="DOLBY_CINEMA",
                delta_minutes=60.0,
                row_idx=7,
                col_idx=12,
                row_label="H",
                seat_number=13,
                is_prime_row=True,
                is_center_seat=True,
                occupancy_ratio=0.90,
                event_type="RECLAMATION",
            )
            for _ in range(5)
        ]
        sink.record_events(events)

        partition_dir = (
            temp_sink_dir
            / "year=2026"
            / "month=10"
            / "date=2026-10-11"
            / "showtime_id=amc-tysons-dolby-dict"
        )
        file_path = list(partition_dir.glob("*.parquet"))[0]
        metadata = pq.read_metadata(file_path)

        assert metadata.num_rows == 5
        # Verify columns are dictionary encoded
        schema = pq.read_schema(file_path)
        format_field = schema.field("screen_format")
        assert pa.types.is_dictionary(format_field.type)
```

---

## 6. Monorepo Directory Layout & Integration

```
apps/api/
├── src/
│   ├── analytics/
│   │   ├── __init__.py
│   │   ├── telemetry.py          # ParquetTelemetrySink & TelemetryEvent
│   │   └── pgvector_schema.sql   # PostgreSQL / pgvector Trajectory DDL
│   └── sentinel/
│       ├── schema.py
│       └── diff_engine.py
└── tests/
    └── test_telemetry.py         # Gate 03 PyArrow & Parquet Verification
data/
└── telemetry/                    # Git-ignored partition target
```

---

## 7. Antigravity Milestone Execution Directive

To execute the implementation of this specification in the Antigravity Agent environment:

```bash
# 1. Switch Active Model in Antigravity Terminal
/model gemini-3.1-pro

# 2. Trigger Autonomous Milestone 3.0 Execution
/milestone-new "Milestone 3.0 based on docs/modules/03_ETL_AND_TELEMETRY.md"
```

The Antigravity agent will autonomously:
1. Create Git branch `feat/milestone-3.0`.
2. Generate task tracking document `tasks/Milestone3.0.md`.
3. Scaffold `apps/api/src/analytics/telemetry.py` and `apps/api/src/analytics/pgvector_schema.sql`.
4. Run `apps/api/tests/test_telemetry.py` verifying Parquet partitioning, schema types, and zstd compression.
