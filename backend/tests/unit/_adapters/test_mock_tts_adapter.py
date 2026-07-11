"""Mock TTS adapter — D-01 test-only mock (BACK-01, plan 01-02).

The sprint's in-process TTS provider (CONVENTIONS.md §Mock provider
harness). Phase 1 was an identity passthrough returning a
hand-rolled 44-byte RIFF header (PITFALL 9). Phase 3 wired the
real D-01 contract.

Plan 01-02 (BACK-01): the in-process ``MockTTSAdapter`` moved from
``backend/src/epubtv/adapters/tts/`` to
``backend/tests/unit/_adapters/`` as a test-only fixture. Production
adapters are the ``OpenAIHttpTTSAdapter`` subclass (TTS-02); the
in-process mock is reachable only from ``tests/``.

D-01 contract:
- ``synthesize(chunk_id, text, source_language, target_language, voice)``
  returns ``(bytes, 1.0)`` where ``bytes`` is a 1-second 16 kHz
  16-bit mono silent WAV.
- The seam is ``pydub.AudioSegment.silent(duration=1000, frame_rate=16000)``.
  CRITICAL: ``silent(1000)`` defaults to 11025 Hz — D-01 wants 16 kHz,
  so the ``frame_rate=16000`` kwarg is REQUIRED (gray area 2).
- ``len(text) <= 4096`` is asserted (D-03) — a chunker bug that lets
  a 5000-char chunk slip through must fail at this seam, not at
  pydub.

Behaviour gating (D-02 seam, keyed on the full ``chunk_id`` per D-04):
- ``success`` (default): happy-path; emits 1 s silent WAV.
- ``slow``: real ``asyncio.sleep(self._behaviour.slow_mode_sleep_seconds)``
  in production; the ``virtual_clock`` pytest fixture short-circuits
  the sleep so tests run sub-second.
- ``fail_once_then_succeed``: raises ``RuntimeError`` on the first
  call for a given ``chunk_id``; succeeds on subsequent calls. The
  per-chunk counter is keyed on the full ``chunk_id``.
- ``timeout``: raises ``TimeoutError``; plan 03-02's ``asyncio.wait_for(60)``
  envelope surfaces it as ``provider_timeout``.

Length seam (extends ``MOCK_TTS_BEHAVIOUR`` with a ``chunk_N:length=Ns``
token — research §Length Control): the in-process adapter maps a
``chunk_id`` to an override length in seconds; when set, the adapter
emits 16 kHz 16-bit mono PCM filled with uniform white noise of
that duration (stdlib ``wave`` + ``random`` — no numpy / soundfile /
ffmpeg). The D-03 chunk-size assertion and D-02 behaviour gating
both run BEFORE the length lookup, so a too-large chunk or a
``timeout``-mapped chunk still fails fast. Unmapped chunks fall
through to the default 1 s silent-WAV path (D-01 contract).

The ``source_language`` + ``target_language`` parameters are accepted
as pass-through (interface parity with ``TranslationPort``; future
real TTS providers may need them) but the mock does not use them.
The ``TTSPort`` Protocol declares only ``(chunk_id, text, voice) -> tuple[bytes, float]``;
``MockTTSAdapter`` accepts additional required positional args (the
``runtime_checkable`` Protocol check is method-name based, so the
structural shape is satisfied).

The ``AdapterBehaviour`` Pydantic model lives in the sibling
``behaviour.py`` (test-only fixture, quick 260709-9yk move from
``backend/src/epubtv/application/behaviour.py``). The mock consumes
it for all four modes; the production workflow services no longer
import it (the slow-mode seam retired with the in-process mocks'
move to ``tests/``).
"""

from __future__ import annotations

import asyncio
import io
import random
import struct
import wave

from pydub import AudioSegment

from .behaviour import AdapterBehaviour

__all__ = ["MockTTSAdapter"]

# D-01 contract: deterministic 1-second silent WAV at 16 kHz. The
# test seam: stitched chapter duration = N * 1.0 s ± 50 ms.
_SILENT_DURATION_MS: int = 1000
_FRAME_RATE_HZ: int = 16000  # explicit; pydub's default is 11025 (gray area 2)

# D-03 chunk-size seam: the chunker must enforce 4096. A
# CharacterChunker bug that lets a 5000-char chunk slip through
# must fail at this assertion, not at pydub (where the failure
# mode would be an obscure sample-rate mismatch).
_MAX_CHUNK_CHARS: int = 4096


def _white_noise_wav(duration_seconds: float, *, frame_rate: int = _FRAME_RATE_HZ) -> bytes:
    """Render ``duration_seconds`` of uniform white noise as 16 kHz 16-bit mono PCM WAV.

    Uses stdlib ``wave`` + ``random.randint`` — no numpy / soundfile /
    ffmpeg dep (research §Standard Stack; the new length seam is
    stdlib-only by design so the standalone ``mock-tts`` service
    keeps a slim image and does not need an ffmpeg install layer
    for the noise path).

    The number of samples is ``int(round(duration_seconds *
    frame_rate))`` so the actual rendered duration is ``n_samples /
    frame_rate`` (callers should use that for the contract return
    value, not the input — Pitfall 3 in research).
    """
    n_samples = max(1, round(duration_seconds * frame_rate))
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)  # 16-bit
        w.setframerate(frame_rate)
        w.writeframes(
            b"".join(struct.pack("<h", random.randint(-32768, 32767)) for _ in range(n_samples))
        )
    return buf.getvalue()


class MockTTSAdapter:
    """Sprint in-process TTS provider (D-01 + D-02 + D-03 + length seam)."""

    def __init__(self, behaviour: AdapterBehaviour) -> None:
        self._behaviour = behaviour
        # Per-chunk call counter for ``fail_once_then_succeed`` (D-02).
        # Keyed on the full ``chunk_id`` so each chunk has its own counter.
        self._call_counts: dict[str, int] = {}

    async def synthesize(
        self,
        chunk_id: str,
        text: str,
        source_language: str | None,
        target_language: str | None,
        voice: str,
    ) -> tuple[bytes, float]:
        """Synthesize ``text`` to a 1 s silent WAV at 16 kHz (D-01).

        Returns ``(audio_bytes, 1.0)``. Behaviour gating (slow /
        fail_once / timeout) happens BEFORE the silent generation
        so a failing call never produces a partial WAV.

        The length-seam branch runs AFTER the D-02 gating + the D-03
        assertion so:
        - a too-large chunk still raises ``AssertionError`` first,
        - a ``timeout``-mapped chunk still raises ``TimeoutError``
          first,
        - and a ``fail_once_then_succeed``-mapped chunk still raises
          ``RuntimeError`` on the first call.

        A mapped length causes the adapter to emit stdlib-wave
        white noise of that duration; the unmapped default is the
        1 s pydub-silent path (D-01).

        The ``source_language`` + ``target_language`` parameters
        are accepted as pass-through (interface parity with
        ``TranslationPort``; the mock does not use them). Future
        real TTS providers may need them for language-specific
        pronunciation hints.
        """
        # D-03 chunk-size seam: the chunker must enforce 4096.
        # A CharacterChunker bug that lets a 5000-char chunk slip
        # through fails HERE, not at pydub.
        assert len(text) <= _MAX_CHUNK_CHARS, (
            f"chunk {chunk_id!r} exceeded {_MAX_CHUNK_CHARS} chars: got {len(text)}"
        )
        _ = (source_language, target_language, voice)  # interface parity; mock does not use

        mode = self._behaviour.resolve(chunk_id)
        if mode == "timeout":
            raise TimeoutError(f"mock TTS forced timeout for chunk_id={chunk_id!r}")
        if mode == "fail_once_then_succeed" and self._call_counts.get(chunk_id, 0) == 0:
            self._call_counts[chunk_id] = 1
            raise RuntimeError(f"simulated fail_once_then_succeed for {chunk_id!r}")
        if mode == "slow":
            await asyncio.sleep(self._behaviour.slow_mode_sleep_seconds)
        # ``success`` (default) and the post-fail_once call fall through.

        # Length seam (runs AFTER D-02 gating + D-03 assertion so the
        # existing seams take priority). Mapped chunks render stdlib
        # white noise of the configured duration; unmapped chunks
        # keep the D-01 1 s pydub-silent path.
        override_length = self._behaviour.length_for(chunk_id)
        if override_length is not None:
            n_samples = max(1, round(override_length * _FRAME_RATE_HZ))
            return (
                _white_noise_wav(override_length, frame_rate=_FRAME_RATE_HZ),
                n_samples / _FRAME_RATE_HZ,
            )

        # CRITICAL (gray area 2): ``silent(1000)`` defaults to 11025 Hz.
        # D-01 wants 16 kHz → ``frame_rate=16000`` is REQUIRED.
        seg = AudioSegment.silent(duration=_SILENT_DURATION_MS, frame_rate=_FRAME_RATE_HZ)
        buf = io.BytesIO()
        seg.export(buf, format="wav")
        return buf.getvalue(), 1.0
