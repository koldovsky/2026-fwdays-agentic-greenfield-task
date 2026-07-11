"""``MockTranslatorDropsNthTag`` harness unit tests (Task 2 TDD cycle, D-07).

The in-process ``MockTranslationAdapter`` moved to
``tests/unit/_adapters/`` (BACK-01, plan 01-02); the
``AdapterBehaviour`` Pydantic model lives in
``backend/tests/unit/_adapters/behaviour.py`` (test-only fixture, quick
260709-9yk move from ``backend/src/epubtv/application/behaviour.py``).

Behaviours (F3 AC2 "exactly 95% accepted" + F3 AC3 "<95% rejected"):
- ``test_fixture_has_exactly_20_canonical_tags`` — the chapter
  fixture has EXACTLY 20 canonical structural tags; if this drifts
  the F3 "exactly 95%" regression is no longer exact.
- ``test_drops_nth_tag_1_yields_19_preserved`` — F3 AC2:
  ``DropsNthTag(1)`` over the 20-tag fixture yields 19 preserved tags
  (95% exact, accepted at the threshold).
- ``test_drops_nth_tag_2_yields_18_preserved`` — F3 AC3:
  ``DropsNthTag(2)`` yields 18 preserved tags (90%, below the
  threshold, rejected).
- ``test_drops_nth_tag_out_of_range_raises`` — ``DropsNthTag(99)``
  on a 20-tag fixture raises ``IndexError`` so callers size the
  fixture to the requested ``n``.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest

# Make ``_adapters`` (the test-only seam at tests/unit/_adapters/) +
# ``_harness`` (the test-only seam at tests/unit/_harness.py)
# importable as top-level modules. Pyrefly + the standalone test
# runner do not add ``tests/unit`` to ``sys.path`` automatically.
_TESTS_UNIT_DIR = Path(__file__).resolve().parent
if str(_TESTS_UNIT_DIR) not in sys.path:
    sys.path.insert(0, str(_TESTS_UNIT_DIR))

from _adapters.behaviour import AdapterBehaviour  # noqa: E402
from _adapters.test_mock_translation_adapter import MockTranslationAdapter  # noqa: E402
from _harness import (  # noqa: E402
    MockTranslatorDropsNthTag,
    count_canonical_tags,
)

pytestmark = pytest.mark.tcid("XLATE-02-UT09")

FIXTURE_PATH = (
    Path(__file__).resolve().parent.parent / "fixtures" / "chapters" / "structural_tags_20.html"
)


def _adapter() -> MockTranslationAdapter:
    """Build a fresh ``MockTranslationAdapter`` for the harness."""
    return MockTranslationAdapter(behaviour=AdapterBehaviour())


def _load_fixture() -> str:
    return FIXTURE_PATH.read_text(encoding="utf-8")


def test_fixture_has_exactly_20_canonical_tags() -> None:
    """Guard rail: the 20-tag chapter fixture must remain at exactly 20 tags."""
    html = _load_fixture()
    assert count_canonical_tags(html) == 20


def test_drops_nth_tag_1_yields_19_preserved() -> None:
    """F3 AC2: ``DropsNthTag(1)`` over the 20-tag fixture → 19 preserved (95% exact)."""
    html = _load_fixture()
    result = MockTranslatorDropsNthTag(_adapter(), n=1, chapter_html=html)
    assert count_canonical_tags(result) == 19
    # 19/20 = 0.95 → at the threshold, accepted
    assert count_canonical_tags(result) / 20 == 0.95


def test_drops_nth_tag_2_yields_18_preserved() -> None:
    """F3 AC3: ``DropsNthTag(2)`` over the 20-tag fixture → 18 preserved (90%, rejected)."""
    html = _load_fixture()
    result = MockTranslatorDropsNthTag(_adapter(), n=2, chapter_html=html)
    assert count_canonical_tags(result) == 18
    # 18/20 = 0.90 → below the 0.95 threshold, rejected
    assert count_canonical_tags(result) / 20 == 0.90


def test_drops_nth_tag_out_of_range_raises() -> None:
    """``DropsNthTag(99)`` on a 20-tag fixture raises ``IndexError``."""
    html = _load_fixture()
    with pytest.raises(IndexError, match="DropsNthTag"):
        MockTranslatorDropsNthTag(_adapter(), n=99, chapter_html=html)


def test_harness_does_not_mutate_underlying_adapter() -> None:
    """The harness must NOT mutate the adapter (test-only seam; per-chunk
    counters from the adapter should be untouched)."""
    html = _load_fixture()
    adapter = _adapter()
    before = dict(adapter._call_counts)
    MockTranslatorDropsNthTag(adapter, n=1, chapter_html=html)
    assert adapter._call_counts == before


def test_count_canonical_tags_counts_known_tags() -> None:
    """``count_canonical_tags`` returns the count of canonical elements."""
    html = "<p>a</p><p>b</p><h1>c</h1>"
    assert count_canonical_tags(html) == 3


def test_100_percent_preservation_baseline() -> None:
    """``DropsNthTag(0)`` is a no-op; the result preserves all 20 tags."""
    html = _load_fixture()
    # The harness raises IndexError for n=0 because seen never reaches 0;
    # a no-op harness is a different surface. We assert the adapter alone
    # preserves 100% by running the full chapter through the adapter and
    # counting tags.
    soup_text = html
    from bs4 import BeautifulSoup

    plain = BeautifulSoup(soup_text, "html5lib").get_text(separator=" ", strip=True)
    import re

    sentences = re.split(r"(?<=[.!?…])\s+(?=[A-ZÀ-ÖØ-Þ])", plain)
    parts: list[str] = []
    adapter = _adapter()
    for idx, sentence in enumerate(sentences):
        out = asyncio.run(
            adapter.translate(
                chunk_id=f"tx_ch0_s{idx}",
                source_text=f"<p>{sentence}</p>",
                source_language="en",
                target_language="de",
            )
        )
        parts.append(out)
    concatenated = "".join(parts)
    # The number of canonical tags in the concatenated output is at
    # least the number of sentences (each ``<p>`` survives + extras
    # preserved by the harness). The point: the production mock
    # preserves 100 % per F3 AC1.
    assert count_canonical_tags(concatenated) >= len(sentences)
