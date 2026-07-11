"""Supplementary stats API tests (implementer-owned, not the acceptance bar).

The acceptance bar lives in ``test_stats_api.py`` (spec 004, one test per OpenSpec
scenario) and is never edited here. This file locks in behavior that bar does not
directly assert but the router/service wire up: query-param validation (a malformed
``window``, an out-of-order range, an invalid ``period``), the auth boundary on both
GETs, and the service's own "should not happen behind CurrentUser" defensive guard.

DB-touching, so gated behind ``RUN_DB_TESTS=1`` like the acceptance tests. Accounts use
a distinct ``@stats004-extra.local`` domain with its own cleanup, so these tests never
interfere with the acceptance suite's ``@stats004.local`` accounts.
"""

import os
import uuid
from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.config import get_settings
from app.db import get_sessionmaker
from app.main import app
from app.services.stats import StatsService, UserNotFoundError

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="requires Postgres; run `docker compose up -d db` and set RUN_DB_TESTS=1",
)

TEST_DOMAIN = "@stats004-extra.local"
PASSWORD = "correct horse battery"  # >= 8 chars
SETTINGS = get_settings()


def unique_email() -> str:
    return f"user-{uuid.uuid4().hex}{TEST_DOMAIN}"


def make_client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


async def register_and_login(client: AsyncClient, email: str) -> str:
    reg = await client.post("/api/auth/register", json={"email": email, "password": PASSWORD})
    assert reg.status_code == 201, reg.text
    login = await client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert login.status_code == 200, login.text
    return str(login.json()["csrf_token"])


@pytest.fixture(autouse=True)
async def _cleanup_test_users() -> AsyncIterator[None]:
    yield
    async with get_sessionmaker()() as session:
        await session.execute(
            text("DELETE FROM users WHERE email LIKE :pat"), {"pat": f"%{TEST_DOMAIN}"}
        )
        await session.commit()


# --- query-param validation -----------------------------------------------------


async def test_snapshot_rejects_a_malformed_window_separator(client: AsyncClient) -> None:
    """A window without the '..' separator is a 422, not a 500 or a silent ignore."""
    await register_and_login(client, unique_email())

    resp = await client.get("/api/stats/snapshot", params={"window": "2026-01-01"})

    assert resp.status_code == 422, resp.text


async def test_snapshot_rejects_non_iso_window_dates(client: AsyncClient) -> None:
    """A window with unparsable dates is a 422."""
    await register_and_login(client, unique_email())

    resp = await client.get(
        "/api/stats/snapshot", params={"window": "not-a-date..2026-01-03"}
    )

    assert resp.status_code == 422, resp.text


async def test_snapshot_rejects_a_window_ending_before_it_starts(client: AsyncClient) -> None:
    """A window whose end precedes its start is a 422."""
    await register_and_login(client, unique_email())

    resp = await client.get(
        "/api/stats/snapshot", params={"window": "2026-01-05..2026-01-01"}
    )

    assert resp.status_code == 422, resp.text


async def test_snapshot_accepts_a_window_exactly_at_the_span_cap(client: AsyncClient) -> None:
    """A window spanning exactly the 366-day cap (inclusive) is accepted, not rejected.

    2025-01-01..2026-01-01 spans 365 calendar days apart -> 366 inclusive days, exactly
    the cap `_parse_window` enforces (security-reviewer finding: an unbounded window is a
    single-request resource-exhaustion vector). Pins the boundary the same way this
    slice's other formulas pin their edges (M3's 60-min, M4's switch_load thresholds).
    """
    await register_and_login(client, unique_email())

    resp = await client.get(
        "/api/stats/snapshot", params={"window": "2025-01-01..2026-01-01"}
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["window"] == {"start": "2025-01-01", "end": "2026-01-01", "days": 366}


async def test_snapshot_rejects_a_window_spanning_more_than_the_cap(client: AsyncClient) -> None:
    """A window spanning one day more than the cap is a 422, not a multi-million-day scan.

    Guards the security-reviewer's finding: without a span cap, a single authenticated
    request (e.g. ``?window=0001-01-01..9999-12-31``) forces ``snapshot.py``'s
    ``_date_range`` to materialize ~3.65M ``date`` objects, which then drives unbounded
    O(days) / O(days x sessions) list-building in ``volume.per_day`` / ``switching.per_day``
    / ``per_category_per_day`` -- a single-request resource-exhaustion DoS reachable by
    any self-registered account with zero sessions.
    """
    await register_and_login(client, unique_email())

    resp = await client.get(
        "/api/stats/snapshot", params={"window": "2025-01-01..2026-01-02"}
    )

    assert resp.status_code == 422, resp.text


async def test_snapshot_rejects_an_extreme_full_range_window(client: AsyncClient) -> None:
    """The exact attack shape from the finding (min..max ISO date) is rejected, not hung on."""
    await register_and_login(client, unique_email())

    resp = await client.get(
        "/api/stats/snapshot", params={"window": "0001-01-01..9999-12-31"}
    )

    assert resp.status_code == 422, resp.text


async def test_heatmap_rejects_an_invalid_period(client: AsyncClient) -> None:
    """A period outside week|month|quarter|6mo|year is a 422, not silently defaulted."""
    await register_and_login(client, unique_email())

    resp = await client.get("/api/stats/heatmap", params={"period": "fortnight"})

    assert resp.status_code == 422, resp.text


# --- auth boundary ----------------------------------------------------------------


async def test_snapshot_requires_authentication() -> None:
    """GET /api/stats/snapshot without a session is 401 (the CurrentUser boundary holds)."""
    async with make_client() as anon:
        resp = await anon.get("/api/stats/snapshot")
        assert resp.status_code == 401, resp.text


async def test_heatmap_requires_authentication() -> None:
    """GET /api/stats/heatmap without a session is 401 (the CurrentUser boundary holds)."""
    async with make_client() as anon:
        resp = await anon.get("/api/stats/heatmap")
        assert resp.status_code == 401, resp.text


# --- service-layer defensive guard -------------------------------------------------


async def test_service_raises_for_an_unknown_user_id() -> None:
    """StatsService's own guard for a user_id with no row -- should not happen behind
    CurrentUser, but the service does not silently compute an empty snapshot for a
    nonexistent account.
    """
    async with get_sessionmaker()() as session:
        service = StatsService(session)
        with pytest.raises(UserNotFoundError):
            await service.get_snapshot(user_id=-1, window=None)
        with pytest.raises(UserNotFoundError):
            await service.get_heatmap(user_id=-1, period="month")
