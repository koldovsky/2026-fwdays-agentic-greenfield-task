"""Provider model-catalog + default-base-URL endpoints.

The model-catalog endpoints (Phase 1 plan 01-04 — BACK-03 + BACK-05)
call the canonical provider Python client at request time and return
the model catalog from the provider:

- ``POST /api/v1/providers/openai-compatible/models`` with body
  ``{base_url: str, api_key: str}`` calls
  ``await openai.AsyncOpenAI(base_url=base_url, api_key=api_key,
  timeout=10.0, max_retries=0).models.list()`` and returns the
  OpenAI ``SyncPage[Model]`` response shape as
  ``{"models": [{"id": str, "object": "model", "created": int,
  "owned_by": str}, ...]}``.

- ``POST /api/v1/providers/ollama/models`` with body
  ``{base_url: str}`` calls
  ``await ollama.AsyncClient(host=base_url, timeout=10.0).list()`` and
  returns the Ollama ``ListResponse`` shape as
  ``{"models": [{"name": str, ...}, ...]}``.

The default-base-URL endpoints (quick 260708-t1t) surface the
runtime-configured ``settings.default_ollama_url`` and
``settings.default_openai_url`` as GET endpoints so the SPA can
read them at mount time instead of baking buildtime env vars into
the static export:

- ``GET /api/v1/providers/ollama/base-url`` →
  ``{"base_url": settings.default_ollama_url}``
- ``GET /api/v1/providers/openai-compatible/base-url`` →
  ``{"base_url": settings.default_openai_url}``

The two default URLs are public (per the old
``buildtimeDefaults.ts`` docstring: ``http://localhost:11434/v1`` for
the local Ollama default + ``https://api.openai.com/v1`` for
OpenAI); the endpoints are unauthenticated, same posture as the
model-catalog GET endpoints in the prior shape.

Per BACK-03 + BACK-05, the model-catalog endpoints return the actual
model catalog from the provider at request time — no hardcoded
fallback list. A connection failure raises 502 ``provider_unreachable``
with the provider's error message in the envelope's
``details.provider_error`` field. The legacy GET endpoint (removed
in plan 01-01 Task 2) is NOT re-introduced.

Implementation contract (per ADR-0012 + CR-02):
- The OpenAI SDK's async ``AsyncOpenAI`` client is the canonical
  seam for talking to any OpenAI-compatible endpoint. ``timeout=10.0`` +
  ``max_retries=0`` (single-shot) caps each request at ≤10s
  wall-clock. ``APIConnectionError`` covers both
  ``APIConnectionError`` + ``APITimeoutError`` (the latter is a
  subclass). ``AuthenticationError`` (HTTP 401 from the upstream)
  is mapped to the same ``provider_unreachable`` envelope so a
  stale key surfaces as a 502 with the SDK message.
- The Ollama SDK's async ``AsyncClient`` is the canonical Ollama
  client (``ollama.AsyncClient(host=...)``); ``timeout=10.0`` caps
  each request. ``ollama.ResponseError`` (HTTP error) and the
  Python builtin ``ConnectionError`` (connect-refused, raised by
  the underlying ``httpx`` library the Ollama SDK uses — the SDK
  converts ``httpx.ConnectError`` → ``ConnectionError`` at the
  public surface) map to the same envelope.
- Both endpoints ``await`` the SDK method directly; the FastAPI
  event loop is not blocked because the async clients release the
  loop while waiting on the socket (CR-02 — the prior sync
  client + ``asyncio.to_thread`` wrapping is gone).

The ``api_key`` field on the OpenAI-compatible endpoint is NEVER
logged (PRD §6 "API keys session-only, never persisted, never
logged"). The structured-logger field is opt-in; the route
handlers do not log the body.
"""

from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlparse

import ollama
import openai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from epubtv.api.error_codes import PROVIDER_UNREACHABLE
from epubtv.config import settings

_logger = logging.getLogger(__name__)

# Allowed URL schemes for ``base_url`` request bodies. Local
# addresses (127.0.0.1, ::1, private RFC1918 ranges) are
# intentionally NOT blocked — the demo container's mock-llm
# service is reached via in-network DNS at
# ``http://mock-llm:8765/v1`` and a user probing their own
# host is not a threat model here.
_ALLOWED_SCHEMES = ("http", "https")


def _validate_base_url_scheme(base_url: str) -> None:
    """Reject ``base_url`` values that are not HTTP(S).

    The two ``POST /api/v1/providers/{ollama,openai-compatible}/models``
    endpoints call the canonical provider Python SDK at request
    time using the user-supplied ``base_url``. Constraining the
    scheme to HTTP(S) at the request layer prevents trivial SSRF
    vectors (e.g. ``file://``, ``ftp://``, ``gopher://``) without
    restricting the user's choice of host (loopback, RFC1918,
    in-network DNS names like ``mock-llm`` are all allowed).
    """
    scheme = urlparse(base_url).scheme.lower()
    if scheme not in _ALLOWED_SCHEMES:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "invalid_base_url_scheme",
                "message": (
                    f"base_url scheme {scheme!r} is not allowed; "
                    f"use one of {list(_ALLOWED_SCHEMES)}"
                ),
                "details": {"scheme": scheme},
            },
        )


# Module-local aliases for the SDK client classes. The endpoints
# reference ``_OllamaClient`` + ``_OpenAIClient`` (NOT
# ``ollama.AsyncClient`` / ``openai.AsyncOpenAI``) so unit tests
# can ``monkeypatch.setattr`` the names below without affecting
# the rest of the codebase (the lifespan's
# ``OllamaHttpTranslationAdapter`` + ``OpenAIHttpTranslationAdapter``
# import ``ollama`` / ``openai`` directly and would otherwise see
# the fake class). Per CR-02 the providers router uses the async
# SDKs end-to-end so the FastAPI event loop is never blocked.
_OllamaClient = ollama.AsyncClient
_OpenAIClient = openai.AsyncOpenAI

router = APIRouter()


# ---------------------------------------------------------------------------
# Request body models (Pydantic v2)
# ---------------------------------------------------------------------------


class OpenAIProviderModelsBody(BaseModel):
    """``POST /api/v1/providers/openai-compatible/models`` body.

    - ``base_url``: the OpenAI-compatible endpoint base URL (e.g.
      ``https://api.openai.com/v1`` or ``http://localhost:11434/v1``
      for an Ollama instance speaking the OpenAI wire shape).
    - ``api_key``: the user's OpenAI-compatible API key. Session-
      only; never persisted; never logged (PRD §6).
    """

    model_config = ConfigDict(extra="forbid")

    base_url: str = Field(min_length=1)
    api_key: str = Field(min_length=1)


class OllamaProviderModelsBody(BaseModel):
    """``POST /api/v1/providers/ollama/models`` body.

    - ``base_url``: the Ollama endpoint base URL (e.g.
      ``http://localhost:11434``).
    """

    model_config = ConfigDict(extra="forbid")

    base_url: str = Field(min_length=1)


# ---------------------------------------------------------------------------
# Response shape models (Pydantic v2, also used as the wire format)
# ---------------------------------------------------------------------------


class OpenAIModelEntry(BaseModel):
    """Single OpenAI-style model entry (matches the SDK's ``Model`` shape)."""

    model_config = ConfigDict(extra="forbid")

    id: str
    object: str
    created: int
    owned_by: str


class OpenAIModelsResponse(BaseModel):
    """``POST /api/v1/providers/openai-compatible/models`` 200 response."""

    model_config = ConfigDict(extra="forbid")

    models: list[OpenAIModelEntry]


class OllamaModelEntry(BaseModel):
    """Single Ollama-style model entry.

    The Ollama SDK's ``ListResponse.Model`` exposes ``model`` as
    the canonical name field; the wire format (per the Ollama REST
    API at ``GET /api/tags``) uses ``name``. The endpoint maps the
    SDK field to ``name`` so the SPA branches on the same key
    across the OpenAI + Ollama response shapes.
    """

    model_config = ConfigDict(extra="forbid")

    name: str


class OllamaModelsResponse(BaseModel):
    """``POST /api/v1/providers/ollama/models`` 200 response."""

    model_config = ConfigDict(extra="forbid")

    models: list[OllamaModelEntry]


# ---------------------------------------------------------------------------
# Mapping helpers (private to the module)
# ---------------------------------------------------------------------------


def _format_openai_models(raw_models: Any) -> list[dict[str, Any]]:
    """Map the OpenAI SDK's ``SyncPage[Model]`` to plain dicts.

    The SDK exposes ``Model`` objects (Pydantic models) with
    ``id`` / ``object`` / ``created`` / ``owned_by`` fields. The
    endpoint returns a plain ``list[dict]`` so the wire shape
    does not leak the SDK type to the SPA.
    """
    out: list[dict[str, Any]] = []
    for m in raw_models:
        out.append(
            {
                "id": str(getattr(m, "id", "")),
                "object": str(getattr(m, "object", "model")),
                "created": int(getattr(m, "created", 0)),
                "owned_by": str(getattr(m, "owned_by", "")),
            },
        )
    return out


def _format_ollama_models(raw_models: Any) -> list[dict[str, Any]]:
    """Map the Ollama SDK's ``ListResponse.Model`` list to plain dicts.

    The SDK uses ``model`` as the canonical name field on the
    response object; the wire format uses ``name``. The endpoint
    maps SDK ``model`` → wire ``name`` so the SPA reads the same
    key across the OpenAI + Ollama response shapes.
    """
    out: list[dict[str, Any]] = []
    for m in raw_models:
        name = getattr(m, "model", None) or getattr(m, "name", None) or ""
        out.append({"name": str(name)})
    return out


# ---------------------------------------------------------------------------
# Error mapping helper (private to the module)
# ---------------------------------------------------------------------------


def _raise_provider_unreachable(provider: str, exc: BaseException) -> None:
    """Raise 502 ``provider_unreachable`` with the SDK's error message.

    The ``provider`` string is the human-readable label
    (``"openai-compatible"`` or ``"ollama"``) — it surfaces in the
    log line for ops triage but is NOT included in the envelope
    (the envelope's ``code`` is the stable contract; the
    ``message`` is the SDK's own error string).
    """
    _logger.warning(
        "provider_unreachable",
        extra={"provider": provider, "error": str(exc) or exc.__class__.__name__},
    )
    raise HTTPException(
        status_code=502,
        detail={
            "code": PROVIDER_UNREACHABLE,
            "message": str(exc) or exc.__class__.__name__,
            "details": {"provider_error": str(exc) or exc.__class__.__name__},
        },
    ) from exc


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/providers/openai-compatible/models",
    response_model=OpenAIModelsResponse,
)
async def list_openai_compatible_models(
    body: OpenAIProviderModelsBody,
) -> OpenAIModelsResponse:
    """List the OpenAI-compatible provider's model catalog.

    Per BACK-03, this endpoint calls the OpenAI Python SDK at
    request time and returns the model catalog from the
    upstream provider. A 502 ``provider_unreachable`` is returned
    on a connection failure (or an upstream auth failure —
    ``AuthenticationError``) with the SDK's error message in
    ``details.provider_error``.
    """
    _validate_base_url_scheme(body.base_url)
    client = _OpenAIClient(
        base_url=body.base_url,
        api_key=body.api_key,
        timeout=10.0,
        max_retries=0,
    )
    page: Any = None
    try:
        # ``openai.AsyncOpenAI`` is awaited end-to-end — the
        # FastAPI event loop is not blocked because the ``await``
        # releases the loop while the SDK waits on the socket
        # (CR-02 — the prior ``asyncio.to_thread`` wrapper is
        # gone). The exception handlers all raise (via
        # ``_raise_provider_unreachable``) so control never falls
        # through to ``page`` being unbound on the success path.
        try:
            page = await client.models.list()
        except (openai.APIConnectionError, openai.AuthenticationError) as exc:
            _raise_provider_unreachable("openai-compatible", exc)
        except openai.APIError as exc:
            # Catch the SDK's broader APIError parent so non-
            # connection / non-auth upstream failures (HTTP 4xx/5xx
            # that don't subclass the narrow types above, rate-limit
            # errors, server errors) also map to the
            # ``provider_unreachable`` envelope.
            _raise_provider_unreachable("openai-compatible", exc)
        except Exception as exc:
            # Final catch-all so unexpected SDK exceptions
            # (serialization errors, malformed responses) do not
            # leak a 500 with a stack trace to the SPA.
            _raise_provider_unreachable("openai-compatible", exc)
    finally:
        # The async ``AsyncOpenAI`` client's ``close()`` is itself
        # awaitable; we ``await`` it directly so the underlying
        # ``httpx.AsyncClient`` the SDK owns is released.
        await client.close()

    return OpenAIModelsResponse(models=_format_openai_models(page.data))


@router.post(
    "/providers/ollama/models",
    response_model=OllamaModelsResponse,
)
async def list_ollama_models(
    body: OllamaProviderModelsBody,
) -> OllamaModelsResponse:
    """List the Ollama provider's model catalog.

    Per BACK-05, this endpoint calls the Ollama Python SDK at
    request time and returns the model catalog from the upstream
    provider. A 502 ``provider_unreachable`` is returned on a
    connection failure (or HTTP error) with the SDK's error
    message in ``details.provider_error``.
    """
    _validate_base_url_scheme(body.base_url)
    client = _OllamaClient(host=body.base_url, timeout=10.0)
    response: Any = None
    try:
        # ``ollama.AsyncClient`` is awaited end-to-end — the
        # FastAPI event loop is not blocked because the ``await``
        # releases the loop while the SDK waits on the socket
        # (CR-02 — the prior ``asyncio.to_thread`` wrapper is
        # gone). The exception handlers all raise so control
        # never falls through to ``response`` being unbound on
        # the success path.
        try:
            response = await client.list()
        except (ollama.ResponseError, ConnectionError) as exc:
            # The Ollama SDK converts ``httpx.ConnectError`` →
            # Python builtin ``ConnectionError`` at the public
            # surface (per the SDK's ``_client.py`` source).
            _raise_provider_unreachable("ollama", exc)
        except Exception as exc:
            # Final catch-all so unexpected SDK exceptions
            # (serialization errors, malformed responses) do not
            # leak a 500 with a stack trace to the SPA.
            _raise_provider_unreachable("ollama", exc)
    finally:
        # The async ``AsyncClient`` exposes ``close()`` (async,
        # named like httpx's sync client rather than httpx's async
        # ``aclose()``); the SDK releases its underlying
        # ``httpx.AsyncClient`` pool. Safe to call multiple
        # times — the SDK's ``close()`` is idempotent.
        await client.close()

    return OllamaModelsResponse(models=_format_ollama_models(response.models))


# ---------------------------------------------------------------------------
# Default base-URL endpoints (quick 260708-t1t)
# ---------------------------------------------------------------------------


class ProviderBaseUrlResponse(BaseModel):
    """``GET /api/v1/providers/{ollama,openai-compatible}/base-url`` 200 response.

    The SPA reads the runtime-configured default base URL from this
    endpoint at mount time, replacing the buildtime
    ``NEXT_PUBLIC_DEFAULT_*_URL`` env vars. The value is a public
    URL (``http://localhost:11434/v1`` for the Ollama default,
    ``https://api.openai.com/v1`` for the OpenAI default) so the
    endpoint is unauthenticated, same posture as the model-catalog
    GET endpoints in the prior shape.
    """

    model_config = ConfigDict(extra="forbid")

    base_url: str


@router.get(
    "/providers/ollama/base-url",
    response_model=ProviderBaseUrlResponse,
)
def get_ollama_default_base_url() -> ProviderBaseUrlResponse:
    """Return the runtime-configured default Ollama base URL.

    Reads ``settings.default_ollama_url`` (the Pydantic settings
    singleton, resolved from ``EPUBTV_DEFAULT_OLLAMA_URL`` /
    ``DEFAULT_OLLAMA_URL`` env vars per ``config.py``). The handler
    is sync (no I/O, no provider call) — the value is cached on
    the settings object at process start.
    """
    return ProviderBaseUrlResponse(base_url=settings.default_ollama_url)


@router.get(
    "/providers/openai-compatible/base-url",
    response_model=ProviderBaseUrlResponse,
)
def get_openai_compatible_default_base_url() -> ProviderBaseUrlResponse:
    """Return the runtime-configured default OpenAI-compatible base URL.

    Reads ``settings.default_openai_url`` (the Pydantic settings
    singleton, resolved from ``EPUBTV_DEFAULT_OPENAI_URL`` /
    ``DEFAULT_OPENAI_URL`` env vars per ``config.py``). The handler
    is sync (no I/O, no provider call) — the value is cached on
    the settings object at process start.
    """
    return ProviderBaseUrlResponse(base_url=settings.default_openai_url)


__all__ = [
    "OllamaModelsResponse",
    "OllamaProviderModelsBody",
    "OpenAIModelsResponse",
    "OpenAIProviderModelsBody",
    "ProviderBaseUrlResponse",
    "router",
]
