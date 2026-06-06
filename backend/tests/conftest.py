"""Pytest configuration and shared fixtures."""
import sys
from pathlib import Path

# Ensure the backend/ directory is on the path so `from main import app` resolves
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"
