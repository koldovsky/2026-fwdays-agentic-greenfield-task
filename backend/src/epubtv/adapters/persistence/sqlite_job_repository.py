"""SQLiteJobRepository — async aiosqlite WAL engine + single-writer session factory.

Per RESEARCH Pattern 2 + backend/AGENTS.md §Mandatory gotchas:
- ``create_async_engine("sqlite+aiosqlite:///{db_path}", connect_args=
  {"check_same_thread": False}, pool_pre_ping=True)``;
- ``@event.listens_for(self._engine.sync_engine, "connect")`` injects the
  PRAGMAs on every new raw DBAPI connection (CRITICAL: listen on
  ``sync_engine``, NOT ``engine`` — aiosqlite async engines require this);
- ``async_sessionmaker`` with ``expire_on_commit=False``;
- Production schema apply is via Alembic (NOT ``SQLModel.metadata.create_all`` —
  RESEARCH line 431 comment); the repository does NOT create tables.

Phase 2 implements the full ``JobRepoPort`` CRUD surface:
- ``create_job`` — INSERT into ``jobs``, return uuid4 hex ``id``.
- ``get_job`` — SELECT row by id; return ``None`` if not found.
- ``update_status`` — UPDATE ``jobs.status`` + bump ``updated_at``.
- ``update_last_chunk_id`` — UPDATE ``jobs.last_chunk_id`` + bump ``updated_at``.
- ``append_chunk`` — TWO writes (INSERT into ``job_chunks`` + UPDATE
  ``jobs.last_chunk_id``) inside ONE ``async with session.begin():``
  transaction (JOBS-04 atomicity). Returns the new ``chunk_id`` in the
  D-04 namespace ``{chunk_namespace}_ch{chapter_idx}_s{chunk_idx}``
  (default ``tx_`` for translation; voiceover ``vo_`` lands in Phase 3).
- ``list_chunks`` — SELECT rows from ``job_chunks`` ordered by
  ``created_at`` ASC (used for resume semantics).
- ``count_active`` + ``pop_next_queued`` — worker drain loop helpers
  (FIFO + atomic promotion to ``running``).
- ``list_jobs`` — SPA list view (agent-discretion in CONTEXT.md).

Phase 3 extends the surface with D-10 + D-16:
- ``append_chunk`` gains a ``chunk_split_warning`` kwarg; the
  ``job_chunks.chunk_split_warning`` column (Alembic 0002) is
  populated when the kwarg is set, NULL otherwise.
- ``register_audio_file`` — INSERT into ``audio_files``; returns the
  new uuid4 hex id. ``list_audio_files`` is the read path for the F6
  download endpoint (Phase 4).
"""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import delete, event, func, select, text, update
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from epubtv.adapters.persistence.schema import AudioFile, Job, JobChunk


class SQLiteJobRepository:
    """Async aiosqlite repository with WAL PRAGMAs wired at the connect listener.

    The engine is single-writer across the FastAPI process — ``--workers 1``
    is mandatory (ADR-0005) so no fork races touch it.
    """

    def __init__(self, db_path: str) -> None:
        # Build the async engine. ``check_same_thread=False`` is required for
        # the worker task (A7) — the aiosqlite connection is shared with the
        # FastAPI event loop and occasional ``run_in_executor`` offloads.
        self._engine = create_async_engine(
            f"sqlite+aiosqlite:///{db_path}",
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
        )

        # PRAGMA injection — runs on every new raw DBAPI connection.
        # CRITICAL (RESEARCH §Anti-Patterns): listen on ``engine.sync_engine``,
        # NOT ``engine`` — aiosqlite async engines require this.
        @event.listens_for(self._engine.sync_engine, "connect")
        def _set_sqlite_pragma(dbapi_connection: Any, _connection_record: Any) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA busy_timeout=5000")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        self._session_factory = async_sessionmaker(
            self._engine, class_=AsyncSession, expire_on_commit=False
        )

    @classmethod
    async def create(cls, db_path: str) -> SQLiteJobRepository:
        """Construct the repository.

        Production schema is applied via ``alembic upgrade head`` (NOT
        ``SQLModel.metadata.create_all`` — RESEARCH line 431). The lifespan
        binds an instance via ``SQLiteJobRepository.create(db_path=...)``;
        tests set the per-test ``settings.db_path`` and run the migration
        via a fixture (see ``tests/conftest.py``).
        """
        repo = cls(db_path)
        # Ensure the db_path parent dir exists so the engine can open the file.
        from pathlib import Path

        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        return repo

    async def dispose(self) -> None:
        await self._engine.dispose()

    async def delete_job(self, job_id: str) -> bool:
        """Physically delete the ``jobs`` row + its ``job_chunks`` + ``audio_files``.

        The router (``DELETE /api/v1/jobs/{id}`` — Quick 260710-oih /
        JOBS-06) calls this after first marking the row ``"cancelled"``
        via ``update_status``; the worker supervisor's FIFO helper
        ``pop_next_queued`` filters on ``status == "queued"`` and
        will skip a cancelled row on its next tick. The row + all
        associated ``job_chunks`` + ``audio_files`` are wiped in one
        ``async with session.begin():`` transaction so a crash
        mid-delete rolls back the whole wipe (atomicity mirrors
        ``append_chunk``'s JOBS-04 invariant).

        Returns ``True`` if a row was found and deleted, ``False`` if
        the id was unknown (no-op, no error). The existence check is
        done with a single ``SELECT`` BEFORE the transaction so the
        return value is correct even if no DELETE matches.

        No FK constraints on ``job_chunks.job_id`` /
        ``audio_files.job_id`` per the ``schema.py`` comment (the FK
        is intentionally not declared for hackathon-sprint
        simplicity), so the three DELETEs in cascade order
        (AudioFile → JobChunk → Job) are safe regardless of the
        current PRAGMA ``foreign_keys`` setting.
        """
        async with self._session_factory() as session:
            existing = await session.get(Job, job_id)
        if existing is None:
            return False
        async with self._session_factory() as session, session.begin():
            # Cascade order: AudioFile → JobChunk → Job (audit log
            # readability — the dependent rows are removed before
            # the parent so the resulting "deletion burst" reads
            # in a natural top-down order).
            await session.execute(
                delete(AudioFile)
                # pyrefly: ignore [bad-argument-type]
                .where(AudioFile.job_id == job_id)
            )
            await session.execute(
                delete(JobChunk)
                # pyrefly: ignore [bad-argument-type]
                .where(JobChunk.job_id == job_id)
            )
            await session.execute(
                delete(Job)
                # pyrefly: ignore [bad-argument-type]
                .where(Job.id == job_id)
            )
        return True

    async def verify_pragmas(self) -> dict[str, str]:
        """Return ``{pragma_name: value_as_str}`` for the WAL/FK/timeout pragmas."""
        async with self._engine.connect() as conn:
            journal_mode = (await conn.execute(text("PRAGMA journal_mode"))).scalar()
            busy_timeout = (await conn.execute(text("PRAGMA busy_timeout"))).scalar()
            synchronous = (await conn.execute(text("PRAGMA synchronous"))).scalar()
            foreign_keys = (await conn.execute(text("PRAGMA foreign_keys"))).scalar()
        return {
            "journal_mode": str(journal_mode),
            "busy_timeout": str(busy_timeout),
            "synchronous": str(synchronous),
            "foreign_keys": str(foreign_keys),
        }

    # --- JobRepoPort surface (Phase 2 implementation) -------------------------

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
        """Persist a new job row, returning the new uuid4 hex ``id``.

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
        job_id = uuid.uuid4().hex
        now = datetime.now(UTC)
        async with self._session_factory() as session, session.begin():
            session.add(
                Job(
                    id=job_id,
                    epub_id=epub_id,
                    job_type=job_type,
                    status="queued",
                    source_language=source_language,
                    target_language=target_language,
                    chapter_ids=json.dumps(chapter_ids),
                    last_chunk_id=None,
                    voice=voice,
                    provider=provider,
                    model=model,
                    created_at=now,
                    updated_at=now,
                )
            )
        return job_id

    async def get_job(self, job_id: str) -> dict[str, Any] | None:
        """Return one job row as a dict, or ``None`` if not found.

        ``chapter_ids`` is JSON-decoded back to a list (the storage layer
        keeps it as a JSON-encoded TEXT column for SQLite affinity).
        """
        async with self._session_factory() as session:
            row = await session.get(Job, job_id)
        if row is None:
            return None
        return _job_to_dict(row)

    async def update_status(self, job_id: str, status: str) -> None:
        """Mutate the ``status`` column on ``jobs``; bumps ``updated_at``.

        No-op (no error) if ``job_id`` is unknown — the UPDATE simply
        affects zero rows. Direct UPDATE avoids a SELECT round-trip.
        """
        now = datetime.now(UTC)
        async with self._session_factory() as session, session.begin():
            await session.execute(
                update(Job)
                # pyrefly: ignore [bad-argument-type]
                .where(Job.id == job_id)
                .values(status=status, updated_at=now)
            )

    async def update_last_chunk_id(self, job_id: str, last_chunk_id: str) -> None:
        """Mutate the ``last_chunk_id`` column; bumps ``updated_at``.

        No-op (no error) if ``job_id`` is unknown.
        """
        now = datetime.now(UTC)
        async with self._session_factory() as session, session.begin():
            await session.execute(
                update(Job)
                # pyrefly: ignore [bad-argument-type]
                .where(Job.id == job_id)
                .values(last_chunk_id=last_chunk_id, updated_at=now)
            )

    async def append_chunk(
        self,
        job_id: str,
        chapter_idx: int,
        chunk_idx: int,
        state: str,
        chunk_namespace: str = "tx",
        chunk_split_warning: str | None = None,
    ) -> str:
        """Append a ``job_chunks`` row AND advance ``jobs.last_chunk_id`` atomically.

        JOBS-04: both writes share one ``async with session.begin():``
        transaction. A crash between the two writes rolls back BOTH — the
        chunk row is absent AND ``last_chunk_id`` is unchanged, so resume
        starts at the start of the incomplete sentence (D-04).

        Returns the new ``chunk_id`` in the D-04 namespace:
        - ``chunk_namespace="tx"`` (Phase 2 default) →
          ``tx_ch{chapter_idx}_s{chunk_idx}`` (translation invariant).
        - ``chunk_namespace="vo"`` (Phase 3 voiceover) →
          ``vo_ch{chapter_idx}_a{chunk_idx}`` (D-04 voiceover contract).
        - any other value → ``ValueError`` (loud failure — a future
          namespace addition is a deliberate change, not silent).

        The ``chunk_split_warning`` kwarg (Phase 3 / D-10) writes the
        ``CharacterChunker`` tier-3 hard-cut warning to the
        ``job_chunks.chunk_split_warning`` column (Alembic 0002). The
        default ``None`` writes NULL — Phase 2 callers and tier-1 /
        tier-2 voiceover chunks all get NULL. The column is shared
        across translation + voiceover namespaces; both workflows
        can write to it.
        """
        if chunk_namespace == "tx":
            chunk_id = f"tx_ch{chapter_idx}_s{chunk_idx}"
        elif chunk_namespace == "vo":
            chunk_id = f"vo_ch{chapter_idx}_a{chunk_idx}"
        else:
            raise ValueError(f"unknown chunk_namespace {chunk_namespace!r}; expected 'tx' or 'vo'")
        now = datetime.now(UTC)
        async with self._session_factory() as session, session.begin():
            session.add(
                JobChunk(
                    id=chunk_id,
                    job_id=job_id,
                    chapter_idx=chapter_idx,
                    chunk_idx=chunk_idx,
                    state=state,
                    chunk_split_warning=chunk_split_warning,
                    created_at=now,
                )
            )
            await session.execute(
                update(Job)
                # pyrefly: ignore [bad-argument-type]
                .where(Job.id == job_id)
                .values(last_chunk_id=chunk_id, updated_at=now)
            )
        return chunk_id

    async def list_chunks(self, job_id: str) -> list[dict[str, Any]]:
        """List chunk rows for a job ordered by creation time ASC.

        Used by ``TranslationWorkflowService`` / ``VoiceOverWorkflowService``
        for resume semantics: the worker builds a ``completed_set``
        from rows with ``state='completed'`` and skips those chunks
        in the next pass. The dict shape includes ``chunk_split_warning``
        (Phase 3 / D-10; ``None`` for chunks that were not split by
        the hard-cut tier).
        """
        async with self._session_factory() as session:
            result = await session.execute(
                select(JobChunk)
                # pyrefly: ignore [bad-argument-type]
                .where(JobChunk.job_id == job_id)
                # pyrefly: ignore [missing-attribute]
                .order_by(JobChunk.created_at.asc())
            )
            rows = result.scalars().all()
        return [_chunk_to_dict(r) for r in rows]

    async def register_audio_file(
        self,
        job_id: str,
        chapter: int,
        file_path: str,
        fmt: str = "wav",
    ) -> str:
        """Insert an ``audio_files`` row (D-16), returning the new uuid4 hex id.

        The ``fmt`` kwarg defaults to ``"wav"`` (sprint path per D-13)
        but the column is permissive — Phase 4 may write ``"mp3"``
        for F6 download conversions. The row is a side-effect of
        ``VoiceOverWorkflowService.run`` after the per-chapter WAV
        stitch; the F6 download endpoint (Phase 4) reads these rows.
        """
        audio_id = uuid.uuid4().hex
        async with self._session_factory() as session, session.begin():
            session.add(
                AudioFile(
                    id=audio_id,
                    job_id=job_id,
                    chapter=chapter,
                    file_path=file_path,
                    fmt=fmt,
                )
            )
        return audio_id

    async def list_audio_files(self, job_id: str) -> list[dict[str, Any]]:
        """List audio rows for a job, ordered by chapter ASC (F6 download path).

        Returns an empty list for an unknown job_id (no rows, no error).
        Phase 3 only writes rows; the read path is Phase 4.
        """
        async with self._session_factory() as session:
            result = await session.execute(
                select(AudioFile)
                # pyrefly: ignore [bad-argument-type]
                .where(AudioFile.job_id == job_id)
                # pyrefly: ignore [missing-attribute]
                .order_by(AudioFile.chapter.asc())
            )
            rows = result.scalars().all()
        return [_audio_to_dict(r) for r in rows]

    # --- Worker drain loop helpers (NOT on the ``JobRepoPort`` protocol) ------

    async def count_active(self) -> int:
        """Count rows with ``status='running'`` (worker MAX_ACTIVE gate)."""
        async with self._session_factory() as session:
            result = await session.execute(
                select(func.count())
                .select_from(Job)
                # pyrefly: ignore [bad-argument-type]
                .where(Job.status == "running")
            )
            return int(result.scalar_one())

    async def pop_next_queued(self) -> dict[str, Any] | None:
        """Return the oldest queued row (FIFO) and promote it to ``running``.

        Both the SELECT and the UPDATE share ONE ``async with
        session.begin():`` transaction so a concurrent worker cannot grab
        the same row. Returns ``None`` when the queue is empty.
        """
        now = datetime.now(UTC)
        async with self._session_factory() as session, session.begin():
            result = await session.execute(
                select(Job)
                # pyrefly: ignore [bad-argument-type]
                .where(Job.status == "queued")
                # pyrefly: ignore [missing-attribute]
                .order_by(Job.created_at.asc())
                .limit(1)
            )
            row = result.scalar_one_or_none()
            if row is None:
                return None
            await session.execute(
                update(Job)
                # pyrefly: ignore [bad-argument-type]
                .where(Job.id == row.id)
                .values(status="running", updated_at=now)
            )
            return _job_to_dict(row)

    async def mark_orphaned_running_as_failed(self) -> list[str]:
        """Sweep ``status='running'`` rows to ``status='failed'`` and return the swept ids.

        Worker-queue-stuck-after-first-job fix: a workflow can die
        (container restart, OOM kill, signal, an unhandled exception
        that bypasses ``_safe_dispatch``) and leave its row in
        ``running`` state. Without recovery, the supervisor's
        ``count_active()`` permanently reads 1, the ``active <
        MAX_ACTIVE`` guard never opens, and the queue stalls.

        ``worker_supervisor`` calls this ONCE on startup, BEFORE the
        first ``count_active`` poll, so any orphan from the previous
        process is cleared before the new process starts dispatching.

        The sweep is idempotent: it only touches ``running`` rows
        (queued / completed / failed / cancelled rows are left alone).
        The SELECT + UPDATE share one ``async with session.begin():``
        transaction so a concurrent worker that is genuinely running
        a job and racing the sweep (extremely unlikely — the supervisor
        is in startup, no workflow is in flight yet) sees a consistent
        snapshot. The returned list is the set of ids the sweep
        transitioned (the operator log surfaces this for postmortem).
        """
        now = datetime.now(UTC)
        async with self._session_factory() as session, session.begin():
            result = await session.execute(
                select(Job.id)
                # pyrefly: ignore [bad-argument-type]
                .where(Job.status == "running")
            )
            orphan_ids = [row[0] for row in result.all()]
            if orphan_ids:
                await session.execute(
                    update(Job)
                    # pyrefly: ignore [bad-argument-type]
                    .where(Job.status == "running")
                    .values(status="failed", updated_at=now)
                )
        return orphan_ids

    # --- SPA list view (agent-discretion in CONTEXT.md) -----------------------

    async def list_jobs(self, limit: int = 50) -> list[dict[str, Any]]:
        """Return rows ordered by ``created_at`` DESC for the SPA list view."""
        async with self._session_factory() as session:
            result = await session.execute(
                select(Job)
                # pyrefly: ignore [missing-attribute]
                .order_by(Job.created_at.desc())
                .limit(limit)
            )
            rows = result.scalars().all()
        return [_job_to_dict(r) for r in rows]


def _job_to_dict(row: Job) -> dict[str, Any]:
    """Convert a ``Job`` row to a dict with JSON-decoded ``chapter_ids``.

    The ``voice`` field (Phase 3 / D-06) is ``None`` for translation
    jobs and the chosen voice name for voiceover jobs. The
    ``VoiceOverWorkflowService`` reads it via ``job["voice"]``.

    The ``provider`` + ``model`` fields (Phase 1 / BACK-09) are
    ``None`` for v1.1 legacy rows (loadable but undispatchable per
    the orchestrator's 422 guard) and populated for every new job.
    The ``JobOrchestrator.dispatch(...)`` reads them via
    ``job["provider"]`` to dispatch to the matching per-provider
    subworkflow.
    """
    return {
        "id": row.id,
        "epub_id": row.epub_id,
        "job_type": row.job_type,
        "status": row.status,
        "source_language": row.source_language,
        "target_language": row.target_language,
        "chapter_ids": json.loads(row.chapter_ids),
        "last_chunk_id": row.last_chunk_id,
        "voice": row.voice,
        "provider": row.provider,
        "model": row.model,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def _chunk_to_dict(row: JobChunk) -> dict[str, Any]:
    """Convert a ``JobChunk`` row to a dict.

    The ``chunk_split_warning`` field (Phase 3 / D-10) is ``None`` for
    chunks that were not split by the ``CharacterChunker`` tier-3
    hard-cut; the resume semantics treat it as informational only
    (the worker's ``completed_set`` is keyed on ``(chapter_idx, chunk_idx, state)``,
    not on the warning value).
    """
    return {
        "id": row.id,
        "job_id": row.job_id,
        "chapter_idx": row.chapter_idx,
        "chunk_idx": row.chunk_idx,
        "state": row.state,
        "chunk_split_warning": row.chunk_split_warning,
        "created_at": row.created_at,
    }


def _audio_to_dict(row: AudioFile) -> dict[str, Any]:
    """Convert an ``AudioFile`` row to a dict (D-16 / F6 download path)."""
    return {
        "id": row.id,
        "job_id": row.job_id,
        "chapter": row.chapter,
        "file_path": row.file_path,
        "fmt": row.fmt,
    }


# Re-export for typing convenience (matches JobRepoPort surface).
__all__ = ["SQLiteJobRepository"]
