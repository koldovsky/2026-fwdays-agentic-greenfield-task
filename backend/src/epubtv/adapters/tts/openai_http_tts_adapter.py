"""OpenAIHttpTTSAdapter — TTS-02.

Phase 1 plan 01-02 (TTS-02): ``OpenAIHttpTTSAdapter`` is a production
TTS provider that uses the official ``openai`` Python SDK
(``>=1.50,<2.0``) per ADR-0012. The adapter POSTs to the
OpenAI-compatible ``/v1/audio/speech`` endpoint via
``openai.AsyncOpenAI(base_url=base_url, api_key=api_key or "EMPTY")``
+ ``await client.audio.speech.create(model=model, voice=voice,
input=text, response_format="wav")`` and returns ``(audio_bytes,
_wav_duration_seconds(audio_bytes))``.

**Note on sync vs async client:** the plan's prose mentions
``openai.OpenAI(...)`` (the sync client), but for an async adapter
the correct client is ``openai.AsyncOpenAI(...)`` (the async
counterpart). The async client has the same shape (same
``base_url=`` / ``api_key=`` params; same
``audio.speech.create(...)`` signature) but its ``close()`` is
truly async (``await client.close()`` works) and its
``audio.speech.create(...)`` returns an awaitable. The sync
``openai.OpenAI.close()`` is synchronous (returns ``None``, not
awaitable). The async client is the canonical choice for async
adapters per the ``openai`` SDK docs.

The ``voice`` parameter has a default (``"alloy"``) because the
OpenAI TTS API requires a voice; the ``OpenAIHttpTTSAdapter`` is
constructed once per job with a specific voice from the voiceover
config (D-06) — the voice is not the ``model``.

The ``api_key`` parameter is optional for the same reason as
``OpenAIHttpTranslationAdapter``: some OpenAI-compatible TTS
endpoints (local LM Studio TTS, etc.) do not require a key. The
``api_key or "EMPTY"`` substitution lets the SDK talk to keyless
endpoints. The key is never logged.

The ``aclose()`` method calls ``await self._client.close()`` — the
``AsyncOpenAI`` client's async ``close()`` (the underlying
``httpx.AsyncClient`` the SDK wraps is closed).

The base class's ``_client`` (an ``httpx.AsyncClient``) is NOT used
by this subclass — the ``openai.AsyncOpenAI`` SDK owns its own HTTP
transport. The trailing-slash guard is preserved (the base class
``__init__`` runs it; the SDK uses the same normalised base URL).
"""

from __future__ import annotations

import openai

from epubtv.adapters.tts.http_tts_adapter import (
    HttpTTSAdapter,
    _wav_duration_seconds,
)


class OpenAIHttpTTSAdapter(HttpTTSAdapter):
    """Async OpenAI-compatible TTS provider (TTS-02).

    Uses ``openai.AsyncOpenAI(base_url=..., api_key=api_key or
    "EMPTY")`` + ``await client.audio.speech.create(...)`` per
    ADR-0012. The ``aclose()`` method calls ``await
    self._client.close()``.
    """

    def __init__(
        self,
        base_url: str,
        model: str,
        voice: str = "alloy",
        *,
        api_key: str | None = None,
    ) -> None:
        # Trailing-slash normalisation is preserved via the base class
        # ``__init__`` (the ``_client`` is constructed for inheritance
        # parity; the ``openai.AsyncOpenAI`` below uses the same
        # normalised base URL so the wire round-trip is consistent).
        super().__init__(base_url=base_url, model=model)
        # The OpenAI SDK's ``base_url=`` is a generic OpenAI-compatible
        # endpoint seam — we pass the ``_base_url`` (which already
        # includes the trailing ``/``). The ``api_key or "EMPTY"``
        # substitution lets the SDK talk to keyless OpenAI-compatible
        # endpoints. The key is never logged.
        self._client = openai.AsyncOpenAI(
            base_url=self._base_url,
            api_key=api_key or "EMPTY",
        )
        self._voice = voice

    async def synthesize(
        self,
        chunk_id: str,
        text: str,
        source_language: str | None,
        target_language: str | None,
        voice: str,
    ) -> tuple[bytes, float]:
        """Call ``client.audio.speech.create(...)`` and return ``(bytes, duration)``.

        Wire shape:
        - request: ``{"model": <model>, "input": <text>, "voice":
          <voice>, "response_format": "wav"}``
        - response: raw audio bytes (WAV).

        The ``chunk_id`` + ``source_language`` + ``target_language``
        parameters are accepted for ``TTSPort`` Protocol parity but
        are NOT posted to OpenAI (the OpenAI shape does not carry
        any of them; the workflow service derives its own
        ``chunk_id`` for persistence; the model + voice + input
        drive the rest).
        """
        _ = (chunk_id, source_language, target_language)  # Protocol parity only
        response = await self._client.audio.speech.create(
            model=self._model,
            voice=voice,
            input=text,
            response_format="wav",
        )
        # The OpenAI SDK returns a binary iterator for audio; the
        # ``read()`` method concatenates the chunks. This is the
        # canonical pattern from the SDK docs.
        audio_bytes = response.read()
        return audio_bytes, _wav_duration_seconds(audio_bytes)

    async def aclose(self) -> None:
        """Close the ``openai.AsyncOpenAI`` client (async ``close()``).

        The base class's ``httpx.AsyncClient`` (``self._client`` before
        this ``__init__``) is replaced by the ``openai.AsyncOpenAI``
        instance in this subclass's ``__init__``; we close the OpenAI
        client here. Safe to call multiple times (the SDK's ``close()``
        is idempotent).
        """
        await self._client.close()


__all__ = ["OpenAIHttpTTSAdapter"]
