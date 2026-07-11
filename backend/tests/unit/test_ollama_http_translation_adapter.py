"""``OllamaHttpTranslationAdapter`` unit tests (TRAN-02, plan 01-02 + plan 260711-1ww).

The ``OllamaHttpTranslationAdapter`` uses the official ``ollama``
Python client (``>=0.4,<1.0``) per ADR-0012. The unit tests
monkey-patch ``ollama.AsyncClient`` to a fake that records the
``generate`` call + returns a canned response (the per-task
instruction in the plan; the test profile avoids standing up a
real Ollama daemon). The ``/api/generate`` endpoint is the
spec-documented Ollama text surface per
``docs/ollama-text-spec.yml``; the previous ``/api/chat`` call
was not in the Ollama OpenAPI spec as of 0.1.0, so the adapter
now uses ``generate`` (plan 260711-1ww) to align with the spec
+ the sprint mock.

Behaviours (locked by TRAN-02 + ADR-0012 + plan 01-02 + plan 260711-1ww + CR-02):
- ``test_instantiation_preserves_trailing_slash`` — ``__init__`` is
  a thin wrapper over the base class ``__init__`` + an
  ``ollama.AsyncClient(host=...)`` construction. The base class's
  trailing-slash guard is preserved (Pitfall 5).
- ``test_translate_uses_ollama_client_generate`` — ``translate(...)``
  calls ``await self._ollama.generate(model=..., prompt=source_text)``
  and returns the generated ``response`` field.
- ``test_translate_ignores_chunk_id_and_languages`` — the wire body
  is ``{model, prompt}`` only; ``chunk_id`` + ``source_language`` +
  ``target_language`` are NOT posted (Ollama's generate endpoint
  does not carry any of them).
- ``test_aclose_awaits_sdk_close`` — the lifespan's per-adapter
  close loop calls ``aclose()`` which in turn awaits
  ``self._ollama.close()`` to release the SDK's
  ``httpx.AsyncClient`` pool (CR-02 / WR-04). The async SDK uses
  ``close()`` (not ``aclose()`` like the httpx-style naming).
"""

from __future__ import annotations

import pytest

from epubtv.adapters.translation.ollama_http_translation_adapter import (
    OllamaHttpTranslationAdapter,
)

pytestmark = pytest.mark.tcid("XLATE-01-UT26")


def test_instantiation_preserves_trailing_slash(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """``__init__`` preserves the base class's trailing-slash guard."""
    # Replace ``ollama.AsyncClient`` with a fake that records the host.
    captured: dict = {}

    class _FakeOllamaAsyncClient:
        def __init__(self, *, host: str) -> None:
            captured["host"] = host

        async def generate(self, **_kwargs: object) -> dict:
            return {"response": "fake"}

        async def close(self) -> None:
            return None

    monkeypatch.setattr("ollama.AsyncClient", _FakeOllamaAsyncClient)
    OllamaHttpTranslationAdapter(
        base_url="http://mock:11434/",
        model="translategemma:12b",
    )
    # The base class's trailing-slash guard runs first; the
    # ``ollama.AsyncClient`` strips a trailing ``/v1`` (Ollama's
    # generate endpoint is at ``/api/generate``, not under ``/v1``).
    assert captured["host"] == "http://mock:11434"


def test_translate_uses_ollama_client_generate(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """``translate(...)`` calls ``await self._ollama.generate(model=..., prompt=...)`` and returns the response."""
    captured: dict = {}

    class _FakeOllamaAsyncClient:
        def __init__(self, *, host: str) -> None:
            pass

        async def generate(self, *, model: str, prompt: str) -> dict:
            captured["model"] = model
            captured["prompt"] = prompt
            return {"response": "Hallo Welt"}

        async def close(self) -> None:
            return None

    monkeypatch.setattr("ollama.AsyncClient", _FakeOllamaAsyncClient)
    adapter = OllamaHttpTranslationAdapter(
        base_url="http://mock:11434",
        model="translategemma:12b",
    )

    import asyncio

    out = asyncio.run(
        adapter.translate(
            chunk_id="tx_ch1_s3",
            source_text="Hello world",
            source_language="en",
            target_language="de",
        )
    )
    assert out == "Hallo Welt"
    assert captured["model"] == "translategemma:12b"
    assert captured["prompt"] == "Hello world"


def test_translate_ignores_chunk_id_and_languages(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The wire body is ``{model, prompt}`` only — chunk_id + languages are NOT posted.

    Regression guard for TRAN-02: the Ollama ``/api/generate`` endpoint
    does not carry ``chunk_id`` + ``source_language`` +
    ``target_language``; the workflow service derives its own
    ``chunk_id`` for persistence; the model + prompt drive the rest.
    A future change that adds these fields to the wire body is a
    regression.
    """
    captured: dict = {}

    class _FakeOllamaAsyncClient:
        def __init__(self, *, host: str) -> None:
            pass

        async def generate(self, **kwargs: object) -> dict:
            captured.update(kwargs)
            return {"response": "ok"}

        async def close(self) -> None:
            return None

    monkeypatch.setattr("ollama.AsyncClient", _FakeOllamaAsyncClient)
    adapter = OllamaHttpTranslationAdapter(
        base_url="http://mock:11434",
        model="translategemma:12b",
    )

    import asyncio

    asyncio.run(
        adapter.translate(
            chunk_id="tx_ch1_s3",
            source_text="Hello",
            source_language="en",
            target_language="de",
        )
    )
    # The captured kwargs are ``model`` + ``prompt`` only.
    assert set(captured.keys()) == {"model", "prompt"}
    assert "chunk_id" not in str(captured)
    assert "source_language" not in str(captured)
    assert "target_language" not in str(captured)


def test_aclose_awaits_sdk_close(monkeypatch: pytest.MonkeyPatch) -> None:
    """``aclose()`` awaits ``self._ollama.close()`` (CR-02 / WR-04).

    The async ``ollama`` Python client uses ``close()`` (not
    ``aclose()`` like the httpx-style naming). The adapter's
    ``aclose()`` awaits the SDK's async ``close()`` to release the
    underlying ``httpx.AsyncClient`` pool the SDK owns.
    """

    closed: dict = {"count": 0}

    class _FakeOllamaAsyncClient:
        def __init__(self, *, host: str) -> None:
            pass

        async def generate(self, **_kwargs: object) -> dict:
            return {"response": "fake"}

        async def close(self) -> None:
            closed["count"] += 1

    monkeypatch.setattr("ollama.AsyncClient", _FakeOllamaAsyncClient)
    import asyncio

    adapter = OllamaHttpTranslationAdapter(
        base_url="http://mock:11434",
        model="translategemma:12b",
    )
    result = asyncio.run(adapter.aclose())
    assert result is None
    # The async SDK's ``close()`` was awaited exactly once.
    assert closed["count"] == 1
