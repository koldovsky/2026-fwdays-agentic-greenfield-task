"""SQLModel table definitions for ``jobs`` / ``job_chunks`` / ``audio_files``.

Phase 1 creates all three tables via Alembic migration ``0001_initial.py``
and the runtime ``SQLiteJobRepository`` ships the same PRAGMA posture
(Pattern 2). Phase 1 writes NO rows — the upload endpoint (Plan 02) persists
to scratch only; Phase 2 writes the first ``jobs`` row.

Per architecture.md §Persistence contract: ``job_type`` is ONE column on
``jobs`` and is the discriminator driving ``JobOrchestrator`` dispatch +
request validation + progress event shape + export artifact kind.

Column types align with SQLModel field types so ``alembic autogenerate``
sees a stable diff (no surprise ALTERs).

Phase 1 plan 01: the runtime provider-mode toggle is gone; the
in-process ``Mock*Adapter`` is the only composition-root binding at
startup.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import PrimaryKeyConstraint
from sqlmodel import Field, SQLModel


def _now_utc() -> datetime:
    """Return tz-aware UTC now — single source for ``created_at`` / ``updated_at``."""
    return datetime.now(UTC)


class Job(SQLModel, table=True):
    """Job row — drives ``JobOrchestrator`` dispatch on ``job_type``."""

    # pyrefly: ignore [bad-override]
    __tablename__ = "jobs"

    id: str = Field(primary_key=True)
    epub_id: str = Field(index=True, foreign_key=None)  # FK to scratch artifact id
    job_type: str = Field(index=True)  # translation | voiceover | translation+voiceover
    status: str = Field(default="queued", index=True)  # queued|running|succeeded|failed|cancelled
    target_language: str | None = Field(default=None)
    source_language: str | None = Field(default=None)
    # JSON-encoded list of chapter_ids (locked once via Pattern 3 in Plan 02).
    chapter_ids: str = Field(default="[]")
    last_chunk_id: str | None = Field(default=None)
    # Phase 3 / D-06: voiceover jobs carry the chosen voice name (set at
    # job creation by the router preflight — the only authoritative
    # source per D-06; the workflow reads it via ``job["voice"]``).
    # NULL for translation jobs; required (Pydantic ``min_length=1``)
    # for voiceover jobs.
    voice: str | None = Field(default=None)
    # Phase 1 / BACK-09: persisted provider + model so the orchestrator
    # (BACK-10) can read the stored provider and dispatch to the matching
    # per-provider subworkflow (``OllamaTranslationWorkflow`` /
    # ``OpenAITranslationWorkflow`` / ``OpenAIVoiceoverWorkflow``).
    # Both columns are nullable for the v1.1 back-compat (the legacy
    # rows have neither; the orchestrator returns 422 for them).
    # ``provider`` is indexed because the orchestrator dispatch keys on
    # it; ``model`` is not indexed (not a query key).
    provider: str | None = Field(default=None, index=True)
    model: str | None = Field(default=None)
    # tz-aware UTC timestamps (stored as ISO strings via SQLite TEXT affinity).
    created_at: datetime = Field(default_factory=_now_utc)
    updated_at: datetime = Field(default_factory=_now_utc)


class JobChunk(SQLModel, table=True):
    """Per-chunk row — written by translation / TTS workflows in Phase 2/3.

    The primary key is the COMPOSITE ``(job_id, id)`` — the D-04
    namespace chunk_id ``tx_ch{CHAPTER}_s{CHUNK}`` (or
    ``vo_ch{CHAPTER}_a{CHUNK}`` for voiceover) is the same across
    jobs targeting the same chapter / sentence. The natural key
    is the tuple; ``id`` alone is NOT unique by construction
    (Phase 4 follow-up to the worker-queue-stuck-after-first-job
    bug — the second job for the same EPUB was hitting
    ``UNIQUE constraint failed: job_chunks.id`` on its first
    chunk). The Alembic migration ``0003_job_chunks_composite_pk``
    swaps the single-column PK for the composite PK.
    """

    # pyrefly: ignore [bad-override]
    __tablename__ = "job_chunks"
    # pyrefly: ignore [bad-override]
    __table_args__ = (PrimaryKeyConstraint("job_id", "id", name="pk_job_chunks"),)

    # ``id`` is part of the composite PK but SQLModel needs
    # ``primary_key=True`` on at least one column to model it;
    # the ``__table_args__`` constraint above is the source of
    # truth. ``index=True`` keeps the ``job_id`` column indexed
    # for non-PK ``WHERE job_id=`` queries.
    id: str
    job_id: str = Field(index=True)
    chapter_idx: int = Field(default=0)
    chunk_idx: int = Field(default=0)
    state: str = Field(default="pending")  # pending|running|succeeded|failed
    # Phase 3 / D-10: tier-3 hard-cut chunks carry a warning string.
    # NULL = normal chunk (tier 1 or tier 2 split). The column is
    # shared across translation + voiceover chunk namespaces; both
    # workflows can write to it.
    chunk_split_warning: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=_now_utc)


class AudioFile(SQLModel, table=True):
    """Audio artifact row — written by VoiceOverWorkflowService in Phase 3."""

    # pyrefly: ignore [bad-override]
    __tablename__ = "audio_files"

    id: str = Field(primary_key=True)
    job_id: str = Field(index=True)
    chapter: int = Field(default=0)
    file_path: str = Field(default="")
    fmt: str = Field(default="wav")  # mock returns WAV to avoid MP3 encoder delay (CONVENTIONS.md)
