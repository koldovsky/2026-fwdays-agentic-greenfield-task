"""``GET /api/v1/epubs/{epub_id}`` HTTP endpoint unit tests (TDD Task 2 RED).

Covers the D-06 SPA prefill: the response shape feeds the
``<TranslationConfigStep>`` source-language prefill. 404 for unknown
``epub_id`` (not_found envelope).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx
import pytest

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("EPUB-02-UT05")]


async def test_get_epub_returns_metadata_shape(app: Any, db_path: Any) -> None:
    """``GET /api/v1/epubs/{id}`` returns the 6-field metadata shape."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        # Upload the fixture first.
        fixtures = Path(__file__).resolve().parents[1] / "fixtures" / "epubs"
        payload = (fixtures / "mystere-nocturne.epub").read_bytes()
        r_post = await ac.post(
            "/api/v1/epubs",
            files={"file": ("mystere-nocturne.epub", payload, "application/epub+zip")},
        )
        assert r_post.status_code == 200
        epub_id = r_post.json()["epub_id"]

        r = await ac.get(f"/api/v1/epubs/{epub_id}")
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == {
        "epub_id",
        "title",
        "author",
        "declared_languages",
        "chapter_count",
        "chapter_ids",
    }
    assert body["epub_id"] == epub_id
    assert "fr" in body["declared_languages"]  # mystere-nocturne declares fr
    assert body["chapter_count"] > 0
    assert len(body["chapter_ids"]) == body["chapter_count"]


async def test_get_epub_unknown_id_returns_404(app: Any, db_path: Any) -> None:
    """``GET /api/v1/epubs/{unknown}`` returns 404 not_found envelope."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        r = await ac.get("/api/v1/epubs/unknown-id")
    assert r.status_code == 404
    body = r.json()
    assert body["error"]["code"] == "not_found"
