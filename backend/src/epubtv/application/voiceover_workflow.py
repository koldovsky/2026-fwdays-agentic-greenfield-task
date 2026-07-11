"""VoiceOverWorkflowService — per-chunk TTS pipeline (D-11, VOICE-01..04).

Phase 3 wires the per-chunk TTS loop:
1. Load the job row via ``JobRepoPort.get_job``.
2. Resolve chapters from the persisted EPUB (filtered by
   ``job.chapter_ids`` if set).
3. For each chapter: chunk via ``CharacterChunker`` (D-04 namespace
   ``vo_ch{N}_a{M}``).
4. For each chunk: call ``tts_port.synthesize`` wrapped in
   ``asyncio.wait_for(60)`` with one retry on ``TimeoutError``; on
   second timeout → ``append_chunk(state='failed', chunk_namespace='vo')``
   + ``update_status('failed')`` + emit ``provider_timeout`` envelope
   (D-11 / D-15).
5. On success: ``append_chunk(state='completed', chunk_namespace='vo',
   chunk_split_warning=...)`` (atomic with ``update_last_chunk_id`` —
   JOBS-04); emit the 6-field progress envelope on the
   ``JobProgressBus`` (D-15).
6. Per-chapter audio stitching: ``audio_stitcher.stitch(ch_idx,
   chapter_segs)`` → WAV bytes → write to
   ``data/audio/{job_id}/ch{N}.wav`` → ``register_audio_file`` (D-13
   + D-16).
7. Resume from ``last_chunk_id``: pre-populated completed chunks are
   skipped (D-10 + F5-AC4/F5-AC5).

The service mirrors ``TranslationWorkflowService`` line-for-line —
the only structural differences are:
- the chunker is ``CharacterChunker`` (3-tier fallback per D-04)
- the tts call has a 5-arg signature
  ``(chunk_id, text, source_language, source_language, voice)``
  (source_language is passed twice as a placeholder — Phase 4 may
  wire a real provider that uses both sides)
- the per-chunk append_chunk passes ``chunk_namespace='vo'`` + the
  optional ``chunk_split_warning=chunk.split_warning``
- the per-chapter side-effect is a WAV write + an
  ``audio_files`` row insert (D-13 + D-16)

Idempotent re-entry: a job with ``status in
{completed, failed, cancelled}`` is a no-op (D-04 resume
semantics — the worker re-enters from the per-chunk
``completed_set``).
"""

from __future__ import annotations

import asyncio
import pathlib
from typing import TYPE_CHECKING

from epubtv.domain.chunkers import CharacterChunker, Chunk

if TYPE_CHECKING:
    from epubtv.adapters.audio.audio_stitcher import AudioStitcher
    from epubtv.adapters.progress.job_progress_bus import JobProgressBus
    from epubtv.application.epub_service import EpubService
    from epubtv.ports.file_store_port import FileStorePort
    from epubtv.ports.job_repo_port import JobRepoPort
    from epubtv.ports.tts_port import TTSPort


class VoiceOverWorkflowService:
    """Per-chunk TTS pipeline for a single voiceover job (D-11).

    Receives all collaborators via ``__init__`` (no global imports).
    """

    # D-11: 60s ``asyncio.wait_for`` envelope per chunk; 1 retry on
    # ``TimeoutError``; second timeout → ``provider_timeout`` envelope.
    PROVIDER_TIMEOUT_SECONDS: float = 60.0

    def __init__(
        self,
        *,
        job_repo: JobRepoPort,
        tts_port: TTSPort,
        progress_bus: JobProgressBus,
        chunker: CharacterChunker,
        epub_service: EpubService,
        file_store: FileStorePort,
        audio_stitcher: AudioStitcher,
        audio_dir: pathlib.Path,
        artifact_dir: pathlib.Path | None = None,
    ) -> None:
        self._job_repo = job_repo
        self._tts_port = tts_port
        self._progress_bus = progress_bus
        self._chunker = chunker
        self._epub_service = epub_service
        self._file_store = file_store
        self._audio_stitcher = audio_stitcher
        self._audio_dir = audio_dir
        # Phase 4 / DL-01: when set, the workflow pre-builds
        # ``{artifact_dir}/{job_id}/audio.zip`` at the
        # ``update_status('completed')`` transition. ``None`` for
        # tests that do NOT exercise the download path; the
        # production lifespan wires it via ``settings.artifact_dir``.
        self._artifact_dir = artifact_dir
        # Per-chapter WAV index for the ZIP build. Reset on every
        # ``run`` call so re-entry does not leak state.
        self._chapter_indices: list[int] = []

    async def run(self, job_id: str) -> None:
        """Run the per-chunk TTS loop for ``job_id`` (D-11 / D-15).

        Side effects (per chunk):
        - ``asyncio.wait_for(60)`` + single retry on ``TimeoutError``.
        - On success: ``append_chunk(state='completed',
          chunk_namespace='vo', chunk_split_warning=...)`` (atomic
          with ``update_last_chunk_id`` — JOBS-04) +
          ``progress_bus.emit`` 6-field envelope with
          ``job_type='voiceover'`` (D-15).
        - On second timeout: ``append_chunk(state='failed',
          chunk_namespace='vo')`` + ``update_status('failed')`` +
          ``progress_bus.emit`` ``provider_timeout`` envelope; early
          return.
        - Per chapter: stitch segments into a WAV via
          ``AudioStitcher.stitch``; write to
          ``{audio_dir}/{job_id}/ch{N}.wav``; insert an ``audio_files``
          row (D-13 + D-16).

        Idempotent re-entry: a job with ``status in
        {completed, failed, cancelled}`` is a no-op (D-04 resume
        semantics — the worker re-enters from the per-chunk
        ``completed_set``).
        """
        job = await self._job_repo.get_job(job_id)
        if job is None:
            raise KeyError(f"job_id {job_id!r} not found")
        if job["status"] in {"completed", "failed", "cancelled"}:
            return  # idempotent re-entry

        await self._job_repo.update_status(job_id, "running")
        source_language = job["source_language"]
        voice = job["voice"]  # D-06: set at job creation by router preflight
        # Phase 4 / DL-01: reset the chapter index for this job so
        # re-entry from a previous failed run does not leak state.
        self._chapter_indices = []

        # Resume (D-10): build a set of (chapter_idx, chunk_idx) pairs
        # already in the ``completed`` state. These are skipped on the
        # next pass. Failed chunks are NOT skipped — the worker
        # re-attempts them (F5-AC5 resume semantics).
        existing_chunks = await self._job_repo.list_chunks(job_id)
        completed_set: set[tuple[int, int]] = {
            (c["chapter_idx"], c["chunk_idx"]) for c in existing_chunks if c["state"] == "completed"
        }

        # Load chapters (filtered by job.chapter_ids if set, else all).
        chapters = await self._epub_service.chapters_for_epub(
            job["epub_id"],
            self._file_store,
            job["chapter_ids"] or None,
        )

        # Pre-compute the chunk list and progress_total in one pass.
        all_chunks: list[tuple[int, Chunk]] = []
        for ch_idx, ch_html in chapters:
            for chunk in self._chunker.chunk(ch_html, source_language, ch_idx):
                all_chunks.append((ch_idx, chunk))
        progress_total = len(all_chunks)
        # progress_current starts at the count of pre-completed chunks
        # (the user-visible bar catches up to the next chunk from there).
        progress_current = sum(1 for (ch, ck) in completed_set)

        chapter_segs: dict[int, list[bytes]] = {}
        for ch_idx, chunk in all_chunks:
            chunk_idx = _chunk_idx_from_id(chunk.chunk_id)
            if (ch_idx, chunk_idx) in completed_set:
                continue  # resume: skip already-done
            chunk_id = chunk.chunk_id

            # Synthesize with 60s budget + 1 retry on TimeoutError (D-11).
            audio_bytes: bytes | None = None
            for attempt in (1, 2):
                try:
                    audio_bytes, _duration = await asyncio.wait_for(
                        self._tts_port.synthesize(
                            chunk_id, chunk.text, source_language, source_language, voice
                        ),
                        timeout=self.PROVIDER_TIMEOUT_SECONDS,
                    )
                    break
                except TimeoutError:
                    if attempt == 2:
                        # Second timeout → mark chunk failed + job failed
                        # + emit provider_timeout envelope.
                        await self._job_repo.append_chunk(
                            job_id, ch_idx, chunk_idx, "failed", chunk_namespace="vo"
                        )
                        await self._job_repo.update_status(job_id, "failed")
                        self._progress_bus.emit(
                            job_id,
                            {
                                "job_id": job_id,
                                "job_type": "voiceover",
                                "chunk_id": chunk_id,
                                "progress_current": progress_current,
                                "progress_total": progress_total,
                                "status": "failed",
                                "error": "provider_timeout",
                            },
                        )
                        return
                    # else: retry once

            if audio_bytes is None:
                # Unreachable: the for loop above either returns a value
                # or returns the function on the second timeout. Keep
                # the type-checker happy.
                return

            # Success: atomic commit (JOBS-04) + 6-field emit (D-15).
            await self._job_repo.append_chunk(
                job_id,
                ch_idx,
                chunk_idx,
                "completed",
                chunk_namespace="vo",
                chunk_split_warning=chunk.split_warning,
            )
            progress_current += 1
            self._progress_bus.emit(
                job_id,
                {
                    "job_id": job_id,
                    "job_type": "voiceover",
                    "chunk_id": chunk_id,
                    "progress_current": progress_current,
                    "progress_total": progress_total,
                    "status": "running",
                },
            )
            chapter_segs.setdefault(ch_idx, []).append(audio_bytes)

        # Per-chapter audio stitching (D-13 + D-16). The audio
        # directory is ``{audio_dir}/{job_id}/`` — a per-job
        # subdirectory so concurrent voiceover jobs do not
        # collide on the file system. The ``audio_files`` row stores
        # the absolute path; the F6 download endpoint (Phase 4)
        # reads it.
        for ch_idx, segs in chapter_segs.items():
            wav = self._audio_stitcher.stitch(ch_idx, segs)
            path = self._audio_dir / job_id / f"ch{ch_idx}.wav"
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(wav)
            await self._job_repo.register_audio_file(job_id, ch_idx, str(path), "wav")
            # Phase 4 / DL-01: track the chapter index for the
            # post-stitch ZIP pre-build.
            self._chapter_indices.append(ch_idx)

        # All chapters done → job completed.
        await self._job_repo.update_status(job_id, "completed")
        last_chunk_id = all_chunks[-1][1].chunk_id if all_chunks else None
        self._progress_bus.emit(
            job_id,
            {
                "job_id": job_id,
                "job_type": "voiceover",
                "chunk_id": last_chunk_id,
                "progress_current": progress_current,
                "progress_total": progress_total,
                "status": "completed",
            },
        )

        # Phase 4 / DL-01: pre-build the per-chapter audio ZIP at
        # ``{artifact_dir}/{job_id}/audio.zip``. The combined-
        # workflow orchestrator (plan 04-02) owns its own pre-build
        # because it coordinates the two legs; the per-workflow path
        # here is for ``job_type == 'voiceover'`` only.
        if self._artifact_dir is not None and job["job_type"] == "voiceover":
            from epubtv.application.artifact_service import ArtifactBuilder

            await ArtifactBuilder().build_audio_zip(
                job_id,
                [(c, self._audio_dir / job_id / f"ch{c}.wav") for c in self._chapter_indices],
                self._artifact_dir / job_id / "audio.zip",
            )


__all__ = ["VoiceOverWorkflowService"]


def _chunk_idx_from_id(chunk_id: str) -> int:
    """Extract the ``a{N}`` integer from a D-04 ``vo_ch{X}_a{N}`` chunk_id.

    Returns ``0`` if the chunk_id does not match the D-04 namespace
    (defensive — should not happen for chunks emitted by the
    ``CharacterChunker``).
    """
    last_underscore = chunk_id.rfind("_a")
    if last_underscore == -1:
        return 0
    suffix = chunk_id[last_underscore + 2 :]
    try:
        return int(suffix)
    except ValueError:
        return 0
