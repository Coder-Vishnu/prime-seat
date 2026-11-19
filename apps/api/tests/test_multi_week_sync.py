"""
apps/api/tests/test_multi_week_sync.py
Unit tests for the autonomous multi-week schedule sync engine.
"""

import json
from datetime import date
from pathlib import Path
import pytest

from scraper.multi_week_sync import (
    map_format,
    parse_rating,
    parse_runtime,
    parse_time_str,
    resolve_auditorium_assignment,
    slugify,
)


def test_slugify():
    assert slugify("The Hunger Games: Sunrise on the Reaping") == "the-hunger-games-sunrise-on-the-reaping"
    assert slugify("Dune: Part Three (2026)") == "dune-part-three-2026"
    assert slugify("Ghost Soldier") == "ghost-soldier"


def test_parse_time_str():
    assert parse_time_str("12:40pm UP TO 15% OFF") == "12:40 PM"
    assert parse_time_str("1:35pm") == "1:35 PM"
    assert parse_time_str("8:05pm\nUP TO 15% OFF") == "8:05 PM"
    assert parse_time_str("10:00am") == "10:00 AM"


def test_parse_runtime():
    assert parse_runtime("2 HR 38 MIN") == 158
    assert parse_runtime("1 HR 30 MIN") == 90
    assert parse_runtime("2 HR 0 MIN") == 120
    assert parse_runtime("N/A") == 120


def test_parse_rating():
    assert parse_rating("PG13") == "PG-13"
    assert parse_rating("PG-13") == "PG-13"
    assert parse_rating("R") == "R"
    assert parse_rating("PG") == "PG"
    assert parse_rating("G") == "G"
    assert parse_rating("NC17") == "NC-17"


def test_map_format():
    assert map_format("IMAX with Laser at AMC: EXTRAORDINARY AWAITS") == "IMAX_LASER"
    assert map_format("Dolby Cinema at AMC: COMPLETELY CAPTIVATING") == "DOLBY_CINEMA"
    assert map_format("4DX at AMC: Feel it in 4DX") == "4DX"
    assert map_format("PRIME at AMC: PERCEIVE THE POWER") == "PRIME"
    assert map_format("RealD 3D: PREMIUM 3D EXPERIENCE") == "REALD_3D"
    assert map_format("Laser at AMC: PICTURE A BETTER WORLD") == "LASER"


def test_resolve_auditorium_assignment():
    aud_id, name, cap = resolve_auditorium_assignment("IMAX_LASER", "12:40 PM", [])
    assert aud_id == "tysons-aud-3-imax"
    assert cap == 350

    dolby_seen = []
    aud_id_1, _, cap_1 = resolve_auditorium_assignment("DOLBY_CINEMA", "1:35 PM", dolby_seen)
    assert aud_id_1 == "tysons-aud-11-dolby"
    assert cap_1 == 262

    # Second concurrent Dolby screening at 1:35 PM routes to Aud 9
    aud_id_2, _, cap_2 = resolve_auditorium_assignment("DOLBY_CINEMA", "1:35 PM", dolby_seen)
    assert aud_id_2 == "tysons-aud-9-dolby"
    assert cap_2 == 161

    aud_id_4dx, _, cap_4dx = resolve_auditorium_assignment("4DX", "2:20 PM", [])
    assert aud_id_4dx == "tysons-aud-2-4dx"
    assert cap_4dx == 125


def test_tysons_schedule_db_integrity():
    db_path = (
        Path(__file__).resolve().parents[3]
        / "apps"
        / "web"
        / "src"
        / "data"
        / "tysons_schedule_db.json"
    )
    assert db_path.exists(), f"Database file {db_path} should exist"

    with open(db_path, "r", encoding="utf-8") as f:
        db = json.load(f)

    assert db["theatreId"] == "amc-tysons-corner-16"
    assert db["totalDates"] >= 35
    assert db["totalShowtimes"] >= 1000
    assert len(db["movies"]) >= 20

    # Verify Hunger Games is present
    hg = [m for m in db["movies"] if "hunger-games" in m["id"]]
    assert len(hg) > 0

    # Verify Nov 19 has active showtimes
    assert "2026-11-19" in db["dates"]
    assert len(db["dates"]["2026-11-19"]) > 0

    # Verify Dec 18 has active showtimes (Dune / Avengers)
    assert "2026-12-18" in db["dates"]
    assert len(db["dates"]["2026-12-18"]) > 0
