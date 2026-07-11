"""``MockTranslationAdapter`` unit tests (Task 2 TDD cycle, D-04 + D-07).

The in-process ``MockTranslationAdapter`` moved to
``tests/unit/_adapters/`` as a test-only fixture (BACK-01, plan 01-02).
The ``AdapterBehaviour`` Pydantic model lives in
``backend/tests/unit/_adapters/behaviour.py`` (test-only fixture, quick
260709-9yk move from ``backend/src/epubtv/application/behaviour.py``;
the mock consumes it for all four modes).

Behaviours (locked by D-04 + D-07 + CONVENTIONS.md §Mock provider harness):
- ``test_writes_d07_wrapper_shape`` — the canonical ``<p>`` input
  produces a real ``<span xml:lang="{target}">`` wrapper and an
  ``id="{chunk_id}"`` marker on the ``<p>``.
- ``test_preserves_100_percent_of_canonical_tags`` — a chapter with
  the canonical tag set round-trips through the adapter with all
  tags preserved (F3 AC1 happy path).
- ``test_preserves_first_p_for_id_marker`` — when multiple ``<p>``
  elements are present, the id marker lands on the FIRST ``<p>``.
- ``test_falls_back_to_h1_when_no_p`` — when the input has no ``<p>``,
  the id marker lands on the first ``<h1>``-``<h6>``.
- ``test_success_mode_default`` — no behaviour set, the adapter
  returns the wrapped HTML.
- ``test_timeout_mode_raises`` — ``behaviour={"chunk_id": "timeout"}``
  raises ``asyncio.TimeoutError``.
- ``test_fail_once_then_succeed`` — the first call for a chunk_id
  raises ``RuntimeError``; the second call succeeds.
- ``test_slow_mode_calls_asyncio_sleep`` — the slow behaviour calls
  ``asyncio.sleep(slow_mode_sleep_seconds)`` (virtual_clock fixture
  in conftest short-circuits the sleep in tests).
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

# Make ``_adapters`` (the test-only seam at tests/unit/_adapters/)
# importable as a top-level module. Pyrefly + the standalone test
# runner do not add ``tests/unit`` to ``sys.path`` automatically.
_TESTS_UNIT_DIR = Path(__file__).resolve().parent
if str(_TESTS_UNIT_DIR) not in sys.path:
    sys.path.insert(0, str(_TESTS_UNIT_DIR))

from _adapters.behaviour import AdapterBehaviour  # noqa: E402
from _adapters.test_mock_translation_adapter import (  # noqa: E402
    _STRUCTURAL_TAG_NAMES,
    MockTranslationAdapter,
)

pytestmark = pytest.mark.tcid("XLATE-02-UT08")


def test_writes_d07_wrapper_shape() -> None:
    """Canonical D-07 shape: ``<p id="tx_ch1_s3"><span xml:lang="de">Hello world</span></p>``-style."""
    adapter = MockTranslationAdapter(behaviour=AdapterBehaviour())

    async def run() -> str:
        return await adapter.translate(
            chunk_id="tx_ch1_s3",
            source_text="<p>Hello world</p>",
            source_language="en",
            target_language="de",
        )

    result = asyncio.run(run())
    soup = BeautifulSoup(result, "html5lib")
    # one ``<p>`` element
    ps = soup.find_all("p")
    assert len(ps) == 1
    # the ``<p>`` carries the id marker
    assert ps[0].get("id") == "tx_ch1_s3"
    # exactly one ``<span xml:lang="de">`` wrapper containing the visible text
    spans = soup.find_all("span", attrs={"xml:lang": "de"})
    assert len(spans) == 1
    assert "Hello world" in spans[0].get_text()


def test_preserves_100_percent_of_canonical_tags() -> None:
    """F3 AC1: chapter with canonical structural tags round-trips intact."""
    chapter = (
        "<h1>Title</h1>"
        "<p>Para 1.</p>"
        "<p>Para 2 <em>emphasised</em>.</p>"
        "<ul><li>one</li><li>two</li></ul>"
        "<ol><li>first</li><li>second</li></ol>"
        "<a href='x'>link</a>"
    )
    adapter = MockTranslationAdapter(behaviour=AdapterBehaviour())
    result = asyncio.run(
        adapter.translate(
            chunk_id="tx_ch1_s0",
            source_text=chapter,
            source_language="en",
            target_language="de",
        )
    )

    # count canonical tags in original vs translated
    def count(html: str) -> dict[str, int]:
        s = BeautifulSoup(html, "html5lib")
        return {name: len(s.find_all(name)) for name in _STRUCTURAL_TAG_NAMES if s.find(name)}

    src = count(chapter)
    out = count(result)
    assert out == src  # 100% preservation


def test_id_marker_on_first_p() -> None:
    """When multiple ``<p>`` elements are present, the id marker is on the first one."""
    adapter = MockTranslationAdapter(behaviour=AdapterBehaviour())
    result = asyncio.run(
        adapter.translate(
            chunk_id="tx_ch2_s5",
            source_text="<p>First paragraph.</p><p>Second paragraph.</p>",
            source_language="en",
            target_language="de",
        )
    )
    soup = BeautifulSoup(result, "html5lib")
    ps = soup.find_all("p")
    assert len(ps) == 2
    assert ps[0].get("id") == "tx_ch2_s5"
    assert ps[1].get("id") is None


def test_id_marker_falls_back_to_h1_when_no_p() -> None:
    """No ``<p>`` → id marker on the first ``<h1>``-``<h6>``."""
    adapter = MockTranslationAdapter(behaviour=AdapterBehaviour())
    result = asyncio.run(
        adapter.translate(
            chunk_id="tx_ch3_s0",
            source_text="<h2>Heading</h2><div>body</div>",
            source_language="en",
            target_language="de",
        )
    )
    soup = BeautifulSoup(result, "html5lib")
    h = soup.find("h2")
    assert h is not None
    assert h.get("id") == "tx_ch3_s0"


def test_timeout_mode_raises() -> None:
    """``behaviour={"chunk_id": "timeout"}`` raises ``asyncio.TimeoutError``."""
    behaviour = AdapterBehaviour(behaviour={"tx_ch1_s0": "timeout"})
    adapter = MockTranslationAdapter(behaviour=behaviour)
    with pytest.raises(TimeoutError):
        asyncio.run(
            adapter.translate(
                chunk_id="tx_ch1_s0",
                source_text="<p>hello</p>",
                source_language="en",
                target_language="de",
            )
        )


def test_fail_once_then_succeed() -> None:
    """First call raises; second call succeeds. Per-chunk counter keyed on ``chunk_id``."""
    behaviour = AdapterBehaviour(behaviour={"tx_ch1_s0": "fail_once_then_succeed"})
    adapter = MockTranslationAdapter(behaviour=behaviour)

    async def run() -> str:
        with pytest.raises(RuntimeError):
            await adapter.translate(
                chunk_id="tx_ch1_s0",
                source_text="<p>hello</p>",
                source_language="en",
                target_language="de",
            )
        # second call: must succeed
        return await adapter.translate(
            chunk_id="tx_ch1_s0",
            source_text="<p>hello</p>",
            source_language="en",
            target_language="de",
        )

    out = asyncio.run(run())
    assert "tx_ch1_s0" in out
    # counter is per chunk_id; a different chunk is unaffected
    assert adapter._call_counts.get("tx_ch1_s0") == 1
    assert adapter._call_counts.get("tx_ch99_s0", 0) == 0


def test_slow_mode_calls_asyncio_sleep(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """``behaviour={"chunk_id": "slow"}`` calls ``asyncio.sleep(slow_mode_sleep_seconds)``.

    The ``virtual_clock`` fixture in conftest swaps ``asyncio.sleep`` for
    a stub that records elapsed virtual time; we assert the stub was
    called with the configured slow duration.
    """
    sleep_calls: list[float] = []

    async def _stub_sleep(seconds: float) -> None:
        sleep_calls.append(seconds)

    monkeypatch.setattr(asyncio, "sleep", _stub_sleep)
    behaviour = AdapterBehaviour(behaviour={"tx_ch1_s0": "slow"}, slow_mode_sleep_seconds=0.5)
    adapter = MockTranslationAdapter(behaviour=behaviour)
    asyncio.run(
        adapter.translate(
            chunk_id="tx_ch1_s0",
            source_text="<p>hello</p>",
            source_language="en",
            target_language="de",
        )
    )
    assert sleep_calls == [0.5]


def test_success_mode_default() -> None:
    """No behaviour set → default success path returns the wrapped HTML."""
    adapter = MockTranslationAdapter(behaviour=AdapterBehaviour())
    result = asyncio.run(
        adapter.translate(
            chunk_id="tx_ch1_s0",
            source_text="<p>Hello</p>",
            source_language="en",
            target_language="de",
        )
    )
    assert "tx_ch1_s0" in result
    assert 'xml:lang="de"' in result


def test_empty_input_does_not_raise() -> None:
    """Empty input returns an empty document (no structural element to mark)."""
    adapter = MockTranslationAdapter(behaviour=AdapterBehaviour())
    result = asyncio.run(
        adapter.translate(
            chunk_id="tx_ch1_s0",
            source_text="",
            source_language="en",
            target_language="de",
        )
    )
    # BeautifulSoup html5lib round-trips an empty document as the full
    # ``<html><head></head><body></body></html>`` shell — the round-trip
    # is the expected behaviour, not a failure. The point is that the
    # adapter does NOT raise on empty input.
    soup = BeautifulSoup(result, "html5lib")
    assert soup.find() is not None  # the document shell parses
    # No structural elements present, so the id marker was a no-op.
    assert soup.find(_STRUCTURAL_TAG_NAMES) is None


def test_per_chunk_failure_counter_isolated() -> None:
    """``fail_once_then_succeed`` counters are isolated per ``chunk_id`` (D-04)."""
    behaviour = AdapterBehaviour(
        behaviour={
            "tx_ch1_s0": "fail_once_then_succeed",
            "tx_ch1_s1": "fail_once_then_succeed",
        }
    )
    adapter = MockTranslationAdapter(behaviour=behaviour)

    async def call(chunk_id: str) -> None:
        with pytest.raises(RuntimeError):
            await adapter.translate(
                chunk_id=chunk_id,
                source_text="<p>hello</p>",
                source_language="en",
                target_language="de",
            )

    asyncio.run(call("tx_ch1_s0"))
    # chunk 0's first call failed; chunk 1's first call also fails
    asyncio.run(call("tx_ch1_s1"))
    # counters are independent
    assert adapter._call_counts == {"tx_ch1_s0": 1, "tx_ch1_s1": 1}
