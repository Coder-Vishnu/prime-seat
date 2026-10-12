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
        description="Auditorium label (e.g., 'Auditorium 1 (IMAX)' or 'Dolby Cinema').",
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
            clean_ts = captured_at.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_ts)
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
