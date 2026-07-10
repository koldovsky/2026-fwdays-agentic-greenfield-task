"""Maker-added coverage for stopping a timer while it is paused (spec 003).

Not an acceptance scenario — the ratified happy paths deliberately stop a
*running* timer to avoid pre-judging architecture Open question 2. But the Timer
screen (DESIGN §7.2) offers Stop from the paused state, so this pins the
conservative server behavior the maker chose: the still-open pause is closed into
a final ``pause_segments`` row, so its span is excluded from net (never counted as
active work). DB-touching, gated behind ``RUN_DB_TESTS=1`` like the other timer
tests. Uses its own cleanup-scoped domain so it never collides with them.
"""

import os
import uuid
from collections.abc import AsyncIterator

import pytest
from httpx import AsyncClient
from sqlalchemy import text

from app.config import get_settings
from app.db import get_sessionmaker
from app.main import app  # noqa: F401 — ensures the app/routers import cleanly

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="requires Postgres; run `docker compose up -d db` and set RUN_DB_TESTS=1",
)

TEST_DOMAIN = "@stoppaused003.local"
PASSWORD = "correct horse battery"
SETTINGS = get_settings()


def _csrf(token: str) -> dict[str, str]:
    return {SETTINGS.csrf_header_name: token}


async def _register_and_login(client: AsyncClient, email: str) -> str:
    reg = await client.post("/api/auth/register", json={"email": email, "password": PASSWORD})
    assert reg.status_code == 201, reg.text
    login = await client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert login.status_code == 200, login.text
    return str(login.json()["csrf_token"])


async def _create_category(client: AsyncClient, csrf: str) -> int:
    resp = await client.post(
        "/api/categories",
        json={"name": "Deep Work", "color": "#3B82F6", "description": "x"},
        headers=_csrf(csrf),
    )
    assert resp.status_code == 201, resp.text
    return int(resp.json()["id"])


@pytest.fixture(autouse=True)
async def _cleanup_test_users() -> AsyncIterator[None]:
    yield
    async with get_sessionmaker()() as session:
        await session.execute(
            text("DELETE FROM users WHERE email LIKE :pat"), {"pat": f"%{TEST_DOMAIN}"}
        )
        await session.commit()


async def test_stop_while_paused_closes_the_open_pause(client: AsyncClient) -> None:
    """Stopping a paused timer saves it with the trailing pause closed; net < gross."""
    email = f"user-{uuid.uuid4().hex}{TEST_DOMAIN}"
    csrf = await _register_and_login(client, email)
    category_id = await _create_category(client, csrf)

    started = await client.post(
        "/api/timer/start", json={"category_id": category_id}, headers=_csrf(csrf)
    )
    assert started.status_code == 201, started.text
    paused = await client.post(
        "/api/timer/pause", json={"version": started.json()["version"]}, headers=_csrf(csrf)
    )
    assert paused.status_code == 200, paused.text

    # Stop straight from the paused state (a control the Timer screen exposes).
    resp = await client.post(
        "/api/timer/stop",
        json={"version": paused.json()["version"], "category_id": category_id},
        headers=_csrf(csrf),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["source"] == "timer"
    # The open pause was closed into exactly one segment and excluded from net.
    assert len(body["pauses"]) == 1
    assert body["net_seconds"] <= body["gross_seconds"]
    assert body["net_seconds"] >= 0
