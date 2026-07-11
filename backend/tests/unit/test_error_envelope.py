"""Error-envelope unit tests (Task 1b).

Asserts the ``{error:{code,message,details?}}`` envelope round-trips via
``http_exception_handler`` registered in ``api/app.py`` (INFRA-03, ASVS V7).
"""

from __future__ import annotations

from typing import Any

import httpx
import pytest

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("INFRA-03-UT04")]


async def _force_404(app: Any) -> None:
    """Register a route that raises ``HTTPException(404)`` for the envelope test."""
    from fastapi import HTTPException
    from fastapi.routing import APIRoute

    def _raise_404() -> None:
        raise HTTPException(status_code=404, detail="not found")

    app.router.routes.append(
        APIRoute(
            "/__test_404",
            _raise_404,
            methods=["GET"],
        )
    )


async def _force_500(app: Any) -> None:
    """Register a route that raises a generic Exception to exercise the 500 path."""
    from fastapi.routing import APIRoute

    def _raise_500() -> None:
        raise RuntimeError("boom")

    app.router.routes.append(
        APIRoute(
            "/__test_500",
            _raise_500,
            methods=["GET"],
        )
    )


async def test_http_exception_wraps_to_envelope(app: Any, db_path: Any) -> None:
    """Raising ``HTTPException(status_code=404, detail=\"not found\")`` returns
    the envelope ``{error:{code:\"not_found\",message:\"not found\"}}``.
    """
    await _force_404(app)
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        r = await ac.get("/__test_404")
    assert r.status_code == 404
    body = r.json()
    assert "error" in body
    assert body["error"]["code"] == "not_found"
    assert body["error"]["message"] == "not found"


async def test_envelope_has_no_traceback(app: Any, db_path: Any) -> None:
    """A forced 500 response body does NOT leak ``traceback`` or ``file_path``."""
    # Register the 500 route + a handler that wraps generic Exception too so
    # we get a 500 JSON body instead of a Starlette 500 plaintext page.
    from fastapi import HTTPException, Request
    from fastapi.responses import JSONResponse
    from fastapi.routing import APIRoute

    @app.exception_handler(RuntimeError)
    async def _runtime_handler(_request: Request, exc: RuntimeError) -> JSONResponse:
        # Convert to a 500 HTTPException so it goes through the envelope handler.
        raise HTTPException(status_code=500, detail={"code": "internal_error", "message": "boom"})

    def _raise_500() -> None:
        raise RuntimeError("boom")

    app.router.routes.append(APIRoute("/__test_500", _raise_500, methods=["GET"]))

    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        r = await ac.get("/__test_500")
    body_text = r.text.lower()
    assert "traceback" not in body_text
    assert "file_path" not in body_text
    # Body is the envelope.
    body = r.json()
    assert "error" in body
    assert body["error"]["code"] == "internal_error"
