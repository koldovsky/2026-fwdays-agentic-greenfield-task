"""Shared pytest fixtures."""

from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient

import app.db as db
from app.main import app


@pytest.fixture(autouse=True)
async def _fresh_db_engine() -> AsyncIterator[None]:
    """Bind a fresh async engine to each test's event loop.

    The app uses one process-global asyncpg engine (fine in production: one loop
    for the process lifetime). pytest-asyncio, however, runs each test on its own
    event loop, so an engine created in one test is bound to a loop that is closed
    by the next test ("Event loop is closed"). Resetting the globals here gives
    every test a fresh engine on its own loop and disposes it cleanly afterwards.
    """
    db._engine = None
    db._sessionmaker = None
    yield
    engine = db._engine
    if engine is not None:
        await engine.dispose()
    db._engine = None
    db._sessionmaker = None


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    """An httpx client that talks to the FastAPI app in-process (no network)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
