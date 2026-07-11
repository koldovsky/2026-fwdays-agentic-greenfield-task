"""Mock translation adapter — D-07 test-only mock (BACK-01, plan 01-02).

The sprint's in-process translation provider (CONVENTIONS.md §Mock
provider harness). Phase 1 was an identity passthrough; Phase 2 wires
the D-07 ``<span xml:lang="...">`` wrapper + ``id={chunk_id}`` marker
+ behaviour gating (success / slow / fail_once_then_succeed / timeout).

Plan 01-02 (BACK-01): the in-process ``MockTranslationAdapter`` moved
from ``backend/src/epubtv/adapters/translation/`` to
``backend/tests/unit/_adapters/`` as a test-only fixture. Production
adapters are the ``OllamaHttpTranslationAdapter`` +
``OpenAIHttpTranslationAdapter`` subclasses (TRAN-02); the in-process
mock is reachable only from ``tests/``.

Behaviour gating (D-04 seam, keyed on the full ``chunk_id``):
- ``success`` (default): happy-path; wraps text nodes in
  ``<span xml:lang="{target_language}">`` and injects ``id="{chunk_id}"``
  on the first ``<p>`` (fallback: ``<h1>``-``<h6>``, then first
  structural element).
- ``slow``: real ``asyncio.sleep(self._behaviour.slow_mode_sleep_seconds)``
  in production; the ``virtual_clock`` pytest fixture short-circuits the
  sleep so tests run sub-second.
- ``fail_once_then_succeed``: raises ``RuntimeError`` on the first call
  for a given ``chunk_id``; succeeds on subsequent calls. The per-chunk
  counter is keyed on the full ``chunk_id`` per D-04.
- ``timeout``: raises ``asyncio.TimeoutError``; plan 02-02's
  ``asyncio.wait_for(60)`` envelope surfaces it as ``provider_timeout``.

Structural HTML tags are preserved 100 % (F3 AC1 happy path). Test
profiles that drop tags live in ``tests/unit/_harness.py``
(``MockTranslatorDropsNthTag``) — never in production code paths.

The ``AdapterBehaviour`` Pydantic model lives in the sibling
``behaviour.py`` (test-only fixture, quick 260709-9yk move from
``backend/src/epubtv/application/behaviour.py``). The mock consumes
it for all four modes; the production workflow services no longer
import it (the slow-mode seam retired with the in-process mocks'
move to ``tests/``).
"""

from __future__ import annotations

import asyncio

from bs4 import BeautifulSoup, Tag

from .behaviour import AdapterBehaviour

# Canonical structural tag set per api-contract.md line 49 (F3 ≥95% threshold).
# The id-marker placement falls back through this set in document order.
_STRUCTURAL_TAG_NAMES: tuple[str, ...] = (
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "em",
    "strong",
    "a",
)


class MockTranslationAdapter:
    """Sprint in-process translation provider (D-07).

    Bound at the FastAPI lifespan DI composition root in
    ``api/app.py`` as the sprint default. The
    ``HttpTranslationAdapter`` (D-08) replaces it when a real
    provider URL is configured; both implement the same
    ``TranslationPort`` protocol so the worker doesn't care which
    one is bound.
    """

    def __init__(self, behaviour: AdapterBehaviour) -> None:
        self._behaviour = behaviour
        # Per-chunk call counter for ``fail_once_then_succeed`` (D-04).
        # Keyed on the full ``chunk_id`` so each chunk has its own counter.
        self._call_counts: dict[str, int] = {}

    async def translate(
        self,
        chunk_id: str,
        source_text: str,
        source_language: str | None,
        target_language: str,
    ) -> str:
        """Translate ``source_text`` from source → target per D-07.

        Returns HTML with structural tags preserved + ``<span xml:lang>``
        wrappers around text nodes + ``id={chunk_id}`` marker on the
        first structural element. Behaviour gating (slow / fail_once /
        timeout) happens BEFORE the parse so a failing call never
        produces a partial wrapper.
        """
        _ = source_language  # not used in mock; interface parity only

        mode = self._behaviour.resolve(chunk_id)
        if mode == "timeout":
            raise TimeoutError(f"mock translator forced timeout for chunk_id={chunk_id!r}")
        if mode == "fail_once_then_succeed" and self._call_counts.get(chunk_id, 0) == 0:
            self._call_counts[chunk_id] = 1
            raise RuntimeError(f"simulated fail_once_then_succeed for {chunk_id!r}")
        if mode == "slow":
            await asyncio.sleep(self._behaviour.slow_mode_sleep_seconds)
        # ``success`` (default) and the post-fail_once call fall through.

        soup = BeautifulSoup(source_text, "html5lib")

        # Wrap every text node in ``<span xml:lang="{target_language}">…</span>``.
        # The xml:lang wrapper makes the translated output visibly different
        # from the source in the demo video (D-07) while keeping the original
        # structural tag tree intact (BeautifulSoup html5lib round-trip).
        for text_node in list(soup.find_all(string=True)):
            if not text_node.parent:  # detached by an earlier iteration
                continue
            wrap = soup.new_tag("span", attrs={"xml:lang": target_language})
            wrap.string = str(text_node)
            text_node.replace_with(wrap)

        # Embed ``id={chunk_id}`` on the first structural element. Falls
        # back through ``<p>`` → ``<h1>``-``<h6>`` → first canonical tag.
        marker_target = self._find_marker_target(soup)
        if marker_target is not None:
            marker_target["id"] = chunk_id

        return str(soup)

    @staticmethod
    def _find_marker_target(soup: BeautifulSoup) -> Tag | None:
        """Return the first canonical structural element for the id marker.

        Order: ``<p>`` → ``<h1>``-``<h6>`` → first canonical tag. Returns
        ``None`` if the parsed HTML has no structural elements at all.
        """
        for name in _STRUCTURAL_TAG_NAMES:
            found = soup.find(name)
            if found is not None:
                return found
        return None


__all__ = ["MockTranslationAdapter"]
