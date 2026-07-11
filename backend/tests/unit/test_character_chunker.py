"""CharacterChunker unit tests (Task 2 TDD cycle).

Satisfies D-04 (chunk_id namespace ``vo_ch{N}_a{M}``) + D-05
(CharacterChunker reuses ``SentenceChunker._tokenize`` for the
tier-1 sentence split) + D-10 (tier-3 hard-cut chunks carry
``chunk_split_warning``).

Locked contracts:
- Tier 1 (sentence): 5-sentence chapter → 5 chunks; every
  ``chunk_id`` matches ``^vo_ch{N}_a\\d+$``; every ``text`` <= 4096.
- Tier 2 (mid-sentence): a 4500-char single sentence with
  ``: at 3000`` + ``, at 3500`` → first chunk ends at the colon
  (priority walk). The 4-step priority order ``: → — → ; → ,`` is
  exhaustively tested.
- Tier 3 (hard cut): a 5000-char string of plain ``a`` characters
  with no delimiters → >= 2 chunks; every chunk carries
  ``split_warning`` matching ``^chunk_split_warning:``.
- Mixed chapter: 1 normal sentence + 1 overlong (5000 chars) →
  1 tier-1 chunk + 2+ tier-3 chunks.
- Regex fallback: ``language='ja'`` (NOT in SUPPORTED_LANGUAGES)
  uses the regex branch; result still has the ``vo_`` namespace +
  ``text`` length <= 4096.
"""

from __future__ import annotations

import re

import pytest

from epubtv.domain.chunkers import CharacterChunker

pytestmark = pytest.mark.tcid("VOICE-01-UT02")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _five_sentence_chapter() -> str:
    """A trivial 5-sentence English chapter (HTML-wrapped)."""
    return (
        "<p>First sentence here.</p>"
        "<p>Second sentence here.</p>"
        "<p>Third sentence here.</p>"
        "<p>Fourth sentence here.</p>"
        "<p>Fifth sentence here.</p>"
    )


def _make_overlong_with_priority_delim(
    primary_delim: str,
    secondary_delim: str,
    primary_at: int = 3000,
    secondary_at: int = 3500,
    total_len: int = 4500,
) -> str:
    """Build a 4500-char string with ``primary_delim`` + ``secondary_delim``.

    Default: 3000 chars of 'a', then ``primary_delim``, then
    ``secondary_at - primary_at - 1`` chars of 'a', then
    ``secondary_delim``, then padding.
    """
    prefix = "a" * primary_at + primary_delim
    middle = "a" * (secondary_at - primary_at - 1) + secondary_delim
    suffix = "a" * (total_len - len(prefix) - len(middle))
    return prefix + middle + suffix


# ---------------------------------------------------------------------------
# Tier 1: sentence
# ---------------------------------------------------------------------------


def test_tier1_sentence_chunking_for_short_chapter() -> None:
    """Tier 1: a 5-sentence chapter yields 5 chunks with ``vo_`` ids."""
    chunker = CharacterChunker()
    html = _five_sentence_chapter()

    chunks = chunker.chunk(html, language="en", chapter_idx=3)

    assert len(chunks) == 5, f"expected 5 chunks, got {len(chunks)}"
    pattern = re.compile(r"^vo_ch3_a\d+$")
    for c in chunks:
        assert pattern.match(c.chunk_id), (
            f"chunk_id should match ^vo_ch3_a\\d+$, got {c.chunk_id!r}"
        )
        assert len(c.text) <= 4096, f"chunk text length should be <= 4096, got {len(c.text)}"
        # Each sentence ends with sentence-end punctuation.
        assert c.text.endswith(".") or c.text.endswith("!") or c.text.endswith("?"), (
            f"chunk text should end with sentence punctuation, got {c.text!r}"
        )


def test_tier1_chunk_id_namespace_is_vo_chapter_audio() -> None:
    """D-04: chunk_ids are ``vo_ch{N}_a{M}`` (not ``tx_``)."""
    chunker = CharacterChunker()
    chunks = chunker.chunk(_five_sentence_chapter(), language="en", chapter_idx=7)

    for c in chunks:
        assert c.chunk_id.startswith("vo_ch7_a"), (
            f"chunk_id namespace should be vo_ch7_a, got {c.chunk_id!r}"
        )
        assert "_s" not in c.chunk_id, (
            f"chunk_id should NOT use the tx_ 's' sub-id, got {c.chunk_id!r}"
        )


def test_tier1_text_length_within_4096_for_every_chunk() -> None:
    """D-03 chunk-size invariant: every chunk's text is <= 4096 chars."""
    chunker = CharacterChunker()
    chunks = chunker.chunk(_five_sentence_chapter(), language="en", chapter_idx=0)

    for c in chunks:
        assert len(c.text) <= 4096, (
            f"chunk text length should be <= 4096 (D-03), got {len(c.text)} for {c.chunk_id}"
        )


def test_tier1_chunks_have_no_split_warning() -> None:
    """Tier-1 (sentence) chunks carry ``split_warning=None``."""
    chunker = CharacterChunker()
    chunks = chunker.chunk(_five_sentence_chapter(), language="en", chapter_idx=0)

    for c in chunks:
        assert c.split_warning is None, (
            f"tier-1 chunks should have split_warning=None, got {c.split_warning!r}"
        )


# ---------------------------------------------------------------------------
# Tier 2: mid-sentence priority walk
# ---------------------------------------------------------------------------


def test_tier2_priority_walk_splits_at_colon_first() -> None:
    """``:` at 3000 + `,` at 3500 → first chunk ends with the colon (priority 0)."""
    chunker = CharacterChunker()
    s = _make_overlong_with_priority_delim(primary_delim=":", secondary_delim=",")

    chunks = chunker.chunk(f"<p>{s}</p>", language="en", chapter_idx=0)

    assert len(chunks) >= 2, f"expected >= 2 chunks, got {len(chunks)}"
    # First chunk ends with the colon (last occurrence within budget).
    assert chunks[0].text.endswith(":"), (
        f"first chunk should end at the colon (priority 0), got {chunks[0].text[-10:]!r}"
    )
    # The comma at 3500 is past the colon-split head so the head is
    # the 3001-char prefix ending with ``:``.
    assert len(chunks[0].text) <= 4096
    # No warning on tier-2 chunks.
    assert chunks[0].split_warning is None


def test_tier2_priority_walk_splits_at_em_dash_second() -> None:
    """No `:` + has `—` + `,` → first chunk ends with em-dash (priority 1)."""
    chunker = CharacterChunker()
    s = _make_overlong_with_priority_delim(primary_delim="—", secondary_delim=",")

    chunks = chunker.chunk(f"<p>{s}</p>", language="en", chapter_idx=0)

    assert len(chunks) >= 2, f"expected >= 2 chunks, got {len(chunks)}"
    assert chunks[0].text.endswith("—"), (
        f"first chunk should end at the em-dash (priority 1), got {chunks[0].text[-10:]!r}"
    )
    assert chunks[0].split_warning is None


def test_tier2_priority_walk_splits_at_semicolon_third() -> None:
    """No `:` / `—` + has `;` + `,` → first chunk ends with semicolon (priority 2)."""
    chunker = CharacterChunker()
    s = _make_overlong_with_priority_delim(primary_delim=";", secondary_delim=",")

    chunks = chunker.chunk(f"<p>{s}</p>", language="en", chapter_idx=0)

    assert len(chunks) >= 2, f"expected >= 2 chunks, got {len(chunks)}"
    assert chunks[0].text.endswith(";"), (
        f"first chunk should end at the semicolon (priority 2), got {chunks[0].text[-10:]!r}"
    )
    assert chunks[0].split_warning is None


def test_tier2_priority_walk_splits_at_comma_last() -> None:
    """Only `,` available → first chunk ends with comma (priority 3)."""
    chunker = CharacterChunker()
    s = "a" * 3000 + "," + "a" * 1500  # 4501 chars; only a comma within budget

    chunks = chunker.chunk(f"<p>{s}</p>", language="en", chapter_idx=0)

    assert len(chunks) >= 2, f"expected >= 2 chunks, got {len(chunks)}"
    assert chunks[0].text.endswith(","), (
        f"first chunk should end at the comma (priority 3), got {chunks[0].text[-10:]!r}"
    )
    assert chunks[0].split_warning is None


# ---------------------------------------------------------------------------
# Tier 3: hard cut
# ---------------------------------------------------------------------------


def test_tier3_hard_cut_for_5000_char_string() -> None:
    """5000 chars of plain 'a' with no delimiters → >= 2 chunks + warning on every piece."""
    chunker = CharacterChunker()
    s = "a" * 5000

    chunks = chunker.chunk(f"<p>{s}</p>", language="en", chapter_idx=0)

    assert len(chunks) >= 2, f"expected >= 2 chunks, got {len(chunks)}"
    for c in chunks:
        assert c.split_warning is not None, (
            f"tier-3 chunks must carry split_warning, got None for {c.chunk_id}"
        )
        assert c.split_warning.startswith("chunk_split_warning:"), (
            f"tier-3 split_warning should start with the marker prefix, got {c.split_warning!r}"
        )
        assert len(c.text) <= 4096, (
            f"tier-3 chunk length should be <= 4096, got {len(c.text)} for {c.chunk_id}"
        )


# ---------------------------------------------------------------------------
# Mixed chapter
# ---------------------------------------------------------------------------


def test_mixed_chapter_with_overlong_and_normal_sentences() -> None:
    """1 normal sentence + 1 overlong (5000 chars) → 1 tier-1 + 2+ tier-3."""
    chunker = CharacterChunker()
    normal = "A perfectly normal English sentence with a period."
    overlong = "b" * 5000  # 5000 chars of 'b', no sentence punctuation, no delimiters
    html = f"<p>{normal}</p><p>{overlong}</p>"

    chunks = chunker.chunk(html, language="en", chapter_idx=0)

    assert len(chunks) >= 3, f"expected >= 3 chunks (1 normal + 2+ tier-3), got {len(chunks)}"
    # First chunk: the normal sentence, no warning.
    assert chunks[0].text == normal, (
        f"first chunk should be the normal sentence, got {chunks[0].text!r}"
    )
    assert chunks[0].split_warning is None
    # Remaining chunks: tier-3 hard cuts, every one has the warning.
    for c in chunks[1:]:
        assert c.split_warning is not None
        assert c.split_warning.startswith("chunk_split_warning:")


def test_chunk_split_warning_only_on_tier3_chunks() -> None:
    """D-10: tier-1 + tier-2 chunks have ``split_warning=None``; tier-3 has a string."""
    chunker = CharacterChunker()
    # Mixed input: 1 normal sentence, 1 mid-length sentence (well under 4096),
    # 1 overlong with no delimiters.
    html = (
        "<p>First normal sentence.</p>"
        "<p>Second normal sentence that is still under the budget.</p>"
        "<p>" + "c" * 5000 + "</p>"  # 5000 'c' chars, no delimiters → tier-3
    )

    chunks = chunker.chunk(html, language="en", chapter_idx=0)

    # The tier-1 / tier-2 chunks have None; the tier-3 chunks have the marker.
    warnings = [c.split_warning for c in chunks]
    tier3_with_warnings = [w for w in warnings if w is not None]
    tier1_tier2_without = [w for w in warnings if w is None]
    assert len(tier3_with_warnings) >= 2, (
        f"expected >= 2 tier-3 chunks with warnings, got {len(tier3_with_warnings)}"
    )
    assert len(tier1_tier2_without) >= 2, (
        f"expected >= 2 tier-1/tier-2 chunks with None warning, got {len(tier1_tier2_without)}"
    )
    for w in tier3_with_warnings:
        assert w.startswith("chunk_split_warning:")


# ---------------------------------------------------------------------------
# Regex fallback for non-NLTK languages
# ---------------------------------------------------------------------------


def test_regex_fallback_for_non_nltk_language() -> None:
    """``language='ja'`` (not in SUPPORTED_LANGUAGES) uses regex; still ``vo_`` namespace."""
    chunker = CharacterChunker()
    # 3 English-like sentences so the regex branch has something to split.
    html = "<p>First sentence here. Second sentence here. Third sentence here.</p>"

    chunks = chunker.chunk(html, language="ja", chapter_idx=2)

    assert len(chunks) >= 2, f"expected >= 2 chunks for the regex branch, got {len(chunks)}"
    for c in chunks:
        assert c.chunk_id.startswith("vo_ch2_a"), (
            f"regex branch should still produce vo_ namespace, got {c.chunk_id!r}"
        )
        assert len(c.text) <= 4096, (
            f"regex-branch chunk length should be <= 4096, got {len(c.text)} for {c.chunk_id}"
        )
