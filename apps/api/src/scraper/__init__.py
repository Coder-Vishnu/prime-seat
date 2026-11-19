"""
Prime Seat Scraper Package.
Playwright Stealth Ingress, AMC Showtime & Seat Harvester, and Sentinel Diff Bridge.
"""

from scraper.stealth_engine import (
    CloudflareChallengeDetected,
    StealthBrowserConfig,
    StealthBrowserSession,
    StealthIngressError,
)
from scraper.amc_harvester import (
    AMCHarvester,
    AMCHarvesterError,
    HarvestedSeatItem,
    HarvestedSeatMapSnapshot,
    HarvestedShowtime,
)
from scraper.bridge import (
    BridgeDiffResult,
    SentinelHarvesterBridge,
)

__all__ = [
    "AMCHarvester",
    "AMCHarvesterError",
    "BridgeDiffResult",
    "CloudflareChallengeDetected",
    "HarvestedSeatItem",
    "HarvestedSeatMapSnapshot",
    "HarvestedShowtime",
    "SentinelHarvesterBridge",
    "StealthBrowserConfig",
    "StealthBrowserSession",
    "StealthIngressError",
]
