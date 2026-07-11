"""JobRepoPort — seam for job-state persistence (Phase 1+).

Phase 1 ships ``SQLiteJobRepository`` as the implementation (WAL engine,
single-writer session factory per RESEARCH Pattern 2). The port surface
declares the CRUD operations Phase 2 expects; Phase 1 only exercises the
schema-init path via Alembic migration ``0001_initial.py``.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class JobRepoPort(Protocol):
    """Async job-state repository seam (single-writer WAL engine)."""

    async def create_job(
        self,
        epub_id: str,
        job_type: str,
        chapter_ids: list[str],
        source_language: str | None = None,
        target_language: str | None = None,
        voice: str | None = None,
        provider: str | None = None,
        model: str | None = None,
    ) -> str:
        """Persist a new job row, returning the new ``job_id``.

        The ``voice`` kwarg (Phase 3 / D-06) is required for
        ``job_type='voiceover'`` jobs (the router preflight
        validates ``voice in VOICES`` — the canonical OpenAI
        voice list). It is ``None`` for translation jobs.

        The ``provider`` + ``model`` kwargs (Phase 1 / BACK-09) are
        required for every new job (the Pydantic discriminated union's
        per-variant ``extra="forbid"`` enforces them on every
        variant; the router forwards them from the request body).
        They are ``None`` only for v1.1 legacy rows that pre-date
        the schema change (the orchestrator returns 422 for them per
        BACK-10's legacy-row branch).
        """
        ...

    async def get_job(self, job_id: str) -> dict[str, Any] | None:
        """Return one job row as a dict, or ``None`` if not found."""
        ...

    async def update_status(self, job_id: str, status: str) -> None:
        """Mutate the ``status`` column on ``jobs``."""
        ...

    async def update_last_chunk_id(self, job_id: str, last_chunk_id: str) -> None:
        """Persist ``last_chunk_id`` for resume (Phase 4 surface; Phase 2 uses)."""
        ...

    async def append_chunk(
        self,
        job_id: str,
        chapter_idx: int,
        chunk_idx: int,
        state: str,
        chunk_namespace: str = "tx",
        chunk_split_warning: str | None = None,
    ) -> str:
        """Append a ``job_chunks`` row, returning the new ``chunk_id``.

        The ``chunk_namespace`` kwarg is the D-04 seam that lets the
        voiceover workflow (plan 03-02) emit ``vo_ch{N}_a{M}`` chunk_ids
        while the Phase 2 translation path continues to produce
        ``tx_ch{N}_s{M}``. The default ``"tx"`` keeps every Phase 2
        caller working without modification. The
        ``backend/src/epubtv/adapters/persistence/sqlite_job_repository.py``
        formatter is namespace-aware: ``"tx"`` → ``tx_ch{N}_s{M}``,
        ``"vo"`` → ``vo_ch{N}_a{M}``; any other value raises
        ``ValueError`` (loud failure, not silent).

        The ``chunk_split_warning`` kwarg (Phase 3 / D-10) carries the
        ``CharacterChunker`` tier-3 hard-cut warning string for
        chunks that were split by force at the 4096-char budget. The
        default ``None`` keeps Phase 2 callers working without
        modification. The column is shared across translation +
        voiceover namespaces; both workflows can write to it.
        """
        ...

    async def list_chunks(self, job_id: str) -> list[dict[str, Any]]:
        """List chunk rows for a job ordered by creation time."""
        ...

    async def register_audio_file(
        self,
        job_id: str,
        chapter: int,
        file_path: str,
        fmt: str = "wav",
    ) -> str:
        """Insert an ``audio_files`` row, returning the new uuid4 hex ``id``.

        Phase 3 / D-16: ``VoiceOverWorkflowService`` writes one row
        per stitched chapter WAV. The F6 download endpoint (Phase 4)
        reads these rows. ``fmt`` is not enum-constrained so the
        column accepts ``"wav"`` (sprint) or future ``"mp3"`` paths.
        """
        ...

    async def list_audio_files(self, job_id: str) -> list[dict[str, Any]]:
        """List audio rows for a job, ordered by chapter ASC (F6 download path)."""
        ...

    async def dispose(self) -> None:
        """Dispose the engine and any pooled connections."""
        ...

    async def delete_job(self, job_id: str) -> bool:
        """Physically delete the ``jobs`` row + its ``job_chunks`` + its
        ``audio_files`` in one transaction.

        Returns ``True`` if the row existed (and was deleted),
        ``False`` if the id was unknown (no-op, no error). The router
        uses this for the ``DELETE /api/v1/jobs/{id}`` cancel surface
        (Quick 260710-oih / JOBS-06): the SPA's "Cancel" button calls
        the endpoint; the router first calls ``update_status(
        job_id, "cancelled")`` (so the worker's FIFO helper skips
        the row on its next tick) and then ``delete_job(job_id)`` to
        wipe the row + its associated chunks + audio files.
        """
        ...

    async def mark_orphaned_running_as_failed(self) -> list[str]:
        """Sweep ``status='running'`` rows to ``status='failed'`` and return the swept ids.

        Worker-queue-stuck-after-first-job fix: a workflow can die
        (container restart, OOM kill, signal, an unhandled exception
        that bypasses ``_safe_dispatch``) and leave its row in
        ``running`` state. Without recovery, the supervisor's
        ``count_active()`` permanently reads 1, the ``active <
        MAX_ACTIVE`` guard never opens, and the queue stalls.

        The supervisor calls this ONCE on startup, BEFORE the first
        ``count_active`` poll, so any orphan from the previous
        process is cleared before the new process starts dispatching.

        The sweep is idempotent: it only touches ``running`` rows.
        Returns the list of ids the sweep transitioned (for
        postmortem logging).
        """
        ...

    # Convenience helper for the PRAGMA unit test (Task 2) --------------------
    async def verify_pragmas(self) -> dict[str, str]:
        """Return ``{pragma_name: value_as_str}`` for the WAL / FK / timeout pragmas."""
        ...


# Re-export datetime for downstream typing convenience without extra import.
__all__ = ["JobRepoPort", "datetime"]
