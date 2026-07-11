"""``GET /api/v1/providers/{ollama,openai-compatible}/base-url`` unit tests.

The two endpoints surface the runtime-configured
``settings.default_ollama_url`` + ``settings.default_openai_url`` so
the SPA can read the defaults from the API at mount time instead of
baking buildtime ``NEXT_PUBLIC_DEFAULT_*_URL`` env vars into the
static export. The default URLs are public (``http://localhost:11434/v1``
for Ollama, ``https://api.openai.com/v1`` for OpenAI) so the
endpoints are unauthenticated, same posture as the model-catalog GET
endpoints in the prior shape.

The ``tcid PROV-DEFAULT-UT01`` marker is the surface-area
test-family id for the new endpoints (per Phase 02.1 tcid pattern
documented in ``backend/AGENTS.md``).

Test cases:
  1. 200 + the ollama default URL is returned
  2. 200 + the openai-compatible default URL is returned
  3. ``monkeypatch`` overrides are reflected verbatim (settings is
     the single source of truth)
  4. Both endpoints are registered under the canonical paths
  5. Response shape has exactly the 1 field (no leakage of internal
     settings)
"""

from __future__ import annotations

from typing import Any, ClassVar

import pytest
from fastapi.testclient import TestClient

from epubtv.api.routers.providers import router
from epubtv.config import settings

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("PROV-DEFAULT-UT01")]


class _CapturedSettings:
    """Tiny holder so we can assert the response shape did NOT leak
    fields beyond the documented contract.

    We do this by counting the keys on the JSON response — the
    handler's ``response_model=ProviderBaseUrlResponse`` (with
    ``model_config = ConfigDict(extra="forbid")``) is the actual
    enforcement; the count check is a belt-and-suspenders assertion
    that catches regressions where a future contributor adds a new
    field to ``ProviderBaseUrlResponse`` without updating the
    tcid-mapped contract.
    """

    EXPECTED_KEYS: ClassVar[set[str]] = {"base_url"}


async def test_ollama_default_base_url_returns_settings_value(
    app: Any, db_path: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """``GET /api/v1/providers/ollama/base-url`` returns the configured value.

    The handler reads ``settings.default_ollama_url`` from the
    Pydantic settings singleton; the value reaches the wire verbatim.
    """
    monkeypatch.setattr(settings, "default_ollama_url", "http://override.example/v1")
    monkeypatch.setattr(settings, "default_openai_url", "https://override.example/v1")

    with TestClient(app) as client:
        response = client.get("/api/v1/providers/ollama/base-url")

    assert response.status_code == 200
    body = response.json()
    assert body == {"base_url": "http://override.example/v1"}
    # Belt-and-suspenders: the response shape has exactly the 1
    # documented field. Catches a future regression where a
    # contributor widens the response without updating the contract.
    assert set(body.keys()) == _CapturedSettings.EXPECTED_KEYS


async def test_openai_compatible_default_base_url_returns_settings_value(
    app: Any, db_path: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """``GET /api/v1/providers/openai-compatible/base-url`` returns the configured value.

    The handler reads ``settings.default_openai_url`` from the
    Pydantic settings singleton; the value reaches the wire verbatim.
    """
    monkeypatch.setattr(settings, "default_ollama_url", "http://override.example/v1")
    monkeypatch.setattr(settings, "default_openai_url", "https://override.example/v1")

    with TestClient(app) as client:
        response = client.get("/api/v1/providers/openai-compatible/base-url")

    assert response.status_code == 200
    body = response.json()
    assert body == {"base_url": "https://override.example/v1"}
    assert set(body.keys()) == _CapturedSettings.EXPECTED_KEYS


async def test_both_endpoints_registered_under_canonical_paths(app: Any, db_path: Any) -> None:
    """Both new GET endpoints are registered on the providers router.

    The router is mounted at ``/api/v1`` by
    ``app.include_router(providers.router, prefix="/api/v1", ...)``;
    the paths below are the relative paths registered on the router
    (the ``/api/v1`` prefix is added at mount time, not on the
    ``@router.get`` decorator).
    """
    paths = {route.path for route in router.routes}  # pyrefly: ignore [missing-attribute]
    assert "/providers/ollama/base-url" in paths
    assert "/providers/openai-compatible/base-url" in paths


async def test_base_url_response_shape_has_exactly_one_field(
    app: Any, db_path: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The response shape has exactly ``{base_url}`` — no internal leakage.

    The Pydantic ``ProviderBaseUrlResponse`` model uses
    ``model_config = ConfigDict(extra="forbid")`` to drop unknown
    fields at parse time. This test asserts the wire shape never
    grows beyond the single documented field, catching a future
    regression where a contributor adds e.g. ``api_key`` /
    ``model`` / ``rate_limit`` to the response without updating the
    tcid-mapped contract.
    """
    monkeypatch.setattr(settings, "default_ollama_url", "http://override.example/v1")

    with TestClient(app) as client:
        response = client.get("/api/v1/providers/ollama/base-url")

    body = response.json()
    assert set(body.keys()) == {"base_url"}
    # And the value type is the documented ``str`` — not a
    # structured object that future contributors might accidentally
    # split (e.g. ``{"host": ..., "port": ...}``).
    assert isinstance(body["base_url"], str)
