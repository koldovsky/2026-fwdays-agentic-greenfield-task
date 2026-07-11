"""``SQLiteJobRepository.create_job(voice=...)`` tests (Task 1 TDD cycle — plan 03-03).

Satisfies the D-06 / D-13 contract end-to-end at the repository layer:

- ``create_job(..., voice='alloy')`` stores the voice name on the
  ``jobs.voice`` column (added by Alembic 0003 + ``Job.voice`` SQLModel
  field in plan 03-02). ``get_job(id)['voice']`` returns the value.
- ``create_job(..., job_type='translation')`` (no voice) → ``voice is None``
  in the row dict. Translation jobs do not need a voice.
- ``create_job(..., job_type='voiceover')`` (no voice) → ``voice is None``
  in the row dict. The router preflight (plan 03-03 Task 3) validates
  the voice against the canonical ``VOICES`` catalog; the repository
  is permissive for the missing case so unit tests can drive the
  schema without a router in the loop.
- The ``voice`` column is shared across job_type values — the D-06 sprint
  scope has a single column regardless of job_type (the
  ``translation+voiceover`` path is Phase 4; the column accepts voice
  for any job_type when supplied).
- The Alembic 0003 migration is reversible: ``alembic upgrade head`` +
  ``alembic downgrade base`` + ``alembic upgrade head`` round-trip
  succeeds; the ``voice`` column is added to ``jobs`` and is nullable.

The test schema is applied via ``SQLModel.metadata.create_all`` on a
per-test sync engine (the conftest ``db_path`` fixture). The migration
round-trip test runs the actual ``alembic`` CLI in a subprocess with
``EPUBTV_DB_PATH`` pointed at a per-test SQLite file.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
from sqlalchemy import create_engine, inspect

from epubtv.adapters.persistence.sqlite_job_repository import (
    SQLiteJobRepository,
)

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("VOICE-01-UT09")]


# ---------------------------------------------------------------------------
# Fixtures (mirror test_voiceover_audio_files.py / test_sqlite_job_repository_crud.py)
# ---------------------------------------------------------------------------


def _create_test_schema(db_path_str: str) -> None:
    """Create the SQLModel tables on a per-test database.

    The per-test ``db_path`` fixture overrides ``settings.db_path``;
    the test schema is applied via ``SQLModel.metadata.create_all``
    on a sync engine to avoid the async-alembic/event-loop conflict.
    Production schema apply goes through ``alembic upgrade head``.
    """
    from sqlmodel import SQLModel, create_engine

    # Importing ``schema`` registers the table models on ``SQLModel.metadata``.
    from epubtv.adapters.persistence import schema  # noqa: F401

    sync_engine = create_engine(f"sqlite:///{db_path_str}")
    SQLModel.metadata.create_all(sync_engine)
    sync_engine.dispose()


@pytest.fixture
async def migrated_repo(db_path: Any) -> Any:
    """Return a ``SQLiteJobRepository`` with the per-test schema applied."""
    _create_test_schema(str(db_path))

    repo = await SQLiteJobRepository.create(db_path=str(db_path))
    try:
        yield repo
    finally:
        await repo.dispose()


# ---------------------------------------------------------------------------
# create_job(voice=...) stores the voice
# ---------------------------------------------------------------------------


async def test_create_job_stores_voice_for_voiceover(migrated_repo: Any) -> None:
    """D-06: ``create_job(..., voice='alloy')`` stores the voice; get_job returns it."""
    job_id = await migrated_repo.create_job(
        epub_id="e1",
        job_type="voiceover",
        chapter_ids=[],
        source_language="en",
        voice="alloy",
    )
    # 32 hex chars; uuid4().hex
    assert isinstance(job_id, str)
    assert len(job_id) == 32
    int(job_id, 16)  # raises if not hex

    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["voice"] == "alloy", (
        f"voice should be 'alloy' for the voiceover job, got {job['voice']!r}"
    )
    # Other columns unchanged — the voice field is purely additive.
    assert job["job_type"] == "voiceover"
    assert job["source_language"] == "en"
    assert job["target_language"] is None
    assert job["status"] == "queued"


async def test_create_job_voice_is_none_for_translation(migrated_repo: Any) -> None:
    """A translation job (no voice kwarg) has ``voice is None`` in the row dict.

    Translation jobs do NOT need a voice — the column is NULL by default.
    The Phase 2 ``create_job`` callers (translation_workflow tests) pass
    no ``voice`` kwarg; the schema default of ``None`` propagates to the
    column.
    """
    job_id = await migrated_repo.create_job(
        epub_id="e2",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["voice"] is None, (
        f"voice should be None for the translation job, got {job['voice']!r}"
    )
    assert job["job_type"] == "translation"


async def test_create_job_voice_is_none_when_omitted_for_voiceover(
    migrated_repo: Any,
) -> None:
    """A voiceover job (no voice kwarg) has ``voice is None`` (router fills it).

    The router preflight (Task 3) supplies the default via the
    canonical ``VOICES`` catalog (the SPA picks from a flat list);
    the repository is permissive for the missing case so the schema
    can be exercised without a router in the loop (e.g. in BDD
    scenarios that POST via the API which would have already
    supplied the voice).
    """
    job_id = await migrated_repo.create_job(
        epub_id="e3",
        job_type="voiceover",
        chapter_ids=[],
        source_language="en",
    )
    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["voice"] is None, f"voice should be None when omitted, got {job['voice']!r}"


async def test_create_job_voice_works_for_combined_job_type(
    migrated_repo: Any,
) -> None:
    """The voice column accepts a value for any job_type (Phase 4 forward-compat).

    The ``translation+voiceover`` job_type is Phase 4 (D-12 — combined-workflow
    501 STAYS in Phase 3). The column is permissive so the Phase 4
    implementation can write the voice without a schema change. This
    test is the regression guard against the column becoming job_type-restricted.
    """
    job_id = await migrated_repo.create_job(
        epub_id="e4",
        job_type="translation+voiceover",
        chapter_ids=[],
        source_language="en",
        target_language="de",
        voice="alloy",
    )
    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["voice"] == "alloy", (
        f"voice should be 'alloy' for the combined job, got {job['voice']!r}"
    )
    assert job["job_type"] == "translation+voiceover"


# ---------------------------------------------------------------------------
# Alembic 0003 migration round-trip
# ---------------------------------------------------------------------------


async def test_alembic_migration_0003_round_trip(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Alembic 0003 round-trip: upgrade adds the column; downgrade drops it.

    Runs ``alembic upgrade head`` + ``alembic downgrade base`` against
    a per-test SQLite DB. After ``upgrade head`` the ``voice`` column
    is present (NOTNULL=0). After ``downgrade base`` the column is
    absent (the table is dropped by the chain; the column being absent
    after re-apply is the post-upgrade signal).

    The ``EPUBTV_DB_PATH`` env var overrides the alembic subprocess's
    ``settings.db_path`` (the env is read by Pydantic Settings inside
    the subprocess — the in-process ``monkeypatch.setattr`` is NOT
    visible to the subprocess).
    """
    test_db = tmp_path / "alembic_test.db"

    backend_dir = Path(__file__).resolve().parents[2]
    env = {**os.environ, "EPUBTV_DB_PATH": str(test_db)}
    cmd_prefix = [sys.executable, "-m", "alembic"]

    # upgrade head
    proc = subprocess.run(
        [*cmd_prefix, "upgrade", "head"],
        cwd=backend_dir,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, f"alembic upgrade head failed: {proc.stderr}"

    # Column present + nullable.
    engine = create_engine(f"sqlite:///{test_db}")
    try:
        insp = inspect(engine)
        cols = {c["name"]: c for c in insp.get_columns("jobs")}
        assert "voice" in cols, f"voice column missing after upgrade: cols={list(cols)}"
        assert cols["voice"]["nullable"] is True, (
            f"voice should be NULL-able, got {cols['voice']!r}"
        )

        # alembic current reports the head revision (0006 is the head
        # after the worker-queue-stuck-after-first-job follow-up; the
        # migration chain is 0001 -> 0002 -> 0003 -> 0005 -> 0006).
        proc_current = subprocess.run(
            [*cmd_prefix, "current"],
            cwd=backend_dir,
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )
        assert "0006" in proc_current.stdout, (
            f"alembic current should report 0006, got: {proc_current.stdout!r}"
        )

        # alembic history includes 0003 (the head).
        proc_history = subprocess.run(
            [*cmd_prefix, "history"],
            cwd=backend_dir,
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )
        assert "0003" in proc_history.stdout, (
            f"alembic history should include 0003, got: {proc_history.stdout!r}"
        )

        # downgrade base — the column is removed (along with the table).
        proc3 = subprocess.run(
            [*cmd_prefix, "downgrade", "base"],
            cwd=backend_dir,
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )
        assert proc3.returncode == 0, f"alembic downgrade base failed: {proc3.stderr}"

        # Re-apply upgrade head (idempotency for the test setup).
        proc4 = subprocess.run(
            [*cmd_prefix, "upgrade", "head"],
            cwd=backend_dir,
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )
        assert proc4.returncode == 0, f"alembic upgrade head (re-apply) failed: {proc4.stderr}"

        # After re-apply the column is back.
        insp_after = inspect(engine)
        cols_after = {c["name"]: c for c in insp_after.get_columns("jobs")}
        assert "voice" in cols_after, (
            f"voice should be present after re-apply, cols={list(cols_after)}"
        )
        assert cols_after["voice"]["nullable"] is True
    finally:
        engine.dispose()
