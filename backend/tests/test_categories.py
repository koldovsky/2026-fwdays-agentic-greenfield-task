"""End-to-end category CRUD tests (spec 002 acceptance checks).

Each test drives the real HTTP endpoints in-process against a real Postgres, so it
exercises the categories router, the user_id-scoped repository, the partial unique
index ``UNIQUE(user_id, name) WHERE archived_at IS NULL`` and delete-as-archive — not
just imports. DB-touching, so gated behind ``RUN_DB_TESTS=1`` like the auth tests.

The scenarios come from ``openspec/changes/add-categories/specs/categories/spec.md``
(FR-CAT-01/02/03), one test per scenario. Delete is encoded as its ratified *observable*
contract: archiving sets ``archived_at`` and drops the row from the active list. The
``sessions`` table does not exist until a later slice, so a physical hard-delete is never
asserted — only "gone from the active list" — per the change's design Open questions.

Every account uses the ``@cat-test.local`` domain and is removed by the autouse cleanup
fixture; the ``categories.user_id`` FK cascade drops that user's categories with them.
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

TEST_DOMAIN = "@cat-test.local"
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


async def _user_id(client: AsyncClient) -> int:
    """The authenticated user's id via GET /api/auth/me."""
    me = await client.get("/api/auth/me")
    assert me.status_code == 200, me.text
    return int(me.json()["id"])


async def _create(
    client: AsyncClient,
    csrf: str,
    name: str,
    color: str = COLOR_A,
    description: str = "focused blocks",
) -> dict[str, object]:
    """POST a category and return the created body (asserts 201)."""
    resp = await client.post(
        "/api/categories",
        json={"name": name, "color": color, "description": description},
        headers=_csrf(csrf),
    )
    assert resp.status_code == 201, resp.text
    body: dict[str, object] = resp.json()
    return body


async def _archived_at(cat_id: int) -> object:
    async with get_sessionmaker()() as session:
        return await session.scalar(
            text("SELECT archived_at FROM categories WHERE id = :id"), {"id": cat_id}
        )


async def _row_name(cat_id: int) -> object:
    async with get_sessionmaker()() as session:
        return await session.scalar(
            text("SELECT name FROM categories WHERE id = :id"), {"id": cat_id}
        )


async def _row_owner(cat_id: int) -> object:
    async with get_sessionmaker()() as session:
        return await session.scalar(
            text("SELECT user_id FROM categories WHERE id = :id"), {"id": cat_id}
        )


async def _count_named(user_id: int, name: str) -> int:
    async with get_sessionmaker()() as session:
        count = await session.scalar(
            text("SELECT count(*) FROM categories WHERE user_id = :uid AND name = :name"),
            {"uid": user_id, "name": name},
        )
    return int(count or 0)


@pytest.fixture(autouse=True)
async def _cleanup_test_users() -> AsyncIterator[None]:
    yield
    async with get_sessionmaker()() as session:
        await session.execute(
            text("DELETE FROM users WHERE email LIKE :pat"), {"pat": f"%{TEST_DOMAIN}"}
        )
        await session.commit()


# --- FR-CAT-01: create a category --------------------------------------------


async def test_create_category_happy_path(client: AsyncClient) -> None:
    """POST /api/categories creates a row owned by the user and responds 201.

    @trace FR-CAT-01
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)

    resp = await client.post(
        "/api/categories",
        json={"name": "Deep Work", "color": COLOR_A, "description": "focused blocks"},
        headers=_csrf(csrf),
    )
    assert resp.status_code == 201, resp.text

    body = resp.json()
    assert body["name"] == "Deep Work"
    assert body["color"] == COLOR_A
    assert body["description"] == "focused blocks"
    assert isinstance(body["id"], int)

    # The persisted row belongs to this authenticated user (per-user ownership).
    assert await _row_owner(body["id"]) == user_id


async def test_same_name_allowed_for_two_users() -> None:
    """Two different users may each own an active category with the same name (201 + 201).

    @trace FR-CAT-01
    """
    email_a = unique_email()
    email_b = unique_email()
    async with make_client() as client_a, make_client() as client_b:
        csrf_a = await register_and_login(client_a, email_a)
        csrf_b = await register_and_login(client_b, email_b)

        resp_a = await client_a.post(
            "/api/categories", json={"name": "Work", "color": COLOR_A}, headers=_csrf(csrf_a)
        )
        assert resp_a.status_code == 201, resp_a.text

        # The partial unique index is scoped (user_id, name), so B's "Work" is allowed.
        resp_b = await client_b.post(
            "/api/categories", json={"name": "Work", "color": COLOR_B}, headers=_csrf(csrf_b)
        )
        assert resp_b.status_code == 201, resp_b.text


async def test_duplicate_active_name_rejected(client: AsyncClient) -> None:
    """A second active category with a duplicate name for the same user is rejected (409).

    @trace FR-CAT-01
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    user_id = await _user_id(client)

    first = await client.post(
        "/api/categories", json={"name": "Work", "color": COLOR_A}, headers=_csrf(csrf)
    )
    assert first.status_code == 201, first.text

    dup = await client.post(
        "/api/categories", json={"name": "Work", "color": COLOR_B}, headers=_csrf(csrf)
    )
    assert dup.status_code == 409, dup.text

    # The partial unique index surfaces as 409, not a second row.
    assert await _count_named(user_id, "Work") == 1


# --- FR-CAT-02: edit a category ----------------------------------------------


async def test_edit_updates_name_color_description(client: AsyncClient) -> None:
    """PATCH updates name, color, and description and responds 200 with the updated category.

    @trace FR-CAT-02
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    created = await _create(client, csrf, "Old Name", COLOR_A, "old description")
    cat_id = created["id"]

    resp = await client.patch(
        f"/api/categories/{cat_id}",
        json={"name": "New Name", "color": COLOR_B, "description": "new description"},
        headers=_csrf(csrf),
    )
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert body["id"] == cat_id
    assert body["name"] == "New Name"
    assert body["color"] == COLOR_B
    assert body["description"] == "new description"


async def test_rename_onto_existing_active_name_rejected(client: AsyncClient) -> None:
    """Renaming a category onto another active name is rejected (409); both rows unchanged.

    @trace FR-CAT-02
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    work = await _create(client, csrf, "Work", COLOR_A)
    study = await _create(client, csrf, "Study", COLOR_B)

    resp = await client.patch(
        f"/api/categories/{study['id']}", json={"name": "Work"}, headers=_csrf(csrf)
    )
    assert resp.status_code == 409, resp.text

    # The collision leaves both categories exactly as they were.
    assert await _row_name(work["id"]) == "Work"
    assert await _row_name(study["id"]) == "Study"


async def test_user_cannot_edit_another_users_category() -> None:
    """User B PATCHing user A's category responds 404 and changes nothing.

    @trace FR-CAT-02
    """
    email_a = unique_email()
    email_b = unique_email()
    async with make_client() as client_a, make_client() as client_b:
        csrf_a = await register_and_login(client_a, email_a)
        csrf_b = await register_and_login(client_b, email_b)
        cat = await _create(client_a, csrf_a, "A-owned", COLOR_A, "original")

        resp = await client_b.patch(
            f"/api/categories/{cat['id']}",
            json={"name": "hijacked", "color": COLOR_B, "description": "changed"},
            headers=_csrf(csrf_b),
        )
        # The user_id-scoped repo never returns another user's row, so it is 404, not 403.
        assert resp.status_code == 404, resp.text

        # A's category is untouched.
        assert await _row_name(cat["id"]) == "A-owned"


# --- FR-CAT-03: delete a category as archive ---------------------------------


async def test_delete_archives_category(client: AsyncClient) -> None:
    """DELETE returns 204, sets archived_at, and the category leaves the active list.

    @trace FR-CAT-03
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create(client, csrf, "To Archive", COLOR_A)
    cat_id = cat["id"]

    resp = await client.delete(f"/api/categories/{cat_id}", headers=_csrf(csrf))
    assert resp.status_code == 204, resp.text

    # The row survives as a valid FK target with archived_at set (the "archives it" guarantee).
    assert await _archived_at(cat_id) is not None

    # And it no longer appears in the active list any picker consumes.
    listing = await client.get("/api/categories")
    assert listing.status_code == 200, listing.text
    assert all(c["id"] != cat_id for c in listing.json())


async def test_archived_category_excluded_from_active_list(client: AsyncClient) -> None:
    """GET /api/categories returns only the active category, never the archived one.

    @trace FR-CAT-03
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    archived = await _create(client, csrf, "Archived One", COLOR_A)
    active = await _create(client, csrf, "Active One", COLOR_B)

    delete = await client.delete(
        f"/api/categories/{archived['id']}", headers=_csrf(csrf)
    )
    assert delete.status_code == 204, delete.text

    listing = await client.get("/api/categories")
    assert listing.status_code == 200, listing.text
    ids = [c["id"] for c in listing.json()]
    assert active["id"] in ids
    assert archived["id"] not in ids


async def test_delete_category_with_no_sessions_removed_from_active_list(
    client: AsyncClient,
) -> None:
    """Deleting a category with no sessions responds 204 and drops it from the active list.

    Only the weaker observable guarantee is asserted (gone from the active list) — archive
    and hard-delete both satisfy "may be hard-deleted", so the physical row is not probed.

    @trace FR-CAT-03
    """
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create(client, csrf, "No Sessions", COLOR_A)
    cat_id = cat["id"]

    resp = await client.delete(f"/api/categories/{cat_id}", headers=_csrf(csrf))
    assert resp.status_code == 204, resp.text

    listing = await client.get("/api/categories")
    assert listing.status_code == 200, listing.text
    assert all(c["id"] != cat_id for c in listing.json())


async def test_user_cannot_delete_another_users_category() -> None:
    """User B DELETEing user A's category responds 404 and changes nothing.

    @trace FR-CAT-03
    """
    email_a = unique_email()
    email_b = unique_email()
    async with make_client() as client_a, make_client() as client_b:
        csrf_a = await register_and_login(client_a, email_a)
        csrf_b = await register_and_login(client_b, email_b)
        cat = await _create(client_a, csrf_a, "A-owned", COLOR_A)

        resp = await client_b.delete(
            f"/api/categories/{cat['id']}", headers=_csrf(csrf_b)
        )
        # The user_id-scoped repo never returns another user's row, so it is 404, not 403.
        assert resp.status_code == 404, resp.text

        # A's category is untouched — not archived.
        assert await _archived_at(cat["id"]) is None
