"""``OpenAIHttpTranslationAdapter`` unit tests (TRAN-02, plan 01-02).

The ``OpenAIHttpTranslationAdapter`` uses the official ``openai``
Python SDK (``>=1.50,<2.0``) per ADR-0012. The unit tests
monkey-patch ``openai.OpenAI`` to a fake that records the
constructor args + the ``chat.completions.create`` call +
returns a canned response (the per-task instruction in the plan;
the test profile avoids standing up a real OpenAI-compatible
endpoint).

Behaviours (locked by TRAN-02 + ADR-0012 + plan 01-02):
- ``test_instantiation_preserves_trailing_slash`` — ``__init__`` is
  a thin wrapper over the base class ``__init__`` + an
  ``openai.OpenAI(base_url=..., api_key=...)`` construction. The
  base class's trailing-slash guard is preserved (Pitfall 5).
- ``test_api_key_default_is_empty`` — ``api_key=None`` defaults to
  ``"EMPTY"`` (lets the SDK talk to keyless OpenAI-compatible
  endpoints like Ollama in OpenAI-compat mode).
- ``test_translate_uses_chat_completions_create`` — ``translate(...)``
  calls ``self._client.chat.completions.create(model=...,
  messages=[...], temperature=0.0)`` and returns the assistant's
  ``choices[0].message.content``.
- ``test_aclose_calls_client_close`` — ``aclose()`` calls
  ``await self._client.close()`` (the OpenAI SDK's async ``close()``
  since v1.50).
"""

from __future__ import annotations

import asyncio
from typing import Any

import pytest

from epubtv.adapters.translation.openai_http_translation_adapter import (
    OpenAIHttpTranslationAdapter,
)

pytestmark = pytest.mark.tcid("XLATE-01-UT27")


def test_instantiation_preserves_trailing_slash(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """``__init__`` preserves the base class's trailing-slash guard."""
    captured: dict = {}

    class _FakeOpenAIClient:
        def __init__(self, *, base_url: str, api_key: str) -> None:
            captured["base_url"] = base_url
            captured["api_key"] = api_key

        class chat:
            class completions:
                @staticmethod
                def create(**_kwargs: object) -> Any:
                    raise NotImplementedError

    monkeypatch.setattr("openai.AsyncOpenAI", _FakeOpenAIClient)
    OpenAIHttpTranslationAdapter(
        base_url="http://mock:11434/",
        model="gpt-4o-mini",
    )
    # The base class's trailing-slash guard forces a single ``/``;
    # the ``openai.AsyncOpenAI`` constructor receives the normalised URL.
    assert captured["base_url"] == "http://mock:11434/"
    # No ``api_key`` passed → ``"EMPTY"`` placeholder (lets the SDK
    # talk to keyless OpenAI-compatible endpoints).
    assert captured["api_key"] == "EMPTY"


def test_api_key_default_is_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    """``api_key=None`` defaults to ``"EMPTY"`` for keyless endpoints."""
    captured: dict = {}

    class _FakeOpenAIClient:
        def __init__(self, *, base_url: str, api_key: str) -> None:
            captured["api_key"] = api_key

        class chat:
            class completions:
                @staticmethod
                def create(**_kwargs: object) -> Any:
                    raise NotImplementedError

    monkeypatch.setattr("openai.AsyncOpenAI", _FakeOpenAIClient)
    OpenAIHttpTranslationAdapter(
        base_url="http://mock:11434",
        model="gpt-4o-mini",
        api_key=None,
    )
    assert captured["api_key"] == "EMPTY"


def test_api_key_passed_through(monkeypatch: pytest.MonkeyPatch) -> None:
    """A real ``api_key`` is passed through to the ``openai.AsyncOpenAI`` constructor."""
    captured: dict = {}

    class _FakeOpenAIClient:
        def __init__(self, *, base_url: str, api_key: str) -> None:
            captured["api_key"] = api_key

        class chat:
            class completions:
                @staticmethod
                def create(**_kwargs: object) -> Any:
                    raise NotImplementedError

    monkeypatch.setattr("openai.AsyncOpenAI", _FakeOpenAIClient)
    OpenAIHttpTranslationAdapter(
        base_url="http://mock:11434",
        model="gpt-4o-mini",
        api_key="sk-test",
    )
    assert captured["api_key"] == "sk-test"


def test_translate_uses_chat_completions_create(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """``translate(...)`` calls ``self._client.chat.completions.create(...)`` and returns the assistant content."""
    captured: dict = {}

    class _FakeMessage:
        def __init__(self, content: str) -> None:
            self.content = content

    class _FakeChoice:
        def __init__(self, content: str) -> None:
            self.message = _FakeMessage(content)

    class _FakeResponse:
        def __init__(self, content: str) -> None:
            self.choices = [_FakeChoice(content)]

    async def _fake_create(
        *, model: str, messages: list[dict[str, str]], temperature: float
    ) -> Any:
        captured["model"] = model
        captured["messages"] = messages
        captured["temperature"] = temperature
        return _FakeResponse("Hallo Welt")

    class _FakeCompletions:
        create = staticmethod(_fake_create)

    class _FakeChat:
        def __init__(self) -> None:
            self.completions = _FakeCompletions()

    class _FakeAsyncOpenAI:
        def __init__(self, *, base_url: str, api_key: str) -> None:
            self.chat = _FakeChat()

        async def close(self) -> None:
            captured["closed"] = True

    monkeypatch.setattr("openai.AsyncOpenAI", _FakeAsyncOpenAI)
    adapter = OpenAIHttpTranslationAdapter(
        base_url="http://mock:11434",
        model="gpt-4o-mini",
    )

    out = asyncio.run(
        adapter.translate(
            chunk_id="tx_ch1_s3",
            source_text="Hello world",
            source_language="en",
            target_language="de",
        )
    )
    assert out == "Hallo Welt"
    assert captured["model"] == "gpt-4o-mini"
    assert captured["temperature"] == 0.0
    assert captured["messages"] == [{"role": "user", "content": "Hello world"}]


def test_aclose_calls_client_close(monkeypatch: pytest.MonkeyPatch) -> None:
    """``aclose()`` calls ``await self._client.close()`` (the OpenAI SDK's async ``close()``)."""
    captured: dict = {}

    class _FakeAsyncOpenAI:
        def __init__(self, *, base_url: str, api_key: str) -> None:
            self.chat = type(
                "_FakeChat",
                (),
                {"completions": type("_FakeCompletions", (), {"create": lambda **_k: None})()},
            )()

        async def close(self) -> None:
            captured["closed"] = True

    monkeypatch.setattr("openai.AsyncOpenAI", _FakeAsyncOpenAI)
    adapter = OpenAIHttpTranslationAdapter(
        base_url="http://mock:11434",
        model="gpt-4o-mini",
    )
    asyncio.run(adapter.aclose())
    assert captured["closed"] is True
