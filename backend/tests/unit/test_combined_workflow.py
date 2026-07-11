"""CombinedWorkflowService unit tests (Phase 4 plan 04-02 Task 1 TDD cycle).

Satisfies the 5 acceptance scenarios:

1. ``test_per_chapter_gate_fires_before_voiceover_tts`` — on a
   2-chapter EPUB, the TTS call for chapter N happens AFTER the
   translation leg's last chunk commit for that chapter.
2. ``test_voiceover_reads_translated_text`` — the TTS input for
   chapter N is the TRANSLATED text (asserted via the stub TTS
   port's ``synthesize.call_args_list``); NOT the source text.
3. ``test_translation_failure_aborts_voiceover`` — translation leg
   failure (forced ``TimeoutError`` on the first chunk) aborts the
   voiceover leg; no artifact pre-built; job status = ``failed``.
4. ``test_voiceover_failure_still_builds_epub`` — voiceover leg
   failure (forced ``TimeoutError`` on the first TTS call) still
   pre-builds the EPUB artifact; ZIP NOT pre-built; job status =
   ``failed``.
5. ``test_successful_combined_run_builds_both_artifacts`` — full
   success: both ``translated.epub`` + ``audio.zip`` are
   pre-built; job status = ``completed``.

The tests stub ``EpubService.chapters_for_epub`` so the unit test
does NOT have to construct a real EPUB archive on disk; the
``AudioStitcher`` is a real instance (pydub concat); the TTS port
is an ``AsyncMock`` that records the per-call ``text`` argument.
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from pydub import AudioSegment
from sqlmodel import SQLModel, create_engine

from epubtv.adapters.audio.audio_stitcher import AudioStitcher
from epubtv.adapters.persistence.sqlite_job_repository import (
    SQLiteJobRepository,
)
from epubtv.adapters.progress.job_progress_bus import JobProgressBus
from epubtv.application.combined import CombinedWorkflowService
from epubtv.application.translation_workflow import TranslationWorkflowService
from epubtv.application.voiceover_workflow import VoiceOverWorkflowService
from epubtv.domain.chunkers import CharacterChunker, SentenceChunker

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("COMB-01-UT01")]


# ---------------------------------------------------------------------------
# Fixtures + helpers
# ---------------------------------------------------------------------------


def _create_test_schema(db_path_str: str) -> None:
    """Create the SQLModel tables on the per-test database (sync engine)."""
    from epubtv.adapters.persistence import schema  # noqa: F401

    sync_engine = create_engine(f"sqlite:///{db_path_str}")
    SQLModel.metadata.create_all(sync_engine)
    sync_engine.dispose()


def _fake_silent_wav_bytes() -> bytes:
    """Return a 1-second 16 kHz 16-bit mono silent WAV (D-01 contract)."""
    seg = AudioSegment.silent(duration=1000, frame_rate=16000)
    buf = io.BytesIO()
    seg.export(buf, format="wav")
    return buf.getvalue()


class _FakeFileStore:
    """Minimal in-memory ``FileStorePort`` for the combined workflow tests."""

    async def save_epub(self, epub_bytes: bytes, original_filename: str | None) -> str:
        return "fake-epub-id"

    async def read_epub(self, epub_id: str) -> bytes:
        return b""

    async def delete_epub(self, epub_id: str) -> None:
        return None


class _StubEpubService:
    """Stub ``EpubService`` whose ``chapters_for_epub`` returns a fixed list.

    The combined workflow needs only ``chapters_for_epub`` +
    ``get_metadata`` (the latter only at job-completion time for the
    EPUB build title fallback). Both are stubbed below.
    """

    def __init__(self, chapters: list[tuple[int, str]]) -> None:
        self._chapters = chapters
        self.chapters_for_epub_call_log: list[str] = []

    async def chapters_for_epub(
        self,
        _epub_id: str,
        _file_store: Any,
        _chapter_ids: list[str] | None = None,
    ) -> list[tuple[int, str]]:
        self.chapters_for_epub_call_log.append(_epub_id)
        return list(self._chapters)

    async def get_metadata(self, _epub_id: str, _file_store: Any) -> dict[str, Any]:
        return {"title": "Test Book", "author": None}


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


def _build_combined_workflow(
    *,
    job_repo: Any,
    translation_port: Any,
    tts_port: Any,
    progress_bus: JobProgressBus,
    epub_service: Any,
    audio_dir: Path,
    artifact_dir: Path,
    provider: str = "ollama",
) -> CombinedWorkflowService:
    """Build a combined workflow + the per-provider subworkflows it owns.

    The two translation subworkflows (Ollama + OpenAI-compatible)
    + the single voiceover subworkflow (OpenAI-compatible) are
    constructed with stub ports so the test can drive both legs
    deterministically. The combined workflow's per-chunk loops
    reach into the subworkflow collaborators (``_translation_port``,
    ``_tts_port``, etc.) so stubs on those collaborators are visible
    to the combined workflow.

    The ``provider`` kwarg selects which per-provider translation
    subworkflow is the active one for the run (default:
    ``"ollama"`` — the sprint default). The combined workflow's
    ``run`` method reads the stored provider from the job row and
    sets ``self._tx`` accordingly; the Ollama and OpenAI
    subworkflows share the same ``TranslationWorkflowService`` class
    but with different ``TranslationPort`` adapters.

    The ``epub_service`` parameter is typed as ``Any`` so the test
    can pass a ``_StubEpubService`` (which only implements the
    methods the combined workflow needs); pyrefly otherwise rejects
    the duck-typed call site.
    """
    ollama_translation_workflow = TranslationWorkflowService(
        job_repo=job_repo,
        translation_port=translation_port,
        progress_bus=progress_bus,
        chunker=SentenceChunker(),
        # pyrefly: ignore [bad-argument-type]
        epub_service=epub_service,
        file_store=_FakeFileStore(),
    )
    openai_translation_workflow = TranslationWorkflowService(
        job_repo=job_repo,
        translation_port=translation_port,  # stub; same port for test
        progress_bus=progress_bus,
        chunker=SentenceChunker(),
        # pyrefly: ignore [bad-argument-type]
        epub_service=epub_service,
        file_store=_FakeFileStore(),
    )
    openai_voiceover_workflow = VoiceOverWorkflowService(
        job_repo=job_repo,
        tts_port=tts_port,
        progress_bus=progress_bus,
        chunker=CharacterChunker(),
        # pyrefly: ignore [bad-argument-type]
        epub_service=epub_service,
        file_store=_FakeFileStore(),
        audio_stitcher=AudioStitcher(),
        audio_dir=audio_dir,
    )
    from epubtv.application.artifact_service import ArtifactBuilder

    return CombinedWorkflowService(
        ollama_translation_workflow=ollama_translation_workflow,
        openai_translation_workflow=openai_translation_workflow,
        openai_voiceover_workflow=openai_voiceover_workflow,
        file_store=_FakeFileStore(),
        # pyrefly: ignore [bad-argument-type]
        epub_service=epub_service,
        job_repo=job_repo,
        artifact_builder=ArtifactBuilder(),
        progress_bus=progress_bus,
        audio_dir=audio_dir,
        artifact_dir=artifact_dir,
    )


# ---------------------------------------------------------------------------
# 1. Per-chapter gate fires before voiceover TTS
# ---------------------------------------------------------------------------


async def test_per_chapter_gate_fires_before_voiceover_tts(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
    tmp_path: Path,
) -> None:
    """2-chapter EPUB: TTS call for chapter N happens AFTER translation
    commit for chapter N.

    The combined workflow's per-chapter ``asyncio.Event`` is the gate
    that the voiceover leg awaits. We assert the gate fires BEFORE
    the TTS call by recording an ordered list of (translate, synth)
    calls and verifying the order.
    """
    job_id = await migrated_repo.create_job(
        epub_id="e_combined_gate",
        job_type="translation+voiceover",
        chapter_ids=[],
        source_language="en",
        target_language="fr",
        voice="alloy",
        provider="ollama",
        model="translategemma:12b",
    )

    # Two chapters; each has a single sentence so the chunker emits
    # one chunk per chapter.
    chapters = [
        (0, "<p>First chapter sentence.</p>"),
        (1, "<p>Second chapter sentence.</p>"),
    ]
    epub_service = _StubEpubService(chapters)

    call_log: list[str] = []

    async def _translate(_chunk_id: str, text: str, _sl: str, _tl: str) -> str:
        call_log.append(f"translate:{text}")
        return f"<p>translated:{text}</p>"

    async def _synthesize(
        chunk_id: str, text: str, _sl: str, _tl: str, _voice: str
    ) -> tuple[bytes, float]:
        call_log.append(f"synth:{chunk_id}:{text}")
        return (_fake_silent_wav_bytes(), 1.0)

    translation_port = MagicMock()
    translation_port.translate = AsyncMock(side_effect=_translate)
    tts_port = MagicMock()
    tts_port.synthesize = AsyncMock(side_effect=_synthesize)

    workflow = _build_combined_workflow(
        job_repo=migrated_repo,
        translation_port=translation_port,
        tts_port=tts_port,
        progress_bus=progress_bus,
        epub_service=epub_service,
        audio_dir=tmp_path / "audio",
        artifact_dir=tmp_path / "artifacts",
    )

    await workflow.run(job_id)

    # The call log interleaves translate + synth per chapter. The
    # TTS call for chapter 0 must come AFTER the translate call for
    # chapter 0 (same for chapter 1).
    log_str = " | ".join(call_log)
    # Per-chapter ordering: the TTS for chapter N appears AFTER the
    # translation for chapter N in the log. The exact chunk_id
    # format is ``vo_ch{N}_a0``; the chapter order is therefore
    # detectable.
    ch0_translate_idx = next(i for i, line in enumerate(call_log) if "First chapter" in line)
    ch0_synth_idx = next(
        i
        for i, line in enumerate(call_log)
        if line.startswith("synth:vo_ch0_a0:") or "vo_ch0_a0" in line
    )
    assert ch0_synth_idx > ch0_translate_idx, (
        f"TTS for chapter 0 must come AFTER translate for chapter 0; got log={call_log!r}"
    )
    ch1_translate_idx = next(i for i, line in enumerate(call_log) if "Second chapter" in line)
    ch1_synth_idx = next(
        i
        for i, line in enumerate(call_log)
        if line.startswith("synth:vo_ch1_a0:") or "vo_ch1_a0" in line
    )
    assert ch1_synth_idx > ch1_translate_idx, (
        f"TTS for chapter 1 must come AFTER translate for chapter 1; got log={call_log!r}"
    )
    # Sanity: the log string is non-empty.
    assert "First chapter" in log_str
    assert "Second chapter" in log_str


# ---------------------------------------------------------------------------
# 2. Voiceover reads the TRANSLATED text (not the source)
# ---------------------------------------------------------------------------


async def test_voiceover_reads_translated_text(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
    tmp_path: Path,
) -> None:
    """The TTS input for a chapter is the TRANSLATED text.

    We stub the translation port to return a marker HTML fragment;
    the stub TTS port records the ``text`` argument. The recorded
    text MUST be the marker, NOT the source text.
    """
    job_id = await migrated_repo.create_job(
        epub_id="e_combined_translated",
        job_type="translation+voiceover",
        chapter_ids=[],
        source_language="en",
        target_language="fr",
        voice="alloy",
        provider="ollama",
        model="translategemma:12b",
    )

    source_text = "Hello"
    # The CharacterChunker strips HTML tags via BeautifulSoup
    # (``.get_text(separator=" ", strip=True)``), so the TTS input is
    # the plain text — not the original HTML. The translation port
    # returns ``<p>Bonjour</p>`` (an HTML fragment that the mock
    # translator emits), but the chunker strips the ``<p>`` wrapper
    # before TTS sees it. The test asserts the TTS input matches
    # the chunker's plain-text view of the translated text — and is
    # NOT the source text.
    translated_html = "<p>Bonjour</p>"
    expected_tts_text = "Bonjour"  # post-chunker plain text

    async def _translate(_cid: str, _text: str, _sl: str, _tl: str) -> str:
        return translated_html

    async def _synthesize(
        _cid: str, text: str, _sl: str, _tl: str, _voice: str
    ) -> tuple[bytes, float]:
        return (_fake_silent_wav_bytes(), 1.0)

    translation_port = MagicMock()
    translation_port.translate = AsyncMock(side_effect=_translate)
    tts_port = MagicMock()
    tts_port.synthesize = AsyncMock(side_effect=_synthesize)

    chapters = [(0, f"<p>{source_text}</p>")]
    epub_service = _StubEpubService(chapters)

    workflow = _build_combined_workflow(
        job_repo=migrated_repo,
        translation_port=translation_port,
        tts_port=tts_port,
        progress_bus=progress_bus,
        epub_service=epub_service,
        audio_dir=tmp_path / "audio",
        artifact_dir=tmp_path / "artifacts",
    )

    await workflow.run(job_id)

    # The TTS port was called exactly once (1 chapter * 1 sentence).
    assert tts_port.synthesize.await_count == 1
    # The recorded text is the TRANSLATED text (plain text post-chunker),
    # not the source text.
    recorded_text = tts_port.synthesize.call_args_list[0].args[1]
    assert recorded_text == expected_tts_text, (
        f"TTS input should be the translated text {expected_tts_text!r}, "
        f"got {recorded_text!r} (source text was {source_text!r})"
    )


# ---------------------------------------------------------------------------
# 3. Translation failure aborts voiceover + no artifacts
# ---------------------------------------------------------------------------


async def test_translation_failure_aborts_voiceover(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
    tmp_path: Path,
) -> None:
    """Translation leg failure (TimeoutError on first chunk) aborts
    the voiceover leg; no artifact pre-built; job status = failed.
    """
    job_id = await migrated_repo.create_job(
        epub_id="e_combined_tx_fail",
        job_type="translation+voiceover",
        chapter_ids=[],
        source_language="en",
        target_language="fr",
        voice="alloy",
        provider="ollama",
        model="translategemma:12b",
    )

    # The translation port raises TimeoutError twice (once for the
    # initial call + once for the retry) → second timeout triggers
    # ``provider_timeout`` envelope + job_state=failed.
    translation_port = MagicMock()
    translation_port.translate = AsyncMock(
        side_effect=[TimeoutError("forced 1"), TimeoutError("forced 2")]
    )
    tts_port = MagicMock()
    tts_port.synthesize = AsyncMock(side_effect=lambda *a, **kw: (_fake_silent_wav_bytes(), 1.0))

    chapters = [(0, "<p>First chapter sentence.</p>")]
    epub_service = _StubEpubService(chapters)

    workflow = _build_combined_workflow(
        job_repo=migrated_repo,
        translation_port=translation_port,
        tts_port=tts_port,
        progress_bus=progress_bus,
        epub_service=epub_service,
        audio_dir=tmp_path / "audio",
        artifact_dir=tmp_path / "artifacts",
    )

    await workflow.run(job_id)

    # TTS was NEVER called (the voiceover leg never started).
    assert tts_port.synthesize.await_count == 0, (
        f"voiceover leg must not run when translation leg fails; "
        f"got await_count={tts_port.synthesize.await_count}"
    )

    # The job is in 'failed' state.
    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["status"] == "failed", f"expected status='failed', got {job['status']!r}"

    # No artifacts pre-built.
    artifact_dir = tmp_path / "artifacts"
    epub_path = artifact_dir / job_id / "translated.epub"
    zip_path = artifact_dir / job_id / "audio.zip"
    assert not epub_path.exists(), (
        f"EPUB artifact must NOT be pre-built on translation failure; found {epub_path}"
    )
    assert not zip_path.exists(), (
        f"ZIP artifact must NOT be pre-built on translation failure; found {zip_path}"
    )


# ---------------------------------------------------------------------------
# 4. Voiceover failure still pre-builds EPUB; ZIP not built
# ---------------------------------------------------------------------------


async def test_voiceover_failure_still_builds_epub(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
    tmp_path: Path,
) -> None:
    """Voiceover leg failure (TimeoutError on first TTS call) still
    pre-builds the EPUB artifact; ZIP is NOT pre-built; job status = failed.
    """
    job_id = await migrated_repo.create_job(
        epub_id="e_combined_vo_fail",
        job_type="translation+voiceover",
        chapter_ids=[],
        source_language="en",
        target_language="fr",
        voice="alloy",
        provider="ollama",
        model="translategemma:12b",
    )

    # Translation succeeds; the TTS port raises TimeoutError on
    # both calls (initial + retry) → second timeout triggers
    # voiceover leg failure.
    translation_port = MagicMock()
    translation_port.translate = AsyncMock(return_value="<p>translated</p>")
    tts_port = MagicMock()
    tts_port.synthesize = AsyncMock(
        side_effect=[TimeoutError("forced 1"), TimeoutError("forced 2")]
    )

    chapters = [(0, "<p>First chapter sentence.</p>")]
    epub_service = _StubEpubService(chapters)

    workflow = _build_combined_workflow(
        job_repo=migrated_repo,
        translation_port=translation_port,
        tts_port=tts_port,
        progress_bus=progress_bus,
        epub_service=epub_service,
        audio_dir=tmp_path / "audio",
        artifact_dir=tmp_path / "artifacts",
    )

    await workflow.run(job_id)

    # The job is in 'failed' state.
    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["status"] == "failed", f"expected status='failed', got {job['status']!r}"

    # The EPUB artifact IS pre-built (translation succeeded).
    artifact_dir = tmp_path / "artifacts"
    epub_path = artifact_dir / job_id / "translated.epub"
    assert epub_path.is_file(), (
        f"EPUB artifact MUST be pre-built on voiceover failure "
        f"(translation succeeded); missing {epub_path}"
    )

    # The ZIP artifact is NOT pre-built.
    zip_path = artifact_dir / job_id / "audio.zip"
    assert not zip_path.exists(), (
        f"ZIP artifact must NOT be pre-built on voiceover failure; found {zip_path}"
    )


# ---------------------------------------------------------------------------
# 5. Successful run pre-builds BOTH artifacts
# ---------------------------------------------------------------------------


async def test_successful_combined_run_builds_both_artifacts(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
    tmp_path: Path,
) -> None:
    """Full success: BOTH ``translated.epub`` + ``audio.zip`` are pre-built;
    job status = completed.
    """
    job_id = await migrated_repo.create_job(
        epub_id="e_combined_success",
        job_type="translation+voiceover",
        chapter_ids=[],
        source_language="en",
        target_language="fr",
        voice="alloy",
        provider="ollama",
        model="translategemma:12b",
    )

    translation_port = MagicMock()
    translation_port.translate = AsyncMock(return_value="<p>translated</p>")
    tts_port = MagicMock()
    tts_port.synthesize = AsyncMock(side_effect=lambda *a, **kw: (_fake_silent_wav_bytes(), 1.0))

    chapters = [(0, "<p>First chapter sentence.</p>")]
    epub_service = _StubEpubService(chapters)

    workflow = _build_combined_workflow(
        job_repo=migrated_repo,
        translation_port=translation_port,
        tts_port=tts_port,
        progress_bus=progress_bus,
        epub_service=epub_service,
        audio_dir=tmp_path / "audio",
        artifact_dir=tmp_path / "artifacts",
    )

    await workflow.run(job_id)

    # The job is in 'completed' state.
    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["status"] == "completed", f"expected status='completed', got {job['status']!r}"

    # BOTH artifacts are pre-built.
    artifact_dir = tmp_path / "artifacts"
    epub_path = artifact_dir / job_id / "translated.epub"
    zip_path = artifact_dir / job_id / "audio.zip"
    assert epub_path.is_file(), f"EPUB artifact missing: {epub_path}"
    assert zip_path.is_file(), f"ZIP artifact missing: {zip_path}"
