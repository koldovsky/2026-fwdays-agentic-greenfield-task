"""Chunkers — sentence-bounded translation chunks (D-01, D-04, D-09).

``SentenceChunker.chunk(html, language, chapter_idx)`` splits a chapter's
HTML into sentence-bounded chunks suitable for per-chunk translation
calls. Each emitted chunk is a ``Chunk(chunk_id, text)`` NamedTuple
where ``chunk_id`` follows the per-workflow namespace from D-04
(``tx_ch{chapter_idx}_s{sentence_idx}``).

The chunker has two branches selected at call time by
``language in SUPPORTED_LANGUAGES`` (D-09):

1. **NLTK branch** — ``nltk.tokenize.PunktTokenizer(language).tokenize(text)``
   for the 19 bundled NLTK languages. Tokenization is offline, hermetic,
   and handles abbreviations correctly (Pitfall 8 in STATE.md). Requires
   the ``punkt`` + ``punkt_tab`` NLTK data packages to be baked; the
   import-time guard below calls ``bake()`` once per process if the
   data is missing AND ``settings.bake_nltk`` is True (Open Q 10).
2. **Regex fallback branch** — ``re.split(...)`` on sentence-end
   punctuation for the 36+ ISO 639-1 target languages that NLTK does
   not cover. Calibrated against the Gutenberg fixture (no
   abbreviations causing splits).

Both branches enforce a 4096-char hard cap per chunk (D-01 +
TESTING.md §Known pitfalls). A single sentence that exceeds 4096 chars
is split into multiple chunks by character offset; sub-chunks share
the same ``s{N}`` chunk_id so resume semantics are unambiguous
(per-chunk atomicity lives in the worker; this module only shapes
the chunk list).

``CharacterChunker`` (Phase 3 / D-04 + D-05 + D-10) is the
voiceover-side analog. It implements a 3-tier fallback (D-04):

1. **Tier 1 (sentence)**: reuse ``SentenceChunker._tokenize`` for
   NLTK / regex tokenization. A sentence <= 4096 chars emits a single
   ``Chunk`` with ``split_warning=None``.
2. **Tier 2 (mid-sentence)**: a single overlong sentence walks the
   priority order ``":" → "—" → ";" → ","`` and splits at the last
   occurrence within the 4096-char budget. The split is recursive:
   if the remainder is still overlong, the walk recurses.
3. **Tier 3 (hard cut)**: no delimiter fits within the budget. The
   chunker falls back to character-offset split at 4096 and stamps
   every emitted piece with ``split_warning="chunk_split_warning:
   hard cut at 4096"`` (D-10) so the worker can persist the warning
   to ``job_chunks.chunk_split_warning`` (Alembic 0002).

The ``Chunk`` namedtuple is extended with a 3rd ``split_warning``
field (default ``None``) so ``SentenceChunker`` callers that use
the 2-arg constructor continue to work without modification
(backward-compat — the namedtuple default is ``None``).
"""

from __future__ import annotations

import os
import re
from typing import NamedTuple

from bs4 import BeautifulSoup
from nltk.tokenize.punkt import PunktTokenizer

from epubtv.domain.nltk_languages import SUPPORTED_LANGUAGES, nltk_name_for
from epubtv.tools.bake_nltk import bake as _bake_nltk

__all__ = ["CharacterChunker", "Chunk", "SentenceChunker"]


# Hard 4096-char cap per chunk (D-01 + TESTING.md §Pitfall + D-03
# TTS contract). A single sentence whose visible text exceeds this
# triggers the CharacterChunker tier-2 / tier-3 escalation; the
# SentenceChunker falls back to character-offset sub-chunks that
# share the same ``s{N}`` id.
_CHUNK_CAP: int = 4096

# Regex fallback for languages outside the NLTK 19-language set
# (D-09). Matches at every sentence-end punctuation followed by
# whitespace + a capital letter; calibrated against the Gutenberg
# fixture's 100-sentence lorem-style HTML (no abbreviations causing
# mid-sentence splits).
_SENTENCE_SPLIT_REGEX: re.Pattern[str] = re.compile(r"(?<=[.!?…])\s+(?=[A-ZÀ-ÖØ-Þ])")

# D-04 tier-2 priority walk order. The chunker walks this list
# from index 0 to index 3; the first delimiter that has an
# occurrence within the 4096-char budget wins. The em-dash is the
# literal U+2014 character (matches the EPUB convention).
_TIER2_DELIMITERS: tuple[str, ...] = (":", "—", ";", ",")

# D-10 tier-3 hard-cut warning string. Persisted to
# ``job_chunks.chunk_split_warning`` (Alembic 0002) so the worker
# can record which chunks were split by force.
_TIER3_WARNING: str = "chunk_split_warning: hard cut at 4096"


class Chunk(NamedTuple):
    """A sentence-bounded chunk of chapter HTML ready for translation / TTS.

    Fields:
    - ``chunk_id``: ``tx_ch{chapter_idx}_s{sentence_idx}`` (translation,
      Phase 2) or ``vo_ch{chapter_idx}_a{chunk_idx}`` (voiceover,
      Phase 3 / D-04) per workflow namespace. Sub-chunks of a single
      overlong sentence share the same id; the worker treats them as
      separate per-chunk writes but the resume invariant is keyed on
      the sentence (D-04 resume semantics).
    - ``text``: the visible text of the chunk (HTML stripped to plain
      text for tokenization; the per-chunk translation call receives
      the original HTML so structural tags are preserved).
    - ``split_warning``: ``None`` for tier-1 / tier-2 splits;
      ``chunk_split_warning: hard cut at 4096`` for tier-3 hard-cuts
      (Phase 3 / D-10). The default is ``None`` so
      ``SentenceChunker`` callers that use the 2-arg constructor
      continue to work without modification.
    """

    chunk_id: str
    text: str
    split_warning: str | None = None


class SentenceChunker:
    """Split a chapter's HTML into sentence-bounded chunks.

    The class shape matches the hexagonal "domain service" pattern
    used by ``EpubService`` so the worker can depend on the chunker
    via DI. ``CharacterChunker.chunk`` reuses ``_tokenize`` for the
    tier-1 sentence split (Phase 3 / D-05).
    """

    def chunk(
        self,
        html: str,
        language: str,
        chapter_idx: int = 0,
    ) -> list[Chunk]:
        """Return the sentence-bounded chunks of ``html`` for ``language``.

        Pipeline:
        1. Strip HTML to visible text (BeautifulSoup html5lib, Pitfall
           parity with the rest of the codebase).
        2. Tokenize into sentences via NLTK (supported language) or the
           regex fallback (everything else).
        3. Enforce the 4096-char hard cap by character offset.
        4. Wrap each emitted piece as ``Chunk(chunk_id, text)`` with the
           locked ``tx_ch{N}_s{M}`` namespace. The 3-arg
           ``split_warning=None`` default is forward-compat for
           CharacterChunker callers; SentenceChunker never sets it.
        """
        text = BeautifulSoup(html, "html5lib").get_text(separator=" ", strip=True)
        sentences = self._tokenize(text, language)
        return self._hard_cap_to_chunks(sentences, chapter_idx=chapter_idx)

    @staticmethod
    def _tokenize(text: str, language: str) -> list[str]:
        """Tokenize ``text`` into sentences. NLTK or regex branch.

        Exposed at the class-method level (vs. private with an
        underscore) so ``CharacterChunker`` (Phase 3) can reuse it
        for the tier-1 sentence split. The D-05 reuse is the
        contract; the underscore was kept for backward-compat.
        """
        if language in SUPPORTED_LANGUAGES:
            # NLTK 3.9.4 ``PunktTokenizer`` expects the full NLTK name
            # (e.g. ``"english"``), not the ISO 639-1 code.
            return PunktTokenizer(nltk_name_for(language)).tokenize(text)
        return _SENTENCE_SPLIT_REGEX.split(text)

    @staticmethod
    def _hard_cap_to_chunks(sentences: list[str], *, chapter_idx: int) -> list[Chunk]:
        """Apply the 4096-char hard cap and assign ``tx_ch{N}_s{M}`` ids."""
        out: list[Chunk] = []
        for sentence_idx, sentence in enumerate(sentences):
            chunk_id = f"tx_ch{chapter_idx}_s{sentence_idx}"
            if len(sentence) <= _CHUNK_CAP:
                out.append(Chunk(chunk_id=chunk_id, text=sentence))
                continue
            # Overlong sentence: split by character offset; sub-chunks
            # share the same ``s{N}`` id (resume semantics in D-04).
            for start in range(0, len(sentence), _CHUNK_CAP):
                out.append(Chunk(chunk_id=chunk_id, text=sentence[start : start + _CHUNK_CAP]))
        return out


class CharacterChunker:
    """3-tier chunker for voiceover (Phase 3 / D-04 + D-05 + D-10).

    Pipeline (per sentence, after HTML-strip + tier-1 tokenization):
    1. **Tier 1 (sentence)**: ``SentenceChunker._tokenize(plain, language)``
       returns a list of sentences. Each sentence <= 4096 chars is
       emitted as a single ``Chunk`` with ``split_warning=None``.
    2. **Tier 2 (mid-sentence)**: a sentence > 4096 chars walks the
       priority order ``":" → "—" → ";" → ","`` and splits at the
       last occurrence of the first delimiter that has an occurrence
       within the 4096-char budget. The split is recursive: if the
       remainder is still overlong, the walk recurses on the
       remainder. All tier-2 pieces have ``split_warning=None``.
    3. **Tier 3 (hard cut)**: no delimiter fits within the budget.
       The chunker falls back to character-offset split at 4096 and
       stamps every emitted piece with the ``_TIER3_WARNING`` string
       (D-10). The worker persists the warning to
       ``job_chunks.chunk_split_warning`` (Alembic 0002).

    The ``chunk_id`` namespace is hard-coded ``vo_ch{chapter_idx}_a{chunk_idx}``
    (D-04) — the chunker ALWAYS uses the voiceover namespace.
    """

    def chunk(
        self,
        html: str,
        language: str,
        chapter_idx: int = 0,
    ) -> list[Chunk]:
        """Return the 3-tier chunked list of ``html`` for voiceover.

        The HTML is stripped to plain text once (BeautifulSoup
        html5lib), then tokenized into sentences via
        ``SentenceChunker._tokenize`` (D-05 — reuses the NLTK /
        regex split). Each sentence is then flattened via
        ``_flatten_overlong`` (tier-2 priority walk + tier-3 hard
        cut). Chunks are assigned ``vo_ch{chapter_idx}_a{idx}`` ids
        in emission order.
        """
        text = BeautifulSoup(html, "html5lib").get_text(separator=" ", strip=True)
        sentences = SentenceChunker._tokenize(text, language)
        out: list[Chunk] = []
        ci = 0
        for sent in sentences:
            for piece, warning in self._flatten_overlong(sent):
                out.append(
                    Chunk(
                        chunk_id=f"vo_ch{chapter_idx}_a{ci}",
                        text=piece,
                        split_warning=warning,
                    )
                )
                ci += 1
        return out

    def _flatten_overlong(self, sent: str) -> list[tuple[str, str | None]]:
        """Flatten an overlong sentence into <= 4096-char pieces.

        Returns a list of ``(text, warning)`` pairs where ``warning``
        is ``None`` for tier-1 / tier-2 splits and the hard-cut
        marker for tier-3 splits.

        Algorithm:
        - If ``sent`` fits in the budget: one tuple ``(sent, None)``.
        - Else: walk ``_TIER2_DELIMITERS`` from index 0 to index 3.
          For the first delimiter with an occurrence within the
          4096-char budget, split there and recurse on the remainder
          (so a 10000-char sentence with two `:` within 4096 will
          recurse to handle the 5904-char tail).
        - If no delimiter fits: tier-3 hard cut at 4096, every piece
          carries the warning.
        """
        if len(sent) <= _CHUNK_CAP:
            return [(sent, None)]
        for delim in _TIER2_DELIMITERS:
            # Walk the last occurrence of ``delim`` within the budget.
            # ``_CHUNK_CAP - 1`` is the inclusive last index; we look at
            # indices in [0, _CHUNK_CAP) so a delimiter at exactly
            # 4096 would still fit the head but we cap to keep head <
            # 4096 to leave room for the delimiter itself.
            last_at = -1
            upper = min(len(sent), _CHUNK_CAP)
            for i in range(upper - 1, -1, -1):
                if sent[i] == delim:
                    last_at = i
                    break
            if last_at >= 0:
                head = sent[: last_at + 1].strip()
                tail = sent[last_at + 1 :].strip()
                pieces: list[tuple[str, str | None]] = [(head, None)] if head else []
                if tail:
                    pieces.extend(self._flatten_overlong(tail))
                return pieces
        # Tier 3: hard cut at 4096.
        return [(sent[s : s + _CHUNK_CAP], _TIER3_WARNING) for s in range(0, len(sent), _CHUNK_CAP)]


# Module-level import-time guard: bake NLTK data once per process when
# the ``EPUBTV_BAKE_NLTK`` env knob is set. Tests run with the knob OFF
# so unit tests do NOT trigger a download (TESTING.md §Running).
# Production builds set ``EPUBTV_BAKE_NLTK=1`` so a fresh container
# with no baked data triggers the download on first import.
if os.environ.get("EPUBTV_BAKE_NLTK") == "1":
    _bake_nltk()
