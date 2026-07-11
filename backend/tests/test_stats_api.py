"""DB-backed contract tests for the stats endpoints (spec 004).

Thin HTTP layer over the pure core tested exhaustively in ``test_metrics_*.py`` /
``test_metrics_snapshot.py``: a happy-path contract test per endpoint, a per-user
isolation test (FR-AUTH-07 reuse), and the wire-level ``period``/``window`` query
params. DB-touching, gated behind ``RUN_DB_TESTS=1`` like the other slice test files.

Wire-format judgment calls this file pins (not fixed by the ratified scenarios):
  - ``GET /api/stats/heatmap`` responds
    ``{"period": "week|month|quarter|6mo|year", "days": [{"date": "...", "min": N,
    "level": 0-4}, ...]}``.
  - ``GET /api/stats/snapshot?window=`` takes an ISO date range joined by ``..``, e.g.
    ``window=2026-01-01..2026-01-03``.

A freshly-registered account defaults to ``timezone = 'UTC'`` (architecture §2.1), so
"today" here is real, current UTC wall-clock time -- these tests build sessions
relative to ``datetime.now(timezone.utc)`` rather than a fixed historical date, since
the server determines "today" from its own clock. This carries a theoretical,
extremely low-probability flake right at a UTC midnight boundary, accepted here (the
pure day-attribution edge cases are already exhaustively covered with fixed dates in
``test_metrics_days.py``).

Every account uses the ``@stats004.local`` domain and is removed by the per-file
autouse cleanup fixture, copied from ``tests/test_sessions.py``.
"""

import os
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.config import get_settings
from app.db import get_sessionmaker
from app.main import app

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="requires Postgres; run `docker compose up -d db` and set RUN_DB_TESTS=1",
)

TEST_DOMAIN = "@stats004.local"
PASSWORD = "correct horse battery"  # >= 8 chars
SETTINGS = get_settings()
COLOR_A = "#3B82F6"
SNAPSHOT_TOP_LEVEL_KEYS = {
    "window",
    "volume",
    "consistency",
    "focus",
    "switching",
    "streaks",
    "baselines",
    "top_categories",
    "per_category_per_day",
}


def unique_email() -> str:
    """A fresh, unique test email under the cleanup-scoped domain."""
    return f"user-{uuid.uuid4().hex}{TEST_DOMAIN}"


def make_client() -> AsyncClient:
    """A new in-process client with its own (isolated) cookie jar."""
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _csrf(token: str) -> dict[str, str]:
    """The CSRF double-submit header a mutating request must carry."""
    return {SETTINGS.csrf_header_name: token}


async def register_and_login(client: AsyncClient, email: str) -> str:
    """Register + login ``email`` on ``client``; return the issued CSRF token."""
    reg = await client.post("/api/auth/register", json={"email": email, "password": PASSWORD})
    assert reg.status_code == 201, reg.text
    login = await client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert login.status_code == 200, login.text
    return str(login.json()["csrf_token"])


async def _create_category(client: AsyncClient, csrf: str, name: str) -> dict[str, object]:
    """Create a category via the slice-002 endpoint; return the created body (201)."""
    resp = await client.post(
        "/api/categories", json={"name": name, "color": COLOR_A}, headers=_csrf(csrf)
    )
    assert resp.status_code == 201, resp.text
    body: dict[str, object] = resp.json()
    return body


async def _add_session_ending_now(
    client: AsyncClient, csrf: str, category_id: object, minutes: int
) -> dict[str, object]:
    """Save a ``minutes``-long, zero-pause session ending right now via slice 003's endpoint."""
    now = datetime.now(timezone.utc)
    start = now - timedelta(minutes=minutes)
    payload = {
        "category_id": category_id,
        "started_at": start.isoformat(),
        "ended_at": now.isoformat(),
        "pauses": [],
    }
    resp = await client.post("/api/sessions", json=payload, headers=_csrf(csrf))
    assert resp.status_code == 201, resp.text
    body: dict[str, object] = resp.json()
    return body


@pytest.fixture(autouse=True)
async def _cleanup_test_users() -> AsyncIterator[None]:
    yield
    async with get_sessionmaker()() as session:
        await session.execute(
            text("DELETE FROM users WHERE email LIKE :pat"), {"pat": f"%{TEST_DOMAIN}"}
        )
        await session.commit()


# --- GET /api/stats/snapshot ---------------------------------------------------


async def test_snapshot_happy_path_reflects_the_callers_own_session(client: AsyncClient) -> None:
    """GET /api/stats/snapshot 200s with the full §4.1 shape reflecting a seeded session.

    @trace NFR-DET-01
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create_category(client, csrf, "Deep Work")
    await _add_session_ending_now(client, csrf, cat["id"], 60)

    resp = await client.get("/api/stats/snapshot")

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert set(body.keys()) == SNAPSHOT_TOP_LEVEL_KEYS
    assert body["volume"]["today_min"] == 60
    assert body["volume"]["all_time_min"] == 60


async def test_snapshot_is_isolated_per_user() -> None:
    """User A's snapshot is computed only over A's own sessions, never B's (FR-AUTH-07).

    @trace NFR-DET-01
    """
    email_a = unique_email()
    email_b = unique_email()
    async with make_client() as client_a, make_client() as client_b:
        csrf_a = await register_and_login(client_a, email_a)
        csrf_b = await register_and_login(client_b, email_b)
        cat_a = await _create_category(client_a, csrf_a, "A-cat")
        cat_b = await _create_category(client_b, csrf_b, "B-cat")
        await _add_session_ending_now(client_a, csrf_a, cat_a["id"], 45)
        await _add_session_ending_now(client_b, csrf_b, cat_b["id"], 99)

        snap_a = await client_a.get("/api/stats/snapshot")
        snap_b = await client_b.get("/api/stats/snapshot")

        assert snap_a.status_code == 200, snap_a.text
        assert snap_b.status_code == 200, snap_b.text
        assert snap_a.json()["volume"]["today_min"] == 45
        assert snap_b.json()["volume"]["today_min"] == 99


async def test_snapshot_window_query_param_rescopes_the_reporting_range(
    client: AsyncClient,
) -> None:
    """GET /api/stats/snapshot?window=START..END reflects the requested range.

    @trace NFR-DET-01
    """
    email = unique_email()
    await register_and_login(client, email)

    resp = await client.get(
        "/api/stats/snapshot", params={"window": "2026-01-01..2026-01-03"}
    )

    assert resp.status_code == 200, resp.text
    window = resp.json()["window"]
    assert window == {"start": "2026-01-01", "end": "2026-01-03", "days": 3}


# --- GET /api/stats/heatmap -----------------------------------------------------


async def test_heatmap_happy_path_defaults_to_month(client: AsyncClient) -> None:
    """GET /api/stats/heatmap with no period param defaults to month and reflects today.

    @trace FR-HEAT-02
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create_category(client, csrf, "Reading")
    await _add_session_ending_now(client, csrf, cat["id"], 30)

    resp = await client.get("/api/stats/heatmap")

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["period"] == "month"
    today_str = datetime.now(timezone.utc).date().isoformat()
    days_by_date = {d["date"]: d for d in body["days"]}
    assert today_str in days_by_date
    assert days_by_date[today_str]["min"] == 30
    assert days_by_date[today_str]["level"] >= 1


async def test_heatmap_period_query_param_is_honored(client: AsyncClient) -> None:
    """GET /api/stats/heatmap?period=quarter computes the grid for the requested period.

    @trace FR-HEAT-02
    """
    email = unique_email()
    await register_and_login(client, email)

    resp = await client.get("/api/stats/heatmap", params={"period": "quarter"})

    assert resp.status_code == 200, resp.text
    assert resp.json()["period"] == "quarter"
