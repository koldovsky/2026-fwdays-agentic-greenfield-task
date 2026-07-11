"""StaticFiles-serving unit tests (Task 1, D-03 prod path).

The production image (repo-root ``Dockerfile``) bakes ``frontend/out/``
into the image at ``/app/frontend/out`` and FastAPI mounts the
``StaticFiles(directory=..., html=True)`` at ``/`` when
``EPUBTV_SERVE_STATIC=true``. The 3 tests assert:

  - ``GET /`` returns the ``index.html`` content (the SPA entry point).
  - ``GET /_next/static/test.js`` returns the JS asset content (the
    ``_next/static/`` tree is served by StaticFiles).
  - ``GET /api/v1/jobs`` returns the API JSON — proves the router
    registration order keeps the routers ahead of the StaticFiles
    catch-all (Pitfall 2 in the research).

The fixture writes a small SPA tree into a per-test tmp dir + flips
``settings.serve_static = True`` + points ``settings.frontend_out``
at the tmp dir, then constructs the FastAPI app.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("INFRA-01-UT11")]


@pytest_asyncio.fixture
async def static_app(db_path: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Any:
    """Construct the FastAPI app with ``serve_static`` flipped on.

    Writes a tiny SPA tree into ``tmp_path`` (an ``index.html`` + a
    ``_next/static/test.js`` file) so the StaticFiles mount has
    something to serve.
    """
    from epubtv.config import settings

    # Tiny SPA tree.
    index_html = tmp_path / "index.html"
    index_html.write_text("<!doctype html><html><body>epubtv</body></html>", encoding="utf-8")
    next_dir = tmp_path / "_next" / "static"
    next_dir.mkdir(parents=True, exist_ok=True)
    (next_dir / "test.js").write_text("console.log('epubtv');", encoding="utf-8")

    monkeypatch.setattr(settings, "serve_static", True)
    monkeypatch.setattr(settings, "frontend_out", tmp_path)

    from epubtv.api.app import create_app

    return create_app()


async def test_get_root_returns_index_html(static_app: Any, db_path: Path) -> None:
    """``GET /`` returns the ``index.html`` content from the StaticFiles mount."""
    from epubtv.api.app import lifespan

    async with lifespan(static_app):
        transport = ASGITransport(app=static_app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/")
        assert resp.status_code == 200, resp.text
        assert "epubtv" in resp.text
        assert "<html>" in resp.text


async def test_get_next_static_asset_returns_js(static_app: Any, db_path: Path) -> None:
    """``GET /_next/static/test.js`` returns the JS asset (StaticFiles walks the tree)."""
    from epubtv.api.app import lifespan

    async with lifespan(static_app):
        transport = ASGITransport(app=static_app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/_next/static/test.js")
        assert resp.status_code == 200, resp.text
        assert "console.log" in resp.text


async def test_get_api_route_wins_over_staticfiles(static_app: Any, db_path: Path) -> None:
    """``GET /api/v1/jobs`` returns the API JSON (router > StaticFiles catch-all)."""
    from epubtv.api.app import lifespan

    async with lifespan(static_app):
        transport = ASGITransport(app=static_app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/jobs")
        # The jobs router is registered; it returns 200 + a list of
        # jobs (empty in the test env). The key assertion is that the
        # response is JSON, NOT the SPA's index.html (which would be
        # the StaticFiles fallback).
        assert resp.status_code == 200, resp.text
        assert resp.headers["content-type"].startswith("application/json")
        body = resp.json()
        assert "jobs" in body
        assert isinstance(body["jobs"], list)
