"""TranslationWorkflowService — pure-Python translation pipeline (D-04, XLATE-01, XLATE-03).

Phase 2 wires the per-chunk translation loop:
1. Load the job row via ``JobRepoPort.get_job``.
2. Resolve chapters from the persisted EPUB (filtered by
   ``job.chapter_ids`` if set).
3. For each chapter: chunk via ``SentenceChunker`` (D-01 + D-04 namespace).
4. For each chunk: call ``translation_port.translate`` wrapped in
   ``asyncio.wait_for(60)`` with one retry on ``TimeoutError``; on
   second timeout → ``append_chunk(state='failed')`` + ``update_status
   ('failed')`` + emit ``provider_timeout`` envelope.
5. On success: ``append_chunk(state='completed')`` (atomic with
   ``update_last_chunk_id`` — JOBS-04); emit the 6-field progress
   envelope on the ``JobProgressBus`` (F5-AC5).
6. Resume from ``last_chunk_id``: pre-populated completed chunks are
   skipped (D-04 + F5-AC4/F5-AC5).

The service is a pure-Python pipeline: it depends on no globals, only
on the DI'd collaborators. The ``JobOrchestrator`` (D-05) wraps it and
dispatches on ``job_type``. The behaviour gate (D-04) was retired with
the in-process ``MockTranslationAdapter`` move to ``tests/`` — the
production HTTP adapters drive their own failure-injection in tests
and have no slow-mode seam in production.
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import TYPE_CHECKING, Any

from epubtv.domain.chunkers import SentenceChunker

if TYPE_CHECKING:
    from epubtv.adapters.progress.job_progress_bus import JobProgressBus
    from epubtv.application.epub_service import EpubService
    from epubtv.ports.file_store_port import FileStorePort
    from epubtv.ports.job_repo_port import JobRepoPort
    from epubtv.ports.translation_port import TranslationPort


class TranslationWorkflowService:
    """Per-chunk translation pipeline for a single job.

    Receives all collaborators via ``__init__`` (no global imports);
    wireable from the FastAPI lifespan in plan 02-03.
    """

    # XLATE-03: 60s ``asyncio.wait_for`` envelope per chunk; 1 retry on
    # ``TimeoutError``; second timeout → ``provider_timeout`` envelope.
    PROVIDER_TIMEOUT_SECONDS: float = 60.0

    def __init__(
        self,
        *,
        job_repo: JobRepoPort,
        translation_port: TranslationPort,
        progress_bus: JobProgressBus,
        chunker: SentenceChunker,
        epub_service: EpubService,
        file_store: FileStorePort,
        artifact_dir: Path | None = None,
    ) -> None:
        self._job_repo = job_repo
        self._translation_port = translation_port
        self._progress_bus = progress_bus
        self._chunker = chunker
        self._epub_service = epub_service
        self._file_store = file_store
        # Phase 4 / DL-01: when set, the workflow pre-builds
        # ``{artifact_dir}/{job_id}/translated.epub`` at the
        # ``update_status('completed')`` transition. ``None`` for
        # tests that do NOT exercise the download path; the
        # production lifespan wires it via ``settings.artifact_dir``.
        self._artifact_dir = artifact_dir
        # Per-chapter translated text buffer for the EPUB build
        # (chapters accumulate chunks via string concatenation).
        # Reset on every ``run`` call so re-entry does not leak
        # state from a previous job.
        self._translated_chapter_texts: dict[int, str] = {}

    async def run(self, job_id: str) -> None:
        """Run the per-chunk translation loop for ``job_id``.

        Side effects (per chunk):
        - ``asyncio.wait_for(60)`` + single retry on ``TimeoutError``.
        - On success: ``append_chunk(state='completed')`` (atomic with
          ``update_last_chunk_id``) + ``progress_bus.emit`` 6-field envelope.
        - On second timeout: ``append_chunk(state='failed')`` +
          ``update_status('failed')`` + ``progress_bus.emit``
          ``provider_timeout`` envelope; early return.

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
        target_language = job["target_language"]
        # Phase 4 / DL-01: reset the per-chapter buffer for this
        # job so re-entry from a previous failed run does not leak
        # chapter text across job ids.
        self._translated_chapter_texts = {}

        # Resume (D-04): build a set of (chapter_idx, chunk_idx) pairs
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
        all_chunks: list[tuple[int, Any]] = []  # (chapter_idx, Chunk)
        for ch_idx, ch_html in chapters:
            for chunk in self._chunker.chunk(ch_html, source_language, ch_idx):
                all_chunks.append((ch_idx, chunk))
        progress_total = len(all_chunks)
        # progress_current starts at the count of pre-completed chunks
        # (the user-visible bar catches up to the next chunk from there).
        progress_current = sum(1 for (ch, ck) in completed_set)

        for ch_idx, chunk in all_chunks:
            chunk_idx = _chunk_idx_from_id(chunk.chunk_id)
            if (ch_idx, chunk_idx) in completed_set:
                continue  # resume: skip already-done
            chunk_id = chunk.chunk_id

            # Translate with 60s budget + 1 retry on TimeoutError (XLATE-03).
            translated: str | None = None
            for attempt in (1, 2):
                try:
                    translated = await asyncio.wait_for(
                        self._translation_port.translate(
                            chunk_id, chunk.text, source_language, target_language
                        ),
                        timeout=self.PROVIDER_TIMEOUT_SECONDS,
                    )
                    break
                except TimeoutError:
                    if attempt == 2:
                        # Second timeout → mark chunk failed + job failed
                        # + emit provider_timeout envelope.
                        await self._job_repo.append_chunk(job_id, ch_idx, chunk_idx, "failed")
                        await self._job_repo.update_status(job_id, "failed")
                        self._progress_bus.emit(
                            job_id,
                            {
                                "job_id": job_id,
                                "job_type": "translation",
                                "chunk_id": chunk_id,
                                "progress_current": progress_current,
                                "progress_total": progress_total,
                                "status": "failed",
                                "error": "provider_timeout",
                            },
                        )
                        return
                    # else: retry once

            if translated is None:
                # Unreachable: the for loop above either returns a value
                # or returns the function on the second timeout. Keep
                # the type-checker happy.
                return

            # Success: atomic commit (JOBS-04) + 6-field emit (F5-AC5).
            await self._job_repo.append_chunk(job_id, ch_idx, chunk_idx, "completed")
            progress_current += 1
            # Phase 4 / DL-01: append the translated text to the
            # per-chapter buffer for the EPUB pre-build. The buffer
            # order is preserved by ``all_chunks`` being chapter
            # ASC, chunk ASC.
            self._translated_chapter_texts[ch_idx] = (
                self._translated_chapter_texts.get(ch_idx, "") + translated
            )
            self._progress_bus.emit(
                job_id,
                {
                    "job_id": job_id,
                    "job_type": "translation",
                    "chunk_id": chunk_id,
                    "progress_current": progress_current,
                    "progress_total": progress_total,
                    "status": "running",
                },
            )

        # All chapters done → job completed.
        await self._job_repo.update_status(job_id, "completed")
        last_chunk_id = all_chunks[-1][1].chunk_id if all_chunks else None
        self._progress_bus.emit(
            job_id,
            {
                "job_id": job_id,
                "job_type": "translation",
                "chunk_id": last_chunk_id,
                "progress_current": progress_current,
                "progress_total": progress_total,
                "status": "completed",
            },
        )

        # Phase 4 / DL-01: pre-build the translated EPUB at
        # ``{artifact_dir}/{job_id}/translated.epub``. The combined-
        # workflow orchestrator (plan 04-02) owns its own pre-build
        # because it coordinates the two legs; the per-workflow path
        # here is for ``job_type == 'translation'`` only.
        if self._artifact_dir is not None and job["job_type"] == "translation":
            from epubtv.application.artifact_service import ArtifactBuilder

            try:
                book_meta = await self._epub_service.get_metadata(job["epub_id"], self._file_store)
                title = book_meta.get("title") or "Translated"
                author = book_meta.get("author")
            except Exception:
                # Defensive: a malformed / missing EPUB should not
                # block job completion. Fall back to a generic title.
                title, author = "Translated", None
            await ArtifactBuilder().build_translated_epub(
                job_id,
                dict(self._translated_chapter_texts),
                self._artifact_dir / job_id / "translated.epub",
                title=str(title),
                author=str(author) if author else None,
            )


__all__ = ["TranslationWorkflowService"]


def _chunk_idx_from_id(chunk_id: str) -> int:
    """Extract the ``s{N}`` integer from a D-04 ``tx_ch{X}_s{N}`` chunk_id.

    Returns ``0`` if the chunk_id does not match the D-04 namespace
    (defensive — should not happen for chunks emitted by the
    ``SentenceChunker``).
    """
    last_underscore = chunk_id.rfind("_s")
    if last_underscore == -1:
        return 0
    suffix = chunk_id[last_underscore + 2 :]
    try:
        return int(suffix)
    except ValueError:
        return 0
