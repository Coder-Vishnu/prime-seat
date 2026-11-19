"""
apps/api/tests/test_stealth_ingress.py
Verification suite for Playwright Stealth Ingress Engine & Cloudflare Clearance (Task 6).
"""

import pytest
from scraper.stealth_engine import (
    CloudflareChallengeDetected,
    StealthBrowserConfig,
    StealthBrowserSession,
    StealthIngressError,
)

AMC_TYSONS_SHOWTIMES_URL = (
    "https://www.amctheatres.com/movie-theatres/washington-d-c/amc-tysons-corner-16/showtimes"
)


def test_stealth_config_defaults():
    """Validates default stealth configuration parameters."""
    cfg = StealthBrowserConfig()
    assert cfg.headless is True
    assert "Chrome/" in cfg.user_agent
    assert "Windows NT 10.0" in cfg.user_agent
    assert cfg.viewport_width == 1920
    assert cfg.viewport_height == 1080
    assert cfg.timeout_ms >= 30000
    assert cfg.locale == "en-US"
    assert "Sec-Ch-Ua" in cfg.extra_headers
    assert cfg.extra_headers["Upgrade-Insecure-Requests"] == "1"


@pytest.mark.asyncio
async def test_stealth_session_lifecycle():
    """Verifies clean initialization, context creation, and teardown."""
    session = StealthBrowserSession()
    async with session:
        assert session._browser is not None
        assert session._context is not None
        page = await session.new_page()
        assert page is not None
        await page.close()

    assert session._browser is None
    assert session._context is None


@pytest.mark.asyncio
async def test_navigator_webdriver_evasion():
    """Verifies that navigator.webdriver is effectively neutralized (evasion active)."""
    async with StealthBrowserSession() as session:
        page = await session.new_page()
        await page.goto("about:blank")
        is_webdriver = await page.evaluate("() => navigator.webdriver")
        assert is_webdriver in (False, None), f"navigator.webdriver was detected as {is_webdriver}"
        user_agent = await page.evaluate("() => navigator.userAgent")
        assert "Chrome" in user_agent
        await page.close()


@pytest.mark.asyncio
async def test_waf_challenge_detection():
    """Verifies the detection engine identifies Cloudflare challenge pages."""
    async with StealthBrowserSession() as session:
        page = await session.new_page()
        await page.set_content("<html><head><title>Just a moment...</title></head><body>Verification</body></html>")
        is_challenge, reason = await StealthBrowserSession.detect_waf_challenge(page)
        assert is_challenge is True
        assert "Just a moment..." in str(reason)

        await page.set_content("<html><head><title>AMC Tysons Corner 16 Showtimes</title></head><body>Normal Content</body></html>")
        is_challenge_clean, _ = await StealthBrowserSession.detect_waf_challenge(page)
        assert is_challenge_clean is False
        await page.close()


@pytest.mark.asyncio
async def test_amc_tysons_showtimes_ingress_live():
    """
    Verification Gate: Headless browser successfully loads AMC Tysons showtime page
    with HTTP 200 (no 403 / Cloudflare captcha block).
    """
    async with StealthBrowserSession() as session:
        page = await session.new_page()
        response = await session.navigate_with_clearance(
            page,
            AMC_TYSONS_SHOWTIMES_URL,
            wait_until="domcontentloaded",
            settle_ms=2500,
        )

        assert response.status == 200, f"Expected HTTP 200, got {response.status}"
        title = await page.title()
        assert "AMC Tysons Corner 16" in title, f"Unexpected page title: {title}"
        assert "Showtimes" in title, f"Title does not mention Showtimes: {title}"

        # Ensure no challenge was active
        is_challenge, _ = await session.detect_waf_challenge(page)
        assert is_challenge is False, "WAF Challenge should not be active"

        # Check that showtime links or content populated
        showtimes_count = await page.eval_on_selector_all(
            "a[href*='/showtimes/']",
            "els => els.length"
        )
        assert showtimes_count > 0, f"Expected showtime links on live schedule, found {showtimes_count}"
        await page.close()
