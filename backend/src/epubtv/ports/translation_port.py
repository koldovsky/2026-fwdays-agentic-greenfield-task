"""TranslationPort — seam for translation providers (Phase 2/4).

Phase 1 binds the mock adapter but never invokes it; Phase 2 wires the
per-chunk translation loop, Phase 4 chains it into the combined workflow.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class TranslationPort(Protocol):
    """Async translation provider seam.

    Implementations: ``MockTranslationAdapter`` (Phase 1 + sprint demo),
    real adapters (Ollama / OpenAI / OmniVoice — PRD Phase 4) — swapped at
    the FastAPI lifespan DI composition root only.
    """

    async def translate(
        self,
        chunk_id: str,
        source_text: str,
        source_language: str | None,
        target_language: str,
    ) -> str:
        """Translate ``source_text`` from source → target language.

        Implementations MUST preserve structural HTML tags hermetically so
        F3-AC1's ≥95% diff assertion is reproducible (CONVENTIONS.md
        §Mock provider harness; TESTING.md).
        """
        ...
