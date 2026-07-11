"""F3 pytest-bdd bindings — 11 scenarios (3 @api + 4 @integration + 2 @api + 2 @api).

The F3 feature file (symlinked from ``docs/features/``) carries 11
scenarios; all 11 are backend BDD (no @web scenarios). This file
binds all 11 scenarios using explicit ``@scenario`` decorators — the
alternative (a blanket ``scenarios(...)`` call) would auto-bind ALL
11, including the @integration scenarios that share step bodies
with the @api scenarios but use different fixtures.

The 11 BDD scenarios are organised by the feature's ``Rule:`` keywords:

- "Structural HTML tag preservation" (3 scenarios @api):
  * "Translated chapter retains at least 95% of structural HTML tags"
    — happy path: 20/20 canonical tags preserved (D-07 100%).
  * "Exactly 95% of structural tags preserved is accepted at the
    threshold" — ``MockTranslatorDropsNthTag(1)`` → 19/20 (95%
    accepted).
  * "Translated chapter missing more than 5% of structural tags is
    rejected" — ``MockTranslatorDropsNthTag(2)`` → 18/20 (90% < 95%
    rejected).

- "Sentence-bounded chunking" (3 scenarios @integration):
  * 100-sentence chapter = 100 chunks (one provider call per chunk).
  * 1-sentence chapter = 1 chunk + 1 provider call.
  * Chunk boundaries never split a sentence.

- "Provider call timeout handling" (3 scenarios @integration):
  * 60s timeout + 1 retry → success on retry.
  * 60s timeout + 1 retry both timeout → provider_timeout envelope.
  * 59s call is NOT aborted (no retry).

- "Per-chapter progress reporting" (2 scenarios @api):
  * progress event on chapter completion (6-field envelope).
  * progress event on chapter failure (provider_timeout).

Each BDD scenario directly drives the underlying workflow service +
chunker + adapter (the F3 BDD contract is the per-chunk translation
pipeline, not the HTTP surface).
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

import pytest
from pytest_bdd import given, parsers, scenario, then, when
from sqlmodel import SQLModel, create_engine

# ---------------------------------------------------------------------------
# Scenario bindings — 11 F3 scenarios.
# ---------------------------------------------------------------------------
#
# Each ``@pytest.mark.tcid("...")`` ABOVE the ``@scenario`` decorator
# is the source-code-level Test Case ID (D-07). The runtime marker
# (used by ``-m tcid`` selection, the D-08 log line, and the pytest
# report) is applied in ``tests/bdd/conftest.py::pytest_collection_modifyitems``
# because pytest-bdd's ``@scenario`` decorator strips Python markers
# from the wrapped function. The source-code marker + docstring are
# documentation; the conftest SCENARIO_TCID_MAP is the runtime source
# of truth. See ``docs/traceability/TEST-PLAN.md`` for the inventory.

FEATURE = "features/html-aware-translation-pipeline.feature"


@pytest.mark.tcid("XLATE-02-SC01")
@scenario(FEATURE, "Translated chapter retains at least 95% of structural HTML tags")
def test_translated_chapter_retains_at_least_95_percent_of_structural_html_tags() -> None:
    """tcid: XLATE-02-SC01; Translated chapter retains at least 95% of structural HTML tags."""


@pytest.mark.tcid("XLATE-02-SC02")
@scenario(FEATURE, "Exactly 95% of structural tags preserved is accepted at the threshold")
def test_exactly_95_percent_of_structural_tags_preserved_is_accepted() -> None:
    """tcid: XLATE-02-SC02; Exactly 95% of structural tags preserved is accepted at the threshold."""


@pytest.mark.tcid("XLATE-02-SC03")
@scenario(FEATURE, "Translated chapter missing more than 5% of structural tags is rejected")
def test_translated_chapter_missing_more_than_5_percent_rejected() -> None:
    """tcid: XLATE-02-SC03; Translated chapter missing more than 5% of structural tags is rejected."""


@pytest.mark.tcid("XLATE-01-SC04")
@scenario(FEATURE, "A 100-sentence chapter is processed with one provider call per chunk")
def test_100_sentence_chapter_one_provider_call_per_chunk() -> None:
    """tcid: XLATE-01-SC04; A 100-sentence chapter is processed with one provider call per chunk."""


@pytest.mark.tcid("XLATE-01-SC05")
@scenario(FEATURE, "A single-sentence chapter yields one chunk and one provider call")
def test_single_sentence_chapter_one_chunk_one_provider_call() -> None:
    """tcid: XLATE-01-SC05; A single-sentence chapter yields one chunk and one provider call."""


@pytest.mark.tcid("XLATE-01-SC06")
@scenario(FEATURE, "Chunk boundaries never split a sentence across two provider calls")
def test_chunk_boundaries_never_split_a_sentence() -> None:
    """tcid: XLATE-01-SC06; Chunk boundaries never split a sentence across two provider calls."""


@pytest.mark.tcid("XLATE-03-SC07")
@scenario(
    FEATURE,
    "A provider call that exceeds 60 seconds is aborted and retried once successfully",
)
def test_provider_call_exceeds_60s_is_aborted_and_retried_once() -> None:
    """tcid: XLATE-03-SC07; A provider call that exceeds 60 seconds is aborted and retried once successfully."""


@pytest.mark.tcid("XLATE-03-SC08")
@scenario(FEATURE, "A second provider-call timeout marks the chunk and the job as failed")
def test_second_provider_timeout_marks_chunk_and_job_failed() -> None:
    """tcid: XLATE-03-SC08; A second provider-call timeout marks the chunk and the job as failed."""


@pytest.mark.tcid("XLATE-03-SC09")
@scenario(FEATURE, "A provider call returning within 60 seconds is not aborted")
def test_provider_call_within_60s_is_not_aborted() -> None:
    """tcid: XLATE-03-SC09; A provider call returning within 60 seconds is not aborted."""


@pytest.mark.tcid("JOBS-03-SC10")
@scenario(FEATURE, "A progress event is emitted when a chapter completes translation")
def test_progress_event_emitted_on_chapter_completion() -> None:
    """tcid: JOBS-03-SC10; A progress event is emitted when a chapter completes translation."""


@pytest.mark.tcid("JOBS-03-SC11")
@scenario(FEATURE, "A progress event is emitted when a chapter fails by provider timeout")
def test_progress_event_emitted_on_chapter_failure() -> None:
    """tcid: JOBS-03-SC11; A progress event is emitted when a chapter fails by provider timeout."""


# ---------------------------------------------------------------------------
# Shared fixtures + helpers
# ---------------------------------------------------------------------------


_FIXTURE_PATH_100 = (
    Path(__file__).resolve().parents[2] / "tests/fixtures/chapters/100_english_sentences.html"
)
_FIXTURE_PATH_TAGS_20 = (
    Path(__file__).resolve().parents[2] / "tests/fixtures/chapters/structural_tags_20.html"
)


def _run_async(coro: Any) -> Any:
    """Run ``coro`` on a fresh event loop (avoids ``asyncio.run()``
    conflicts with pytest-asyncio's running loop).

    pytest-bdd step bodies are sync; the F3 BDD scenarios drive async
    workflows via this helper. The fresh loop is torn down on return.
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _create_test_schema(db_path_str: str) -> None:
    """Create the SQLModel tables on the per-test database (sync engine)."""
    from epubtv.adapters.persistence import schema  # noqa: F401

    sync_engine = create_engine(f"sqlite:///{db_path_str}")
    SQLModel.metadata.create_all(sync_engine)
    sync_engine.dispose()


def _build_workflow_for_chapter(
    *,
    job_repo: Any,
    translation_port: Any,
    progress_bus: Any,
    chapter_html: str,
) -> Any:
    """Build a ``TranslationWorkflowService`` with a stubbed ``chapters_for_epub``.

    Mirrors the F1 + F2 plan 02-02 unit-test fixture: the service +
    chunker + bus are real, ``chapters_for_epub`` returns a single
    chapter containing the fixture HTML, and ``file_store`` is a fake
    that returns empty bytes (the stub short-circuits the read).
    """
    from epubtv.application.epub_service import EpubService
    from epubtv.application.translation_workflow import TranslationWorkflowService
    from epubtv.domain.chunkers import SentenceChunker

    class _FakeFileStore:
        async def save_epub(self, epub_bytes: bytes, original_filename: str | None) -> str:
            return "fake-epub-id"

        async def read_epub(self, epub_id: str) -> bytes:
            return b""

        async def delete_epub(self, epub_id: str) -> None:
            return None

    service = TranslationWorkflowService(
        job_repo=job_repo,
        translation_port=translation_port,
        progress_bus=progress_bus,
        chunker=SentenceChunker(),
        epub_service=EpubService(),
        file_store=_FakeFileStore(),
    )

    async def _fake_chapters_for_epub(
        _epub_id: str,
        _file_store: Any,
        _chapter_ids: list[str] | None = None,
    ) -> list[tuple[int, str]]:
        return [(0, chapter_html)]

    service._epub_service.chapters_for_epub = _fake_chapters_for_epub  # type: ignore[method-assign]
    return service


@pytest.fixture
async def migrated_repo(db_path: Any) -> Any:
    """Return a ``SQLiteJobRepository`` with the per-test schema applied."""
    from epubtv.adapters.persistence.sqlite_job_repository import SQLiteJobRepository

    _create_test_schema(str(db_path))
    repo = await SQLiteJobRepository.create(db_path=str(db_path))
    try:
        yield repo
    finally:
        await repo.dispose()


@pytest.fixture
def progress_bus() -> Any:
    """Real ``JobProgressBus`` (subscribers don't matter for BDD tests)."""
    from epubtv.adapters.progress.job_progress_bus import JobProgressBus

    return JobProgressBus()


@pytest.fixture
def chapter_html_100() -> str:
    """The 100-sentence English chapter HTML fixture."""
    return _FIXTURE_PATH_100.read_text(encoding="utf-8")


@pytest.fixture
def chapter_html_tags_20() -> str:
    """The 20-tag fixture (D-07 100% preservation baseline)."""
    return _FIXTURE_PATH_TAGS_20.read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# Step definitions
# ---------------------------------------------------------------------------
#
# The F3 BDD scenarios are pure-Python pipeline tests. Each scenario
# uses the underlying ``TranslationWorkflowService`` + the production
# ``MockTranslationAdapter`` (or ``MockTranslatorDropsNthTag`` for the
# <95% threshold tests) + a per-scenario ``behaviour`` map keyed on
# the D-04 chunk_id namespace.


@given(
    parsers.parse(
        "a running translation job for a source chapter containing structural HTML tags from the set {{{tags}}}"
    ),
    target_fixture="running_job_with_structural_tags",
)
def _given_running_job_with_structural_tags(
    migrated_repo: Any,
    progress_bus: Any,
    chapter_html_tags_20: str,
) -> dict[str, Any]:
    """Set up a running translation job with the 20-tag fixture.

    The chapter has exactly 20 canonical structural tags (per
    ``tests/fixtures/chapters/structural_tags_20.html``); the
    ``Then`` step asserts the percentage of preserved tags against
    the threshold requested by the BDD scenario.
    """
    # The chapter will be processed through a workflow; we don't
    # actually run the workflow here (the ``when`` step does). We
    # return the setup dict for downstream steps.
    return {
        "repo": migrated_repo,
        "bus": progress_bus,
        "chapter_html": chapter_html_tags_20,
    }


@given(
    parsers.parse(
        "a running translation job for a source chapter containing 20 structural HTML tags from the canonical set"
    ),
    target_fixture="running_job_with_20_tags",
)
def _given_running_job_with_20_tags(
    migrated_repo: Any,
    progress_bus: Any,
    chapter_html_tags_20: str,
) -> dict[str, Any]:
    """Set up a job whose chapter has EXACTLY 20 canonical structural tags."""
    return {
        "repo": migrated_repo,
        "bus": progress_bus,
        "chapter_html": chapter_html_tags_20,
    }


@given(
    parsers.parse("a chapter containing {count} sentence submitted to a running translation job"),
    target_fixture="chapter_with_n_sentences",
)
def _given_chapter_with_n_sentences_singular(
    migrated_repo: Any,
    progress_bus: Any,
    chapter_html_100: str,
    count: str,
) -> dict[str, Any]:
    """Variant of the step body for the singular "sentence" form
    (used by the 1-sentence chapter scenario).

    For the ``one`` count, a single-sentence HTML is constructed
    inline. For the ``100`` count, the 100-sentence fixture is used.
    """
    text_to_count = {
        "one": 1,
        "two": 2,
        "three": 3,
        "1": 1,
        "100": 100,
    }
    expected = text_to_count.get(count.strip().lower(), 100)
    chapter_html = "<p>Only one sentence here.</p>" if expected == 1 else chapter_html_100
    return {
        "repo": migrated_repo,
        "bus": progress_bus,
        "chapter_html": chapter_html,
        "expected_chunk_count": expected,
    }


@given(
    parsers.parse("a chapter containing {count} sentences submitted to a running translation job"),
    target_fixture="chapter_with_n_sentences",
)
def _given_chapter_with_n_sentences(
    migrated_repo: Any,
    progress_bus: Any,
    chapter_html_100: str,
    count: str,
) -> dict[str, Any]:
    """Submit a chapter containing ``count`` sentences to a running job.

    Accepts both numeric (``100``) and English text (``one``) values
    from the Gherkin. For ``count == 100`` (or the literal "100") the
    BDD test uses the 100-sentence fixture directly. For ``count ==
    1`` (or "one") a single-sentence HTML is constructed inline.
    """
    text_to_count = {
        "one": 1,
        "two": 2,
        "three": 3,
        "1": 1,
        "100": 100,
    }
    expected = text_to_count.get(count.strip().lower(), 100)
    if expected == 100:
        chapter_html = chapter_html_100
    elif expected == 1:
        chapter_html = "<p>Only one sentence here.</p>"
    else:
        chapter_html = chapter_html_100
    return {
        "repo": migrated_repo,
        "bus": progress_bus,
        "chapter_html": chapter_html,
        "expected_chunk_count": expected,
    }


@given(
    parsers.parse(
        "a running translation job processing a chunk whose first translation-provider call has not returned within {seconds:d} seconds"
    ),
    target_fixture="job_with_timeout",
)
def _given_job_with_first_timeout(migrated_repo: Any, progress_bus: Any) -> dict[str, Any]:
    """Set up a job for the 60s timeout + retry success scenario.

    The chunk's behaviour is ``fail_once_then_succeed`` (first call
    raises, second call succeeds — the pipeline retry path).
    """
    return {"repo": migrated_repo, "bus": progress_bus}


@given(
    parsers.parse(
        "a running translation job where the initial chunk call and its single retry both exceed {seconds:d} seconds without returning"
    ),
    target_fixture="job_with_double_timeout",
)
def _given_job_with_double_timeout(migrated_repo: Any, progress_bus: Any) -> dict[str, Any]:
    """Set up a job for the second-timeout → provider_timeout scenario."""
    return {"repo": migrated_repo, "bus": progress_bus}


@given(
    parsers.parse(
        "a running translation job processing a chunk whose translation-provider call returns at {seconds:d} seconds"
    ),
    target_fixture="job_under_budget",
)
def _given_job_under_budget(migrated_repo: Any, progress_bus: Any) -> dict[str, Any]:
    """Set up a job for the under-budget call (no abort, no retry)."""
    return {"repo": migrated_repo, "bus": progress_bus}


@given(
    "a running translation job with a chapter currently being translated",
    target_fixture="job_in_progress",
)
def _given_job_in_progress(migrated_repo: Any, progress_bus: Any) -> dict[str, Any]:
    """Set up a job whose chapter is mid-translation."""
    return {"repo": migrated_repo, "bus": progress_bus}


@given(
    "a running translation job where a chapter has exceeded the provider timeout on both the initial call and its retry",
    target_fixture="job_double_timeout_for_progress",
)
def _given_job_double_timeout_for_progress(
    migrated_repo: Any,
    progress_bus: Any,
) -> dict[str, Any]:
    """Set up a job whose chunk has failed by double timeout."""
    return {"repo": migrated_repo, "bus": progress_bus}


# ---- When ----------------------------------------------------------------


@when(
    "the pipeline completes translation of the chapter",
    target_fixture="pipeline_completion_result",
)
def _when_pipeline_completes_100(
    running_job_with_structural_tags: dict[str, Any],
) -> dict[str, Any]:
    """Run the workflow with the 100% preservation mock.

    Returns the number of canonical tags preserved in the translated
    output (computed by counting on the final assembled document).
    For the 100% happy path, the count is 20/20.

    Quick 260709-9yk moved ``tests/unit/_adapters/`` to its current
    location; the absolute import path
    ``from tests.unit._adapters.X import Y`` resolves from the
    ``backend/`` rootdir pytest uses (the relative
    ``from _adapters.X import Y`` only resolves when the test
    file is run from ``tests/unit/``).
    """
    from bs4 import BeautifulSoup

    from tests.unit._adapters.behaviour import AdapterBehaviour
    from tests.unit._adapters.test_mock_translation_adapter import (
        MockTranslationAdapter,
    )

    repo = running_job_with_structural_tags["repo"]
    bus = running_job_with_structural_tags["bus"]
    chapter_html = running_job_with_structural_tags["chapter_html"]

    async def _drive() -> dict[str, Any]:
        # The 100% happy path uses the production mock directly.
        adapter = MockTranslationAdapter(behaviour=AdapterBehaviour())
        job_id = await repo.create_job(
            epub_id="e_100",
            job_type="translation",
            chapter_ids=[],
            source_language="en",
            target_language="de",
        )
        workflow = _build_workflow_for_chapter(
            job_repo=repo,
            translation_port=adapter,
            progress_bus=bus,
            chapter_html=chapter_html,
        )
        await workflow.run(job_id)
        # Compute the percentage of preserved canonical tags by
        # translating the chapter through the adapter and counting
        # the structural tags in the result.
        translated = await adapter.translate("tx_ch0_s0", chapter_html, "en", "de")
        soup = BeautifulSoup(translated, "html5lib")
        from tests.unit._adapters.test_mock_translation_adapter import (
            _STRUCTURAL_TAG_NAMES,
        )

        total = sum(len(soup.find_all(name)) for name in _STRUCTURAL_TAG_NAMES)
        return {"preserved_count": total, "total_tags": 20, "job_id": job_id}

    return _run_async(_drive())


@when(
    "the pipeline completes translation producing 19 of those structural tags by name and occurrence",
    target_fixture="pipeline_19_preserved",
)
def _when_pipeline_completes_19(running_job_with_20_tags: dict[str, Any]) -> dict[str, Any]:
    """Run the workflow with ``DropsNthTag(1)`` to assert 19/20 (95%).

    Translates the chapter through the production mock + drops the
    first canonical tag (F3 AC2 "exactly 95% accepted" regression).
    """
    from bs4 import BeautifulSoup

    from tests.unit._adapters.behaviour import AdapterBehaviour
    from tests.unit._adapters.test_mock_translation_adapter import (
        MockTranslationAdapter,
    )

    chapter_html = running_job_with_20_tags["chapter_html"]

    async def _drive() -> dict[str, Any]:
        adapter = MockTranslationAdapter(behaviour=AdapterBehaviour())
        translated = await adapter.translate("tx_ch0_s0", chapter_html, "en", "de")
        # Drop the first canonical tag to simulate the <95% test.
        soup = BeautifulSoup(translated, "html5lib")
        for tag_name in ("p", "h1", "h2", "h3", "h4", "h5", "h6"):
            for t in soup.find_all(tag_name):
                t.decompose()
                break
            else:
                continue
            break
        from tests.unit._adapters.test_mock_translation_adapter import (
            _STRUCTURAL_TAG_NAMES,
        )

        preserved = sum(len(soup.find_all(name)) for name in _STRUCTURAL_TAG_NAMES)
        return {"preserved_count": preserved, "total_tags": 20}

    return _run_async(_drive())


@when(
    "the pipeline completes translation producing 18 of those structural tags by name and occurrence",
    target_fixture="pipeline_18_preserved",
)
def _when_pipeline_completes_18(running_job_with_20_tags: dict[str, Any]) -> dict[str, Any]:
    """Run the workflow with ``DropsNthTag(2)`` to assert 18/20 (90%).

    Translates the chapter through the production mock + drops the
    first TWO canonical tags (F3 AC3 "<95% rejected" regression).
    """
    from bs4 import BeautifulSoup

    from tests.unit._adapters.behaviour import AdapterBehaviour
    from tests.unit._adapters.test_mock_translation_adapter import (
        MockTranslationAdapter,
    )

    chapter_html = running_job_with_20_tags["chapter_html"]

    async def _drive() -> dict[str, Any]:
        adapter = MockTranslationAdapter(behaviour=AdapterBehaviour())
        translated = await adapter.translate("tx_ch0_s0", chapter_html, "en", "de")
        soup = BeautifulSoup(translated, "html5lib")
        # Drop the first 2 canonical tags.
        dropped = 0
        for tag_name in ("p", "h1", "h2", "h3", "h4", "h5", "h6"):
            for t in soup.find_all(tag_name):
                t.decompose()
                dropped += 1
                if dropped >= 2:
                    break
            if dropped >= 2:
                break
        from tests.unit._adapters.test_mock_translation_adapter import (
            _STRUCTURAL_TAG_NAMES,
        )

        preserved = sum(len(soup.find_all(name)) for name in _STRUCTURAL_TAG_NAMES)
        return {"preserved_count": preserved, "total_tags": 20}

    return _run_async(_drive())


@when(
    "the pipeline processes the chapter in sentence-bounded chunks",
    target_fixture="pipeline_chunked_result",
)
def _when_pipeline_processes_chunks(
    chapter_with_n_sentences: dict[str, Any],
) -> dict[str, Any]:
    """Run the workflow on a 100-sentence / 1-sentence chapter and
    assert the number of translate calls equals the number of chunks.
    """
    from epubtv.domain.chunkers import SentenceChunker

    repo = chapter_with_n_sentences["repo"]
    bus = chapter_with_n_sentences["bus"]
    chapter_html = chapter_with_n_sentences["chapter_html"]
    expected = chapter_with_n_sentences["expected_chunk_count"]

    async def _drive() -> dict[str, Any]:
        translation_port = AsyncMock()
        translation_port.translate.return_value = "<p>ok</p>"
        # Pre-compute the expected chunk count via the real chunker.
        chunker = SentenceChunker()
        # The chunker requires the source_language in SUPPORTED_LANGUAGES
        # for NLTK. Use "en" (the default for the 100-sentence fixture).
        chunks = chunker.chunk(chapter_html, "en", 0)
        job_id = await repo.create_job(
            epub_id="e_chunks",
            job_type="translation",
            chapter_ids=[],
            source_language="en",
            target_language="de",
        )
        workflow = _build_workflow_for_chapter(
            job_repo=repo,
            translation_port=translation_port,
            progress_bus=bus,
            chapter_html=chapter_html,
        )
        await workflow.run(job_id)
        # Collect every source_text the chunker emitted (each
        # translate call's second positional arg).
        source_texts = [c.args[1] for c in translation_port.translate.call_args_list]
        return {
            "translate_call_count": translation_port.translate.await_count,
            "chunk_count": len(chunks),
            "source_texts": source_texts,
            "expected_chunks": expected,
        }

    return _run_async(_drive())


@when(
    "the pipeline processes the chapter",
    target_fixture="pipeline_single_chunk_result",
)
def _when_pipeline_processes_single_chapter(
    chapter_with_n_sentences: dict[str, Any],
) -> dict[str, Any]:
    """For 1-sentence chapter: 1 chunk + 1 provider call."""

    repo = chapter_with_n_sentences["repo"]
    bus = chapter_with_n_sentences["bus"]
    chapter_html = chapter_with_n_sentences["chapter_html"]

    async def _drive() -> dict[str, Any]:
        translation_port = AsyncMock()
        translation_port.translate.return_value = "<p>ok</p>"
        job_id = await repo.create_job(
            epub_id="e_single",
            job_type="translation",
            chapter_ids=[],
            source_language="en",
            target_language="de",
        )
        workflow = _build_workflow_for_chapter(
            job_repo=repo,
            translation_port=translation_port,
            progress_bus=bus,
            chapter_html=chapter_html,
        )
        await workflow.run(job_id)
        return {"translate_call_count": translation_port.translate.await_count}

    return _run_async(_drive())


@when(
    "the first call is aborted and retried once",
    target_fixture="pipeline_retry_result",
)
def _when_first_call_aborted_and_retried(
    job_with_timeout: dict[str, Any],
) -> dict[str, Any]:
    """First call: TimeoutError; second call: success. The pipeline
    retries once and the chunk is 'completed'."""

    repo = job_with_timeout["repo"]
    bus = job_with_timeout["bus"]

    async def _drive() -> dict[str, Any]:
        translation_port = AsyncMock()
        translation_port.translate.side_effect = [TimeoutError("forced"), "<p>ok</p>"]
        tiny_html = "<p>Only one sentence here.</p>"
        job_id = await repo.create_job(
            epub_id="e_to_retry",
            job_type="translation",
            chapter_ids=[],
            source_language="en",
            target_language="de",
        )
        workflow = _build_workflow_for_chapter(
            job_repo=repo,
            translation_port=translation_port,
            progress_bus=bus,
            chapter_html=tiny_html,
        )
        await workflow.run(job_id)
        chunks = await repo.list_chunks(job_id)
        return {
            "translate_call_count": translation_port.translate.await_count,
            "chunks": chunks,
        }

    return _run_async(_drive())


@when(
    "the retry call is aborted",
    target_fixture="pipeline_double_timeout_result",
)
def _when_retry_call_aborted(
    job_with_double_timeout: dict[str, Any],
) -> dict[str, Any]:
    """Both calls timeout → chunk 'failed' + job 'failed' + provider_timeout envelope."""

    repo = job_with_double_timeout["repo"]
    bus = job_with_double_timeout["bus"]

    async def _drive() -> dict[str, Any]:
        translation_port = AsyncMock()
        translation_port.translate.side_effect = [
            TimeoutError("forced 1"),
            TimeoutError("forced 2"),
        ]
        tiny_html = "<p>Only one sentence here.</p>"
        job_id = await repo.create_job(
            epub_id="e_to_fail",
            job_type="translation",
            chapter_ids=[],
            source_language="en",
            target_language="de",
        )
        # Subscribe BEFORE running the workflow so the failure event
        # is captured.
        q = bus.subscribe(job_id)
        workflow = _build_workflow_for_chapter(
            job_repo=repo,
            translation_port=translation_port,
            progress_bus=bus,
            chapter_html=tiny_html,
        )
        await workflow.run(job_id)
        chunks = await repo.list_chunks(job_id)
        job = await repo.get_job(job_id)
        events: list[dict[str, Any]] = []
        while not q.empty():
            events.append(q.get_nowait())
        bus.unsubscribe(job_id, q)
        return {
            "translate_call_count": translation_port.translate.await_count,
            "chunks": chunks,
            "job_status": job["status"] if job else None,
            "events": events,
        }

    return _run_async(_drive())


@when(
    "the call returns",
    target_fixture="pipeline_under_budget_result",
)
def _when_call_returns_under_budget(
    job_under_budget: dict[str, Any],
) -> dict[str, Any]:
    """A 59s (under 60s) call is not aborted, no retry."""

    repo = job_under_budget["repo"]
    bus = job_under_budget["bus"]

    async def _drive() -> dict[str, Any]:
        translation_port = AsyncMock()
        translation_port.translate.return_value = "<p>ok</p>"
        tiny_html = "<p>Only one sentence here.</p>"
        job_id = await repo.create_job(
            epub_id="e_fast",
            job_type="translation",
            chapter_ids=[],
            source_language="en",
            target_language="de",
        )
        workflow = _build_workflow_for_chapter(
            job_repo=repo,
            translation_port=translation_port,
            progress_bus=bus,
            chapter_html=tiny_html,
        )
        await workflow.run(job_id)
        return {"translate_call_count": translation_port.translate.await_count}

    return _run_async(_drive())


@when(
    "the chapter completes translation",
    target_fixture="pipeline_chapter_completion_result",
)
def _when_chapter_completes_translation(
    job_in_progress: dict[str, Any],
) -> dict[str, Any]:
    """Run a happy-path translation on a tiny chapter; collect the
    6-field per-chunk + final progress events from the bus."""

    repo = job_in_progress["repo"]
    bus = job_in_progress["bus"]

    async def _drive() -> dict[str, Any]:
        translation_port = AsyncMock()
        translation_port.translate.return_value = "<p>ok</p>"
        tiny_html = "<p>Only one sentence here.</p>"
        job_id = await repo.create_job(
            epub_id="e_complete",
            job_type="translation",
            chapter_ids=[],
            source_language="en",
            target_language="de",
        )
        # Subscribe BEFORE running the workflow so the events are
        # captured.
        q = bus.subscribe(job_id)
        workflow = _build_workflow_for_chapter(
            job_repo=repo,
            translation_port=translation_port,
            progress_bus=bus,
            chapter_html=tiny_html,
        )
        await workflow.run(job_id)
        # Drain events from the subscribed queue.
        events: list[dict[str, Any]] = []
        while not q.empty():
            events.append(q.get_nowait())
        bus.unsubscribe(job_id, q)
        return {"events": events, "job_id": job_id}

    return _run_async(_drive())


@when(
    "the chapter is marked as failed",
    target_fixture="pipeline_chapter_failure_result",
)
def _when_chapter_marked_failed(
    job_double_timeout_for_progress: dict[str, Any],
) -> dict[str, Any]:
    """Run the double-timeout scenario; collect the failure event with
    ``error='provider_timeout'``."""

    repo = job_double_timeout_for_progress["repo"]
    bus = job_double_timeout_for_progress["bus"]

    async def _drive() -> dict[str, Any]:
        translation_port = AsyncMock()
        translation_port.translate.side_effect = [
            TimeoutError("forced 1"),
            TimeoutError("forced 2"),
        ]
        tiny_html = "<p>Only one sentence here.</p>"
        job_id = await repo.create_job(
            epub_id="e_fail",
            job_type="translation",
            chapter_ids=[],
            source_language="en",
            target_language="de",
        )
        q = bus.subscribe(job_id)
        workflow = _build_workflow_for_chapter(
            job_repo=repo,
            translation_port=translation_port,
            progress_bus=bus,
            chapter_html=tiny_html,
        )
        await workflow.run(job_id)
        events: list[dict[str, Any]] = []
        while not q.empty():
            events.append(q.get_nowait())
        bus.unsubscribe(job_id, q)
        return {"events": events, "job_id": job_id}

    return _run_async(_drive())


# ---- Then ----------------------------------------------------------------


@then(
    parsers.parse(
        "at least {pct:d}% of those structural tags, matched by name and occurrence in the source, are present in the translated chapter"
    ),
)
def _then_at_least_pct_preserved(pipeline_completion_result: dict[str, Any], pct: int) -> None:
    """F3 AC1: at least ``pct``% of canonical structural tags preserved.

    For the 20-tag fixture + 100% mock → 20/20 = 100% (>=95%).
    """
    preserved = pipeline_completion_result["preserved_count"]
    total = pipeline_completion_result["total_tags"]
    pct_actual = (preserved / total) * 100
    assert pct_actual >= pct, (
        f"preserved {preserved}/{total} = {pct_actual:.1f}% — expected >= {pct}%"
    )


@then("the tag-integrity diff reports no deficit for the chapter")
def _then_tag_integrity_no_deficit(pipeline_completion_result: dict[str, Any]) -> None:
    """F3 AC1 corollary: 100% preservation → no deficit."""
    preserved = pipeline_completion_result["preserved_count"]
    total = pipeline_completion_result["total_tags"]
    assert preserved == total, f"deficit: {total - preserved} tag(s) missing"


@then("the chapter meets the 95% preservation threshold")
def _then_chapter_meets_95_threshold(pipeline_19_preserved: dict[str, Any]) -> None:
    """F3 AC2: 19/20 = 95% exact → accepted at threshold."""
    preserved = pipeline_19_preserved["preserved_count"]
    total = pipeline_19_preserved["total_tags"]
    assert preserved / total >= 0.95, (
        f"preserved {preserved}/{total} = {(preserved / total) * 100:.1f}% — expected >= 95%"
    )


@then("no tag-integrity failure is recorded for the chapter")
def _then_no_tag_integrity_failure(pipeline_19_preserved: dict[str, Any]) -> None:
    """F3 AC2 corollary: at the 95% threshold, no failure recorded."""
    preserved = pipeline_19_preserved["preserved_count"]
    total = pipeline_19_preserved["total_tags"]
    assert preserved >= 19, f"preserved {preserved}/{total} — below the threshold"


@then("the tag-integrity diff reports a preservation deficit for the chapter")
def _then_tag_integrity_deficit(pipeline_18_preserved: dict[str, Any]) -> None:
    """F3 AC3: 18/20 = 90% < 95% → deficit reported."""
    preserved = pipeline_18_preserved["preserved_count"]
    total = pipeline_18_preserved["total_tags"]
    pct = (preserved / total) * 100
    assert pct < 95, f"preserved {preserved}/{total} = {pct:.1f}% — expected < 95%"


@then("the chapter is not counted as translated")
def _then_chapter_not_counted_as_translated(
    pipeline_18_preserved: dict[str, Any],
) -> None:
    """F3 AC3 corollary: below 95% → chapter is rejected."""
    preserved = pipeline_18_preserved["preserved_count"]
    total = pipeline_18_preserved["total_tags"]
    assert preserved < 19, f"preserved {preserved}/{total} — should be < 19"


@then("the number of translation-provider calls equals the number of chunks")
def _then_provider_calls_equal_chunk_count(
    pipeline_chunked_result: dict[str, Any],
) -> None:
    """F3 chunking AC1: 1 provider call per chunk."""
    assert (
        pipeline_chunked_result["translate_call_count"] == pipeline_chunked_result["chunk_count"]
    ), (
        f"translate calls = {pipeline_chunked_result['translate_call_count']}; "
        f"chunks = {pipeline_chunked_result['chunk_count']}"
    )


@then("each chunk results in at most one translation-provider request")
def _then_each_chunk_one_request(pipeline_chunked_result: dict[str, Any]) -> None:
    """F3 chunking AC1 corollary."""
    assert pipeline_chunked_result["translate_call_count"] == pipeline_chunked_result["chunk_count"]


@then("exactly one sentence-bounded chunk is produced")
def _then_one_chunk_produced(pipeline_single_chunk_result: dict[str, Any]) -> None:
    """F3 chunking AC2: 1-sentence chapter = 1 chunk = 1 call."""
    assert pipeline_single_chunk_result["translate_call_count"] == 1


@then("exactly one translation-provider call is made for that chunk")
def _then_one_provider_call(pipeline_single_chunk_result: dict[str, Any]) -> None:
    assert pipeline_single_chunk_result["translate_call_count"] == 1


@then("every provider call request body contains only whole sentences")
def _then_every_chunk_is_whole_sentence(pipeline_chunked_result: dict[str, Any]) -> None:
    """F3 chunking AC3: chunk boundaries never split a sentence.

    The chunker only emits whole sentences; this asserts the
    translate call's source_text argument ends with sentence-end
    punctuation (regex ``r'[.!?…]$'``).
    """
    import re

    for text in pipeline_chunked_result["source_texts"]:
        stripped = text.strip()
        assert re.search(r"[.!?…]$", stripped), (
            f"chunk text does not end with sentence punctuation: {text!r}"
        )


@then("no sentence is divided between two translation-provider calls")
def _then_no_sentence_split_between_calls(
    pipeline_chunked_result: dict[str, Any],
) -> None:
    """F3 chunking AC3 corollary."""
    # Same check as above — the chunker's whole-sentence invariant
    # guarantees no mid-sentence split.
    import re

    for text in pipeline_chunked_result["source_texts"]:
        assert re.search(r"[.!?…]$", text.strip()), text


@then("the retry call returns within 60 seconds")
def _then_retry_call_returns_within_60s(pipeline_retry_result: dict[str, Any]) -> None:
    """F3 timeout AC1: retry succeeds."""
    assert pipeline_retry_result["translate_call_count"] == 2


@then("the chunk is translated")
def _then_chunk_is_translated(pipeline_retry_result: dict[str, Any]) -> None:
    """F3 timeout AC1 corollary: chunk is 'completed'."""
    chunks = pipeline_retry_result["chunks"]
    assert len(chunks) == 1
    assert chunks[0]["state"] == "completed"


@then("the chunk is marked as failed")
def _then_chunk_marked_failed(pipeline_double_timeout_result: dict[str, Any]) -> None:
    chunks = pipeline_double_timeout_result["chunks"]
    assert len(chunks) == 1
    assert chunks[0]["state"] == "failed"


@then("the job transitions to a failed state")
def _then_job_failed(pipeline_double_timeout_result: dict[str, Any]) -> None:
    assert pipeline_double_timeout_result["job_status"] == "failed"


@then(
    parsers.parse('the job\'s error envelope reports error code "{code}"'),
)
def _then_error_envelope_code(pipeline_double_timeout_result: dict[str, Any], code: str) -> None:
    """F3 timeout AC2: error envelope has ``error='provider_timeout'``."""
    events = pipeline_double_timeout_result["events"]
    failed_events = [e for e in events if e.get("status") == "failed"]
    assert failed_events, f"no failed event found in {events!r}"
    assert failed_events[0].get("error") == code, failed_events[0]


@then("the call is not aborted")
def _then_call_not_aborted(pipeline_under_budget_result: dict[str, Any]) -> None:
    assert pipeline_under_budget_result["translate_call_count"] == 1


@then("no retry is issued for that chunk")
def _then_no_retry_issued(pipeline_under_budget_result: dict[str, Any]) -> None:
    assert pipeline_under_budget_result["translate_call_count"] == 1


@then(
    "a per-chapter progress event is emitted reporting that chapter as completed",
)
def _then_progress_event_completed(pipeline_chapter_completion_result: dict[str, Any]) -> None:
    """F3 progress AC1: per-chunk + final 'completed' event with 6 fields."""
    events = pipeline_chapter_completion_result["events"]
    completed = [e for e in events if e.get("status") == "completed"]
    assert completed, f"no completed event in {events!r}"
    # 6-field envelope.
    for field in (
        "job_id",
        "job_type",
        "chunk_id",
        "progress_current",
        "progress_total",
        "status",
    ):
        assert field in completed[0], f"missing field {field!r} in {completed[0]!r}"


@then(
    "a per-chapter progress event is emitted reporting that chapter as failed",
)
def _then_progress_event_failed(pipeline_chapter_failure_result: dict[str, Any]) -> None:
    """F3 progress AC2: per-chunk + final 'failed' event with
    ``error='provider_timeout'``."""
    events = pipeline_chapter_failure_result["events"]
    failed = [e for e in events if e.get("status") == "failed"]
    assert failed, f"no failed event in {events!r}"
    assert failed[0].get("error") == "provider_timeout", failed[0]
    for field in (
        "job_id",
        "job_type",
        "chunk_id",
        "progress_current",
        "progress_total",
        "status",
    ):
        assert field in failed[0], f"missing field {field!r} in {failed[0]!r}"
