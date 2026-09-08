"""Acceptance tests for the undo notification (spec 003, FR-NOTIF-01).

Test-first (RED) coverage of the immediate-write + compensating-restore undo for
discard / edit / delete. Each test drives the real HTTP endpoints in-process against a
real Postgres, exercising the ``undo_entries`` before-image, the single-use/expiring
token, and the un-discard conflict against the single-active rule (FR-TIMER-06).
DB-touching, so gated behind ``RUN_DB_TESTS=1``.

Expiry is simulated deterministically (a raw ``UPDATE undo_entries SET expires_at``),
never by sleeping past the 10-second server validity.

Every account uses the ``@undo003.local`` domain and is removed by the per-file autouse
cleanup fixture; the user_id FK cascades drop that user's rows with them.
"""

import os
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timedelta, timezone

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

TEST_DOMAIN = "@undo003.local"
PASSWORD = "correct horse battery"  # >= 8 chars
SETTINGS = get_settings()
COLOR_A = "#3B82F6"

BASE = datetime(2026, 1, 15, 10, 0, 0, tzinfo=timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


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


async def _user_id(client: AsyncClient) -> int:
    """The authenticated user's id via GET /api/auth/me."""
    me = await client.get("/api/auth/me")
    assert me.status_code == 200, me.text
    return int(me.json()["id"])


async def _create_category(client: AsyncClient, csrf: str, name: str) -> dict[str, object]:
    resp = await client.post(
        "/api/categories",
        json={"name": name, "color": COLOR_A, "description": "for undo"},
        headers=_csrf(csrf),
    )
    assert resp.status_code == 201, resp.text
    body: dict[str, object] = resp.json()
    return body


def _pause(start: datetime, end: datetime) -> dict[str, str]:
    return {"paused_at": _iso(start), "resumed_at": _iso(end)}


def _manual_payload(
    category_id: object,
    start: datetime,
    end: datetime,
    pauses: list[dict[str, str]] | None = None,
    notes: str | None = None,
) -> dict[str, object]:
    body: dict[str, object] = {
        "category_id": category_id,
        "started_at": _iso(start),
        "ended_at": _iso(end),
        "pauses": pauses or [],
    }
    if notes is not None:
        body["notes"] = notes
    return body


async def _add_manual(client: AsyncClient, csrf: str, payload: dict[str, object]) -> Response:
    return await client.post("/api/sessions", json=payload, headers=_csrf(csrf))


async def _undo(client: AsyncClient, csrf: str, token: str) -> Response:
    return await client.post(f"/api/undo/{token}", headers=_csrf(csrf))


async def _start(client: AsyncClient, csrf: str, category_id: object) -> Response:
    return await client.post(
        "/api/timer/start", json={"category_id": category_id}, headers=_csrf(csrf)
    )


async def _pause_timer(client: AsyncClient, csrf: str, version: int) -> Response:
    return await client.post("/api/timer/pause", json={"version": version}, headers=_csrf(csrf))


async def _continue_timer(client: AsyncClient, csrf: str, version: int) -> Response:
    return await client.post("/api/timer/continue", json={"version": version}, headers=_csrf(csrf))


async def _discard(client: AsyncClient, csrf: str, version: int) -> Response:
    return await client.post("/api/timer/discard", json={"version": version}, headers=_csrf(csrf))


async def _start_ok(client: AsyncClient, csrf: str, category_id: object) -> int:
    """Start a timer, assert 201, and return the new version (a RED-clean state builder)."""
    resp = await _start(client, csrf, category_id)
    assert resp.status_code == 201, resp.text
    return int(resp.json()["version"])


async def _pause_ok(client: AsyncClient, csrf: str, version: int) -> int:
    """Pause a running timer, assert 200, and return the new version."""
    resp = await _pause_timer(client, csrf, version)
    assert resp.status_code == 200, resp.text
    return int(resp.json()["version"])


async def _continue_ok(client: AsyncClient, csrf: str, version: int) -> int:
    """Continue a paused timer, assert 200, and return the new version."""
    resp = await _continue_timer(client, csrf, version)
    assert resp.status_code == 200, resp.text
    return int(resp.json()["version"])


# --- raw-SQL probes of persisted state ----------------------------------------


async def _count_sessions(user_id: int) -> int:
    async with get_sessionmaker()() as session:
        count = await session.scalar(
            text("SELECT count(*) FROM sessions WHERE user_id = :uid"), {"uid": user_id}
        )
    return int(count or 0)


async def _count_user_pause_segments(user_id: int) -> int:
    async with get_sessionmaker()() as session:
        count = await session.scalar(
            text(
                "SELECT count(*) FROM pause_segments ps "
                "JOIN sessions s ON ps.session_id = s.id WHERE s.user_id = :uid"
            ),
            {"uid": user_id},
        )
    return int(count or 0)


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


async def _active_category(user_id: int) -> object:
    async with get_sessionmaker()() as session:
        return await session.scalar(
            text("SELECT category_id FROM active_sessions WHERE user_id = :uid"), {"uid": user_id}
        )


async def _active_accumulated_len(user_id: int) -> object:
    async with get_sessionmaker()() as session:
        return await session.scalar(
            text(
                "SELECT jsonb_array_length(accumulated_pauses) "
                "FROM active_sessions WHERE user_id = :uid"
            ),
            {"uid": user_id},
        )


async def _expire_undo(user_id: int) -> None:
    """Force the user's undo entries past their server validity (deterministic expiry)."""
    async with get_sessionmaker()() as session:
        await session.execute(
            text(
                "UPDATE undo_entries SET expires_at = now() - interval '1 minute' "
                "WHERE user_id = :uid"
            ),
            {"uid": user_id},
        )
        await session.commit()


@pytest.fixture(autouse=True)
async def _cleanup_test_users() -> AsyncIterator[None]:
    yield
    async with get_sessionmaker()() as session:
        await session.execute(
            text("DELETE FROM users WHERE email LIKE :pat"), {"pat": f"%{TEST_DOMAIN}"}
        )
        await session.commit()


# --- FR-NOTIF-01: undo of discard / edit / delete -----------------------------


async def test_undo_of_delete_reinserts_session_and_pauses(client: AsyncClient) -> None:
    """Undo of a delete re-inserts the session and its pause segments and is 200.

    @trace FR-NOTIF-01
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat = await _create_category(client, csrf, "Reading")

    p1 = _pause(BASE + timedelta(minutes=10), BASE + timedelta(minutes=15))
    p2 = _pause(BASE + timedelta(minutes=30), BASE + timedelta(minutes=35))
    created = await _add_manual(
        client, csrf, _manual_payload(cat["id"], BASE, BASE + timedelta(minutes=60), [p1, p2])
    )
    assert created.status_code == 201, created.text

    deleted = await client.delete(f"/api/sessions/{created.json()['id']}", headers=_csrf(csrf))
    assert deleted.status_code == 200, deleted.text
    assert await _count_sessions(user_id) == 0

    resp = await _undo(client, csrf, deleted.json()["undo_token"])
    assert resp.status_code == 200, resp.text
    # Row and both pause segments restored from the before-image.
    assert await _count_sessions(user_id) == 1
    assert await _count_user_pause_segments(user_id) == 2

    listing = await client.get("/api/sessions")
    assert listing.status_code == 200, listing.text
    rows = listing.json()
    assert len(rows) == 1
    assert rows[0]["category_id"] == cat["id"]
    assert len(rows[0]["pauses"]) == 2


async def test_undo_of_edit_reverts_prior_values(client: AsyncClient) -> None:
    """Undo of an edit reverts the session and its pause segments to the prior values.

    @trace FR-NOTIF-01
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat1 = await _create_category(client, csrf, "Old Cat")
    cat2 = await _create_category(client, csrf, "New Cat")

    p1 = _pause(BASE + timedelta(minutes=10), BASE + timedelta(minutes=15))
    p2 = _pause(BASE + timedelta(minutes=30), BASE + timedelta(minutes=35))
    created = await _add_manual(
        client,
        csrf,
        _manual_payload(cat1["id"], BASE, BASE + timedelta(minutes=60), [p1, p2], "original"),
    )
    assert created.status_code == 201, created.text
    session_id = created.json()["id"]

    edited = await client.patch(
        f"/api/sessions/{session_id}",
        json={"category_id": cat2["id"], "notes": "edited", "pauses": []},
        headers=_csrf(csrf),
    )
    assert edited.status_code == 200, edited.text
    assert edited.json()["category_id"] == cat2["id"]

    resp = await _undo(client, csrf, edited.json()["undo_token"])
    assert resp.status_code == 200, resp.text

    listing = await client.get("/api/sessions")
    assert listing.status_code == 200, listing.text
    rows = listing.json()
    assert len(rows) == 1
    assert rows[0]["category_id"] == cat1["id"]
    assert rows[0]["notes"] == "original"
    assert len(rows[0]["pauses"]) == 2


async def test_undo_of_discard_restores_active_timer(client: AsyncClient) -> None:
    """Undo of a discard re-inserts the active row incl. accumulated_pauses and is 200.

    @trace FR-NOTIF-01
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat = await _create_category(client, csrf, "Deep Work")

    v = await _start_ok(client, csrf, cat["id"])
    v = await _pause_ok(client, csrf, v)
    v = await _continue_ok(client, csrf, v)  # one accumulated pause

    discarded = await _discard(client, csrf, v)
    assert discarded.status_code == 200, discarded.text
    assert await _count_active_sessions(user_id) == 0

    resp = await _undo(client, csrf, discarded.json()["undo_token"])
    assert resp.status_code == 200, resp.text
    # The running timer is back, with its single accumulated pause restored.
    assert await _count_active_sessions(user_id) == 1
    assert await _active_state(user_id) == "running"
    assert await _active_accumulated_len(user_id) == 1


async def test_undo_of_discard_conflicts_with_new_active_session(client: AsyncClient) -> None:
    """Undo of a discard is 409 when a new active session exists, and restores nothing.

    @trace FR-NOTIF-01
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat1 = await _create_category(client, csrf, "First")
    cat2 = await _create_category(client, csrf, "Second")

    v = await _start_ok(client, csrf, cat1["id"])
    discarded = await _discard(client, csrf, v)
    assert discarded.status_code == 200, discarded.text

    # A new active session now occupies the single slot.
    new_start = await _start(client, csrf, cat2["id"])
    assert new_start.status_code == 201, new_start.text

    resp = await _undo(client, csrf, discarded.json()["undo_token"])
    assert resp.status_code == 409, resp.text
    # The new active session is untouched — nothing was restored over it.
    assert await _count_active_sessions(user_id) == 1
    assert await _active_category(user_id) == cat2["id"]


async def test_consumed_token_second_use_is_404(client: AsyncClient) -> None:
    """A consumed undo token used a second time is 404 and restores nothing (single-use).

    @trace FR-NOTIF-01
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat = await _create_category(client, csrf, "Reading")

    created = await _add_manual(
        client, csrf, _manual_payload(cat["id"], BASE, BASE + timedelta(minutes=30))
    )
    assert created.status_code == 201, created.text

    deleted = await client.delete(f"/api/sessions/{created.json()['id']}", headers=_csrf(csrf))
    assert deleted.status_code == 200, deleted.text
    token = deleted.json()["undo_token"]

    first = await _undo(client, csrf, token)
    assert first.status_code == 200, first.text
    assert await _count_sessions(user_id) == 1

    second = await _undo(client, csrf, token)
    assert second.status_code == 404, second.text
    # No duplicate re-insert from the dead token.
    assert await _count_sessions(user_id) == 1


async def test_expired_token_is_404(client: AsyncClient) -> None:
    """An expired undo token is 404 and restores nothing.

    @trace FR-NOTIF-01
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat = await _create_category(client, csrf, "Reading")

    created = await _add_manual(
        client, csrf, _manual_payload(cat["id"], BASE, BASE + timedelta(minutes=30))
    )
    assert created.status_code == 201, created.text

    deleted = await client.delete(f"/api/sessions/{created.json()['id']}", headers=_csrf(csrf))
    assert deleted.status_code == 200, deleted.text
    assert await _count_sessions(user_id) == 0

    # Deterministically push the token past its server validity, then try to undo.
    await _expire_undo(user_id)
    resp = await _undo(client, csrf, deleted.json()["undo_token"])
    assert resp.status_code == 404, resp.text
    assert await _count_sessions(user_id) == 0
