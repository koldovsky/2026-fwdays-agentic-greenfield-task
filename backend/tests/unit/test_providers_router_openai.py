"""``POST /api/v1/providers/openai-compatible/models`` unit tests (BACK-03-UT28).

The endpoint calls the OpenAI Python SDK at request time and
returns the model catalog from the upstream provider. A
connection failure surfaces as 502 ``provider_unreachable`` with
the SDK's error message in the envelope ``details.provider_error``
field. A malformed body (missing ``base_url`` / ``api_key`` or
extra field) is rejected at parse time with 422.

The tests monkeypatch ``openai.OpenAI.models.list`` so the SDK's
underlying HTTP call is not exercised in unit tests (the live
``curl`` smoke test in the plan covers the wire path).
"""

from __future__ import annotations

from typing import Any, ClassVar

import openai
import pytest
from fastapi.testclient import TestClient

from epubtv.api.error_codes import PROVIDER_UNREACHABLE

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("BACK-03-UT28")]


# ---------------------------------------------------------------------------
# Test doubles
# ---------------------------------------------------------------------------


class _FakeOpenAIModel:
    """Mimics the OpenAI SDK's ``Model`` shape (id/object/created/owned_by)."""

    def __init__(self, id_: str, created: int, owned_by: str) -> None:
        self.id = id_
        self.object = "model"
        self.created = created
        self.owned_by = owned_by


class _FakeSyncPage:
    """Mimics the OpenAI SDK's ``SyncPage[Model]`` shape.

    The endpoint reads ``page.data`` (the standard sync-page
    iterable) to map each ``Model`` to the wire shape.
    """

    def __init__(self, models: list[_FakeOpenAIModel]) -> None:
        self.data = models


class _FakeModelsResource:
    """Subresource returned by ``client.models``; carries the canned page.

    Per CR-02 the production endpoint uses ``openai.AsyncOpenAI``
    + ``await client.models.list()``; the fake mirrors the async
    shape (the test's ``TestClient(app)`` enters the event loop
    so ``await fake_models.list()`` is satisfied).
    """

    def __init__(self, page: _FakeSyncPage) -> None:
        self._page = page
        self.list_should_raise: BaseException | None = None

    async def list(self) -> _FakeSyncPage:
        if self.list_should_raise is not None:
            raise self.list_should_raise
        return self._page


class _FakeOpenAIClient:
    """Captures constructor kwargs + returns a canned ``models.list`` page.

    Per CR-02 the fake mirrors the async SDK shape:
    ``__init__`` + ``await client.models.list()`` +
    ``await client.close()``.
    """

    instances: ClassVar[list[_FakeOpenAIClient]] = []

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout: float | None = None,
        max_retries: int | None = None,
        **_: Any,
    ) -> None:
        self.base_url = base_url
        self.api_key = api_key
        self.timeout = timeout
        self.max_retries = max_retries
        self.models = _FakeModelsResource(
            _FakeSyncPage(
                [
                    _FakeOpenAIModel("gpt-4o-mini", 1700000000, "openai"),
                    _FakeOpenAIModel("gpt-4o", 1700000000, "openai"),
                ],
            ),
        )
        _FakeOpenAIClient.instances.append(self)

    async def close(self) -> None:
        # Mimic the async client's async ``close()``.
        return None


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_openai_models_happy_path_returns_canonical_shape(
    app: Any, db_path: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The endpoint returns ``{models: [{id, object, created, owned_by}, ...]}``.

    The OpenAI SDK exposes ``Model`` objects with the 4 fields
    the wire response mirrors; the endpoint maps the SDK objects
    to plain dicts so the SPA does not need the SDK type.
    """
    _FakeOpenAIClient.instances.clear()
    monkeypatch.setattr(
        "epubtv.api.routers.providers._OpenAIClient",
        _FakeOpenAIClient,
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/providers/openai-compatible/models",
            json={
                "base_url": "https://api.openai.com/v1",
                "api_key": "sk-test-fake-key",
            },
        )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert "models" in payload
    assert len(payload["models"]) == 2
    assert payload["models"][0] == {
        "id": "gpt-4o-mini",
        "object": "model",
        "created": 1700000000,
        "owned_by": "openai",
    }
    assert payload["models"][1] == {
        "id": "gpt-4o",
        "object": "model",
        "created": 1700000000,
        "owned_by": "openai",
    }

    # The endpoint constructed the client with the user's base URL +
    # the locked 10s / 0-retries envelope.
    assert len(_FakeOpenAIClient.instances) == 1
    fake = _FakeOpenAIClient.instances[0]
    assert fake.base_url == "https://api.openai.com/v1"
    assert fake.api_key == "sk-test-fake-key"
    assert fake.timeout == 10.0
    assert fake.max_retries == 0


async def test_openai_models_unreachable_provider_returns_502(
    app: Any, db_path: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A connection error surfaces as 502 ``provider_unreachable``.

    The OpenAI SDK's ``APIConnectionError`` (or its subclass
    ``APITimeoutError``) is mapped to the locked 502 envelope
    with the SDK message in ``details.provider_error``
    (BACK-03 + threat model T-04-04).
    """
    _FakeOpenAIClient.instances.clear()
    monkeypatch.setattr(
        "epubtv.api.routers.providers._OpenAIClient",
        _FakeOpenAIClient,
    )

    # Pre-arm the next constructed client's models.list to raise.
    original_init = _FakeOpenAIClient.__init__

    def init_with_raise(self: Any, **kwargs: Any) -> None:
        original_init(self, **kwargs)
        self.models.list_should_raise = openai.APIConnectionError(
            request=object(),  # type: ignore[arg-type]
            message="Connection refused: https://unreachable.example/v1",
        )

    monkeypatch.setattr(_FakeOpenAIClient, "__init__", init_with_raise)

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/providers/openai-compatible/models",
            json={
                "base_url": "https://unreachable.example/v1",
                "api_key": "sk-test-fake-key",
            },
        )

    assert response.status_code == 502, response.text
    payload = response.json()
    assert "error" in payload
    assert payload["error"]["code"] == PROVIDER_UNREACHABLE
    assert "details" in payload["error"]
    assert "provider_error" in payload["error"]["details"]
    assert "Connection refused" in payload["error"]["details"]["provider_error"]


async def test_openai_models_missing_api_key_returns_422(
    app: Any, db_path: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A body without ``api_key`` is rejected at parse time with 422."""
    _FakeOpenAIClient.instances.clear()
    monkeypatch.setattr(
        "epubtv.api.routers.providers._OpenAIClient",
        _FakeOpenAIClient,
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/providers/openai-compatible/models",
            json={"base_url": "https://api.openai.com/v1"},
        )

    assert response.status_code == 422, response.text
    # The endpoint did NOT construct an OpenAI client (parse-time gate).
    assert _FakeOpenAIClient.instances == []


async def test_openai_models_extra_field_returns_422(
    app: Any, db_path: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A body with an unknown field is rejected at parse time with 422.

    The Pydantic v2 ``extra="forbid"`` on the body model is the
    schema-level gate (threat model T-04-05).
    """
    _FakeOpenAIClient.instances.clear()
    monkeypatch.setattr(
        "epubtv.api.routers.providers._OpenAIClient",
        _FakeOpenAIClient,
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/providers/openai-compatible/models",
            json={
                "base_url": "https://api.openai.com/v1",
                "api_key": "sk-test-fake-key",
                "model": "gpt-4o-mini",
            },
        )

    assert response.status_code == 422, response.text
    # The endpoint did NOT construct an OpenAI client (parse-time gate).
    assert _FakeOpenAIClient.instances == []


async def test_openai_models_rejects_non_http_scheme_returns_400(
    app: Any, db_path: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A non-HTTP(S) ``base_url`` is rejected at 400 with ``invalid_base_url_scheme``.

    The CR-01 scheme allowlist guards against trivial SSRF
    vectors (e.g. ``file://``, ``ftp://``); the request layer
    raises 400 before constructing the SDK client.
    """
    _FakeOpenAIClient.instances.clear()
    monkeypatch.setattr(
        "epubtv.api.routers.providers._OpenAIClient",
        _FakeOpenAIClient,
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/providers/openai-compatible/models",
            json={"base_url": "ftp://evil.example/", "api_key": "sk-test-fake-key"},
        )

    assert response.status_code == 400, response.text
    payload = response.json()
    assert payload["error"]["code"] == "invalid_base_url_scheme"
    # The endpoint did NOT construct an OpenAI client (scheme gate).
    assert _FakeOpenAIClient.instances == []


async def test_openai_models_broad_api_error_maps_to_502(
    app: Any, db_path: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A non-connection / non-auth ``openai.APIError`` is also mapped to 502.

    The WR-02 broader catch wraps the ``openai.APIError`` parent
    class so 4xx/5xx upstream failures (rate-limit, server
    errors) that do not subclass ``APIConnectionError`` or
    ``AuthenticationError`` still surface as
    ``provider_unreachable`` rather than leaking a 500.
    """
    _FakeOpenAIClient.instances.clear()
    monkeypatch.setattr(
        "epubtv.api.routers.providers._OpenAIClient",
        _FakeOpenAIClient,
    )

    original_init = _FakeOpenAIClient.__init__

    def init_with_broad_api_error(self: Any, **kwargs: Any) -> None:
        original_init(self, **kwargs)
        self.models.list_should_raise = openai.APIError(
            "upstream rate-limited",
            request=object(),  # type: ignore[arg-type]
            body=None,
        )

    monkeypatch.setattr(_FakeOpenAIClient, "__init__", init_with_broad_api_error)

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/providers/openai-compatible/models",
            json={
                "base_url": "https://api.openai.com/v1",
                "api_key": "sk-test-fake-key",
            },
        )

    assert response.status_code == 502, response.text
    payload = response.json()
    assert payload["error"]["code"] == PROVIDER_UNREACHABLE
    assert "upstream rate-limited" in payload["error"]["details"]["provider_error"]
