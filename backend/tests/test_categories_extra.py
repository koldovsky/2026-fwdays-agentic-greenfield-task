"""Supplementary category tests (implementer-owned, not the acceptance bar).

The acceptance bar lives in ``test_categories.py`` (spec 002, one test per OpenSpec
scenario) and is never edited here. This file locks in behavior that bar does not
directly assert but the design ratified or the router wires up:

* the partial-unique-index semantic that an **archived** name can be re-created
  (design "Partial-unique-index semantics" (c); FR-CAT-01);
* input validation and the security wiring the categories router owns — a blank
  name is rejected, mutations require the CSRF double-submit, reads require a
  session (NFR-SEC-02, FR-AUTH-07);
* cross-user list isolation and PATCH partial-update semantics.

DB-touching, so gated behind ``RUN_DB_TESTS=1`` like the acceptance tests. Accounts
use a distinct ``@cat-extra.local`` domain with its own cleanup, so these tests
never interfere with the acceptance suite's ``@cat-test.local`` accounts.
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

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="requires Postgres; run `docker compose up -d db` and set RUN_DB_TESTS=1",
)

TEST_DOMAIN = "@cat-extra.local"
PASSWORD = "correct horse battery"  # >= 8 chars
SETTINGS = get_settings()
COLOR_A = "#3B82F6"
COLOR_B = "#EF4444"


def unique_email() -> str:
    return f"user-{uuid.uuid4().hex}{TEST_DOMAIN}"


def make_client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _csrf(token: str) -> dict[str, str]:
    return {SETTINGS.csrf_header_name: token}


async def register_and_login(client: AsyncClient, email: str) -> str:
    reg = await client.post("/api/auth/register", json={"email": email, "password": PASSWORD})
    assert reg.status_code == 201, reg.text
    login = await client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert login.status_code == 200, login.text
    return str(login.json()["csrf_token"])


async def _create(
    client: AsyncClient, csrf: str, name: str, color: str = COLOR_A
) -> dict[str, object]:
    resp = await client.post(
        "/api/categories",
        json={"name": name, "color": color, "description": "seed"},
        headers=_csrf(csrf),
    )
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


async def test_archived_name_can_be_recreated(client: AsyncClient) -> None:
    """After archiving "Work", a fresh active "Work" is allowed (partial index is partial)."""
    csrf = await register_and_login(client, unique_email())
    first = await _create(client, csrf, "Work")

    archived = await client.delete(f"/api/categories/{first['id']}", headers=_csrf(csrf))
    assert archived.status_code == 204, archived.text

    # The archived row no longer occupies the active (user_id, name) slot.
    again = await client.post(
        "/api/categories", json={"name": "Work", "color": COLOR_B}, headers=_csrf(csrf)
    )
    assert again.status_code == 201, again.text
    assert again.json()["id"] != first["id"]

    # Only the fresh one is active.
    listing = await client.get("/api/categories")
    ids = [c["id"] for c in listing.json()]
    assert again.json()["id"] in ids
    assert first["id"] not in ids


async def test_create_rejects_blank_name(client: AsyncClient) -> None:
    """A whitespace-only name is rejected by validation (422), before any DB write."""
    csrf = await register_and_login(client, unique_email())
    resp = await client.post(
        "/api/categories", json={"name": "   ", "color": COLOR_A}, headers=_csrf(csrf)
    )
    assert resp.status_code == 422, resp.text


async def test_create_requires_csrf(client: AsyncClient) -> None:
    """A mutation without the CSRF double-submit header is rejected (403), even when authed."""
    await register_and_login(client, unique_email())  # session + csrf cookies now set
    resp = await client.post(
        "/api/categories", json={"name": "NoCsrf", "color": COLOR_A}
    )  # deliberately no X-CSRF-Token header
    assert resp.status_code == 403, resp.text


async def test_reads_require_authentication() -> None:
    """GET /api/categories without a session is 401 (the CurrentUser boundary holds)."""
    async with make_client() as anon:
        resp = await anon.get("/api/categories")
        assert resp.status_code == 401, resp.text


async def test_list_excludes_other_users_categories() -> None:
    """User B's active list never contains user A's category (per-user isolation, FR-AUTH-07)."""
    async with make_client() as client_a, make_client() as client_b:
        csrf_a = await register_and_login(client_a, unique_email())
        await register_and_login(client_b, unique_email())
        a_cat = await _create(client_a, csrf_a, "A-only")

        listing = await client_b.get("/api/categories")
        assert listing.status_code == 200, listing.text
        assert all(c["id"] != a_cat["id"] for c in listing.json())


async def test_patch_partial_update_leaves_other_fields(client: AsyncClient) -> None:
    """PATCHing only the description leaves name and color untouched (exclude_unset semantics)."""
    csrf = await register_and_login(client, unique_email())
    created = await _create(client, csrf, "Keep Name")

    resp = await client.patch(
        f"/api/categories/{created['id']}",
        json={"description": "only this changed"},
        headers=_csrf(csrf),
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["name"] == "Keep Name"
    assert body["color"] == COLOR_A
    assert body["description"] == "only this changed"
