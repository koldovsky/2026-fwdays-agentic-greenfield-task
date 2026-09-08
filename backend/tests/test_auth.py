"""End-to-end auth tests (spec 001 acceptance checks).

Each test drives the real HTTP endpoints in-process against a real Postgres, so
it exercises hashing, cookies, CSRF, session lookup, and per-user scoping — not
just imports. DB-touching, so gated behind RUN_DB_TESTS=1 like the smoke tests.

Every test's accounts use the ``@auth-test.local`` domain and are removed by the
autouse cleanup fixture (FK cascade also drops their sessions), keeping runs
independent and repeatable.
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

TEST_DOMAIN = "@auth-test.local"
PASSWORD = "correct horse battery"  # >= 8 chars
SETTINGS = get_settings()


def unique_email() -> str:
    """A fresh, unique test email under the cleanup-scoped domain."""
    return f"user-{uuid.uuid4().hex}{TEST_DOMAIN}"


def make_client() -> AsyncClient:
    """A new in-process client with its own (isolated) cookie jar."""
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def set_session_cookie(client: AsyncClient, value: str) -> None:
    client.cookies.set(SETTINGS.session_cookie_name, value, domain="test")


async def _count_sessions_for(email: str) -> int:
    async with get_sessionmaker()() as session:
        count = await session.scalar(
            text(
                "SELECT count(*) FROM user_sessions us "
                "JOIN users u ON u.id = us.user_id WHERE u.email = :email"
            ),
            {"email": email},
        )
    return int(count or 0)


async def register_and_login(client: AsyncClient, email: str) -> str:
    """Register + login ``email`` on ``client``; return the issued CSRF token."""
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


# --- FR-AUTH-01: registration ------------------------------------------------


async def test_register_happy_path(client: AsyncClient) -> None:
    """New email + password creates a user (201). @trace FR-AUTH-01"""
    email = unique_email()
    resp = await client.post("/api/auth/register", json={"email": email, "password": PASSWORD})

    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["email"] == email
    assert body["timezone"] == "UTC"
    assert body["coach_language"] == "en"
    assert isinstance(body["id"], int)
    # The password / its hash never leave the server.
    assert "password" not in body
    assert "password_hash" not in body


async def test_register_duplicate_email_rejected(client: AsyncClient) -> None:
    """A second register with the same email (CITEXT) is rejected (409). @trace FR-AUTH-01"""
    email = unique_email()
    first = await client.post("/api/auth/register", json={"email": email, "password": PASSWORD})
    assert first.status_code == 201

    # Same address, different case: CITEXT makes it a duplicate.
    dup = await client.post(
        "/api/auth/register", json={"email": email.upper(), "password": PASSWORD}
    )
    assert dup.status_code == 409


# --- FR-AUTH-02: login -------------------------------------------------------


async def test_login_success_sets_session_cookie(client: AsyncClient) -> None:
    """Valid credentials set an HttpOnly; SameSite=None cookie + CSRF token; session row exists.

    @trace FR-AUTH-02
    """
    email = unique_email()
    await client.post("/api/auth/register", json={"email": email, "password": PASSWORD})

    resp = await client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert resp.status_code == 200, resp.text

    # A CSRF token is issued.
    assert resp.json()["csrf_token"]

    # The session cookie is set with HttpOnly + SameSite=None.
    session_header = next(
        h
        for h in resp.headers.get_list("set-cookie")
        if h.lower().startswith(SETTINGS.session_cookie_name.lower() + "=")
    ).lower()
    assert "httponly" in session_header
    assert "samesite=none" in session_header
    assert client.cookies.get(SETTINGS.session_cookie_name)

    # A server-side session row now exists for this account.
    assert await _count_sessions_for(email) == 1


async def test_login_wrong_password_rejected(client: AsyncClient) -> None:
    """Wrong password returns 401 and sets no session cookie. @trace FR-AUTH-02"""
    email = unique_email()
    await client.post("/api/auth/register", json={"email": email, "password": PASSWORD})

    resp = await client.post(
        "/api/auth/login", json={"email": email, "password": "wrong-password-9"}
    )
    assert resp.status_code == 401
    # No session cookie set on a failed login.
    assert not resp.headers.get_list("set-cookie")
    assert not client.cookies.get(SETTINGS.session_cookie_name)
    assert await _count_sessions_for(email) == 0


# --- FR-AUTH-03: logout ------------------------------------------------------


async def test_logout_clears_session(client: AsyncClient) -> None:
    """Logout deletes the session row and clears the cookie; old cookie no longer authorizes.

    @trace FR-AUTH-03
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    old_token = client.cookies.get(SETTINGS.session_cookie_name)
    assert old_token
    assert await _count_sessions_for(email) == 1

    resp = await client.post(
        "/api/auth/logout", headers={SETTINGS.csrf_header_name: csrf}
    )
    assert resp.status_code == 204

    # The session row is gone.
    assert await _count_sessions_for(email) == 0
    # The cleared cookie is dropped from the jar...
    assert not client.cookies.get(SETTINGS.session_cookie_name)
    # ...and even replaying the old token no longer authorizes (server-side gone).
    async with make_client() as replay:
        set_session_cookie(replay, old_token)
        me = await replay.get("/api/auth/me")
        assert me.status_code == 401


# --- FR-AUTH-06: protected route ---------------------------------------------


async def test_protected_route_401_without_session(client: AsyncClient) -> None:
    """GET /api/auth/me with no / invalid / expired cookie returns 401. @trace FR-AUTH-06"""
    # No cookie.
    assert (await client.get("/api/auth/me")).status_code == 401

    # Invalid cookie.
    set_session_cookie(client, "not-a-real-token")
    assert (await client.get("/api/auth/me")).status_code == 401

    # Expired session: insert a user + an already-expired session directly.
    email = unique_email()
    expired_token = "expired-" + uuid.uuid4().hex
    async with get_sessionmaker()() as session:
        user_id = await session.scalar(
            text("INSERT INTO users (email, password_hash) VALUES (:email, :ph) RETURNING id"),
            {"email": email, "ph": "unused"},
        )
        await session.execute(
            text(
                "INSERT INTO user_sessions (user_id, token, expires_at) "
                "VALUES (:uid, :tok, :exp)"
            ),
            {
                "uid": user_id,
                "tok": expired_token,
                "exp": datetime.now(timezone.utc) - timedelta(days=1),
            },
        )
        await session.commit()

    async with make_client() as expired_client:
        set_session_cookie(expired_client, expired_token)
        assert (await expired_client.get("/api/auth/me")).status_code == 401


# --- FR-AUTH-07: per-user isolation ------------------------------------------


async def test_current_user_is_isolated() -> None:
    """Each session yields only its own account via the user_id-scoped repo pattern.

    @trace FR-AUTH-07
    @trace NFR-SEC-03
    """
    email_a = unique_email()
    email_b = unique_email()
    async with make_client() as client_a, make_client() as client_b:
        await register_and_login(client_a, email_a)
        await register_and_login(client_b, email_b)

        me_a = await client_a.get("/api/auth/me")
        me_b = await client_b.get("/api/auth/me")
        assert me_a.status_code == 200 and me_b.status_code == 200

        # Each session yields only its own account, never the other's.
        assert me_a.json()["email"] == email_a
        assert me_b.json()["email"] == email_b
        assert me_a.json()["email"] != email_b
        assert me_a.json()["id"] != me_b.json()["id"]


# --- NFR-SEC-02: CSRF double-submit ------------------------------------------


async def test_csrf_required_on_mutation(client: AsyncClient) -> None:
    """A mutating request without the CSRF header is rejected (double-submit). @trace NFR-SEC-02"""
    email = unique_email()
    csrf = await register_and_login(client, email)

    # Mutating request without the CSRF header is rejected (session cookie is sent).
    missing = await client.post("/api/auth/logout")
    assert missing.status_code == 403
    # The mutation did not proceed — the session is still valid.
    assert (await client.get("/api/auth/me")).status_code == 200

    # With the header it succeeds.
    ok = await client.post("/api/auth/logout", headers={SETTINGS.csrf_header_name: csrf})
    assert ok.status_code == 204


# --- NFR-SEC-01: password storage --------------------------------------------


async def test_password_stored_hashed(client: AsyncClient) -> None:
    """Stored password_hash is a bcrypt hash (cost 12), never the plaintext. @trace NFR-SEC-01"""
    email = unique_email()
    await client.post("/api/auth/register", json={"email": email, "password": PASSWORD})

    async with get_sessionmaker()() as session:
        stored = await session.scalar(
            text("SELECT password_hash FROM users WHERE email = :email"), {"email": email}
        )

    assert stored is not None
    assert stored.startswith("$2b$")  # bcrypt hash, not plaintext
    assert PASSWORD not in stored
    assert stored.split("$")[2] == "12"  # cost factor 12 (NFR-SEC-01, architecture §8.1)
