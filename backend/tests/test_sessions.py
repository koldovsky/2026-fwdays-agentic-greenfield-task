"""Acceptance tests for saved sessions: manual add / edit / delete / log (spec 003).

Test-first (RED) coverage of FR-SESS-01..06. Each test drives the real HTTP endpoints
in-process against a real Postgres, so it exercises the sessions router, the
user_id-scoped repo, the discrete ``pause_segments`` rows, the CHECK constraints
(``ended_at > started_at`` and pauses within the session), and the read-time derived
``gross_seconds``/``net_seconds`` (never stored). DB-touching, so gated behind
``RUN_DB_TESTS=1``.

Durations are integer seconds derived at read time: ``gross = ended - started`` and
``net = gross - sum(pause durations)``. Timestamps are ISO-8601 UTC strings.

Every account uses the ``@sess003.local`` domain and is removed by the per-file autouse
cleanup fixture; the user_id FK cascades drop that user's saved rows with them.
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

TEST_DOMAIN = "@sess003.local"
PASSWORD = "correct horse battery"  # >= 8 chars
SETTINGS = get_settings()
COLOR_A = "#3B82F6"

# A fixed UTC anchor so every session's bounds and pauses are deterministic.
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
    """Create a category via the slice-002 endpoint; return the created body (201)."""
    resp = await client.post(
        "/api/categories",
        json={"name": name, "color": COLOR_A, "description": "for sessions"},
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
    """A POST /api/sessions (manual add) body."""
    body: dict[str, object] = {
        "category_id": category_id,
        "started_at": _iso(start),
        "ended_at": _iso(end),
        "pauses": pauses or [],
    }
    if notes is not None:
        body["notes"] = notes
    return body


async def _add_manual(
    client: AsyncClient, csrf: str, payload: dict[str, object]
) -> object:
    return await client.post("/api/sessions", json=payload, headers=_csrf(csrf))


# --- raw-SQL probes of persisted state ----------------------------------------


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


async def _session_notes(session_id: object) -> object:
    async with get_sessionmaker()() as session:
        return await session.scalar(
            text("SELECT notes FROM sessions WHERE id = :sid"), {"sid": session_id}
        )


@pytest.fixture(autouse=True)
async def _cleanup_test_users() -> AsyncIterator[None]:
    yield
    async with get_sessionmaker()() as session:
        await session.execute(
            text("DELETE FROM users WHERE email LIKE :pat"), {"pat": f"%{TEST_DOMAIN}"}
        )
        await session.commit()


# --- FR-SESS-01: discrete pause segments --------------------------------------


async def test_two_pauses_stored_as_two_discrete_segments(client: AsyncClient) -> None:
    """A twice-paused session persists as one row + two discrete pauses, never merged.

    @trace FR-SESS-01
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat = await _create_category(client, csrf, "Reading")

    p1 = _pause(BASE + timedelta(minutes=20), BASE + timedelta(minutes=25))  # 5 min
    p2 = _pause(BASE + timedelta(minutes=60), BASE + timedelta(minutes=70))  # 10 min
    payload = _manual_payload(cat["id"], BASE, BASE + timedelta(minutes=120), [p1, p2])

    resp = await _add_manual(client, csrf, payload)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["source"] == "manual"
    # Two discrete pairs in the response with their exact boundaries (not one 15-min span).
    assert len(body["pauses"]) == 2
    returned = {(p["paused_at"], p["resumed_at"]) for p in body["pauses"]}
    assert returned == {(p1["paused_at"], p1["resumed_at"]), (p2["paused_at"], p2["resumed_at"])}

    # Persisted as one session with two discrete pause_segments rows.
    assert await _count_sessions(user_id) == 1
    assert await _count_pause_segments(body["id"]) == 2


async def test_ended_not_after_started_is_422_persists_nothing(client: AsyncClient) -> None:
    """A session whose ended_at is not after started_at is 422 and persists nothing.

    @trace FR-SESS-01
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat = await _create_category(client, csrf, "Reading")

    # ended_at == started_at violates ended_at > started_at.
    payload = _manual_payload(cat["id"], BASE, BASE)
    resp = await _add_manual(client, csrf, payload)
    assert resp.status_code == 422, resp.text
    assert await _count_sessions(user_id) == 0


async def test_pause_outside_session_bounds_is_422_persists_nothing(client: AsyncClient) -> None:
    """A pause lying outside [started_at, ended_at] is 422 and persists nothing.

    @trace FR-SESS-01
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat = await _create_category(client, csrf, "Reading")

    # Pause starts before the session starts -> outside bounds.
    outside = _pause(BASE - timedelta(minutes=5), BASE + timedelta(minutes=5))
    payload = _manual_payload(cat["id"], BASE, BASE + timedelta(minutes=60), [outside])
    resp = await _add_manual(client, csrf, payload)
    assert resp.status_code == 422, resp.text
    assert await _count_sessions(user_id) == 0


# --- FR-SESS-02: derived gross and net ----------------------------------------


async def test_net_excludes_total_paused_time(client: AsyncClient) -> None:
    """Gross 60 min with pauses summing 15 min gives gross 3600s, net 2700s.

    @trace FR-SESS-02
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create_category(client, csrf, "Reading")

    p1 = _pause(BASE + timedelta(minutes=10), BASE + timedelta(minutes=15))  # 5 min
    p2 = _pause(BASE + timedelta(minutes=30), BASE + timedelta(minutes=40))  # 10 min
    payload = _manual_payload(cat["id"], BASE, BASE + timedelta(minutes=60), [p1, p2])

    resp = await _add_manual(client, csrf, payload)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["gross_seconds"] == 3600
    assert body["net_seconds"] == 2700


async def test_net_equals_gross_with_no_pauses(client: AsyncClient) -> None:
    """With no pause segments, net equals gross.

    @trace FR-SESS-02
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create_category(client, csrf, "Reading")

    payload = _manual_payload(cat["id"], BASE, BASE + timedelta(minutes=60), [])
    resp = await _add_manual(client, csrf, payload)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["gross_seconds"] == 3600
    assert body["net_seconds"] == 3600


async def test_editing_a_pause_recomputes_net(client: AsyncClient) -> None:
    """After editing a pause's boundaries, net is recomputed from the updated segments.

    @trace FR-SESS-02
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create_category(client, csrf, "Reading")

    original = _pause(BASE + timedelta(minutes=10), BASE + timedelta(minutes=20))  # 10 min
    payload = _manual_payload(cat["id"], BASE, BASE + timedelta(minutes=60), [original])
    created = await _add_manual(client, csrf, payload)
    assert created.status_code == 201, created.text
    assert created.json()["net_seconds"] == 3000  # 3600 - 600

    # Widen the pause to 20 minutes; net must fall to 3600 - 1200 = 2400.
    widened = _pause(BASE + timedelta(minutes=10), BASE + timedelta(minutes=30))
    resp = await client.patch(
        f"/api/sessions/{created.json()['id']}",
        json={"pauses": [widened]},
        headers=_csrf(csrf),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["gross_seconds"] == 3600
    assert body["net_seconds"] == 2400


# --- FR-SESS-03: manually add a past session ----------------------------------


async def test_manual_add_with_two_pauses(client: AsyncClient) -> None:
    """Manual add with an owned category and two pauses is 201, source manual, two segments.

    @trace FR-SESS-03
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create_category(client, csrf, "Reading")

    p1 = _pause(BASE + timedelta(minutes=10), BASE + timedelta(minutes=15))
    p2 = _pause(BASE + timedelta(minutes=30), BASE + timedelta(minutes=35))
    payload = _manual_payload(cat["id"], BASE, BASE + timedelta(minutes=60), [p1, p2], "notes")

    resp = await _add_manual(client, csrf, payload)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["source"] == "manual"
    assert len(body["pauses"]) == 2
    assert await _count_pause_segments(body["id"]) == 2


async def test_manual_add_with_no_pauses(client: AsyncClient) -> None:
    """Manual add with no pauses is 201 with zero pause segments.

    @trace FR-SESS-03
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create_category(client, csrf, "Reading")

    payload = _manual_payload(cat["id"], BASE, BASE + timedelta(minutes=60), [])
    resp = await _add_manual(client, csrf, payload)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["source"] == "manual"
    assert len(body["pauses"]) == 0
    assert await _count_pause_segments(body["id"]) == 0


async def test_manual_add_invalid_bounds_is_422(client: AsyncClient) -> None:
    """Manual add whose ended_at is not after started_at is 422 and persists nothing.

    @trace FR-SESS-03
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat = await _create_category(client, csrf, "Reading")

    payload = _manual_payload(cat["id"], BASE + timedelta(minutes=60), BASE)
    resp = await _add_manual(client, csrf, payload)
    assert resp.status_code == 422, resp.text
    assert await _count_sessions(user_id) == 0


async def test_manual_add_foreign_category_is_404() -> None:
    """Manual add with a category owned by another user is 404 and persists nothing.

    @trace FR-SESS-03
    """
    email_a = unique_email()
    email_b = unique_email()
    async with make_client() as client_a, make_client() as client_b:
        csrf_a = await register_and_login(client_a, email_a)
        csrf_b = await register_and_login(client_b, email_b)
        b_id = await _user_id(client_b)
        cat_a = await _create_category(client_a, csrf_a, "A-only")

        payload = _manual_payload(cat_a["id"], BASE, BASE + timedelta(minutes=60))
        resp = await _add_manual(client_b, csrf_b, payload)
        # The user_id-scoped repo never resolves A's category for B: 404, not 403.
        assert resp.status_code == 404, resp.text
        assert await _count_sessions(b_id) == 0


# --- FR-SESS-04: edit a saved session -----------------------------------------


async def test_edit_fields_updates_and_offers_undo(client: AsyncClient) -> None:
    """PATCH start/end/category/notes is 200, captures a before-image, carries a token.

    @trace FR-SESS-04
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)
    cat1 = await _create_category(client, csrf, "Old Cat")
    cat2 = await _create_category(client, csrf, "New Cat")

    payload = _manual_payload(cat1["id"], BASE, BASE + timedelta(minutes=30), [], "original")
    created = await _add_manual(client, csrf, payload)
    assert created.status_code == 201, created.text

    resp = await client.patch(
        f"/api/sessions/{created.json()['id']}",
        json={
            "started_at": _iso(BASE + timedelta(hours=1)),
            "ended_at": _iso(BASE + timedelta(hours=2)),
            "category_id": cat2["id"],
            "notes": "updated",
        },
        headers=_csrf(csrf),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["category_id"] == cat2["id"]
    assert body["notes"] == "updated"
    assert body["gross_seconds"] == 3600  # the new 1-hour span
    assert isinstance(body["undo_token"], str) and body["undo_token"]
    # A before-image was captured for the undo notification.
    assert await _count_undo_entries(user_id) >= 1


async def test_edit_pause_set_add_adjust_remove(client: AsyncClient) -> None:
    """PATCHing the pause set stores exactly the edited pauses and recomputes net.

    @trace FR-SESS-04
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create_category(client, csrf, "Reading")

    p1 = _pause(BASE + timedelta(minutes=10), BASE + timedelta(minutes=15))  # 5 min
    p2 = _pause(BASE + timedelta(minutes=30), BASE + timedelta(minutes=40))  # 10 min
    created = await _add_manual(
        client, csrf, _manual_payload(cat["id"], BASE, BASE + timedelta(minutes=60), [p1, p2])
    )
    assert created.status_code == 201, created.text
    session_id = created.json()["id"]

    # Adjust p1 (now 8 min), remove p2, add p3 (12 min): the edited set is two pauses.
    p1_adj = _pause(BASE + timedelta(minutes=10), BASE + timedelta(minutes=18))  # 8 min
    p3 = _pause(BASE + timedelta(minutes=44), BASE + timedelta(minutes=56))  # 12 min
    resp = await client.patch(
        f"/api/sessions/{session_id}", json={"pauses": [p1_adj, p3]}, headers=_csrf(csrf)
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    returned = {(p["paused_at"], p["resumed_at"]) for p in body["pauses"]}
    assert returned == {
        (p1_adj["paused_at"], p1_adj["resumed_at"]),
        (p3["paused_at"], p3["resumed_at"]),
    }
    assert await _count_pause_segments(session_id) == 2
    # Net recomputed from the edited segments: 3600 - (8+12)*60 = 2400.
    assert body["net_seconds"] == 2400


async def test_edit_another_users_session_is_404() -> None:
    """User B PATCHing user A's session is 404 and changes nothing.

    @trace FR-SESS-04
    """
    email_a = unique_email()
    email_b = unique_email()
    async with make_client() as client_a, make_client() as client_b:
        csrf_a = await register_and_login(client_a, email_a)
        csrf_b = await register_and_login(client_b, email_b)
        cat_a = await _create_category(client_a, csrf_a, "A-cat")
        created = await _add_manual(
            client_a,
            csrf_a,
            _manual_payload(cat_a["id"], BASE, BASE + timedelta(minutes=30), [], "original"),
        )
        assert created.status_code == 201, created.text
        session_id = created.json()["id"]

        resp = await client_b.patch(
            f"/api/sessions/{session_id}", json={"notes": "hijacked"}, headers=_csrf(csrf_b)
        )
        assert resp.status_code == 404, resp.text
        # A's session is untouched.
        assert await _session_notes(session_id) == "original"


# --- FR-SESS-05: delete a saved session ---------------------------------------


async def test_delete_removes_session_and_pauses_and_offers_undo(client: AsyncClient) -> None:
    """DELETE is 200 + token, removes the session and its pauses, captures a before-image.

    @trace FR-SESS-05
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
    session_id = created.json()["id"]

    resp = await client.delete(f"/api/sessions/{session_id}", headers=_csrf(csrf))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert isinstance(body["undo_token"], str) and body["undo_token"]

    # Row and its pause segments removed (cascade); a before-image was captured.
    assert await _count_sessions(user_id) == 0
    assert await _count_pause_segments(session_id) == 0
    assert await _count_undo_entries(user_id) >= 1


async def test_delete_another_users_session_is_404() -> None:
    """User B DELETEing user A's session is 404 and removes nothing.

    @trace FR-SESS-05
    """
    email_a = unique_email()
    email_b = unique_email()
    async with make_client() as client_a, make_client() as client_b:
        csrf_a = await register_and_login(client_a, email_a)
        csrf_b = await register_and_login(client_b, email_b)
        a_id = await _user_id(client_a)
        cat_a = await _create_category(client_a, csrf_a, "A-cat")
        created = await _add_manual(
            client_a, csrf_a, _manual_payload(cat_a["id"], BASE, BASE + timedelta(minutes=30))
        )
        assert created.status_code == 201, created.text

        resp = await client_b.delete(
            f"/api/sessions/{created.json()['id']}", headers=_csrf(csrf_b)
        )
        assert resp.status_code == 404, resp.text
        # A still owns the session.
        assert await _count_sessions(a_id) == 1


# --- FR-SESS-06: the session log ----------------------------------------------


async def test_log_lists_sessions_with_durations_in_order(client: AsyncClient) -> None:
    """GET lists the user's sessions newest-first, each with gross and net durations.

    @trace FR-SESS-06
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create_category(client, csrf, "Reading")

    ids: list[int] = []
    for day in range(3):  # started_at increases: day 0 < day 1 < day 2
        start = BASE + timedelta(days=day)
        created = await _add_manual(
            client, csrf, _manual_payload(cat["id"], start, start + timedelta(minutes=30))
        )
        assert created.status_code == 201, created.text
        ids.append(created.json()["id"])

    listing = await client.get("/api/sessions")
    assert listing.status_code == 200, listing.text
    rows = listing.json()
    # started_at DESC then id DESC => newest first.
    assert [r["id"] for r in rows] == [ids[2], ids[1], ids[0]]
    for r in rows:
        assert isinstance(r["gross_seconds"], int)
        assert isinstance(r["net_seconds"], int)


async def test_log_is_isolated_per_user() -> None:
    """User A's log contains only A's sessions, never B's.

    @trace FR-SESS-06
    """
    email_a = unique_email()
    email_b = unique_email()
    async with make_client() as client_a, make_client() as client_b:
        csrf_a = await register_and_login(client_a, email_a)
        csrf_b = await register_and_login(client_b, email_b)
        cat_a = await _create_category(client_a, csrf_a, "A-cat")
        cat_b = await _create_category(client_b, csrf_b, "B-cat")
        created_a = await _add_manual(
            client_a, csrf_a, _manual_payload(cat_a["id"], BASE, BASE + timedelta(minutes=30))
        )
        created_b = await _add_manual(
            client_b, csrf_b, _manual_payload(cat_b["id"], BASE, BASE + timedelta(minutes=30))
        )
        assert created_a.status_code == 201, created_a.text
        assert created_b.status_code == 201, created_b.text

        listing = await client_a.get("/api/sessions")
        assert listing.status_code == 200, listing.text
        ids = [r["id"] for r in listing.json()]
        assert created_a.json()["id"] in ids
        assert created_b.json()["id"] not in ids


async def test_running_session_is_not_in_log(client: AsyncClient) -> None:
    """A running active session does not appear in the saved-session log.

    @trace FR-SESS-06
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create_category(client, csrf, "Reading")

    saved = await _add_manual(
        client, csrf, _manual_payload(cat["id"], BASE, BASE + timedelta(minutes=30))
    )
    assert saved.status_code == 201, saved.text

    started = await client.post(
        "/api/timer/start", json={"category_id": cat["id"]}, headers=_csrf(csrf)
    )
    assert started.status_code == 201, started.text

    listing = await client.get("/api/sessions")
    assert listing.status_code == 200, listing.text
    rows = listing.json()
    # Only the saved session is listed; the active_sessions row is not a saved session.
    assert [r["id"] for r in rows] == [saved.json()["id"]]
