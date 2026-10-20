"""
sentinel - AMC Tysons 16 Seat Sentinel / Prime Seat Ingestion Engine.
"""

from sentinel.schema import (
    SeatStatus,
    SeatType,
    ScreenFormat,
    SeatRecord,
    SeatMapSnapshot,
    SchemaValidationError,
    parse_raw_amc_payload,
    is_tysons_prime_seat,
)
from sentinel.diff_engine import (
    CoordinateMappingError,
    AuditoriumCoordinateMapper,
    AuditoriumStateEngine,
)
from sentinel.poller import (
    AdaptivePollingPolicy,
)
from sentinel.dispatcher import (
    SSEConnectionManager,
    sse_manager,
    DualAlertDispatcher,
)

__all__ = [
    "SeatStatus",
    "SeatType",
    "ScreenFormat",
    "SeatRecord",
    "SeatMapSnapshot",
    "SchemaValidationError",
    "parse_raw_amc_payload",
    "is_tysons_prime_seat",
    "CoordinateMappingError",
    "AuditoriumCoordinateMapper",
    "AuditoriumStateEngine",
    "AdaptivePollingPolicy",
    "SSEConnectionManager",
    "sse_manager",
    "DualAlertDispatcher",
]

