"""
apps/api/tests/conftest.py
Pytest configuration and shared fixtures for Prime Seat test suites.
"""

import sys
from pathlib import Path

# Ensure apps/api/src is on sys.path for direct imports
src_path = Path(__file__).parent.parent / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))
