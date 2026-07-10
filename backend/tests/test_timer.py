"""Acceptance tests for the live active timer (spec 003, FR-TIMER-01..06).

Test-first (RED): every test drives the real HTTP endpoints in-process against a real
Postgres, so it exercises the timer router, the user_id-scoped active-session repo, the
``UNIQUE(user_id)`` single-active constraint, and the optimistic ``version`` — not just
imports. DB-touching, so gated behind ``RUN_DB_TESTS=1`` like the auth/categories tests.

Scenarios come from ``openspec/changes/add-timer-sessions/specs/timer-sessions/spec.md``
and the agreed HTTP/DTO contract, one test per scenario (a scenario asserting two
behaviors is split into two tests). Timer-action bodies carry the ``version`` last seen;
a stale version is a ``409`` that changes nothing. State is built through the ``_*_ok``
helpers, which assert the happy status before reading the next ``version`` so a RED
failure localizes to the exact absent endpoint rather than a downstream ``KeyError``.

Every account uses the ``@timer003.local`` domain and is removed by the per-file autouse
cleanup fixture; the user_id FK cascades drop that user's active/saved rows with them.
"""

import os
import uuid
from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient, Response
from sqlalchemy import text

from app.config import get_settings
from app.db import get_sessionmaker
from app.main import app

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="requires Postgres; run `docker compose up -d db` and set RUN_DB_TESTS=1",
)

TEST_DOMAIN = "@timer003.local"
PASSWORD = "correct horse battery"  # >= 8 chars
SETTINGS = get_settings()
COLOR_A = "#3B82F6"
COLOR_B = "#EF4444"


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


async def login_only(client: AsyncClient, email: str) -> str:
    """Log an already-registered ``email`` in on a second client; return its CSRF token."""
    login = await client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert login.status_code == 200, login.text
    return str(login.json()["csrf_token"])


async def _user_id(client: AsyncClient) -> int:
    """The authenticated user's id via GET /api/auth/me."""
    me = await client.get("/api/auth/me")
    assert me.status_code == 200, me.text
    return int(me.json()["id"])


async def _create_category(client: AsyncClient, csrf: str, name: str) -> dict[str, object]:
    """Create a category via the slice-002 endpoint; return the created body (201)."""
    resp = await client.post(
        "/api/categories",
        json={"name": name, "color": COLOR_A, "description": "for timer"},
        headers=_csrf(csrf),
    )
    assert resp.status_code == 201, resp.text
    body: dict[str, object] = resp.json()
    return body


async def _start(client: AsyncClient, csrf: str, category_id: object) -> Response:
    return await client.post(
        "/api/timer/start", json={"category_id": category_id}, headers=_csrf(csrf)
    )


async def _pause(client: AsyncClient, csrf: str, version: int) -> Response:
    return await client.post("/api/timer/pause", json={"version": version}, headers=_csrf(csrf))


async def _continue(client: AsyncClient, csrf: str, version: int) -> Response:
    return await client.post("/api/timer/continue", json={"version": version}, headers=_csrf(csrf))


async def _stop(
    client: AsyncClient, csrf: str, version: int, category_id: object, notes: str | None = None
) -> Response:
    body: dict[str, object] = {"version": version, "category_id": category_id}
    if notes is not None:
        body["notes"] = notes
    return await client.post("/api/timer/stop", json=body, headers=_csrf(csrf))


async def _discard(client: AsyncClient, csrf: str, version: int) -> Response:
    return await client.post("/api/timer/discard", json={"version": version}, headers=_csrf(csrf))


async def _start_ok(client: AsyncClient, csrf: str, category_id: object) -> int:
    """Start a timer, assert 201, and return the new version (a RED-clean state builder)."""
    resp = await _start(client, csrf, category_id)
    assert resp.status_code == 201, resp.text
    return int(resp.json()["version"])


async def _pause_ok(client: AsyncClient, csrf: str, version: int) -> int:
    """Pause a running timer, assert 200, and return the new version."""
    resp = await _pause(client, csrf, version)
    assert resp.status_code == 200, resp.text
    return int(resp.json()["version"])


async def _continue_ok(client: AsyncClient, csrf: str, version: int) -> int:
    """Continue a paused timer, assert 200, and return the new version."""
    resp = await _continue(client, csrf, version)
    assert resp.status_code == 200, resp.text
    return int(resp.json()["version"])


# --- raw-SQL probes of persisted state (mirrors test_categories.py's helpers) ----


async def _count_active_sessions(user_id: int) -> int:
    async with get_sessionmaker()() as session:
        count = await session.scalar(
            text("SELECT count(*) FROM active_sessions WHERE user_id = :uid"), {"uid": user_id}
        )
    return int(count or 0)


async def _active_state(user_id: int) -> object:
    async with get_sessionmaker()() as session:
        return await session.scalar(
            text("SELECT state FROM active_sessions WHERE user_id = :uid"), {"uid": user_id}
        )


async def _active_version(user_id: int) -> object:
    async with get_sessionmaker()() as session:
        return await session.scalar(
            text("SELECT version FROM active_sessions WHERE user_id = :uid"), {"uid": user_id}
        )


async def _count_sessions(user_id: int) -> int:
    async with get_sessionmaker()() as session:
        count = await session.scalar(
            text("SELECT count(*) FROM sessions WHERE user_id = :uid"), {"uid": user_id}
        )
    return int(count or 0)


async def _count_pause_segments(session_id: object) -> int:
    async with get_sessionmaker()() as session:
        count = await session.scalar(
            text("SELECT count(*) FROM pause_segments WHERE session_id = :sid"), {"sid": session_id}
        )
    return int(count or 0)


async def _count_undo_entries(user_id: int) -> int:
    async with get_sessionmaker()() as session:
        count = await session.scalar(
            text("SELECT count(*) FROM undo_entries WHERE user_id = :uid"), {"uid": user_id}
        )
    return int(count or 0)


async def _session_category(session_id: object) -> object:
    async with get_sessionmaker()() as session:
        return await session.scalar(
            text("SELECT category_id FROM sessions WHERE id = :sid"), {"sid": session_id}
        )


@pytest.fixture(autouse=True)
async def _cleanup_test_users() -> AsyncIterator[None]:
    yield
    async with get_sessionmaker()() as session:
        await session.execute(
            text("DELETE FROM users WHERE email LIKE :pat"), {"pat": f"%{TEST_DOMAIN}"}
        )
        await session.commit()


# --- FR-TIMER-01: start a session timer ---------------------------------------


async def test_start_creates_running_active_session(client: AsyncClient) -> None:
    """POST /api/timer/start creates one running active_sessions row, 201, version 1.

    @trace FR-TIMER-01
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat = await _create_category(client, csrf, "Deep Work")

    resp = await _start(client, csrf, cat["id"])
    assert resp.status_code == 201, resp.text

    body = resp.json()
    assert body["category_id"] == cat["id"]
    assert body["state"] == "running"
    assert body["version"] == 1
    assert body["pause_started_at"] is None
    assert body["accumulated_pauses"] == []
    assert isinstance(body["id"], int)
    assert isinstance(body["started_at"], str) and body["started_at"]

    # Exactly one server-authoritative active row exists for this user.
    assert await _count_active_sessions(user_id) == 1


async def test_start_on_foreign_category_is_404_and_creates_nothing() -> None:
    """Starting on another user's category is 404 and creates no active session.

    @trace FR-TIMER-01
    """
    email_a = unique_email()
    email_b = unique_email()
    async with make_client() as client_a, make_client() as client_b:
        csrf_a = await register_and_login(client_a, email_a)
        csrf_b = await register_and_login(client_b, email_b)
        b_id = await _user_id(client_b)
        cat_a = await _create_category(client_a, csrf_a, "A-only")

        resp = await _start(client_b, csrf_b, cat_a["id"])
        # The user_id-scoped repo never resolves A's category for B: 404, not 403.
        assert resp.status_code == 404, resp.text
        assert await _count_active_sessions(b_id) == 0


# --- FR-TIMER-02: pause and continue ------------------------------------------


async def test_pause_running_timer_opens_pause_segment(client: AsyncClient) -> None:
    """Pausing a running timer is 200, state paused, pause_started_at set, version 2.

    @trace FR-TIMER-02
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create_category(client, csrf, "Focus")

    started = await _start(client, csrf, cat["id"])
    assert started.status_code == 201, started.text

    resp = await _pause(client, csrf, started.json()["version"])
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["state"] == "paused"
    assert isinstance(body["pause_started_at"], str) and body["pause_started_at"]
    assert body["version"] == 2


async def test_continue_paused_timer_closes_pause_segment(client: AsyncClient) -> None:
    """Continuing is 200, state running, pause_started_at cleared, one closed pause pair.

    @trace FR-TIMER-02
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create_category(client, csrf, "Focus")

    started = await _start(client, csrf, cat["id"])
    assert started.status_code == 201, started.text
    paused = await _pause(client, csrf, started.json()["version"])
    assert paused.status_code == 200, paused.text

    resp = await _continue(client, csrf, paused.json()["version"])
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["state"] == "running"
    assert body["pause_started_at"] is None
    assert body["version"] == 3
    assert len(body["accumulated_pauses"]) == 1
    pair = body["accumulated_pauses"][0]
    assert pair["paused_at"] and pair["resumed_at"]


async def test_continue_while_running_is_409_unchanged(client: AsyncClient) -> None:
    """Continue is only valid from paused: continue while running is 409, nothing applied.

    @trace FR-TIMER-02
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat = await _create_category(client, csrf, "Focus")

    started = await _start(client, csrf, cat["id"])
    assert started.status_code == 201, started.text

    resp = await _continue(client, csrf, started.json()["version"])
    assert resp.status_code == 409, resp.text
    # The session is untouched: still running at version 1.
    assert await _active_state(user_id) == "running"
    assert await _active_version(user_id) == 1


async def test_pause_while_paused_is_409_unchanged(client: AsyncClient) -> None:
    """Pause is only valid from running: pause while paused is 409, nothing applied.

    @trace FR-TIMER-02
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat = await _create_category(client, csrf, "Focus")

    started = await _start(client, csrf, cat["id"])
    assert started.status_code == 201, started.text
    paused = await _pause(client, csrf, started.json()["version"])
    assert paused.status_code == 200, paused.text

    resp = await _pause(client, csrf, paused.json()["version"])
    assert resp.status_code == 409, resp.text
    # Still paused at version 2 — the invalid transition applied nothing.
    assert await _active_state(user_id) == "paused"
    assert await _active_version(user_id) == 2


# --- FR-TIMER-03: stop and save -----------------------------------------------


async def test_stop_persists_session_and_two_pauses_atomically(client: AsyncClient) -> None:
    """Stop writes one sessions row + two pause_segments, deletes the active row, 201.

    @trace FR-TIMER-03
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat = await _create_category(client, csrf, "Deep Work")

    v = await _start_ok(client, csrf, cat["id"])
    v = await _pause_ok(client, csrf, v)
    v = await _continue_ok(client, csrf, v)
    v = await _pause_ok(client, csrf, v)
    v = await _continue_ok(client, csrf, v)

    resp = await _stop(client, csrf, v, cat["id"], notes="wrapped up")
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["source"] == "timer"
    assert len(body["pauses"]) == 2

    # One saved session, its two discrete pause segments, and the active slot freed.
    assert await _count_sessions(user_id) == 1
    assert await _count_pause_segments(body["id"]) == 2
    assert await _count_active_sessions(user_id) == 0


async def test_stop_final_category_overrides_start_category(client: AsyncClient) -> None:
    """The save modal's final category overrides the one the timer started with.

    @trace FR-TIMER-03
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    work = await _create_category(client, csrf, "Work")
    study = await _create_category(client, csrf, "Study")

    v = await _start_ok(client, csrf, work["id"])

    resp = await _stop(client, csrf, v, study["id"])
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["category_id"] == study["id"]
    assert await _session_category(body["id"]) == study["id"]


async def test_stop_with_no_active_session_is_404(client: AsyncClient) -> None:
    """Stopping with no active session is 404 and writes no session.

    @trace FR-TIMER-03
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat = await _create_category(client, csrf, "Work")

    resp = await _stop(client, csrf, 1, cat["id"])
    assert resp.status_code == 404, resp.text
    assert await _count_sessions(user_id) == 0


# --- FR-TIMER-04: discard with confirmation -----------------------------------


async def test_discard_deletes_active_writes_undo_and_no_session(client: AsyncClient) -> None:
    """Discard deletes the active row, writes a before-image, 200 + token, saves nothing.

    @trace FR-TIMER-04
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat = await _create_category(client, csrf, "Deep Work")

    v = await _start_ok(client, csrf, cat["id"])
    v = await _pause_ok(client, csrf, v)
    v = await _continue_ok(client, csrf, v)

    resp = await _discard(client, csrf, v)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert isinstance(body["undo_token"], str) and body["undo_token"]

    # Active row gone, before-image captured, and no saved session/pauses written.
    assert await _count_active_sessions(user_id) == 0
    assert await _count_undo_entries(user_id) >= 1
    assert await _count_sessions(user_id) == 0


async def test_discarded_session_leaves_no_trace_in_log(client: AsyncClient) -> None:
    """After a discard, GET /api/sessions shows no row for that timer.

    @trace FR-TIMER-04
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create_category(client, csrf, "Deep Work")

    v = await _start_ok(client, csrf, cat["id"])
    discarded = await _discard(client, csrf, v)
    assert discarded.status_code == 200, discarded.text

    listing = await client.get("/api/sessions")
    assert listing.status_code == 200, listing.text
    assert listing.json() == []


# --- FR-TIMER-06: a single server-authoritative active session per user --------


async def test_second_start_while_active_is_409(client: AsyncClient) -> None:
    """A second start while one is active is 409; still exactly one active row.

    @trace FR-TIMER-06
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat = await _create_category(client, csrf, "Deep Work")

    first = await _start(client, csrf, cat["id"])
    assert first.status_code == 201, first.text

    second = await _start(client, csrf, cat["id"])
    assert second.status_code == 409, second.text
    # The UNIQUE(user_id) rule holds: no second active row.
    assert await _count_active_sessions(user_id) == 1


async def test_active_session_is_shared_across_the_users_clients() -> None:
    """A second client for the same user acts on the same single active row.

    @trace FR-TIMER-06
    """
    email = unique_email()
    async with make_client() as client_a, make_client() as client_b:
        csrf_a = await register_and_login(client_a, email)
        csrf_b = await login_only(client_b, email)
        user_id = await _user_id(client_a)
        cat = await _create_category(client_a, csrf_a, "Deep Work")

        started = await _start(client_a, csrf_a, cat["id"])
        assert started.status_code == 201, started.text

        # Client B (same user, separate cookie) pauses using the version A returned.
        paused = await _pause(client_b, csrf_b, started.json()["version"])
        assert paused.status_code == 200, paused.text
        assert paused.json()["state"] == "paused"

        # Server-authoritative: one shared row for the user, now paused.
        assert await _count_active_sessions(user_id) == 1
        assert await _active_state(user_id) == "paused"


async def test_stale_version_timer_action_is_409_unchanged(client: AsyncClient) -> None:
    """A timer action carrying a stale version is 409 and applies nothing.

    @trace FR-TIMER-06
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat = await _create_category(client, csrf, "Deep Work")

    started = await _start(client, csrf, cat["id"])
    assert started.status_code == 201, started.text
    assert started.json()["version"] == 1
    paused = await _pause(client, csrf, started.json()["version"])
    assert paused.status_code == 200, paused.text
    assert paused.json()["version"] == 2

    # Continue carrying the now-stale version 1 (not the current 2).
    resp = await _continue(client, csrf, 1)
    assert resp.status_code == 409, resp.text
    # Nothing applied: still paused at version 2.
    assert await _active_state(user_id) == "paused"
    assert await _active_version(user_id) == 2
