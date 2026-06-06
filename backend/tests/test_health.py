"""
HRMS Backend Tests — Phase 1: Health check test.
Expand this directory with feature-level tests in Phase 2+.
"""

import pytest
from httpx import AsyncClient, ASGITransport

# Import after setting test env vars (handled by conftest or CI env)


@pytest.mark.asyncio
async def test_health_check():
    """Verify the /health endpoint returns 200 OK."""
    import os
    # Set minimal env vars needed to import main without errors
    os.environ.setdefault("SUPABASE_URL",         "https://placeholder.supabase.co")
    os.environ.setdefault("SUPABASE_SERVICE_KEY",  "placeholder-key")
    os.environ.setdefault("SUPABASE_JWT_SECRET",   "placeholder-secret")

    # Lazy import after env vars are set
    from main import app

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "HRMS Platform API"
