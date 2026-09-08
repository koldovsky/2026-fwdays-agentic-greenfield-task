"""Smoke tests proving the app boots and (optionally) reaches PostgreSQL."""

import os

import pytest
from httpx import AsyncClient
from sqlalchemy import text

from app.db import get_sessionmaker


async def test_health_ok(client: AsyncClient) -> None:
    """Liveness endpoint responds without any external dependency."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="requires Postgres; run `docker compose up -d db` and set RUN_DB_TESTS=1",
)
async def test_db_connectivity() -> None:
    """Verifies real PostgreSQL connectivity end-to-end."""
    async with get_sessionmaker()() as session:
        result = await session.execute(text("SELECT 1"))
        assert result.scalar_one() == 1
