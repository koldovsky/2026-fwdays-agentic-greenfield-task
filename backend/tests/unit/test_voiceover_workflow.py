"""VoiceOverWorkflowService + per-chapter WAV stitch tests (Task 3 TDD cycle).

Satisfies D-11 (60s ``asyncio.wait_for`` + 1 retry → ``provider_timeout``
envelope) + D-13 (per-chapter WAV write at ``audio_dir/job_id/ch{N}.wav``)
+ D-15 (6-field WS envelope with ``job_type='voiceover'``) + D-16
(``audio_files`` row insert via ``register_audio_file``) + D-10
(``chunk_split_warning`` persisted for tier-3 hard-cut chunks) +
F5-AC4/F5-AC5 (resume from ``last_chunk_id``).

The test profile mirrors ``test_translation_workflow.py``:
- Single-chapter 5-sentence EPUB → 5 synth calls + 5 ``append_chunk``
  + 5 WS events with ``job_type='voiceover'`` + 1 ``register_audio_file``
  + 1 WAV file at ``audio_dir / job_id / ch0.wav``; final status
  ``completed``.
- Behaviour ``fail_once_then_succeed`` on the first chunk → first call
  raises; retry succeeds.
- Behaviour ``timeout`` on the first chunk → second timeout → chunk
  ``failed`` + job ``failed`` + final WS event with
  ``error='provider_timeout'``.
- Resume: pre-populate 4 completed chunks; assert synth was called
  only for indices 4+; ``append_chunk`` called only for indices 4+.
- ``chunk_split_warning``: chapter with a 5000-char string → the
  resulting tier-3 chunk rows carry the warning.
- ``voice`` is read from the job row (D-06: set at job creation by
  the router preflight).
"""

from __future__ import annotations

import io
import pathlib
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from pydub import AudioSegment

from epubtv.adapters.audio.audio_stitcher import AudioStitcher
from epubtv.adapters.persistence.sqlite_job_repository import (
    SQLiteJobRepository,
)
from epubtv.adapters.progress.job_progress_bus import JobProgressBus
from epubtv.application.epub_service import EpubService
from epubtv.application.voiceover_workflow import VoiceOverWorkflowService
from epubtv.domain.chunkers import CharacterChunker

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("VOICE-01-UT06")]


# ---------------------------------------------------------------------------
# Fixtures + helpers
# ---------------------------------------------------------------------------


def _create_test_schema(db_path_str: str) -> None:
    """Create the SQLModel tables on the per-test database.

    Production schema apply goes through ``alembic upgrade head``; the
    unit test path uses ``SQLModel.metadata.create_all`` to avoid the
    async-alembic/event-loop conflict in ``pytest-asyncio`` fixtures.
    """
    from sqlmodel import SQLModel, create_engine

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
    """Minimal in-memory ``FileStorePort`` for the voiceover workflow tests.

    Mirrors the Phase 2 ``_FakeFileStore`` in ``test_translation_workflow.py``
    — the workflow tests do NOT need a real EPUB archive on disk because
    ``EpubService.chapters_for_epub`` is monkeypatched on the service
    instance to return a single chapter directly.
    """

    def __init__(self, chapter_html: str) -> None:
        self._chapter_html = chapter_html

    async def save_epub(self, epub_bytes: bytes, original_filename: str | None) -> str:
        return "fake-epub-id"

    async def read_epub(self, epub_id: str) -> bytes:
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


def _build_workflow(
    *,
    job_repo: Any,
    tts_port: Any,
    progress_bus: JobProgressBus,
    chapter_html: str,
    audio_dir: pathlib.Path | None = None,
) -> VoiceOverWorkflowService:
    """Build a voiceover workflow with a stubbed ``chapters_for_epub``."""
    service = VoiceOverWorkflowService(
        job_repo=job_repo,
        tts_port=tts_port,
        progress_bus=progress_bus,
        chunker=CharacterChunker(),
        epub_service=EpubService(),
        file_store=_FakeFileStore(chapter_html),
        audio_stitcher=AudioStitcher(),
        audio_dir=audio_dir or pathlib.Path("/tmp/audio_test"),
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


_FIVE_SENTENCE_HTML = (
    "<p>First sentence here.</p>"
    "<p>Second sentence here.</p>"
    "<p>Third sentence here.</p>"
    "<p>Fourth sentence here.</p>"
    "<p>Fifth sentence here.</p>"
)


# ---------------------------------------------------------------------------
# Happy path: 5-sentence chapter → 5 synth + 5 append_chunk + 5 events
# ---------------------------------------------------------------------------


async def test_workflow_runs_n_chunks_for_n_sentence_chapter(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
) -> None:
    """5-sentence chapter → 5 synth + 5 append_chunk + 5 events + 1 register_audio_file."""
    job_id = await migrated_repo.create_job(
        epub_id="e_vo5",
        job_type="voiceover",
        chapter_ids=[],
        source_language="en",
        target_language="en",
    )

    tts_port = MagicMock()
    tts_port.synthesize = AsyncMock(side_effect=lambda *a, **kw: (_fake_silent_wav_bytes(), 1.0))

    workflow = _build_workflow(
        job_repo=migrated_repo,
        tts_port=tts_port,
        progress_bus=progress_bus,
        chapter_html=_FIVE_SENTENCE_HTML,
    )

    queue = progress_bus.subscribe(job_id)
    await workflow.run(job_id)

    # 5 synthesize calls (one per sentence).
    assert tts_port.synthesize.await_count == 5

    # 5 completed chunk rows.
    chunks = await migrated_repo.list_chunks(job_id)
    assert len(chunks) == 5
    assert all(c["state"] == "completed" for c in chunks)
    # chunk_ids are vo_ch0_a0..vo_ch0_a4 (D-04).
    chunk_ids = sorted(c["id"] for c in chunks)
    assert chunk_ids == [f"vo_ch0_a{i}" for i in range(5)]

    # Final job status.
    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["status"] == "completed"

    # 5 per-chunk events + 1 final "completed" event = 6.
    events: list[dict[str, Any]] = []
    while not queue.empty():
        events.append(await queue.get())
    per_chunk_events = [e for e in events if e.get("status") == "running"]
    final_events = [e for e in events if e.get("status") == "completed"]
    assert len(per_chunk_events) == 5
    assert len(final_events) == 1

    # All per-chunk events carry job_type='voiceover' (D-15).
    for e in per_chunk_events:
        assert e["job_type"] == "voiceover", (
            f"per-chunk event must carry job_type='voiceover', got {e['job_type']!r}"
        )


async def test_workflow_emitted_per_chunk_envelope_has_vo_job_type(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
) -> None:
    """D-15: 6-field envelope shape with ``job_type='voiceover'`` for each chunk."""
    job_id = await migrated_repo.create_job(
        epub_id="e_vo_env",
        job_type="voiceover",
        chapter_ids=[],
        source_language="en",
        target_language="en",
    )

    tts_port = MagicMock()
    tts_port.synthesize = AsyncMock(side_effect=lambda *a, **kw: (_fake_silent_wav_bytes(), 1.0))

    workflow = _build_workflow(
        job_repo=migrated_repo,
        tts_port=tts_port,
        progress_bus=progress_bus,
        chapter_html=_FIVE_SENTENCE_HTML,
    )

    queue = progress_bus.subscribe(job_id)
    await workflow.run(job_id)

    # Pull the first per-chunk event.
    event = await queue.get()
    while event.get("status") != "running":
        event = await queue.get()

    assert event["job_id"] == job_id
    assert event["job_type"] == "voiceover"
    assert event["chunk_id"] == "vo_ch0_a0"
    assert event["progress_current"] == 1
    assert event["progress_total"] == 5
    assert event["status"] == "running"


# ---------------------------------------------------------------------------
# Per-chapter WAV write + audio_files row (D-13 + D-16)
# ---------------------------------------------------------------------------


async def test_workflow_stitches_per_chapter_wav(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
    tmp_path: pathlib.Path,
) -> None:
    """D-13: per-chapter WAV written to ``audio_dir / job_id / ch0.wav``."""
    audio_dir = tmp_path / "audio"
    job_id = await migrated_repo.create_job(
        epub_id="e_vo_stitch",
        job_type="voiceover",
        chapter_ids=[],
        source_language="en",
        target_language="en",
    )

    tts_port = MagicMock()
    tts_port.synthesize = AsyncMock(side_effect=lambda *a, **kw: (_fake_silent_wav_bytes(), 1.0))

    workflow = _build_workflow(
        job_repo=migrated_repo,
        tts_port=tts_port,
        progress_bus=progress_bus,
        chapter_html=_FIVE_SENTENCE_HTML,
        audio_dir=audio_dir,
    )

    await workflow.run(job_id)

    expected_path = audio_dir / job_id / "ch0.wav"
    assert expected_path.exists(), f"WAV file not written: {expected_path}"

    # The file decodes as a 5-second WAV (5 x 1s stitched).
    decoded = AudioSegment.from_wav(io.BytesIO(expected_path.read_bytes()))
    assert decoded.frame_rate == 16000
    assert abs(decoded.duration_seconds - 5.0) < 0.050, (
        f"stitched duration should be 5.0s ± 50ms, got {decoded.duration_seconds}"
    )


async def test_workflow_inserts_audio_files_row(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
    tmp_path: pathlib.Path,
) -> None:
    """D-16: ``register_audio_file`` called once per chapter; row has the right shape."""
    audio_dir = tmp_path / "audio"
    job_id = await migrated_repo.create_job(
        epub_id="e_vo_audio_row",
        job_type="voiceover",
        chapter_ids=[],
        source_language="en",
        target_language="en",
    )

    tts_port = MagicMock()
    tts_port.synthesize = AsyncMock(side_effect=lambda *a, **kw: (_fake_silent_wav_bytes(), 1.0))

    workflow = _build_workflow(
        job_repo=migrated_repo,
        tts_port=tts_port,
        progress_bus=progress_bus,
        chapter_html=_FIVE_SENTENCE_HTML,
        audio_dir=audio_dir,
    )

    await workflow.run(job_id)

    rows = await migrated_repo.list_audio_files(job_id)
    assert len(rows) == 1
    assert rows[0]["job_id"] == job_id
    assert rows[0]["chapter"] == 0
    assert rows[0]["fmt"] == "wav"
    expected_path = audio_dir / job_id / "ch0.wav"
    assert rows[0]["file_path"] == str(expected_path), (
        f"file_path should be the per-chapter WAV path, got {rows[0]['file_path']!r}"
    )


# ---------------------------------------------------------------------------
# Timeout + retry (D-11)
# ---------------------------------------------------------------------------


async def test_workflow_60s_timeout_retries_then_succeeds(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
) -> None:
    """D-11: first call times out, retry succeeds, chunk completes."""
    job_id = await migrated_repo.create_job(
        epub_id="e_vo_retry",
        job_type="voiceover",
        chapter_ids=[],
        source_language="en",
        target_language="en",
    )

    # First call: TimeoutError. Second call: success.
    tts_port = MagicMock()
    tts_port.synthesize = AsyncMock(
        side_effect=[TimeoutError("forced"), (_fake_silent_wav_bytes(), 1.0)]
    )

    # Use a tiny 1-sentence chapter so the test is focused.
    tiny_html = "<p>Only one sentence here.</p>"
    workflow = _build_workflow(
        job_repo=migrated_repo,
        tts_port=tts_port,
        progress_bus=progress_bus,
        chapter_html=tiny_html,
    )

    queue = progress_bus.subscribe(job_id)
    await workflow.run(job_id)

    # 2 calls (timeout + retry).
    assert tts_port.synthesize.await_count == 2

    chunks = await migrated_repo.list_chunks(job_id)
    assert len(chunks) == 1
    assert chunks[0]["state"] == "completed"

    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["status"] == "completed"

    # Exactly ONE per-chunk emit (the retry is transparent).
    events: list[dict[str, Any]] = []
    while not queue.empty():
        events.append(await queue.get())
    per_chunk = [e for e in events if e.get("status") == "running"]
    assert len(per_chunk) == 1


async def test_workflow_60s_timeout_retries_then_fails(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
) -> None:
    """D-11: second timeout → chunk failed + job failed + provider_timeout envelope."""
    job_id = await migrated_repo.create_job(
        epub_id="e_vo_fail",
        job_type="voiceover",
        chapter_ids=[],
        source_language="en",
        target_language="en",
    )

    # Force the TTS adapter to raise TimeoutError on every call.
    tts_port = MagicMock()
    tts_port.synthesize = AsyncMock(side_effect=TimeoutError("forced"))

    # Use a tiny 1-sentence chapter so the test is focused.
    tiny_html = "<p>Only one sentence here.</p>"
    workflow = _build_workflow(
        job_repo=migrated_repo,
        tts_port=tts_port,
        progress_bus=progress_bus,
        chapter_html=tiny_html,
    )

    queue = progress_bus.subscribe(job_id)
    await workflow.run(job_id)

    # 2 calls (timeout + retry).
    assert tts_port.synthesize.await_count == 2

    chunks = await migrated_repo.list_chunks(job_id)
    assert len(chunks) == 1
    assert chunks[0]["state"] == "failed"

    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["status"] == "failed"

    # The final failed event carries the provider_timeout envelope.
    events: list[dict[str, Any]] = []
    while not queue.empty():
        events.append(await queue.get())
    failed_events = [e for e in events if e.get("status") == "failed"]
    assert len(failed_events) == 1
    assert failed_events[0].get("error") == "provider_timeout"
    assert failed_events[0]["job_id"] == job_id
    assert failed_events[0]["job_type"] == "voiceover"


# ---------------------------------------------------------------------------
# Resume from last_chunk_id
# ---------------------------------------------------------------------------


async def test_workflow_resume_skips_completed_chunks(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
) -> None:
    """F5-AC4 + F5-AC5: pre-populated completed chunks are skipped on re-entry."""
    job_id = await migrated_repo.create_job(
        epub_id="e_vo_resume",
        job_type="voiceover",
        chapter_ids=[],
        source_language="en",
        target_language="en",
    )

    # Pre-insert 4 completed chunks + advance last_chunk_id.
    for idx in range(4):
        await migrated_repo.append_chunk(
            job_id, chapter_idx=0, chunk_idx=idx, state="completed", chunk_namespace="vo"
        )

    tts_port = MagicMock()
    tts_port.synthesize = AsyncMock(side_effect=lambda *a, **kw: (_fake_silent_wav_bytes(), 1.0))

    workflow = _build_workflow(
        job_repo=migrated_repo,
        tts_port=tts_port,
        progress_bus=progress_bus,
        chapter_html=_FIVE_SENTENCE_HTML,
    )

    await workflow.run(job_id)

    # 5 total - 4 pre-completed = 1 synth call.
    assert tts_port.synthesize.await_count == 1, (
        f"expected 1 synth call (chunks 4..end), got {tts_port.synthesize.await_count}"
    )

    # Only the chunk with idx=4 was synthesized.
    called_chunk_ids = [c.args[0] for c in tts_port.synthesize.call_args_list]
    assert called_chunk_ids == ["vo_ch0_a4"], (
        f"expected to synthesize only vo_ch0_a4, got {called_chunk_ids}"
    )


# ---------------------------------------------------------------------------
# chunk_split_warning
# ---------------------------------------------------------------------------


async def test_workflow_writes_chunk_split_warning(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
) -> None:
    """D-10: tier-3 hard-cut chunks carry ``chunk_split_warning`` in ``list_chunks``."""
    job_id = await migrated_repo.create_job(
        epub_id="e_vo_warning",
        job_type="voiceover",
        chapter_ids=[],
        source_language="en",
        target_language="en",
    )

    tts_port = MagicMock()
    tts_port.synthesize = AsyncMock(side_effect=lambda *a, **kw: (_fake_silent_wav_bytes(), 1.0))

    # 1 normal sentence + 1 overlong (5000 chars) → 1 tier-1 + 2+ tier-3.
    overlong = "b" * 5000
    chapter_html = f"<p>First normal sentence.</p><p>{overlong}</p>"

    workflow = _build_workflow(
        job_repo=migrated_repo,
        tts_port=tts_port,
        progress_bus=progress_bus,
        chapter_html=chapter_html,
    )

    await workflow.run(job_id)

    chunks = await migrated_repo.list_chunks(job_id)
    # The tier-1 chunk has no warning; the tier-3 chunks do.
    normal = [c for c in chunks if c["chunk_split_warning"] is None]
    warned = [c for c in chunks if c["chunk_split_warning"] is not None]
    assert len(normal) == 1, f"expected 1 normal chunk, got {len(normal)}"
    assert len(warned) >= 2, f"expected >= 2 tier-3 chunks with warnings, got {len(warned)}"
    for c in warned:
        assert c["chunk_split_warning"] == "chunk_split_warning: hard cut at 4096", (
            f"expected hard-cut marker, got {c['chunk_split_warning']!r}"
        )


# ---------------------------------------------------------------------------
# Voice is read from the job row (D-06)
# ---------------------------------------------------------------------------


async def test_workflow_uses_voice_from_job_row(
    migrated_repo: Any,
    progress_bus: JobProgressBus,
) -> None:
    """D-06: the workflow reads ``job['voice']`` and passes it to the TTS port."""
    job_id = await migrated_repo.create_job(
        epub_id="e_vo_voice",
        job_type="voiceover",
        chapter_ids=[],
        source_language="en",
        target_language="en",
    )
    # Set the voice via a direct UPDATE on the job row (the router
    # preflight in plan 03-03 is the authoritative source; the unit
    # test path uses a direct write to keep the test self-contained).
    from sqlalchemy import update

    from epubtv.adapters.persistence.schema import Job

    async with migrated_repo._session_factory() as session, session.begin():
        await session.execute(
            update(Job)
            # pyrefly: ignore [bad-argument-type]
            .where(Job.id == job_id)
            .values(voice="alloy")
        )

    tts_port = MagicMock()
    tts_port.synthesize = AsyncMock(side_effect=lambda *a, **kw: (_fake_silent_wav_bytes(), 1.0))

    workflow = _build_workflow(
        job_repo=migrated_repo,
        tts_port=tts_port,
        progress_bus=progress_bus,
        chapter_html=_FIVE_SENTENCE_HTML,
    )

    await workflow.run(job_id)

    # All 5 calls used the 'alloy' voice.
    for call in tts_port.synthesize.call_args_list:
        assert call.args[4] == "alloy", (
            f"TTS port should receive voice='alloy', got {call.args[4]!r}"
        )
