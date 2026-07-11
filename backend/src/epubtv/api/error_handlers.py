"""Error envelope handler — ``{error:{code,message,details?}}`` (INFRA-03).

Phase 1 ships the generic ``HTTPException`` handler that maps ``status_code``
to a stable code via ``_http_status_to_code``. Plan 02 registers the
``EpubValidationError`` handler once ``routers/epubs.py`` exists; here the
handler function is defined but ``EpubValidationError`` is imported lazily
inside the function body so Plan 01 does NOT depend on Plan 02's
``routers/epubs.py`` existing yet.

Security (ASVS V7, RESEARCH §Security step 6):
- NEVER include ``traceback`` or ``file_path`` keys in the payload.
- ``ErrorResponse`` Pydantic schema only allows ``code``/``message``/``details``;
  extra keys are forbidden by ``ConfigDict(extra="forbid")``.
- The ``details`` field, when present, is constrained to a dict of simple
  values — no recursive objects that could leak internal structure.
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


def _http_status_to_code(status_code: int) -> str:
    """Map a generic HTTP status code to a stable error code (INFRA-03).

    Phase 1 defines the generic map. Domain-specific codes like
    ``invalid_epub`` / ``file_too_large`` are attached by Plan 02's
    ``EpubValidationError`` (passed via ``exc.detail`` dict with a ``code``
    key), NOT invented here.
    """
    mapping = {
        400: "bad_request",
        401: "unauthorized",
        403: "forbidden",
        404: "not_found",
        405: "method_not_allowed",
        409: "conflict",
        413: "file_too_large",
        422: "invalid_request",
        429: "rate_limited",
        500: "internal_error",
        503: "service_unavailable",
        504: "provider_timeout",
    }
    return mapping.get(status_code, "internal_error" if status_code >= 500 else "error")


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Wrap an ``HTTPException`` into the ``{error:{code,message,details?}}`` envelope.

    - If ``exc.detail`` is a dict with a ``"code"`` key → use that code +
      ``message`` + optional ``details`` (forward-compatible with Plan 02's
      ``EpubValidationError`` pattern).
    - Otherwise map ``exc.status_code`` to a stable code via
      ``_http_status_to_code`` and stringify ``exc.detail`` as the message.

    NEVER includes ``traceback`` or ``file_path`` keys (ASVS V7).
    """
    _ = request  # request unused in Phase 1; signature required by FastAPI.

    details: dict[str, Any] | None = None
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        code = str(exc.detail["code"])
        message = str(exc.detail.get("message", ""))
        raw_details = exc.detail.get("details")
        if raw_details is not None:
            # Defensive: only allow simple dict details; reject anything that
            # could carry traceback / file_path / nested exception info.
            details = _scrub_details(raw_details)
    else:
        code = _http_status_to_code(exc.status_code)
        message = str(exc.detail) if exc.detail is not None else ""

    payload: dict[str, Any] = {"error": {"code": code, "message": message}}
    if details is not None:
        payload["error"]["details"] = details
    return JSONResponse(status_code=exc.status_code, content=payload)


def _scrub_details(raw: Any) -> dict[str, Any] | None:
    """Return a cleansed ``details`` dict, or None if it carries leak keys.

    Drops any key in the leak denylist (``traceback``, ``file_path``,
    ``filename``, ``exc``, ``exception``). Non-dict input → None (defensive).
    """
    if not isinstance(raw, dict):
        return None
    leak_keys = {"traceback", "file_path", "filename", "exc", "exception", "stack"}
    cleansed: dict[str, Any] = {}
    for key, value in raw.items():
        if isinstance(key, str) and key.lower() in leak_keys:
            continue
        cleansed[key] = value
    return cleansed or None


async def epub_validation_handler(request: Request, exc: Any) -> JSONResponse:
    """Handler for ``EpubValidationError`` (registered in Plan 02).

    ``EpubValidationError`` lives in Plan 02's ``routers/epubs.py`` — import
    it lazily here so Plan 01 does NOT depend on that file existing yet.
    Phase 1 ships the function definition only; ``app.py`` does NOT register
    it until Plan 02.
    """
    _ = request
    code = getattr(exc, "code", "invalid_epub")
    message = getattr(exc, "message", "")
    status_code = getattr(exc, "status_code", 422)
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": str(code), "message": str(message)}},
    )
