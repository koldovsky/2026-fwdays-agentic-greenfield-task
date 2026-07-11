"""Mock-translator test harness — ``MockTranslatorDropsNthTag(n)``.

Test-only factory that drives the F3 "exactly 95%" / "<95% rejected"
BDD regressions. The in-process ``MockTranslationAdapter`` (test-only,
lives in ``tests/unit/_adapters/`` per BACK-01 + plan 01-02)
preserves 100% of canonical structural tags; the test profile below
post-processes the translated output to drop the n-th canonical tag so
the ≥95% threshold assertion has a deterministic way to inject the
deficit (D-07 + CONVENTIONS.md §Mock provider harness).

Lives in ``tests/unit/_harness.py`` per backend/TESTING.md's mock
harness convention (test-only, never in ``adapters/`` or
``application/``). Production code paths do NOT import this module.
"""

from __future__ import annotations

import asyncio

from _adapters.test_mock_translation_adapter import (
    _STRUCTURAL_TAG_NAMES,
    MockTranslationAdapter,
)
from bs4 import BeautifulSoup, Tag

__all__ = ["MockTranslatorDropsNthTag", "count_canonical_tags"]


# Canonical structural tag set per api-contract.md line 49. Mirrors
# ``_STRUCTURAL_TAG_NAMES`` from the production mock; duplicated here
# to keep the harness self-contained (TESTING.md mock-harness rule).
CANONICAL_TAG_NAMES: tuple[str, ...] = _STRUCTURAL_TAG_NAMES


def count_canonical_tags(html: str) -> int:
    """Count canonical structural elements in ``html`` (F3 tag-integrity diff)."""
    soup = BeautifulSoup(html, "html5lib")
    total = 0
    for name in CANONICAL_TAG_NAMES:
        total += len(soup.find_all(name))
    return total


def MockTranslatorDropsNthTag(
    adapter: MockTranslationAdapter,
    n: int,
    chapter_html: str,
) -> str:
    """Run ``adapter`` over the chapter and drop the first ``n`` canonical tags.

    Translates the entire chapter as a single chunk (the production
    mock preserves 100% of structural tags, so the full document is
    the right unit of work), then drops the first ``n`` canonical
    structural tags from the translated HTML and returns the
    post-processed document. ``n=1`` drops the FIRST canonical tag,
    ``n=2`` drops the first TWO canonical tags, etc. The drops are in
    document order, so a 20-tag chapter with ``n=2`` yields 18
    preserved tags (F3 AC3 below-95% regression).

    Raises ``IndexError`` if ``n`` exceeds the tag count of the
    translated output — call sites should size the chapter fixture
    to have at least ``n`` canonical tags.
    """
    translated = asyncio.run(
        adapter.translate(
            chunk_id="tx_ch0_s0",
            source_text=chapter_html,
            source_language="en",
            target_language="de",
        )
    )
    return _drop_first_n_canonical_tags(translated, n)


def _drop_first_n_canonical_tags(html: str, n: int) -> str:
    """Return ``html`` with the first ``n`` canonical structural tags removed.

    Walks the document in depth-first order and ``decompose()``s the
    first ``n`` canonical tags found. The remainder of the document
    is untouched. Raises ``IndexError`` if the document has fewer
    than ``n`` canonical tags.
    """
    soup = BeautifulSoup(html, "html5lib")
    seen: int = 0
    for element in soup.find_all(list(CANONICAL_TAG_NAMES)):
        if not isinstance(element, Tag):
            continue
        seen += 1
        element.decompose()
        if seen >= n:
            break
    if seen < n:
        raise IndexError(f"DropsNthTag({n}) requested but only {seen} canonical tag(s) in document")
    return str(soup)
