"""TTSPort — seam for text-to-speech providers (Phase 3/4)."""

from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class TTSPort(Protocol):
    """Async TTS provider seam.

    Implementations: ``MockTTSAdapter`` (Phase 1 + sprint demo), real
    adapters (OpenAI-TTS / OmniVoice — PRD Phase 4) — swapped at the
    FastAPI lifespan DI composition root only.
    """

    async def synthesize(
        self,
        chunk_id: str,
        text: str,
        source_language: str | None,
        target_language: str | None,
        voice: str,
    ) -> tuple[bytes, float]:
        """Synthesize ``text`` to audio.

        Returns ``(audio_bytes, duration_seconds)``. Implementations return
        deterministic silent-audio WAV bytes so pydub's ±50ms stitch
        assertion is reproducible (CONVENTIONS.md §Mock provider harness).

        The ``source_language`` + ``target_language`` parameters are
        interface parity with ``TranslationPort`` (mock implementations
        do not use them; future real TTS providers may need them for
        language-specific pronunciation hints). The
        ``VoiceOverWorkflowService`` passes ``source_language`` for both
        because there is no target language for a voiceover job (the
        output is audio in the same language as the source text).
        """
        ...
