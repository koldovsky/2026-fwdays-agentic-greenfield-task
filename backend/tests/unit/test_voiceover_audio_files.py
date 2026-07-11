"""Voiceover audio_files table + chunk_split_warning column tests (Task 1 TDD cycle).

Satisfies D-10 (atomic per-chunk commit + ``chunk_split_warning`` column)
+ D-16 (``audio_files`` row writes for F6 download path).

The test suite locks the seam between the Phase 3 SQLModel column
addition + the Alembic 0002 migration:

- ``append_chunk(..., chunk_namespace='vo', chunk_split_warning='...')``
  writes the warning to the new column. ``list_chunks`` returns it
  in the dict.
- The default ``chunk_split_warning=None`` writes NULL (the test
  asserts ``list_chunks`` returns ``None`` for the warning).
- The column is shared across translation + voiceover namespaces:
  ``append_chunk(..., chunk_namespace='tx', chunk_split_warning='...')``
  works the same way. Phase 2 callers that pass no ``chunk_split_warning``
  kwarg get NULL.
- ``register_audio_file(job_id, chapter, file_path, fmt='wav')`` inserts
  an ``AudioFile`` row and returns a uuid4 hex id. ``list_audio_files``
  returns the row.
- The ``fmt`` kwarg accepts non-default values (``'mp3'``) — the sprint
  path is WAV per D-13 but the column is permissive for Phase 4.
- The Alembic 0002 migration is reversible: ``alembic upgrade head``
  + ``alembic downgrade base`` round-trip succeeds.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
from sqlalchemy import create_engine, inspect, text

from epubtv.adapters.persistence.sqlite_job_repository import (
    SQLiteJobRepository,
)

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("VOICE-01-UT05")]


# ---------------------------------------------------------------------------
# Helpers (mirror the ones in test_sqlite_job_repository_crud.py)
# ---------------------------------------------------------------------------


def _create_test_schema(db_path_str: str) -> None:
    """Create the SQLModel tables on a per-test database.

    The per-test ``db_path`` fixture overrides ``settings.db_path``;
    the test schema is applied via ``SQLModel.metadata.create_all``
    on a sync engine to avoid the async-alembic/event-loop conflict.
    Production schema apply goes through ``alembic upgrade head``.
    """
    from sqlmodel import SQLModel

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


@pytest.fixture
async def job_with_one_chapter(migrated_repo: Any) -> str:
    """Create a job row so ``append_chunk`` + ``register_audio_file`` have a valid id."""
    return await migrated_repo.create_job(
        epub_id="e_audio",
        job_type="voiceover",
        chapter_ids=["ch1"],
        source_language="en",
        target_language="en",
    )


# ---------------------------------------------------------------------------
# chunk_split_warning column writes
# ---------------------------------------------------------------------------


async def test_append_chunk_writes_chunk_split_warning(
    migrated_repo: Any,
    job_with_one_chapter: str,
) -> None:
    """D-10: ``append_chunk(..., chunk_split_warning='...')`` writes the warning."""
    chunk_id = await migrated_repo.append_chunk(
        job_id=job_with_one_chapter,
        chapter_idx=0,
        chunk_idx=0,
        state="completed",
        chunk_namespace="vo",
        chunk_split_warning="chunk_split_warning: hard cut at 4096",
    )
    assert chunk_id == "vo_ch0_a0"

    chunks = await migrated_repo.list_chunks(job_with_one_chapter)
    assert len(chunks) == 1
    assert chunks[0]["chunk_split_warning"] == "chunk_split_warning: hard cut at 4096", (
        f"chunk_split_warning should be the hard-cut marker, got {chunks[0]['chunk_split_warning']!r}"
    )


async def test_append_chunk_default_chunk_split_warning_is_none(
    migrated_repo: Any,
    job_with_one_chapter: str,
) -> None:
    """No ``chunk_split_warning`` kwarg → ``None`` in the dict (NULL in the column)."""
    await migrated_repo.append_chunk(
        job_id=job_with_one_chapter,
        chapter_idx=0,
        chunk_idx=0,
        state="completed",
        chunk_namespace="vo",
    )

    chunks = await migrated_repo.list_chunks(job_with_one_chapter)
    assert len(chunks) == 1
    assert chunks[0]["chunk_split_warning"] is None, (
        f"Default chunk_split_warning should be None, got {chunks[0]['chunk_split_warning']!r}"
    )


async def test_append_chunk_chunk_split_warning_works_for_tx_namespace(
    migrated_repo: Any,
    job_with_one_chapter: str,
) -> None:
    """The column is shared across translation + voiceover namespaces."""
    # Pre-create a translation job so we exercise the tx namespace.
    tx_job_id = await migrated_repo.create_job(
        epub_id="e_tx",
        job_type="translation",
        chapter_ids=["ch1"],
        source_language="en",
        target_language="de",
    )
    chunk_id = await migrated_repo.append_chunk(
        job_id=tx_job_id,
        chapter_idx=0,
        chunk_idx=0,
        state="completed",
        chunk_namespace="tx",
        chunk_split_warning="tx shared warning",
    )
    assert chunk_id == "tx_ch0_s0"

    chunks = await migrated_repo.list_chunks(tx_job_id)
    assert chunks[0]["chunk_split_warning"] == "tx shared warning"


async def test_append_chunk_phase2_callers_default_to_null_warning(
    migrated_repo: Any,
) -> None:
    """Phase 2 callers that pass no ``chunk_split_warning`` kwarg get NULL (no regression)."""
    job_id = await migrated_repo.create_job(
        epub_id="e_p2",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    # The Phase 2 call shape — no chunk_split_warning kwarg.
    await migrated_repo.append_chunk(
        job_id=job_id,
        chapter_idx=0,
        chunk_idx=0,
        state="completed",
    )
    chunks = await migrated_repo.list_chunks(job_id)
    assert chunks[0]["chunk_split_warning"] is None


# ---------------------------------------------------------------------------
# register_audio_file (D-16)
# ---------------------------------------------------------------------------


async def test_register_audio_file_inserts_row_and_returns_uuid4_hex(
    migrated_repo: Any,
    job_with_one_chapter: str,
) -> None:
    """D-16: ``register_audio_file`` inserts an ``AudioFile`` row + returns a uuid4 hex id."""
    audio_id = await migrated_repo.register_audio_file(
        job_id=job_with_one_chapter,
        chapter=0,
        file_path="/data/audio/abc/ch0.wav",
        fmt="wav",
    )
    # 32 hex chars; uuid4().hex
    assert isinstance(audio_id, str)
    assert len(audio_id) == 32
    int(audio_id, 16)  # raises if not hex

    rows = await migrated_repo.list_audio_files(job_with_one_chapter)
    assert len(rows) == 1
    assert rows[0]["id"] == audio_id
    assert rows[0]["job_id"] == job_with_one_chapter
    assert rows[0]["chapter"] == 0
    assert rows[0]["file_path"] == "/data/audio/abc/ch0.wav"
    assert rows[0]["fmt"] == "wav"


async def test_register_audio_file_default_format_is_wav(
    migrated_repo: Any,
    job_with_one_chapter: str,
) -> None:
    """The ``fmt`` kwarg defaults to ``'wav'`` (D-13 sprint path)."""
    audio_id = await migrated_repo.register_audio_file(
        job_id=job_with_one_chapter,
        chapter=0,
        file_path="/data/audio/x/ch0.wav",
    )
    rows = await migrated_repo.list_audio_files(job_with_one_chapter)
    assert rows[0]["fmt"] == "wav"
    assert rows[0]["id"] == audio_id


async def test_register_audio_file_accepts_other_format(
    migrated_repo: Any,
    job_with_one_chapter: str,
) -> None:
    """The ``fmt`` column is permissive (sprint path is WAV; Phase 4 may write MP3)."""
    await migrated_repo.register_audio_file(
        job_id=job_with_one_chapter,
        chapter=0,
        file_path="/data/audio/x/ch0.mp3",
        fmt="mp3",
    )
    rows = await migrated_repo.list_audio_files(job_with_one_chapter)
    assert rows[0]["fmt"] == "mp3"
    assert rows[0]["file_path"] == "/data/audio/x/ch0.mp3"


async def test_list_audio_files_returns_empty_for_unknown_job(
    migrated_repo: Any,
) -> None:
    """``list_audio_files('nonexistent')`` returns ``[]`` (no rows, no error)."""
    assert await migrated_repo.list_audio_files("nonexistent") == []


async def test_list_audio_files_orders_by_chapter_ascending(
    migrated_repo: Any,
    job_with_one_chapter: str,
) -> None:
    """``list_audio_files`` returns rows in chapter ASC order (F6 download ordering)."""
    await migrated_repo.register_audio_file(
        job_id=job_with_one_chapter, chapter=2, file_path="/data/audio/c2.wav", fmt="wav"
    )
    await migrated_repo.register_audio_file(
        job_id=job_with_one_chapter, chapter=0, file_path="/data/audio/c0.wav", fmt="wav"
    )
    await migrated_repo.register_audio_file(
        job_id=job_with_one_chapter, chapter=1, file_path="/data/audio/c1.wav", fmt="wav"
    )

    rows = await migrated_repo.list_audio_files(job_with_one_chapter)
    chapters = [r["chapter"] for r in rows]
    assert chapters == [0, 1, 2], f"chapters should be sorted ASC, got {chapters}"


# ---------------------------------------------------------------------------
# Alembic 0002 migration round-trip
# ---------------------------------------------------------------------------


async def test_alembic_migration_0002_round_trip(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Alembic 0002 round-trip: upgrade adds the column; downgrade drops it.

    Runs ``alembic upgrade head`` + ``alembic downgrade base`` against
    a per-test SQLite DB. After ``upgrade head`` the
    ``chunk_split_warning`` column is present (NOTNULL=0). After
    ``downgrade base`` the column is absent.

    The ``EPUBTV_DB_PATH`` env var overrides the alembic subprocess's
    ``settings.db_path`` (the env is read by Pydantic Settings inside
    the subprocess — the in-process ``monkeypatch.setattr`` is NOT
    visible to the subprocess).
    """
    test_db = tmp_path / "alembic_test.db"

    import os

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
        cols = {c["name"]: c for c in insp.get_columns("job_chunks")}
        assert "chunk_split_warning" in cols, (
            f"chunk_split_warning column missing after upgrade: cols={list(cols)}"
        )
        assert cols["chunk_split_warning"]["nullable"] is True, (
            f"chunk_split_warning should be NULL-able, got {cols['chunk_split_warning']}"
        )

        # alembic current reports the head revision (0002 was the head
        # when the test was written; subsequent migrations like 0003
        # may be present in the codebase — the assertion below is that
        # 0002 is in the migration history, NOT that it is the head).
        proc2 = subprocess.run(
            [*cmd_prefix, "history"],
            cwd=backend_dir,
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )
        assert "0002" in proc2.stdout, f"alembic history should include 0002, got: {proc2.stdout!r}"
        # And ``alembic current`` should report a non-empty head.
        proc_current = subprocess.run(
            [*cmd_prefix, "current"],
            cwd=backend_dir,
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )
        assert proc_current.stdout.strip(), (
            f"alembic current should report a non-empty head, got: {proc_current.stdout!r}"
        )

        # downgrade base
        proc3 = subprocess.run(
            [*cmd_prefix, "downgrade", "base"],
            cwd=backend_dir,
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )
        assert proc3.returncode == 0, f"alembic downgrade base failed: {proc3.stderr}"

        # Column absent (table is dropped entirely by downgrade base, so the
        # presence/absence of the table itself is the post-downgrade signal).
        insp_after = inspect(engine)
        assert not insp_after.has_table("job_chunks"), (
            "job_chunks should be dropped after alembic downgrade base"
        )

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

        # After re-apply the column is back (PRAGMA sanity check).
        with engine.connect() as conn:
            row = conn.execute(text("PRAGMA table_info(job_chunks)")).fetchall()
            col_names = {r[1] for r in row}
            assert "chunk_split_warning" in col_names, (
                f"chunk_split_warning should be present after re-apply, cols={col_names}"
            )
    finally:
        engine.dispose()
