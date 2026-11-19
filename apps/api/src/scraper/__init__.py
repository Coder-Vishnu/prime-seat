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

__all__ = [
    "AMCHarvester",
    "AMCHarvesterError",
    "CloudflareChallengeDetected",
    "HarvestedSeatItem",
    "HarvestedSeatMapSnapshot",
    "HarvestedShowtime",
    "StealthBrowserConfig",
    "StealthBrowserSession",
    "StealthIngressError",
]
