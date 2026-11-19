"""
apps/api/src/scraper/stealth_engine.py
Playwright Stealth Ingress Engine & Cloudflare Clearance Handler.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from playwright.async_api import (
    Browser,
    BrowserContext,
    Page,
    Response,
    async_playwright,
)
from playwright_stealth import Stealth


class StealthIngressError(Exception):
    """Base exception for stealth ingress operations."""
    pass


class CloudflareChallengeDetected(StealthIngressError):
    """
    Raised when a WAF anti-bot challenge (e.g. Cloudflare Turnstile, Managed Challenge)
    is detected on the target page. Fail-closed defense boundary.
    """
    pass


@dataclass
class StealthBrowserConfig:
    """Configuration parameters for the Playwright stealth browser."""
    headless: bool = True
    user_agent: str = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
    viewport_width: int = 1920
    viewport_height: int = 1080
    timeout_ms: int = 35000
    locale: str = "en-US"
    timezone_id: str = "America/New_York"
    extra_headers: Dict[str, str] = field(
        default_factory=lambda: {
            "Accept": (
                "text/html,application/xhtml+xml,application/xml;q=0.9,"
                "image/avif,image/webp,image/apng,*/*;q=0.8"
            ),
            "Accept-Language": "en-US,en;q=0.9",
            "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
        }
    )


class StealthBrowserSession:
    """
    Asynchronous session manager managing Playwright Chromium instances
    hardened with browser fingerprint evasion techniques.
    """

    def __init__(self, config: Optional[StealthBrowserConfig] = None) -> None:
        self.config = config or StealthBrowserConfig()
        self._stealth = Stealth()
        self._playwright_cm: Any = None
        self._playwright: Any = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None

    async def __aenter__(self) -> StealthBrowserSession:
        await self.start()
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.close()

    async def start(self) -> None:
        """Launches the instrumented Chromium browser and stealth context."""
        if self._browser is not None:
            return

        self._playwright_cm = self._stealth.use_async(async_playwright())
        self._playwright = await self._playwright_cm.__aenter__()

        self._browser = await self._playwright.chromium.launch(
            headless=self.config.headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-infobars",
                "--window-position=0,0",
                f"--window-size={self.config.viewport_width},{self.config.viewport_height}",
            ],
        )

        self._context = await self._browser.new_context(
            user_agent=self.config.user_agent,
            viewport={
                "width": self.config.viewport_width,
                "height": self.config.viewport_height,
            },
            locale=self.config.locale,
            timezone_id=self.config.timezone_id,
            extra_http_headers=self.config.extra_headers,
        )

    async def new_page(self) -> Page:
        """Creates and returns a new page within the stealth context."""
        if self._context is None:
            raise StealthIngressError("StealthBrowserSession is not started. Use 'async with' or call start().")
        page = await self._context.new_page()
        return page

    async def navigate_with_clearance(
        self,
        page: Page,
        url: str,
        wait_until: str = "domcontentloaded",
        settle_ms: int = 3000,
    ) -> Response:
        """
        Navigates to the specified URL, verifies HTTP status, and conducts
        defensive checks against Cloudflare/WAF challenge gates.
        """
        try:
            response = await page.goto(
                url,
                wait_until=wait_until,
                timeout=self.config.timeout_ms,
            )
        except Exception as exc:
            raise StealthIngressError(f"Navigation to {url} failed: {exc}") from exc

        if response is None:
            raise StealthIngressError(f"Navigation to {url} returned no response object.")

        if settle_ms > 0:
            await page.wait_for_timeout(settle_ms)

        # WAF Challenge Detection Gate
        is_challenge, reason = await self.detect_waf_challenge(page)
        if is_challenge:
            raise CloudflareChallengeDetected(
                f"Defensive fail-safe: Cloudflare challenge detected at {url}. Reason: {reason}"
            )

        if response.status >= 400:
            raise StealthIngressError(
                f"HTTP {response.status} returned from {url}"
            )

        return response

    @staticmethod
    async def detect_waf_challenge(page: Page) -> tuple[bool, Optional[str]]:
        """
        Defensively checks if the page is a Cloudflare or WAF challenge screen.
        Returns (is_challenge: bool, reason: str | None).
        """
        try:
            title = (await page.title()).strip()
        except Exception:
            title = ""

        challenge_titles = [
            "Just a moment...",
            "Attention Required! | Cloudflare",
            "Security Check",
            "Cloudflare",
        ]
        if any(ct.lower() in title.lower() for ct in challenge_titles):
            return True, f"Challenge title detected: '{title}'"

        try:
            # Check for Cloudflare Turnstile or challenge DOM markers
            markers = await page.eval_on_selector_all(
                "#challenge-running, #challenge-stage, .cf-turnstile-wrapper, div[id*='turnstile']",
                "els => els.length"
            )
            if markers > 0:
                return True, "Cloudflare challenge DOM elements detected"
        except Exception:
            pass

        return False, None

    async def close(self) -> None:
        """Closes context, browser, and playwright manager."""
        if self._context:
            await self._context.close()
            self._context = None
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright_cm:
            await self._playwright_cm.__aexit__(None, None, None)
            self._playwright_cm = None
            self._playwright = None
