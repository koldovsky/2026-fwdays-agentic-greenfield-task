"""``OpenAIHttpTTSAdapter`` unit tests (TTS-02, plan 01-02).

The ``OpenAIHttpTTSAdapter`` uses the official ``openai`` Python
SDK (``>=1.50,<2.0``) per ADR-0012. The unit tests monkey-patch
``openai.OpenAI`` to a fake that records the constructor args +
the ``audio.speech.create`` call + returns a canned audio
response (the per-task instruction in the plan; the test profile
avoids standing up a real OpenAI-compatible TTS endpoint).

Behaviours (locked by TTS-02 + ADR-0012 + plan 01-02):
- ``test_instantiation_default_voice`` — ``voice`` defaults to
  ``"alloy"`` (the canonical OpenAI TTS voice id).
- ``test_instantiation_preserves_trailing_slash`` — ``__init__`` is
  a thin wrapper over the base class ``__init__`` + an
  ``openai.OpenAI(base_url=..., api_key=...)`` construction. The
  base class's trailing-slash guard is preserved (Pitfall 5).
- ``test_synthesize_uses_audio_speech_create`` — ``synthesize(...)``
  calls ``self._client.audio.speech.create(model=..., voice=...,
  input=..., response_format="wav")`` and returns
  ``(audio_bytes, _wav_duration_seconds(audio_bytes))``.
- ``test_aclose_calls_client_close`` — ``aclose()`` calls
  ``await self._client.close()`` (the OpenAI SDK's async
  ``close()`` since v1.50).
"""

from __future__ import annotations

import asyncio
from typing import Any

import pytest

from epubtv.adapters.tts.openai_http_tts_adapter import OpenAIHttpTTSAdapter

pytestmark = pytest.mark.tcid("VOICE-01-UT05")


def test_instantiation_default_voice(monkeypatch: pytest.MonkeyPatch) -> None:
    """``voice`` defaults to ``"alloy"`` (the canonical OpenAI TTS voice id)."""

    class _FakeAsyncOpenAI:
        def __init__(self, *, base_url: str, api_key: str) -> None:
            pass

        class audio:
            class speech:
                @staticmethod
                def create(**_kwargs: object) -> Any:
                    raise NotImplementedError

    monkeypatch.setattr("openai.AsyncOpenAI", _FakeAsyncOpenAI)
    # Default voice is "alloy" (per the OpenAI TTS API contract).
    adapter = OpenAIHttpTTSAdapter(base_url="http://mock:11434", model="tts-1")
    assert adapter._voice == "alloy"


def test_instantiation_preserves_trailing_slash(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """``__init__`` preserves the base class's trailing-slash guard."""
    captured: dict = {}

    class _FakeAsyncOpenAI:
        def __init__(self, *, base_url: str, api_key: str) -> None:
            captured["base_url"] = base_url
            captured["api_key"] = api_key

        class audio:
            class speech:
                @staticmethod
                def create(**_kwargs: object) -> Any:
                    raise NotImplementedError

    monkeypatch.setattr("openai.AsyncOpenAI", _FakeAsyncOpenAI)
    OpenAIHttpTTSAdapter(base_url="http://mock:11434/", model="tts-1", voice="nova")
    assert captured["base_url"] == "http://mock:11434/"
    assert captured["api_key"] == "EMPTY"


def test_synthesize_uses_audio_speech_create(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """``synthesize(...)`` calls ``self._client.audio.speech.create(...)`` and returns ``(bytes, duration)``."""
    captured: dict = {}

    # Build a 1-second 16 kHz 16-bit mono silent WAV so the
    # ``_wav_duration_seconds`` helper returns 1.0.
    sample_rate = 16000
    audio_size = sample_rate * 2
    wav = b"RIFF" + (audio_size + 36).to_bytes(4, "little") + b"WAVEfmt "
    wav += b"\x10\x00\x00\x00\x01\x00\x01\x00" + sample_rate.to_bytes(4, "little")
    wav += (sample_rate * 2).to_bytes(4, "little") + b"\x02\x00\x10\x00data"
    wav += audio_size.to_bytes(4, "little") + b"\x00" * audio_size

    class _FakeResponse:
        def __init__(self, data: bytes) -> None:
            self._data = data

        def read(self) -> bytes:
            return self._data

    async def _fake_create(
        self,
        *,
        model: str,
        voice: str,
        input: str,
        response_format: str,
    ) -> Any:
        captured["model"] = model
        captured["voice"] = voice
        captured["input"] = input
        captured["response_format"] = response_format
        return _FakeResponse(wav)

    class _FakeSpeech:
        create = _fake_create

    class _FakeAudio:
        def __init__(self) -> None:
            self.speech = _FakeSpeech()

    class _FakeAsyncOpenAI:
        def __init__(self, *, base_url: str, api_key: str) -> None:
            self.audio = _FakeAudio()

        async def close(self) -> None:
            captured["closed"] = True

    monkeypatch.setattr("openai.AsyncOpenAI", _FakeAsyncOpenAI)
    adapter = OpenAIHttpTTSAdapter(base_url="http://mock:11434", model="tts-1")

    audio_bytes, duration = asyncio.run(
        adapter.synthesize(
            chunk_id="vo_ch1_a0",
            text="hello world",
            source_language="en",
            target_language="en",
            voice="alloy",
        )
    )
    assert audio_bytes == wav
    assert duration == pytest.approx(1.0, abs=0.01)
    assert captured["model"] == "tts-1"
    assert captured["voice"] == "alloy"
    assert captured["input"] == "hello world"
    assert captured["response_format"] == "wav"


def test_aclose_calls_client_close(monkeypatch: pytest.MonkeyPatch) -> None:
    """``aclose()`` calls ``await self._client.close()`` (the OpenAI SDK's async ``close()``)."""
    captured: dict = {}

    class _FakeAsyncOpenAI:
        def __init__(self, *, base_url: str, api_key: str) -> None:
            self.audio = type(
                "_FakeAudio",
                (),
                {"speech": type("_FakeSpeech", (), {"create": lambda **_k: None})()},
            )()

        async def close(self) -> None:
            captured["closed"] = True

    monkeypatch.setattr("openai.AsyncOpenAI", _FakeAsyncOpenAI)
    adapter = OpenAIHttpTTSAdapter(base_url="http://mock:11434", model="tts-1")
    asyncio.run(adapter.aclose())
    assert captured["closed"] is True
