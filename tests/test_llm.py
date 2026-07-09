"""Unit tests for OpenAICompatibleProvider error handling (no live endpoint)."""

import httpx
import pytest

from askdocs.llm import LLMError, OpenAICompatibleProvider


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


def _provider():
    return OpenAICompatibleProvider(base_url="http://unused/v1", model="fake")


def test_transport_failure_raises_llmerror(monkeypatch):
    def boom(*args, **kwargs):
        raise httpx.ConnectError("connection refused")

    monkeypatch.setattr(httpx, "post", boom)

    with pytest.raises(LLMError):
        _provider().complete("system", "user")


def test_http_status_error_raises_llmerror(monkeypatch):
    class _ErrResponse(_FakeResponse):
        def raise_for_status(self):
            raise httpx.HTTPStatusError("400", request=None, response=None)

    monkeypatch.setattr(httpx, "post", lambda *a, **k: _ErrResponse({}))

    with pytest.raises(LLMError):
        _provider().complete("system", "user")


def test_malformed_json_raises_llmerror(monkeypatch):
    monkeypatch.setattr(httpx, "post", lambda *a, **k: _FakeResponse({"unexpected": True}))

    with pytest.raises(LLMError):
        _provider().complete("system", "user")


def test_valid_response_returns_stripped_content(monkeypatch):
    payload = {"choices": [{"message": {"content": "<think>міркую</think>Відповідь [1]."}}]}
    monkeypatch.setattr(httpx, "post", lambda *a, **k: _FakeResponse(payload))

    assert _provider().complete("system", "user") == "Відповідь [1]."
