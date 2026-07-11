"""``POST /api/v1/providers/ollama/models`` unit tests (BACK-05-UT27).

The endpoint calls the Ollama Python SDK at request time and
returns the model catalog from the upstream provider. A
connection failure surfaces as 502 ``provider_unreachable`` with
the SDK's error message in the envelope ``details.provider_error``
field. A malformed body (missing ``base_url`` or extra field) is
rejected at parse time with 422.

The tests monkeypatch ``ollama.Client.list`` so the SDK's
underlying HTTP call is not exercised in unit tests (the live
``curl`` smoke test in the plan covers the wire path).
"""

from __future__ import annotations

from typing import Any, ClassVar

import pytest
from fastapi.testclient import TestClient

from epubtv.api.error_codes import PROVIDER_UNREACHABLE

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("BACK-05-UT27")]


# ---------------------------------------------------------------------------
# Test doubles
# ---------------------------------------------------------------------------


class _FakeOllamaModel:
    """Mimics the Ollama SDK's ``ListResponse.Model`` shape."""

    def __init__(self, name: str) -> None:
        self.model = name  # the SDK uses ``.model`` as the canonical name field


class _FakeListResponse:
    """Mimics the Ollama SDK's ``ListResponse`` shape."""

    def __init__(self, names: list[str]) -> None:
        self.models = [_FakeOllamaModel(n) for n in names]


class _FakeOllamaClient:
    """Captures constructor kwargs + returns a canned ``list()`` response.

    Per CR-02 the production endpoint uses ``ollama.AsyncClient``
    + ``await client.list()``; the fake mirrors the async shape
    (the test's ``TestClient(app)`` enters the event loop so
    ``await fake_client.list()`` is satisfied).
    """

    instances: ClassVar[list[_FakeOllamaClient]] = []

    def __init__(self, host: str, timeout: float) -> None:
        self.host = host
        self.timeout = timeout
        self.list_response: _FakeListResponse = _FakeListResponse(
            ["translategemma:12b", "translategemma:27b", "llama3.1:8b"],
        )
        self.list_should_raise: BaseException | None = None
        _FakeOllamaClient.instances.append(self)

    async def list(self) -> _FakeListResponse:
        if self.list_should_raise is not None:
            raise self.list_should_raise
        return self.list_response

    async def close(self) -> None:
        # The async SDK's close seam; tests don't assert on it.
        return None


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_ollama_models_happy_path_returns_canonical_shape(
    app: Any, db_path: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The endpoint returns ``{models: [{name, ...}, ...]}`` from the SDK.

    The Ollama SDK exposes ``.model`` as the canonical name field;
    the wire format uses ``.name`` — the endpoint maps SDK
    ``model`` → wire ``name``.
    """
    _FakeOllamaClient.instances.clear()
    monkeypatch.setattr(
        "epubtv.api.routers.providers._OllamaClient",
        _FakeOllamaClient,
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/providers/ollama/models",
            json={"base_url": "http://localhost:11434"},
        )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert "models" in payload
    assert len(payload["models"]) == 3
    assert payload["models"][0] == {"name": "translategemma:12b"}
    assert payload["models"][1] == {"name": "translategemma:27b"}
    assert payload["models"][2] == {"name": "llama3.1:8b"}

    # The endpoint constructed the client with the user's base URL
    # + the locked 10s timeout envelope.
    assert len(_FakeOllamaClient.instances) == 1
    fake = _FakeOllamaClient.instances[0]
    assert fake.host == "http://localhost:11434"
    assert fake.timeout == 10.0


async def test_ollama_models_unreachable_provider_returns_502(
    app: Any, db_path: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A connection error surfaces as 502 ``provider_unreachable``.

    The Ollama SDK converts ``httpx.ConnectError`` → Python
    builtin ``ConnectionError`` at the public surface (per the
    SDK's ``_client.py`` source). The endpoint maps that to the
    locked 502 envelope with the SDK message in
    ``details.provider_error`` (BACK-05 + threat model T-04-04).
    """
    _FakeOllamaClient.instances.clear()
    monkeypatch.setattr(
        "epubtv.api.routers.providers._OllamaClient",
        _FakeOllamaClient,
    )

    # Pre-arm the next constructed client to raise on ``.list()``
    # with the same exception class the real Ollama SDK raises
    # when the upstream is unreachable.
    original_init = _FakeOllamaClient.__init__

    def init_with_raise(self: Any, host: str, timeout: float) -> None:
        original_init(self, host, timeout)
        self.list_should_raise = ConnectionError(
            "Connection refused: http://unreachable:11434",
        )

    monkeypatch.setattr(_FakeOllamaClient, "__init__", init_with_raise)

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/providers/ollama/models",
            json={"base_url": "http://unreachable:11434"},
        )

    assert response.status_code == 502, response.text
    payload = response.json()
    assert "error" in payload
    assert payload["error"]["code"] == PROVIDER_UNREACHABLE
    assert "details" in payload["error"]
    assert "provider_error" in payload["error"]["details"]
    assert "Connection refused" in payload["error"]["details"]["provider_error"]


async def test_ollama_models_missing_base_url_returns_422(
    app: Any, db_path: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A body without ``base_url`` is rejected at parse time with 422."""
    _FakeOllamaClient.instances.clear()
    monkeypatch.setattr(
        "epubtv.api.routers.providers._OllamaClient",
        _FakeOllamaClient,
    )

    with TestClient(app) as client:
        response = client.post("/api/v1/providers/ollama/models", json={})

    assert response.status_code == 422, response.text
    # The endpoint did NOT construct an Ollama client (parse-time gate).
    assert _FakeOllamaClient.instances == []


async def test_ollama_models_extra_field_returns_422(
    app: Any, db_path: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A body with an unknown field is rejected at parse time with 422.

    The Pydantic v2 ``extra="forbid"`` on the body model is the
    schema-level gate (threat model T-04-05).
    """
    _FakeOllamaClient.instances.clear()
    monkeypatch.setattr(
        "epubtv.api.routers.providers._OllamaClient",
        _FakeOllamaClient,
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/providers/ollama/models",
            json={"base_url": "http://localhost:11434", "api_key": "leak"},
        )

    assert response.status_code == 422, response.text
    # The endpoint did NOT construct an Ollama client (parse-time gate).
    assert _FakeOllamaClient.instances == []


async def test_ollama_models_rejects_non_http_scheme_returns_400(
    app: Any, db_path: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A non-HTTP(S) ``base_url`` is rejected at 400 with ``invalid_base_url_scheme``.

    The CR-01 scheme allowlist guards against trivial SSRF
    vectors (e.g. ``file://``, ``ftp://``); the request layer
    raises 400 before constructing the SDK client.
    """
    _FakeOllamaClient.instances.clear()
    monkeypatch.setattr(
        "epubtv.api.routers.providers._OllamaClient",
        _FakeOllamaClient,
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/providers/ollama/models",
            json={"base_url": "file:///etc/passwd"},
        )

    assert response.status_code == 400, response.text
    payload = response.json()
    assert payload["error"]["code"] == "invalid_base_url_scheme"
    # The endpoint did NOT construct an Ollama client (scheme gate).
    assert _FakeOllamaClient.instances == []
