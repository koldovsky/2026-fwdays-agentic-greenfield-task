"""Supplementary stats API tests (implementer-owned, not the acceptance bar).

The acceptance bar lives in ``test_stats_api.py`` (spec 004, one test per OpenSpec
scenario) and is never edited here. This file locks in behavior that bar does not
directly assert but the router/service wire up: query-param validation (a malformed
``window``, an out-of-order range, an invalid ``period``), the auth boundary on both
GETs, and the service's own "should not happen behind CurrentUser" defensive guard.

Also carries the DB-backed, end-to-end proof for a second rework pass's
`[BLOCKING]` finding: a single saved session with an absurd own span (nothing upstream
bounds ``ended_at - started_at`` beyond ``ended_at > started_at``) used to force every
stats read into an unbounded, event-loop-blocking day-by-day walk
(``app.core.metrics.days``) -- independent of, and not reachable through, the
``window``/``period`` query-param caps already pinned below. The service-load defensive
cap itself (``app.services.stats._within_session_span_cap``, exact 90/91-day boundary)
is pinned without a DB in ``test_metrics_extra.py``; the tests here instead prove the cap
actually protects a live request end-to-end, with real timings, mirroring how the
``window``-cap tests are split across these same two files.

DB-touching, so gated behind ``RUN_DB_TESTS=1`` like the acceptance tests. Accounts use
a distinct ``@stats004-extra.local`` domain with its own cleanup, so these tests never
interfere with the acceptance suite's ``@stats004.local`` accounts.
"""

import os
import time
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timedelta, timezone

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
COLOR_A = "#3B82F6"
# Well beyond the 90-day defensive cap (backend/app/services/stats.py::_MAX_SESSION_SPAN_DAYS)
# and, deliberately, beyond any legitimate work session -- a 200-year span, matching the
# order of magnitude this rework's own before/after reproduction used (see the run
# record), so the "before" cost is dramatic and unambiguous rather than marginal.
_HUGE_SPAN_START = datetime(1826, 1, 1, tzinfo=timezone.utc)
_HUGE_SPAN_END = datetime(2026, 1, 1, tzinfo=timezone.utc)


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


def _csrf(token: str) -> dict[str, str]:
    """The CSRF double-submit header a mutating request must carry."""
    return {SETTINGS.csrf_header_name: token}


async def _create_category(client: AsyncClient, csrf: str, name: str) -> dict[str, object]:
    """Create a category via the slice-002 endpoint; return the created body (201)."""
    resp = await client.post(
        "/api/categories", json={"name": name, "color": COLOR_A}, headers=_csrf(csrf)
    )
    assert resp.status_code == 201, resp.text
    body: dict[str, object] = resp.json()
    return body


async def _add_session_with_span(
    client: AsyncClient, csrf: str, category_id: object, started_at: datetime, ended_at: datetime
) -> dict[str, object]:
    """Save a zero-pause session with an explicit ``[started_at, ended_at]`` span."""
    payload = {
        "category_id": category_id,
        "started_at": started_at.isoformat(),
        "ended_at": ended_at.isoformat(),
        "pauses": [],
    }
    resp = await client.post("/api/sessions", json=payload, headers=_csrf(csrf))
    assert resp.status_code == 201, resp.text
    body: dict[str, object] = resp.json()
    return body


async def _add_session_ending_now(
    client: AsyncClient, csrf: str, category_id: object, minutes: int
) -> dict[str, object]:
    """Save a ``minutes``-long, zero-pause session ending right now."""
    now = datetime.now(timezone.utc)
    return await _add_session_with_span(
        client, csrf, category_id, now - timedelta(minutes=minutes), now
    )


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


# --- session-span defensive cap, end-to-end (rework iteration 3, BLOCKING finding 1) ----
#
# Reproduces the finding's own literal attack shape: an ordinary ``POST /api/sessions``
# (any authenticated user, own category -- slice 003's own validation only checks
# ``ended_at > started_at``) followed by a **bare** GET, no query parameters at all --
# this is deliberately not the `window`/`period` cap exercised above, which only bounds
# the *reporting* range, not the underlying session data those endpoints read.


async def test_snapshot_skips_an_absurd_span_session_and_stays_fast(
    client: AsyncClient,
) -> None:
    """A 200-year-spanning session is skipped by the load-time cap, not walked
    day-by-day: the request stays fast and the rest of the caller's history (one
    ordinary 30-min session) still reports correctly.
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create_category(client, csrf, "Ancient")
    await _add_session_with_span(client, csrf, cat["id"], _HUGE_SPAN_START, _HUGE_SPAN_END)
    await _add_session_ending_now(client, csrf, cat["id"], 30)

    started = time.perf_counter()
    resp = await client.get("/api/stats/snapshot")
    elapsed = time.perf_counter() - started

    assert resp.status_code == 200, resp.text
    assert elapsed < 2.0, (
        f"GET /api/stats/snapshot took {elapsed:.3f}s -- the 200-year session does not "
        "look like it was skipped by the defensive span cap"
    )
    # The 200-year session contributes nothing; only the ordinary 30-min one does --
    # skip, not clip, semantics (backend/app/services/stats.py::_within_session_span_cap).
    assert resp.json()["volume"]["all_time_min"] == 30


async def test_heatmap_skips_an_absurd_span_session_and_stays_fast(client: AsyncClient) -> None:
    """The same load-time cap protects ``GET /api/stats/heatmap`` too -- ``StatsService``'s
    ``_load`` is the one place both endpoints get their session list from.
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create_category(client, csrf, "Ancient")
    await _add_session_with_span(client, csrf, cat["id"], _HUGE_SPAN_START, _HUGE_SPAN_END)

    started = time.perf_counter()
    resp = await client.get("/api/stats/heatmap", params={"period": "year"})
    elapsed = time.perf_counter() - started

    assert resp.status_code == 200, resp.text
    assert elapsed < 2.0, f"GET /api/stats/heatmap took {elapsed:.3f}s"
    assert all(day["min"] == 0 for day in resp.json()["days"])
