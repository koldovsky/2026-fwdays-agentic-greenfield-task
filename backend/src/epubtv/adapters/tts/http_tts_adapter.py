"""HTTP TTS adapter — base class (TTS-01, plan 01-02).

Phase 1 plan 01-02 (TTS-01): ``HttpTTSAdapter`` is now a
non-overridable base class. The ``model`` parameter has no default
(used to default to ``tts-1``); ``synthesize(...)`` raises
``NotImplementedError`` with a class-qualified message so a caller
that accidentally instantiates the base class gets a loud failure.

The production subclass (TTS-02):

- ``OpenAIHttpTTSAdapter`` uses the official ``openai`` Python SDK
  (``>=1.50,<2.0``) per ADR-0012 — calls
  ``client.audio.speech.create(model=model, voice=voice, input=text,
  response_format="wav")`` and returns ``(response.read(),
  _wav_duration_seconds(...))``.

The base class keeps the trailing-slash guard + the ``aclose()``
method for inheritance. The ``_wav_duration_seconds`` helper stays
on the base class (subclasses reuse it; it is exposed via the module
so the unit tests can import it directly). The base class
constructor does NOT carry a default for ``model`` (the previous
``tts-1`` default was removed per TTS-01).
"""

from __future__ import annotations

import struct

import httpx


class HttpTTSAdapter:
    """Async HTTP TTS provider base class (TTS-01).

    The base class is non-overridable. Subclasses MUST override
    ``synthesize(...)`` to provide the actual TTS call (the
    ``openai`` Python SDK per ADR-0012). The ``model`` parameter is
    required (no default) so accidental ``HttpTTSAdapter(base_url=...)``
    instantiation gets a loud ``TypeError`` from the missing positional
    argument.
    """

    def __init__(
        self,
        base_url: str,
        model: str,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        """Build the base-class adapter.

        ``base_url`` MUST end with a single ``/`` (forced via
        ``rstrip("/") + "/"`` — Pitfall 5). ``model`` is the TTS
        model name; required (no default — the previous ``tts-1``
        default was removed per TTS-01). ``client`` is an optional
        injection seam for unit tests; the production path uses the
        default ``httpx.AsyncClient(base_url=..., timeout=httpx.Timeout(60.0,
        connect=5.0))`` (D-08 60s timeout, 5s connect for fast-fail).

        The subclass is free to ignore ``client`` and use the Python
        client instead (the base class just keeps the seam available
        for any future subclass that wants raw HTTP).
        """
        # Trailing-slash guard (Pitfall 5). httpx issues a silent
        # 307 redirect when the base URL and the relative path
        # disagree on trailing slashes; normalising here keeps the
        # ``POST {base_url}/...`` round-trip deterministic for any
        # subclass that uses the ``_client`` seam.
        normalised_base = base_url.rstrip("/") + "/"
        self._base_url = normalised_base
        self._model = model
        self._client = client or httpx.AsyncClient(
            base_url=normalised_base,
            timeout=httpx.Timeout(60.0, connect=5.0),
        )

    async def synthesize(
        self,
        chunk_id: str,
        text: str,
        source_language: str | None,
        target_language: str | None,
        voice: str,
    ) -> tuple[bytes, float]:
        """Raise ``NotImplementedError`` — subclasses MUST override.

        The base class is non-overridable per TTS-01. A caller that
        accidentally instantiates ``HttpTTSAdapter`` and calls
        ``synthesize(...)`` gets a loud failure with a
        class-qualified message.
        """
        raise NotImplementedError("HttpTTSAdapter is a base class; use OpenAIHttpTTSAdapter")

    async def aclose(self) -> None:
        """Close the underlying ``httpx.AsyncClient`` (idempotent).

        Called from the FastAPI lifespan shutdown path. Safe to call
        multiple times (``httpx.AsyncClient.aclose`` is idempotent).
        """
        await self._client.aclose()


def _wav_duration_seconds(
    audio_bytes: bytes, *, sample_rate: int = 16000, channels: int = 1
) -> float:
    """Compute the duration of a 16 kHz 16-bit mono PCM WAV from its byte size.

    The mock's WAV output is byte-deterministic (16 kHz, 16-bit, mono
    PCM). The byte size minus the 44-byte header divided by the
    frame size gives the number of frames; the duration is
    ``frames / sample_rate``.

    Falls back to the byte-size approximation if the header is
    malformed (e.g. the in-process mock returns raw bytes; the
    consolidated service returns the same). The fallback is
    intentionally permissive — the audio stitcher in Phase 3 only
    needs an order-of-magnitude estimate for the ±50ms tolerance.
    """
    if len(audio_bytes) < 44 or not audio_bytes.startswith(b"RIFF"):
        # Smaller than a WAV header OR not a RIFF container — the
        # mock returned raw bytes (no header). Fall back to the
        # byte-size approximation.
        return len(audio_bytes) / float(sample_rate * channels * 2)
    # Parse the RIFF chunk size: 4 bytes at offset 4 (little-endian
    # uint32) + 8 bytes for "WAVEfmt " chunk header.
    try:
        riff_size = struct.unpack_from("<I", audio_bytes, 4)[0]
        # Total file size = riff_size + 8 (RIFF + WAVE headers).
        # Audio data size = file size - 44-byte standard header.
        # The 44-byte header is the canonical PCM header; the
        # consolidated mock's output is exactly 44 bytes of header
        # + audio data.
        audio_data_size = max(0, riff_size + 8 - 44)
        return audio_data_size / float(sample_rate * channels * 2)
    except struct.error:
        return len(audio_bytes) / float(sample_rate * channels * 2)


__all__ = ["HttpTTSAdapter", "_wav_duration_seconds"]
