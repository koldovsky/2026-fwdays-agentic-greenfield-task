"""TranslationWorkflowService + JobOrchestrator unit tests (Task 2 TDD cycle).

Satisfies JOBS-02 (orchestrator dispatch) + JOBS-04 (atomic per-chunk
commit) + XLATE-01 (chunker + resume from ``last_chunk_id``) + XLATE-03
(60s ``asyncio.wait_for`` + single retry → ``provider_timeout``) +
D-04 (resume semantics) + D-05 (501 dispatch for non-translation
``job_type``).

Test profile (D-04 + D-07): the workflow service calls
``translation_port.translate`` with the locked signature. The timeout /
retry tests inject ``TimeoutError`` via ``AsyncMock(side_effect=[...])``
to control the per-call outcome deterministically (Pitfall F — real
network latency is not reproducible).

Resume semantics: pre-populate ``job_chunks`` with N completed rows
for a chapter; call ``run``; assert ``translate`` was called for
chunks ``N..end`` only (NOT for chunks ``0..N-1``).
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from sqlmodel import SQLModel, create_engine

from epubtv.adapters.persistence.sqlite_job_repository import (
    SQLiteJobRepository,
)
from epubtv.adapters.progress.job_progress_bus import JobProgressBus
from epubtv.application.epub_service import EpubService
from epubtv.application.job_orchestrator import JobOrchestrator
from epubtv.application.translation_workflow import TranslationWorkflowService
from epubtv.domain.chunkers import SentenceChunker

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("XLATE-01-UT25")]


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


_FIXTURE_PATH = (
    Path(__file__).resolve().parents[2] / "tests/fixtures/chapters/100_english_sentences.html"
)


def _create_test_schema(db_path_str: str) -> None:
    """Create the SQLModel tables on the per-test database (sync engine).

    Production schema apply goes through ``alembic upgrade head``; the
    unit test path uses ``SQLModel.metadata.create_all`` to avoid the
    async-alembic/event-loop conflict in ``pytest-asyncio`` fixtures.
    """
    from epubtv.adapters.persistence import schema  # noqa: F401

    sync_engine = create_engine(f"sqlite:///{db_path_str}")
    SQLModel.metadata.create_all(sync_engine)
    sync_engine.dispose()


class _FakeFileStore:
    """Minimal in-memory ``FileStorePort`` for workflow tests.

    Pre-loads a single EPUB fixture so ``read_epub`` returns the bytes
    of the 100-sentence English chapter. The EPUB format is loose for
    the workflow tests — we don't need a real archive; we patch
    ``EpubService.chapters_for_epub`` to return a single chapter
    containing the fixture HTML directly.
    """

    def __init__(self, chapter_html: str) -> None:
        self._chapter_html = chapter_html

    async def save_epub(self, epub_bytes: bytes, original_filename: str | None) -> str:
        return "fake-epub-id"

    async def read_epub(self, epub_id: str) -> bytes:
        # Return raw chapter HTML wrapped in a minimal EPUB skeleton so
        # ``EpubService._read_epub`` can parse it. But we shortcut this
        # by patching ``chapters_for_epub`` directly in the tests.
        return b""

    async def delete_epub(self, epub_id: str) -> None:
        return None


@pytest.fixture
async def migrated_repo(db_path: Any) -> Any:
    """Return a ``SQLiteJobRepository`` with the per-test schema applied."""
    _create_test_schema(str(db_path))
    repo = await SQLiteJobRepository.create(db_path=str(db_path))
    try:
        yield repo
    finally:
        await repo.dispose()


@pytest.fixture
def progress_bus() -> JobProgressBus:
    """Real ``JobProgressBus`` (subscribers don't matter for unit tests)."""
    return JobProgressBus()


@pytest.fixture
def chapter_html() -> str:
    """The 100-sentence English chapter HTML fixture (D-01 / D-04 baseline)."""
    return _FIXTURE_PATH.read_text(encoding="utf-8")


def _build_workflow(
    *,
    job_repo: Any,
    translation_port: Any,
    progress_bus: JobProgressBus,
    chapter_html: str,
) -> TranslationWorkflowService:
    """Build a workflow with a stubbed ``chapters_for_epub``.

    Tests construct the real service + chunker + bus, then monkeypatch
    the epub_service method so the unit test does NOT have to provide a
    real EPUB archive on disk (we only need the chapter HTML, not the
    spine parsing).
    """
    service = TranslationWorkflowService(
        job_repo=job_repo,
        translation_port=translation_port,
        progress_bus=progress_bus,
        chunker=SentenceChunker(),
        epub_service=EpubService(),
        file_store=_FakeFileStore(chapter_html),
    )

    async def _fake_chapters_for_epub(
        _epub_id: str,
        _file_store: Any,
        _chapter_ids: list[str] | None = None,
    ) -> list[tuple[int, str]]:
        return [(0, chapter_html)]

    # Bind the stub method on the instance.
    service._epub_service.chapters_for_epub = _fake_chapters_for_epub  # type: ignore[method-assign]
    return service


# ---------------------------------------------------------------------------
# Happy path: 100-sentence chapter → 100 translate calls + 100 chunk rows
# ---------------------------------------------------------------------------


async def test_100_sentence_chapter_produces_100_chunks_and_100_translate_calls(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
    chapter_html: str,
) -> None:
    """F3 AC2: 100-sentence chapter → 100 translate calls + 100 chunk rows + 100 emits."""
    job_id = await migrated_repo.create_job(
        epub_id="e_100",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )

    translation_port = AsyncMock()
    translation_port.translate.return_value = "<p>translated</p>"

    workflow = _build_workflow(
        job_repo=migrated_repo,
        translation_port=translation_port,
        progress_bus=progress_bus,
        chapter_html=chapter_html,
    )

    # Subscribe a queue to capture emitted events.
    queue = progress_bus.subscribe(job_id)

    await workflow.run(job_id)

    assert translation_port.translate.await_count == 100

    chunks = await migrated_repo.list_chunks(job_id)
    assert len(chunks) == 100
    assert all(c["state"] == "completed" for c in chunks)

    # Final job status is "completed"
    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["status"] == "completed"

    # Drain emitted events.
    events: list[dict[str, Any]] = []
    while not queue.empty():
        events.append(await queue.get())

    # 100 per-chunk events + 1 final "completed" event = 101
    assert len(events) == 101
    per_chunk_events = [e for e in events if e.get("status") == "running"]
    final_events = [e for e in events if e.get("status") == "completed"]
    assert len(per_chunk_events) == 100
    assert len(final_events) == 1


async def test_emitted_per_chunk_envelope_has_locked_6_field_shape(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
    chapter_html: str,
) -> None:
    """F5-AC5: per-chunk emit carries the 6-field envelope."""
    job_id = await migrated_repo.create_job(
        epub_id="e_env",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    translation_port = AsyncMock()
    translation_port.translate.return_value = "<p>x</p>"
    workflow = _build_workflow(
        job_repo=migrated_repo,
        translation_port=translation_port,
        progress_bus=progress_bus,
        chapter_html=chapter_html,
    )
    queue = progress_bus.subscribe(job_id)
    await workflow.run(job_id)

    # Pull one per-chunk event.
    event = await queue.get()
    while event.get("status") != "running":
        event = await queue.get()

    assert event["job_id"] == job_id
    assert event["job_type"] == "translation"
    assert event["chunk_id"] == "tx_ch0_s0"
    assert event["progress_current"] == 1
    assert event["progress_total"] == 100
    assert event["status"] == "running"


# ---------------------------------------------------------------------------
# Timeout + retry (XLATE-03)
# ---------------------------------------------------------------------------


async def test_timeout_on_first_call_retries_and_succeeds(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
    chapter_html: str,
) -> None:
    """F3 AC4: first call times out → retry once → success on retry.

    Only ONE chunk in the test (small input — we override the chunker
    via a tiny chapter).
    """
    job_id = await migrated_repo.create_job(
        epub_id="e_to_retry",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    translation_port = AsyncMock()
    # First call: TimeoutError. Second call: success.
    translation_port.translate.side_effect = [TimeoutError("forced"), "<p>ok</p>"]

    # Use a tiny 1-sentence chapter to keep the test focused.
    tiny_html = "<p>Only one sentence here.</p>"
    workflow = _build_workflow(
        job_repo=migrated_repo,
        translation_port=translation_port,
        progress_bus=progress_bus,
        chapter_html=tiny_html,
    )
    queue = progress_bus.subscribe(job_id)
    await workflow.run(job_id)

    # 2 calls (timeout + retry).
    assert translation_port.translate.await_count == 2

    chunks = await migrated_repo.list_chunks(job_id)
    assert len(chunks) == 1
    assert chunks[0]["state"] == "completed"

    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["status"] == "completed"

    # Exactly ONE per-chunk emit (not two) — the retry is transparent.
    events: list[dict[str, Any]] = []
    while not queue.empty():
        events.append(await queue.get())
    per_chunk = [e for e in events if e.get("status") == "running"]
    assert len(per_chunk) == 1


async def test_timeout_on_both_calls_marks_chunk_failed_and_emits_provider_timeout(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
) -> None:
    """F3 AC5: both calls timeout → chunk is 'failed' + status='failed' + provider_timeout emit."""
    job_id = await migrated_repo.create_job(
        epub_id="e_to_fail",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    translation_port = AsyncMock()
    # Both calls: TimeoutError.
    translation_port.translate.side_effect = [
        TimeoutError("forced 1"),
        TimeoutError("forced 2"),
    ]

    tiny_html = "<p>Only one sentence here.</p>"
    workflow = _build_workflow(
        job_repo=migrated_repo,
        translation_port=translation_port,
        progress_bus=progress_bus,
        chapter_html=tiny_html,
    )
    queue = progress_bus.subscribe(job_id)
    await workflow.run(job_id)

    assert translation_port.translate.await_count == 2

    chunks = await migrated_repo.list_chunks(job_id)
    assert len(chunks) == 1
    assert chunks[0]["state"] == "failed"

    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["status"] == "failed"

    events: list[dict[str, Any]] = []
    while not queue.empty():
        events.append(await queue.get())
    failed_events = [e for e in events if e.get("status") == "failed"]
    assert len(failed_events) == 1
    assert failed_events[0].get("error") == "provider_timeout"
    assert failed_events[0]["job_id"] == job_id
    assert failed_events[0]["job_type"] == "translation"


async def test_under_budget_call_is_not_aborted_and_does_not_retry(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
) -> None:
    """F3 AC6: a fast call is not aborted; no retry."""
    job_id = await migrated_repo.create_job(
        epub_id="e_fast",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    translation_port = AsyncMock()
    translation_port.translate.return_value = "<p>ok</p>"

    tiny_html = "<p>Only one sentence here.</p>"
    workflow = _build_workflow(
        job_repo=migrated_repo,
        translation_port=translation_port,
        progress_bus=progress_bus,
        chapter_html=tiny_html,
    )
    await workflow.run(job_id)

    # Exactly one call, no retry.
    assert translation_port.translate.await_count == 1


async def test_happy_path_does_not_consume_60s_budget(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
    chapter_html: str,
) -> None:
    """The 60s ``wait_for`` budget is NOT consumed in the happy path."""
    job_id = await migrated_repo.create_job(
        epub_id="e_budget",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    translation_port = AsyncMock()
    translation_port.translate.return_value = "<p>x</p>"

    workflow = _build_workflow(
        job_repo=migrated_repo,
        translation_port=translation_port,
        progress_bus=progress_bus,
        chapter_html=chapter_html,
    )

    t0 = time.monotonic()
    await workflow.run(job_id)
    elapsed = time.monotonic() - t0
    assert elapsed < 1.0, f"100-chapter happy path took {elapsed:.2f}s, expected < 1s"


# ---------------------------------------------------------------------------
# Resume from last_chunk_id
# ---------------------------------------------------------------------------


async def test_resume_from_last_completed_chunk_skips_already_done(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
) -> None:
    """F5-AC4 + F5-AC5: pre-populated completed chunks are skipped on re-entry.

    Pre-insert 3 completed chunks for chapter 0 (idx 0..2) and
    ``last_chunk_id='tx_ch0_s2'``. The workflow should call
    ``translate`` for chunks 3..(end-1) ONLY (NOT for 0..2).
    """
    job_id = await migrated_repo.create_job(
        epub_id="e_resume",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    # Pre-insert 3 completed chunks + advance last_chunk_id.
    for idx in range(3):
        await migrated_repo.append_chunk(job_id, chapter_idx=0, chunk_idx=idx, state="completed")

    # The 100-sentence fixture is used; resume should hit chunks 3..99 (97 calls).
    translation_port = AsyncMock()
    translation_port.translate.return_value = "<p>x</p>"

    chapter_html = _FIXTURE_PATH.read_text(encoding="utf-8")
    workflow = _build_workflow(
        job_repo=migrated_repo,
        translation_port=translation_port,
        progress_bus=progress_bus,
        chapter_html=chapter_html,
    )
    await workflow.run(job_id)

    # 100 total chunks - 3 pre-completed = 97 translate calls.
    assert translation_port.translate.await_count == 97

    # No chunks are translated for indices 0..2 (the mocked translate
    # would have been called with their chunk_ids; assert via call_args_list).
    called_chunk_ids = [c.args[0] for c in translation_port.translate.call_args_list]
    assert "tx_ch0_s0" not in called_chunk_ids
    assert "tx_ch0_s1" not in called_chunk_ids
    assert "tx_ch0_s2" not in called_chunk_ids
    assert "tx_ch0_s3" in called_chunk_ids
    assert "tx_ch0_s99" in called_chunk_ids


async def test_completed_job_is_idempotent(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
) -> None:
    """A job already in 'completed' state is a no-op on re-entry."""
    job_id = await migrated_repo.create_job(
        epub_id="e_done",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    await migrated_repo.update_status(job_id, "completed")

    translation_port = AsyncMock()
    tiny_html = "<p>Only one sentence here.</p>"
    workflow = _build_workflow(
        job_repo=migrated_repo,
        translation_port=translation_port,
        progress_bus=progress_bus,
        chapter_html=tiny_html,
    )
    await workflow.run(job_id)

    # No translate calls because the job is already completed.
    assert translation_port.translate.await_count == 0


# ---------------------------------------------------------------------------
# chunk_id namespace
# ---------------------------------------------------------------------------


async def test_chunk_ids_match_d04_translation_namespace(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
) -> None:
    """D-04: chunk_ids are ``tx_ch{N}_s{M}``."""
    job_id = await migrated_repo.create_job(
        epub_id="e_namespace",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    translation_port = AsyncMock()
    translation_port.translate.return_value = "<p>x</p>"

    chapter_html = _FIXTURE_PATH.read_text(encoding="utf-8")
    workflow = _build_workflow(
        job_repo=migrated_repo,
        translation_port=translation_port,
        progress_bus=progress_bus,
        chapter_html=chapter_html,
    )
    await workflow.run(job_id)

    # First call's chunk_id argument
    first_call_chunk_id = translation_port.translate.call_args_list[0].args[0]
    assert first_call_chunk_id == "tx_ch0_s0"


# ---------------------------------------------------------------------------
# PROVIDER_TIMEOUT_SECONDS constant
# ---------------------------------------------------------------------------


async def test_provider_timeout_seconds_is_60() -> None:
    """XLATE-03: the 60s budget is locked as a class constant."""
    assert TranslationWorkflowService.PROVIDER_TIMEOUT_SECONDS == 60.0


# ---------------------------------------------------------------------------
# JobOrchestrator dispatch (D-05) — quick 260709-bso: per-dispatch adapter
# ---------------------------------------------------------------------------


def _make_per_dispatch_orchestrator(
    *,
    job_row: dict[str, Any],
) -> tuple[JobOrchestrator, dict[str, MagicMock]]:
    """Build a ``JobOrchestrator`` with the per-dispatch constructor (quick 260709-bso).

    The orchestrator now receives adapter classes + base URLs +
    the default voice + workflow collaborators. The stub
    translation + voiceover + combined workflows are injected
    indirectly via the per-dispatch construction: the
    orchestrator builds the ``TranslationWorkflowService`` /
    ``VoiceOverWorkflowService`` /
    ``CombinedWorkflowService`` instances itself from the
    collaborators. For the dispatch contract tests we
    substitute the workflow classes via monkeypatching the
    orchestrator's import; the simpler approach is to provide
    a real ``EpubService`` whose ``chapters_for_epub`` returns
    an empty list, so the per-dispatch workflow services exit
    cleanly without running a real per-chunk loop.
    """
    import pathlib
    import tempfile

    job_repo = MagicMock()
    job_repo.get_job = AsyncMock(return_value=job_row)
    job_repo.update_status = AsyncMock()
    job_repo.append_chunk = AsyncMock()
    job_repo.list_chunks = AsyncMock(return_value=[])
    job_repo.register_audio_file = AsyncMock()
    epub_service = MagicMock()
    epub_service.chapters_for_epub = AsyncMock(return_value=[])
    epub_service.get_metadata = AsyncMock(return_value={"title": "Translated", "author": None})
    file_store = MagicMock()
    audio_stitcher = MagicMock()
    progress_bus = MagicMock()
    audio_dir = pathlib.Path(tempfile.mkdtemp(prefix="epubtv_test_audio_"))
    artifact_dir = pathlib.Path(tempfile.mkdtemp(prefix="epubtv_test_artifact_"))

    translation_adapters_called: dict[str, MagicMock] = {
        "ollama": MagicMock(),
        "openai-compatible": MagicMock(),
    }
    tts_adapter_called = MagicMock()

    class _FakeOllamaAdapter:
        def __init__(self, *, base_url: str, model: str) -> None:
            self.base_url = base_url
            self.model = model
            translation_adapters_called["ollama"].__call__(base_url=base_url, model=model)

        async def aclose(self) -> None:
            pass

    class _FakeOpenAITranslationAdapter:
        def __init__(self, *, base_url: str, model: str) -> None:
            self.base_url = base_url
            self.model = model
            translation_adapters_called["openai-compatible"].__call__(
                base_url=base_url, model=model
            )

        async def aclose(self) -> None:
            pass

    class _FakeTTSAdapter:
        def __init__(self, *, base_url: str, model: str, voice: str) -> None:
            self.base_url = base_url
            self.model = model
            self.voice = voice
            tts_adapter_called.__call__(base_url=base_url, model=model, voice=voice)

        async def aclose(self) -> None:
            pass

    orchestrator = JobOrchestrator(
        job_repo=job_repo,
        translation_adapter_classes={
            "ollama": _FakeOllamaAdapter,
            "openai-compatible": _FakeOpenAITranslationAdapter,
        },
        translation_base_urls={
            "ollama": "http://mock-ollama:11434/",
            "openai-compatible": "http://mock-llm:8765/v1/",
        },
        tts_adapter_class=_FakeTTSAdapter,
        tts_base_url="http://mock-llm:8765/v1/",
        default_voice="alloy",
        progress_bus=progress_bus,
        epub_service=epub_service,
        file_store=file_store,
        audio_stitcher=audio_stitcher,
        audio_dir=audio_dir,
        artifact_dir=artifact_dir,
    )
    return orchestrator, {
        "translation_adapters_called": translation_adapters_called,
        "tts_adapter_called": tts_adapter_called,
    }


async def test_orchestrator_dispatches_translation_job() -> None:
    """``translation`` job_type → per-dispatch Ollama translation workflow runs (BACK-10).

    Quick 260709-bso: the orchestrator constructs a fresh
    ``TranslationWorkflowService`` bound to a per-dispatch
    ``OllamaHttpTranslationAdapter`` (TRAN-02). The previous
    "shared singleton + ``adapter._model = model`` mutation"
    pattern (quick 260709-lifespan) is replaced; the
    per-dispatch adapter receives the row's stored ``model=``.
    """
    job_row = {
        "id": "job-1",
        "epub_id": "e1",
        "job_type": "translation",
        "status": "queued",
        "source_language": "en",
        "target_language": "de",
        "voice": None,
        "chapter_ids": [],
        "last_chunk_id": None,
        "provider": "ollama",
        "model": "translategemma:12b",
    }
    orchestrator, stubs = _make_per_dispatch_orchestrator(job_row=job_row)

    await orchestrator.dispatch("job-1", "translation")
    # The per-dispatch Ollama adapter was constructed with the
    # row's stored ``model=`` + the Ollama base URL.
    ollama_mock = stubs["translation_adapters_called"]["ollama"]
    ollama_mock.assert_called_once_with(
        base_url="http://mock-ollama:11434/", model="translategemma:12b"
    )
    # The OpenAI-compatible translation adapter was NOT constructed.
    openai_mock = stubs["translation_adapters_called"]["openai-compatible"]
    openai_mock.assert_not_called()
    # The TTS adapter was NOT constructed (translation job_type).
    stubs["tts_adapter_called"].assert_not_called()


async def test_orchestrator_dispatches_voiceover_to_voiceover_workflow() -> None:
    """``voiceover`` job_type → per-dispatch TTS workflow runs (D-11 + BACK-10).

    Phase 3 / D-11: the 501 stub from Phase 2 is REPLACED with a
    real dispatch to ``VoiceOverWorkflowService``. Phase 1 plan
    01-03 / BACK-10: the dispatch is per-provider; the only
    valid voiceover provider is ``openai-compatible`` (TTS-02).
    The per-dispatch TTS adapter receives the row's stored
    ``model=`` + ``voice=``.
    """
    job_row = {
        "id": "job-vo",
        "epub_id": "e1",
        "job_type": "voiceover",
        "status": "queued",
        "source_language": "en",
        "target_language": None,
        "voice": "nova",
        "chapter_ids": [],
        "last_chunk_id": None,
        "provider": "openai-compatible",
        "model": "tts-1",
    }
    orchestrator, stubs = _make_per_dispatch_orchestrator(job_row=job_row)

    await orchestrator.dispatch("job-vo", "voiceover")
    # The per-dispatch TTS adapter was constructed with the
    # row's stored ``model=`` + ``voice=``.
    stubs["tts_adapter_called"].assert_called_once_with(
        base_url="http://mock-llm:8765/v1/", model="tts-1", voice="nova"
    )
    # No translation adapter was constructed (voiceover job_type).
    ollama_mock = stubs["translation_adapters_called"]["ollama"]
    openai_mock = stubs["translation_adapters_called"]["openai-compatible"]
    ollama_mock.assert_not_called()
    openai_mock.assert_not_called()


async def test_orchestrator_dispatches_combined_workflow() -> None:
    """``translation+voiceover`` job_type → per-dispatch combined workflow runs (Phase 4 + BACK-10).

    Quick 260709-bso: the orchestrator constructs a fresh
    ``CombinedWorkflowService`` bound to per-dispatch
    translation + TTS adapters. Both adapters are closed in
    the finally block.
    """
    job_row = {
        "id": "job-combined",
        "epub_id": "e1",
        "job_type": "translation+voiceover",
        "status": "queued",
        "source_language": "en",
        "target_language": "de",
        "voice": "alloy",
        "chapter_ids": [],
        "last_chunk_id": None,
        "provider": "ollama",
        "model": "translategemma:12b",
    }
    orchestrator, stubs = _make_per_dispatch_orchestrator(job_row=job_row)

    await orchestrator.dispatch("job-combined", "translation+voiceover")
    # The per-dispatch Ollama translation adapter was constructed
    # (the combined workflow runs the Ollama translation leg).
    ollama_mock = stubs["translation_adapters_called"]["ollama"]
    ollama_mock.assert_called_once_with(
        base_url="http://mock-ollama:11434/", model="translategemma:12b"
    )
    # The per-dispatch TTS adapter was also constructed (the
    # combined workflow always runs the OpenAI TTS leg).
    stubs["tts_adapter_called"].assert_called_once_with(
        base_url="http://mock-llm:8765/v1/",
        model="translategemma:12b",
        voice="alloy",
    )


async def test_orchestrator_dispatches_unknown_job_type_with_422() -> None:
    """Unknown ``job_type`` → 422 ``validation_error`` (defensive guard)."""
    job_row = {
        "id": "job-bad",
        "epub_id": "e1",
        "job_type": "translation",
        "status": "queued",
        "source_language": "en",
        "target_language": "de",
        "voice": None,
        "chapter_ids": [],
        "last_chunk_id": None,
        "provider": "ollama",
        "model": "translategemma:12b",
    }
    orchestrator, _stubs = _make_per_dispatch_orchestrator(job_row=job_row)

    with pytest.raises(HTTPException) as exc_info:
        await orchestrator.dispatch("job-bad", "narration")
    assert exc_info.value.status_code == 422
    # pyrefly: ignore [bad-index]
    assert exc_info.value.detail["code"] == "validation_error"
