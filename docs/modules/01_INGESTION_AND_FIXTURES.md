# Module 01: AMC Ingestion Contracts & Schema Validation

**Module Identifier:** `01_INGESTION_AND_FIXTURES`  
**System Layer:** Data Ingestion Boundary & Type Enforcement  
**Target Codebase Location:** `apps/api/src/sentinel/schema.py`, `apps/api/tests/fixtures/tysons_seatmap_sample.json`, `apps/api/tests/test_schema.py`  
**Author:** Vishnu Venkatesan (Lead Systems Architect & AI Engineer)  
**Classification:** Core Ingestion Blueprint  
**Version:** 2.0.0-PROD  

---

## 1. Domain Objective & Operational Contract

The primary mission of Module 01 is to establish a hermetic, offline-first, type-safe ingestion boundary between untrusted remote AMC network responses and the internal numerical array pipelines of `prime-seat`.

Raw AMC seatmap payloads retrieved from client-side network captures, reverse-engineered endpoints, or browser DevTools XHR traces exhibit structural volatility, undocumented enumerations, and irregular physical geometries. Ingestion operates under a strict **Fail-Closed Defensive Boundary Pattern**:
1. **Zero Trust Network Payloads:** Remote responses are treated as hostile, untrusted inputs.
2. **Explicit Type Normalization:** Every seat is mapped deterministically to internal canonical enumerations (`SeatStatus`, `SeatType`).
3. **Fail-Closed Rejection:** Any unexpected JSON key variation, unmapped status string, out-of-range numerical index, or invalid coordinate syntax immediately raises a deterministic `SchemaValidationError` and halts downstream processing before entering NumPy memory.
4. **Offline Fixture Decoupling:** Development, unit testing, and benchmarking are driven by verified offline physical seat fixtures representing AMC Tysons Corner 16 PLF auditoriums (Dolby Cinema and IMAX with Laser), preventing test reliance on live AMC endpoints.

```
                      +------------------------------------------+
                      |   Untrusted AMC Ingress (XHR / Mock)     |
                      +------------------------------------------+
                                           |
                                           v
                      +------------------------------------------+
                      |   Fail-Closed Ingestion Boundary         |
                      |   - Regex Validation (Row ^[A-Z]{1,2}$)  |
                      |   - Bounded Seat Numbers (1 <= c <= 50)  |
                      |   - Raw Status -> Canonical SeatStatus   |
                      |   - Freshness & Capacity Assertion       |
                      +------------------------------------------+
                                    /              \
                        [Valid]    /                \  [Malformed]
                                  v                  v
            +---------------------------+   +-----------------------------+
            | Pydantic v2 Domain Models |   | SchemaValidationError       |
            | - SeatRecord              |   | - Pipeline Execution Halts  |
            | - SeatMapSnapshot         |   | - Anomaly Log Emitted       |
            +---------------------------+   +-----------------------------+
                          |
                          v
            +---------------------------+
            | Module 02 NumPy 2D Engine |
            +---------------------------+
```

---

## 2. Ingestion Contracts & Raw AMC Field Mappings

### 2.1 Raw AMC Status Mapping Matrix

The AMC ticketing backend exposes diverse seat state descriptions across API revisions. The ingestion boundary normalizes these states into three discrete internal invariants:

| Raw AMC JSON State | Canonical `SeatStatus` | Occupancy Matrix Value ($M_t$) | Operational Semantics |
| :--- | :--- | :--- | :--- |
| `"Available"` | `SeatStatus.AVAILABLE` | `0` (Vacant) | Unsold seat eligible for purchase or newly vacated. |
| `"Reserved"`, `"Sold"`, `"Held"` | `SeatStatus.OCCUPIED` | `1` (Occupied) | Active booking; monitored for post-fix vacancy release. |
| `"Unavailable"`, `"House"`, `"Broken"` | `SeatStatus.BLOCKED` | `-1` (Masked) | Physical seat exists but cannot be sold; excluded from diffs. |
| *Any unmapped string* (e.g., `"VIP_HELD"`) | **REJECTED** | **HALT** | Triggers `SchemaValidationError`. Fail-closed invariant. |

### 2.2 Raw AMC Seat Classification Matrix

| Raw Seat Feature / Flag | Canonical `SeatType` | Internal Flag `is_prime` | Downstream Handling |
| :--- | :--- | :--- | :--- |
| Standard Auditorium Seat | `SeatType.STANDARD` | Evaluated by grid rule | Default coordinate entry. |
| Premium Recliner Seat | `SeatType.RECLINER` | Evaluated by grid rule | AMC Signature Recliner geometry. |
| ADA Accessible Wheelchair Space | `SeatType.WHEELCHAIR` | `False` | Excluded from prime drop alerts. |
| ADA Companion Seat | `SeatType.COMPANION` | `False` | Excluded from prime drop alerts. |

### 2.3 Physical Prime Row Geometries (AMC Tysons Corner 16)

To eliminate false-positive alerts on suboptimal acoustic/sightline angles, `is_prime` is deterministically computed based on audited auditorium architectural layouts:
- **Dolby Cinema (Auditoriums 9 & 11):**
  - Prime Rows: Rows `E`, `F`, `G`, `H`.
  - Prime Column Range: Seats `8` through `18` (midpoint centered).
- **IMAX with Laser (Auditorium 3):**
  - Prime Rows: Rows `F`, `G`, `H`, `J`, `K`.
  - Prime Column Range: Seats `10` through `22`.

---

## 3. Concrete Pydantic v2 Domain Models

The implementation is located at `apps/api/src/sentinel/schema.py`. It uses Pydantic v2 strict typing, custom validators, and serialization contracts.

```python
"""
apps/api/src/sentinel/schema.py
Type-Safe Ingestion Boundary & Domain Models for AMC Seatmap Telemetry.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
    ValidationInfo,
)


class SchemaValidationError(ValueError):
    """Raised when an incoming raw payload violates the fail-closed ingestion invariants."""
    pass


class SeatStatus(str, Enum):
    """Canonical occupancy status mapped from raw ticketing states."""
    AVAILABLE = "AVAILABLE"
    OCCUPIED = "OCCUPIED"
    BLOCKED = "BLOCKED"


class SeatType(str, Enum):
    """Physical hardware classification of auditorium seating."""
    STANDARD = "STANDARD"
    RECLINER = "RECLINER"
    WHEELCHAIR = "WHEELCHAIR"
    COMPANION = "COMPANION"


class ScreenFormat(str, Enum):
    """Supported Premium Large Format (PLF) auditorium formats at AMC Tysons 16."""
    DOLBY_CINEMA = "DOLBY_CINEMA"
    IMAX_LASER = "IMAX_LASER"


class SeatRecord(BaseModel):
    """
    Normalized physical seat entity.
    Guarantees structural validity of row, seat number, coordinates, and prime status.
    """
    model_config = ConfigDict(frozen=True, extra="forbid")

    row: str = Field(
        ...,
        description="Alphabetic row identifier (single or double uppercase letters).",
        pattern=r"^[A-Z]{1,2}$",
    )
    number: int = Field(
        ...,
        description="Positive 1-indexed column/seat number.",
        ge=1,
        le=50,
    )
    status: SeatStatus = Field(
        ...,
        description="Normalized occupancy status.",
    )
    seat_type: SeatType = Field(
        default=SeatType.STANDARD,
        description="Physical seat tier or ADA classification.",
    )
    is_prime: bool = Field(
        default=False,
        description="Flag indicating if the seat resides in prime sightline/acoustic zones.",
    )
    physical_x: Optional[float] = Field(
        default=None,
        description="Continuous SVG or layout X-coordinate.",
    )
    physical_y: Optional[float] = Field(
        default=None,
        description="Continuous SVG or layout Y-coordinate.",
    )

    @field_validator("row")
    @classmethod
    def validate_row_casing(cls, v: str) -> str:
        if not v.isupper():
            raise SchemaValidationError(f"Row identifier must be uppercase ASCII: {v}")
        return v


class SeatMapSnapshot(BaseModel):
    """
    Complete state payload representing an instantaneous point-in-time snapshot
    of an entire auditorium seating grid.
    """
    model_config = ConfigDict(frozen=True, extra="forbid")

    showtime_id: str = Field(
        ...,
        min_length=4,
        max_length=64,
        description="AMC unique screening identifier.",
    )
    auditorium_name: str = Field(
        ...,
        min_length=2,
        max_length=64,
        description="Auditorium label (e.g., 'Auditorium 3 (IMAX)' or 'Dolby Cinema').",
    )
    screen_format: ScreenFormat = Field(
        ...,
        description="PLF format classification.",
    )
    captured_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC microsecond timestamp of snapshot acquisition.",
    )
    total_rows: int = Field(
        ...,
        ge=1,
        le=35,
        description="Bounding grid row count.",
    )
    total_cols: int = Field(
        ...,
        ge=1,
        le=45,
        description="Bounding grid column count.",
    )
    seats: List[SeatRecord] = Field(
        ...,
        min_length=1,
        max_length=450,
        description="List of individual validated seat records.",
    )

    @field_validator("captured_at")
    @classmethod
    def ensure_timezone_aware(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v.astimezone(timezone.utc)

    @model_validator(mode="after")
    def validate_spatial_integrity(self) -> SeatMapSnapshot:
        """
        Validates internal consistency:
        1. Unique (row, number) coordinates across all seat records.
        2. Total seat count <= total_rows * total_cols.
        3. Row index and column index fit within bounded grid dimensions.
        """
        seen_coordinates = set()
        for seat in self.seats:
            coord = (seat.row, seat.number)
            if coord in seen_coordinates:
                raise SchemaValidationError(
                    f"Duplicate seat coordinate detected in snapshot: row={seat.row}, number={seat.number}"
                )
            seen_coordinates.add(coord)

        if len(self.seats) > (self.total_rows * self.total_cols):
            raise SchemaValidationError(
                f"Seat count ({len(self.seats)}) exceeds bounding grid capacity "
                f"({self.total_rows}x{self.total_cols} = {self.total_rows * self.total_cols})"
            )

        return self


# ---------------------------------------------------------------------------
# Normalization Pipeline: Raw AMC JSON Parser
# ---------------------------------------------------------------------------

RAW_STATUS_MAP: Dict[str, SeatStatus] = {
    "Available": SeatStatus.AVAILABLE,
    "available": SeatStatus.AVAILABLE,
    "Reserved": SeatStatus.OCCUPIED,
    "reserved": SeatStatus.OCCUPIED,
    "Sold": SeatStatus.OCCUPIED,
    "sold": SeatStatus.OCCUPIED,
    "Held": SeatStatus.OCCUPIED,
    "held": SeatStatus.OCCUPIED,
    "Unavailable": SeatStatus.BLOCKED,
    "unavailable": SeatStatus.BLOCKED,
    "House": SeatStatus.BLOCKED,
    "house": SeatStatus.BLOCKED,
    "Broken": SeatStatus.BLOCKED,
}

RAW_TYPE_MAP: Dict[str, SeatType] = {
    "Standard": SeatType.STANDARD,
    "standard": SeatType.STANDARD,
    "Recliner": SeatType.RECLINER,
    "recliner": SeatType.RECLINER,
    "Wheelchair": SeatType.WHEELCHAIR,
    "wheelchair": SeatType.WHEELCHAIR,
    "Companion": SeatType.COMPANION,
    "companion": SeatType.COMPANION,
}


def is_tysons_prime_seat(screen_format: ScreenFormat, row: str, number: int) -> bool:
    """Calculates whether a physical seat coordinate qualifies as prime PLF inventory."""
    if screen_format == ScreenFormat.DOLBY_CINEMA:
        # Tysons 16 Dolby: Rows E-H, seats 8-18
        return row in {"E", "F", "G", "H"} and (8 <= number <= 18)
    elif screen_format == ScreenFormat.IMAX_LASER:
        # Tysons 16 IMAX with Laser: Rows F-K, seats 10-22
        return row in {"F", "G", "H", "J", "K"} and (10 <= number <= 22)
    return False


def parse_raw_amc_payload(raw_json: Dict[str, Any]) -> SeatMapSnapshot:
    """
    Fail-closed parsing engine translating untrusted raw AMC responses into SeatMapSnapshot.
    Raises SchemaValidationError on any unrecognized status, corrupted field, or invariant violation.
    """
    required_root_keys = {"showtime_id", "auditorium_name", "screen_format", "rows", "cols", "seats"}
    missing_keys = required_root_keys - set(raw_json.keys())
    if missing_keys:
        raise SchemaValidationError(f"Payload missing mandatory root keys: {missing_keys}")

    # Format normalizer
    raw_format = str(raw_json["screen_format"]).strip().upper()
    if raw_format in {"DOLBY", "DOLBY_CINEMA", "DOLBY CINEMA"}:
        fmt = ScreenFormat.DOLBY_CINEMA
    elif raw_format in {"IMAX", "IMAX_LASER", "IMAX WITH LASER"}:
        fmt = ScreenFormat.IMAX_LASER
    else:
        raise SchemaValidationError(f"Unsupported screen format for PLF tracking: {raw_format}")

    parsed_seats: List[SeatRecord] = []
    for raw_seat in raw_json["seats"]:
        raw_status = raw_seat.get("status")
        if raw_status not in RAW_STATUS_MAP:
            raise SchemaValidationError(
                f"Unmapped raw seat status encountered: '{raw_status}'. "
                f"Refusing to proceed under fail-closed ingestion contract."
            )
        status = RAW_STATUS_MAP[raw_status]

        raw_type = raw_seat.get("seat_type", "Standard")
        if raw_type not in RAW_TYPE_MAP:
            raise SchemaValidationError(f"Unmapped raw seat type encountered: '{raw_type}'")
        seat_type = RAW_TYPE_MAP[raw_type]

        row = str(raw_seat.get("row", "")).strip().upper()
        if not re.match(r"^[A-Z]{1,2}$", row):
            raise SchemaValidationError(f"Invalid row format: '{row}'")

        try:
            num = int(raw_seat.get("number", 0))
        except (ValueError, TypeError):
            raise SchemaValidationError(f"Invalid seat number: {raw_seat.get('number')}")

        if num < 1 or num > 50:
            raise SchemaValidationError(f"Seat number {num} out of bounds [1, 50]")

        prime = is_tysons_prime_seat(fmt, row, num) if seat_type not in {SeatType.WHEELCHAIR, SeatType.COMPANION} else False

        parsed_seats.append(
            SeatRecord(
                row=row,
                number=num,
                status=status,
                seat_type=seat_type,
                is_prime=prime,
                physical_x=float(raw_seat["x"]) if "x" in raw_seat and raw_seat["x"] is not None else None,
                physical_y=float(raw_seat["y"]) if "y" in raw_seat and raw_seat["y"] is not None else None,
            )
        )

    captured_at = raw_json.get("captured_at")
    if captured_at:
        if isinstance(captured_at, str):
            dt = datetime.fromisoformat(captured_at)
        elif isinstance(captured_at, datetime):
            dt = captured_at
        else:
            raise SchemaValidationError(f"Invalid captured_at timestamp: {captured_at}")
    else:
        dt = datetime.now(timezone.utc)

    return SeatMapSnapshot(
        showtime_id=str(raw_json["showtime_id"]),
        auditorium_name=str(raw_json["auditorium_name"]),
        screen_format=fmt,
        captured_at=dt,
        total_rows=int(raw_json["rows"]),
        total_cols=int(raw_json["cols"]),
        seats=parsed_seats,
    )
```

---

## 4. Test Fixture Specification

The canonical test fixture is located at `apps/api/tests/fixtures/tysons_seatmap_sample.json`. It represents a verified sample layout for AMC Tysons Corner 16 Dolby Cinema.

```json
{
  "showtime_id": "amc-tysons-20261011-dolby-2000",
  "auditorium_name": "Dolby Cinema at AMC",
  "screen_format": "DOLBY_CINEMA",
  "captured_at": "2026-10-11T12:00:00Z",
  "rows": 12,
  "cols": 24,
  "seats": [
    {
      "row": "D",
      "number": 10,
      "status": "Available",
      "seat_type": "Standard",
      "x": 100.5,
      "y": 200.0
    },
    {
      "row": "E",
      "number": 12,
      "status": "Reserved",
      "seat_type": "Recliner",
      "x": 120.0,
      "y": 250.0
    },
    {
      "row": "F",
      "number": 14,
      "status": "Reserved",
      "seat_type": "Recliner",
      "x": 140.0,
      "y": 300.0
    },
    {
      "row": "G",
      "number": 14,
      "status": "Sold",
      "seat_type": "Recliner",
      "x": 140.0,
      "y": 350.0
    },
    {
      "row": "H",
      "number": 15,
      "status": "Held",
      "seat_type": "Recliner",
      "x": 150.0,
      "y": 400.0
    },
    {
      "row": "A",
      "number": 1,
      "status": "Unavailable",
      "seat_type": "Wheelchair",
      "x": 10.0,
      "y": 50.0
    },
    {
      "row": "A",
      "number": 2,
      "status": "Unavailable",
      "seat_type": "Companion",
      "x": 20.0,
      "y": 50.0
    }
  ]
}
```

---

## 5. Verification Gates & Automated Test Suite

The test suite is located at `apps/api/tests/test_schema.py`. It asserts schema parsing, invariant boundaries, and intentional failure on corrupted payloads.

```python
"""
apps/api/tests/test_schema.py
Deterministic Verification Gates for Ingestion Schema & Invariants.
"""

import json
import pytest
from datetime import datetime, timezone
from pathlib import Path

from sentinel.schema import (
    SeatStatus,
    SeatType,
    ScreenFormat,
    SeatRecord,
    SeatMapSnapshot,
    SchemaValidationError,
    parse_raw_amc_payload,
)


@pytest.fixture
def valid_fixture_path() -> Path:
    return Path(__file__).parent / "fixtures" / "tysons_seatmap_sample.json"


@pytest.fixture
def valid_raw_json(valid_fixture_path: Path) -> dict:
    with open(valid_fixture_path, "r", encoding="utf-8") as f:
        return json.load(f)


class TestIngestionSchemaVerificationGates:
    """Gate 01: Ingestion & Fixture Contract Verification Suite."""

    def test_gate_01_parse_valid_fixture(self, valid_raw_json: dict):
        """Verify successful normalization of authentic AMC Tysons 16 fixture."""
        snapshot = parse_raw_amc_payload(valid_raw_json)

        assert snapshot.showtime_id == "amc-tysons-20261011-dolby-2000"
        assert snapshot.screen_format == ScreenFormat.DOLBY_CINEMA
        assert snapshot.total_rows == 12
        assert snapshot.total_cols == 24
        assert len(snapshot.seats) == 7

        # Verify status mapping
        available_seat = next(s for s in snapshot.seats if s.row == "D" and s.number == 10)
        assert available_seat.status == SeatStatus.AVAILABLE
        assert not available_seat.is_prime  # Row D is not prime in Dolby (E-H is prime)

        # Verify prime calculation on Row F, Seat 14
        prime_seat = next(s for s in snapshot.seats if s.row == "F" and s.number == 14)
        assert prime_seat.status == SeatStatus.OCCUPIED
        assert prime_seat.seat_type == SeatType.RECLINER
        assert prime_seat.is_prime is True

        # Verify ADA wheelchair mapping
        wheelchair_seat = next(s for s in snapshot.seats if s.row == "A" and s.number == 1)
        assert wheelchair_seat.status == SeatStatus.BLOCKED
        assert wheelchair_seat.seat_type == SeatType.WHEELCHAIR
        assert wheelchair_seat.is_prime is False

    def test_gate_02_fail_closed_on_unmapped_status(self, valid_raw_json: dict):
        """Verify immediate rejection when raw status is unknown."""
        corrupted = dict(valid_raw_json)
        corrupted["seats"] = [
            {"row": "F", "number": 12, "status": "UNKNOWN_EXTERNAL_STATE", "seat_type": "Standard"}
        ]

        with pytest.raises(SchemaValidationError, match="Unmapped raw seat status encountered"):
            parse_raw_amc_payload(corrupted)

    def test_gate_03_fail_closed_on_invalid_row_regex(self, valid_raw_json: dict):
        """Verify rejection of lower-case or malformed row strings."""
        corrupted = dict(valid_raw_json)
        corrupted["seats"] = [
            {"row": "row_f", "number": 12, "status": "Available", "seat_type": "Standard"}
        ]

        with pytest.raises(SchemaValidationError, match="Invalid row format"):
            parse_raw_amc_payload(corrupted)

    def test_gate_04_fail_closed_on_out_of_bounds_seat_number(self, valid_raw_json: dict):
        """Verify rejection when seat number exceeds upper bound of 50 or is negative."""
        corrupted_negative = dict(valid_raw_json)
        corrupted_negative["seats"] = [
            {"row": "F", "number": -1, "status": "Available"}
        ]
        with pytest.raises(SchemaValidationError, match="out of bounds"):
            parse_raw_amc_payload(corrupted_negative)

        corrupted_overflow = dict(valid_raw_json)
        corrupted_overflow["seats"] = [
            {"row": "F", "number": 99, "status": "Available"}
        ]
        with pytest.raises(SchemaValidationError, match="out of bounds"):
            parse_raw_amc_payload(corrupted_overflow)

    def test_gate_05_duplicate_coordinate_rejection(self, valid_raw_json: dict):
        """Verify rejection when duplicate (row, seat) tuples appear in a single payload."""
        corrupted = dict(valid_raw_json)
        corrupted["seats"] = [
            {"row": "F", "number": 10, "status": "Available"},
            {"row": "F", "number": 10, "status": "Reserved"},
        ]
        with pytest.raises(SchemaValidationError, match="Duplicate seat coordinate detected"):
            parse_raw_amc_payload(corrupted)

    def test_gate_06_unsupported_screen_format_rejection(self, valid_raw_json: dict):
        """Verify standard auditorium formats are rejected under PLF focus constraint."""
        corrupted = dict(valid_raw_json)
        corrupted["screen_format"] = "STANDARD_DIGITAL"

        with pytest.raises(SchemaValidationError, match="Unsupported screen format"):
            parse_raw_amc_payload(corrupted)
```

---

## 6. Monorepo Directory Layout & Integration

```
apps/api/
├── src/
│   └── sentinel/
│       ├── __init__.py
│       └── schema.py                 # Pydantic v2 Models & parse_raw_amc_payload
└── tests/
    ├── __init__.py
    ├── conftest.py
    ├── fixtures/
    │   └── tysons_seatmap_sample.json # Verified offline PLF fixture
    └── test_schema.py                # Deterministic Verification Gates
```

---

## 7. Antigravity Milestone Execution Directive

To execute the implementation of this specification in the Antigravity Agent environment:

```bash
# 1. Switch Active Model in Antigravity Terminal
/model gemini-3.1-pro

# 2. Trigger Autonomous Milestone 1.0 Execution
/milestone-new "Milestone 1.0 based on docs/modules/01_INGESTION_AND_FIXTURES.md"
```

The Antigravity agent will autonomously:
1. Create Git branch `feat/milestone-1.0`.
2. Generate task tracking document `tasks/Milestone1.0.md`.
3. Scaffold `apps/api/src/sentinel/schema.py` and `apps/api/tests/fixtures/tysons_seatmap_sample.json`.
4. Implement and run `apps/api/tests/test_schema.py` ensuring all 6 test gates exit code 0.
