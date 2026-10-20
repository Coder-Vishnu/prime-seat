"""
apps/api/src/sentinel/poller.py
Adaptive Polling Engine with Jitter & WAF Anti-Detection.
"""

from __future__ import annotations

import random
from datetime import datetime, timezone
from typing import Tuple


class AdaptivePollingPolicy:
    """Calculates dynamically scaled polling intervals based on time to showtime."""

    DORMANT_INTERVAL: float = 7200.0     # 2 hours
    BACKGROUND_INTERVAL: float = 900.0   # 15 mins
    ACCELERATED_INTERVAL: float = 120.0  # 2 mins
    CRITICAL_INTERVAL: float = 30.0      # 30 seconds

    JITTER_RATIO: float = 0.20  # +/- 20%

    @classmethod
    def calculate_interval(cls, showtime: datetime, now: datetime) -> float:
        """
        Determines the next sleep interval in seconds, injecting stochastic jitter.
        """
        delta_seconds = (showtime - now).total_seconds()

        if delta_seconds > 86400.0:  # > 24 hours
            base = cls.DORMANT_INTERVAL
        elif delta_seconds > 7200.0:  # 2h to 24h
            base = cls.BACKGROUND_INTERVAL
        elif delta_seconds > 1800.0:  # 30m to 2h
            base = cls.ACCELERATED_INTERVAL
        elif delta_seconds > 0.0:     # 0 to 30m
            base = cls.CRITICAL_INTERVAL
        else:
            return -1.0  # Showtime has started, discontinue polling

        # Apply +/- 20% randomized jitter
        jitter = random.uniform(-cls.JITTER_RATIO, cls.JITTER_RATIO)
        actual_interval = base * (1.0 + jitter)
        return max(5.0, actual_interval)
