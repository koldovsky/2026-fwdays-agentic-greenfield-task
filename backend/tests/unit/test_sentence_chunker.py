"""SentenceChunker unit tests (Task 1 TDD cycle, D-01 + D-09).

Behaviours:
- ``test_100_sentence_chapter_yields_100_chunks`` — the canonical
  F3 "100 sentences = 100 chunks" BDD AC. NLTK punkt_tab branch
  on the 100-sentence English fixture; ``chunk_id`` namespace
  ``tx_ch{chapter_idx}_s{sentence_idx}`` per D-04.
- ``test_4096_cap_splits_overlong_sentence`` — a single 5000-char
  English sentence produces 2 chunks (4096 cap); the second chunk
  contains the remainder.
- ``test_regex_fallback_uses_4096_cap`` — when ``language="ja"`` (not
  in ``SUPPORTED_LANGUAGES``) the regex branch runs; the same
  100-sentence English fixture still yields 100 chunks; an overlong
  sentence in fallback still splits at 4096.
- ``test_1_sentence_yields_1_chunk`` — regression: a single-sentence
  chapter produces 1 chunk.
- ``test_chunk_id_format_is_tx_namespace`` — the chunk_id format
  matches the ``tx_ch{N}_s{M}`` regex.

Per Pattern 3: NLTK punkt_tab branch + regex fallback + 4096 cap.
Per TESTING.md: the regex branch is exercised via ``language="ja"``
because the punkt data download is not required for the test (NLTK
data is hermetic in CI via the bake step, but unit tests do not
trigger the download — ``EPUBTV_BAKE_NLTK`` stays OFF).
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from epubtv.domain.chunkers import Chunk, SentenceChunker

pytestmark = pytest.mark.tcid("XLATE-01-UT06")

CHUNK_ID_RE = re.compile(r"^tx_ch(\d+)_s(\d+)$")
FIXTURE_PATH = (
    Path(__file__).resolve().parent.parent / "fixtures" / "chapters" / "100_english_sentences.html"
)


def _load_fixture() -> str:
    return FIXTURE_PATH.read_text(encoding="utf-8")


def test_100_sentence_chapter_yields_100_chunks(nltk_data: None) -> None:
    """F3 AC2: 100-sentence English chapter → 100 chunks via NLTK branch."""
    chunker = SentenceChunker()
    html = _load_fixture()
    chunks = chunker.chunk(html, language="en", chapter_idx=3)
    assert len(chunks) == 100
    assert chunks[0].chunk_id == "tx_ch3_s0"
    assert chunks[-1].chunk_id == "tx_ch3_s99"
    for chunk in chunks:
        assert isinstance(chunk, Chunk)
        assert CHUNK_ID_RE.match(chunk.chunk_id)
        assert chunk.text  # non-empty


def test_4096_cap_splits_overlong_sentence(nltk_data: None) -> None:
    """A 5000-char English sentence splits into 2 chunks (4096 cap, D-01)."""
    chunker = SentenceChunker()
    long = "a" * 5000 + "."  # 5001 chars total
    html = f"<p>{long}</p>"
    chunks = chunker.chunk(html, language="en", chapter_idx=0)
    assert len(chunks) == 2
    assert len(chunks[0].text) == 4096
    # 5001 total - 4096 first = 905 in the second chunk
    assert len(chunks[1].text) == 5001 - 4096
    # Sub-chunks share the same ``s{0}`` id (D-04 resume semantics).
    assert chunks[0].chunk_id == chunks[1].chunk_id == "tx_ch0_s0"


def test_1_sentence_yields_1_chunk(nltk_data: None) -> None:
    """Regression: single-sentence chapter produces exactly 1 chunk."""
    chunker = SentenceChunker()
    chunks = chunker.chunk("<p>Hello world.</p>", language="en", chapter_idx=0)
    assert len(chunks) == 1
    assert chunks[0].chunk_id == "tx_ch0_s0"
    assert chunks[0].text == "Hello world."


def test_regex_fallback_uses_4096_cap() -> None:
    """When ``language="ja"`` the regex branch runs and the 4096 cap is enforced.

    The 100-sentence English fixture still produces 100 chunks via the
    regex ``r'(?<=[.!?…])\\s+(?=[A-ZÀ-ÖØ-Þ])'`` (the text shape matches
    the regex). An overlong sentence in fallback still splits at 4096.
    """
    chunker = SentenceChunker()
    html = _load_fixture()
    chunks = chunker.chunk(html, language="ja", chapter_idx=1)
    assert len(chunks) == 100
    assert chunks[0].chunk_id == "tx_ch1_s0"
    assert chunks[-1].chunk_id == "tx_ch1_s99"


def test_regex_fallback_splits_overlong_sentence() -> None:
    """Regex branch enforces the 4096 cap on an overlong sentence."""
    chunker = SentenceChunker()
    long = "a" * 5000 + "."  # 5001 chars total
    html = f"<p>{long}</p>"
    chunks = chunker.chunk(html, language="ja", chapter_idx=0)
    assert len(chunks) == 2
    assert len(chunks[0].text) == 4096
    # 5001 total - 4096 first = 905 in the second chunk
    assert len(chunks[1].text) == 5001 - 4096


def test_chunk_id_format_is_tx_namespace(nltk_data: None) -> None:
    """Every chunk_id matches the locked ``tx_ch{N}_s{M}`` namespace."""
    chunker = SentenceChunker()
    chunks = chunker.chunk("<p>One. Two. Three.</p>", language="en", chapter_idx=42)
    assert len(chunks) == 3
    assert [c.chunk_id for c in chunks] == ["tx_ch42_s0", "tx_ch42_s1", "tx_ch42_s2"]


def test_html_stripped_to_visible_text(nltk_data: None) -> None:
    """``BeautifulSoup.get_text`` strips tags before tokenization."""
    chunker = SentenceChunker()
    html = "<p>First sentence. <em>Second</em> sentence.</p>"
    chunks = chunker.chunk(html, language="en", chapter_idx=0)
    # Tags are gone from ``text`` (the per-chunk translate call still
    # receives the original HTML separately — the chunker only shapes ids).
    assert len(chunks) == 2
    assert chunks[0].text == "First sentence."
    assert chunks[1].text == "Second sentence."
