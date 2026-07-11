"""Voices router unit tests (plan 03-03, refactor).

The OpenAI voice catalog is a fixed set (D-07 + per OpenAI's published
voice list); there is no per-language provider endpoint to call. The
router exposes the canonical voice list as a flat ``{voices: [...]}``
response (no ``language`` query parameter — the previous per-language
lookup + ``VOICES_BY_LANGUAGE`` dict were retired when the canned
provider voices were dropped).

The router is mounted at ``/api/v1`` in ``api/app.py``; tests hit the
full path via ``httpx.ASGITransport``.
"""

from __future__ import annotations

from typing import Any

import httpx
import pytest

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("VOICE-01-UT10")]


async def test_list_voices_returns_flat_catalog(app: Any, db_path: Any) -> None:
    """``GET /api/v1/voices`` returns ``{"voices": [...]}`` (flat list)."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        r = await ac.get("/api/v1/voices")
    assert r.status_code == 200, r.text
    body = r.json()
    assert "voices" in body, f"expected 'voices' key, got: {body!r}"
    voices = body["voices"]
    assert isinstance(voices, list)
    assert len(voices) > 0
    # Voices are a non-empty list of non-empty strings.
    for v in voices:
        assert isinstance(v, str) and v


async def test_list_voices_response_is_deterministic(app: Any, db_path: Any) -> None:
    """The voice list is stable across calls (no upstream call)."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        first = (await ac.get("/api/v1/voices")).json()["voices"]
        second = (await ac.get("/api/v1/voices")).json()["voices"]
    assert first == second


async def test_list_voices_includes_alloy(app: Any, db_path: Any) -> None:
    """``alloy`` is the canonical OpenAI voice — sanity guard."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        body = (await ac.get("/api/v1/voices")).json()
    assert "alloy" in body["voices"]
