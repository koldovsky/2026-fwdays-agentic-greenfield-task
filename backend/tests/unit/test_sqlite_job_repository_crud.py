"""SQLiteJobRepository CRUD + atomicity unit tests (Task 1 TDD cycle).

Satisfies JOBS-04 (atomic per-chunk commit) + JOBS-02 partial
(``pop_next_queued`` FIFO helper) + the agent-discretion
``list_jobs`` SPA list view.

The test suite uses the per-test ``db_path`` fixture (see
``tests/conftest.py``) so PRAGMA / migration tests do NOT collide with
the dev ``db/epubtv.db``. Each test runs the Alembic ``0001_initial``
migration against the fresh per-test database (production schema apply
goes through Alembic per RESEARCH §Anti-Patterns line 431 — NOT
``SQLModel.metadata.create_all``).

Atomicity under JOBS-04: ``append_chunk`` + ``update_last_chunk_id`` MUST
share one ``async with session.begin():`` transaction. The test injects a
``RuntimeError`` via a SQLAlchemy ``after_insert`` event listener on
``JobChunk`` so the second write never executes; the test then asserts
that NEITHER the ``job_chunks`` row nor the ``jobs.last_chunk_id`` update
is visible after the failed call. This proves the single-transaction
envelope (RESEARCH §Pattern 2 + Pitfall 8).
"""

from __future__ import annotations

import json
from typing import Any

import pytest
from sqlalchemy import event
from sqlalchemy.exc import IntegrityError

from epubtv.adapters.persistence.schema import JobChunk
from epubtv.adapters.persistence.sqlite_job_repository import (
    SQLiteJobRepository,
)

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("JOBS-04-UT23")]


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _create_test_schema(db_path_str: str) -> None:
    """Create the SQLModel tables on a per-test database.

    Tests use ``SQLModel.metadata.create_all`` for the schema (synchronous
    engine) to avoid the async-alembic/event-loop conflict in
    ``pytest-asyncio`` fixtures. Production schema apply goes through
    ``alembic upgrade head`` (verified by the lifespan startup path).
    """
    from sqlmodel import SQLModel, create_engine

    # Importing ``schema`` registers the table models on ``SQLModel.metadata``.
    from epubtv.adapters.persistence import schema  # noqa: F401

    sync_engine = create_engine(f"sqlite:///{db_path_str}")
    SQLModel.metadata.create_all(sync_engine)
    sync_engine.dispose()


@pytest.fixture
async def migrated_repo(db_path: Any) -> Any:
    """Return a ``SQLiteJobRepository`` with the per-test schema applied.

    The per-test ``db_path`` fixture already monkeypatches
    ``settings.db_path``; we create the tables on the sync engine so the
    test does NOT have to spawn a subprocess for alembic (avoids the
    async-alembic/event-loop conflict). The production schema apply goes
    through ``alembic upgrade head`` (verified by the lifespan startup).
    """
    _create_test_schema(str(db_path))

    repo = await SQLiteJobRepository.create(db_path=str(db_path))
    try:
        yield repo
    finally:
        await repo.dispose()


# ---------------------------------------------------------------------------
# create_job / get_job round-trip
# ---------------------------------------------------------------------------


async def test_create_job_returns_uuid4_hex_and_get_job_round_trips(
    migrated_repo: Any,
) -> None:
    """``create_job`` returns a uuid4 hex; ``get_job`` returns the row."""
    job_id = await migrated_repo.create_job(
        epub_id="e1",
        job_type="translation",
        chapter_ids=["ch1", "ch2"],
        source_language="en",
        target_language="de",
    )
    # 32 hex chars; uuid4().hex
    assert isinstance(job_id, str)
    assert len(job_id) == 32
    int(job_id, 16)  # raises if not hex

    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["id"] == job_id
    assert job["epub_id"] == "e1"
    assert job["job_type"] == "translation"
    assert job["status"] == "queued"
    assert job["source_language"] == "en"
    assert job["target_language"] == "de"
    assert job["chapter_ids"] == ["ch1", "ch2"]
    assert job["last_chunk_id"] is None


async def test_create_job_with_optional_languages_none(migrated_repo: Any) -> None:
    """``source_language`` and ``target_language`` may be ``None`` (D-06)."""
    job_id = await migrated_repo.create_job(
        epub_id="e2",
        job_type="translation",
        chapter_ids=[],
        source_language=None,
        target_language=None,
    )
    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["source_language"] is None
    assert job["target_language"] is None
    assert job["chapter_ids"] == []


async def test_get_job_returns_none_when_not_found(migrated_repo: Any) -> None:
    """``get_job`` returns ``None`` for an unknown job_id (not raises)."""
    assert await migrated_repo.get_job("nonexistent-job-id") is None


# ---------------------------------------------------------------------------
# update_status
# ---------------------------------------------------------------------------


async def test_update_status_changes_status_and_bumps_updated_at(
    migrated_repo: Any,
) -> None:
    """``update_status`` mutates ``status`` and bumps ``updated_at``."""
    job_id = await migrated_repo.create_job(
        epub_id="e3",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )

    job_before = await migrated_repo.get_job(job_id)
    assert job_before is not None
    assert job_before["status"] == "queued"

    # Sleep a millisecond so the timestamp comparison is deterministic
    # without depending on the wall clock between two operations.
    import asyncio

    await asyncio.sleep(0.01)

    await migrated_repo.update_status(job_id, "running")
    job_after = await migrated_repo.get_job(job_id)
    assert job_after is not None
    assert job_after["status"] == "running"
    assert job_after["updated_at"] > job_before["updated_at"]


async def test_update_status_is_noop_for_unknown_job_id(migrated_repo: Any) -> None:
    """``update_status`` on an unknown id does NOT raise."""
    # No exception expected; this is a no-op.
    await migrated_repo.update_status("missing-id", "running")


# ---------------------------------------------------------------------------
# update_last_chunk_id
# ---------------------------------------------------------------------------


async def test_update_last_chunk_id_persists_value(migrated_repo: Any) -> None:
    """``update_last_chunk_id`` mutates the column and bumps ``updated_at``."""
    job_id = await migrated_repo.create_job(
        epub_id="e4",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )

    await migrated_repo.update_last_chunk_id(job_id, "tx_ch1_s3")
    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["last_chunk_id"] == "tx_ch1_s3"


# ---------------------------------------------------------------------------
# append_chunk + update_last_chunk_id atomic
# ---------------------------------------------------------------------------


async def test_append_chunk_returns_chunk_id_and_persists(
    migrated_repo: Any,
) -> None:
    """``append_chunk`` returns ``tx_ch{N}_s{M}`` + writes row + updates ``last_chunk_id``."""
    job_id = await migrated_repo.create_job(
        epub_id="e5",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )

    chunk_id = await migrated_repo.append_chunk(
        job_id, chapter_idx=3, chunk_idx=7, state="completed"
    )
    assert chunk_id == "tx_ch3_s7"

    # last_chunk_id advanced
    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["last_chunk_id"] == "tx_ch3_s7"

    # chunk row exists with the right columns
    chunks = await migrated_repo.list_chunks(job_id)
    assert len(chunks) == 1
    assert chunks[0]["id"] == "tx_ch3_s7"
    assert chunks[0]["chapter_idx"] == 3
    assert chunks[0]["chunk_idx"] == 7
    assert chunks[0]["state"] == "completed"
    assert chunks[0]["job_id"] == job_id


async def test_append_chunk_is_atomic_under_simulated_crash(
    migrated_repo: Any,
) -> None:
    """JOBS-04: a mid-transaction crash rolls back BOTH writes.

    Injects a ``RuntimeError`` via a SQLAlchemy ``after_insert`` event
    listener on ``JobChunk`` so the second write (UPDATE jobs) never
    executes; the test then asserts the ``job_chunks`` row is absent
    AND ``jobs.last_chunk_id`` is unchanged. Proves the
    ``async with session.begin():`` envelope covers BOTH writes.
    """
    job_id = await migrated_repo.create_job(
        epub_id="e6",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )

    # Wire a one-shot SQLAlchemy event listener that raises after the
    # INSERT into job_chunks fires but BEFORE the subsequent UPDATE on
    # jobs runs (the UPDATE is the next statement inside the same
    # ``async with session.begin():`` envelope).
    raised = {"count": 0}

    def _raise_after_insert(_mapper: Any, _connection: Any, _target: Any) -> None:
        raised["count"] += 1
        raise RuntimeError("simulated crash after job_chunks INSERT")

    event.listen(JobChunk, "after_insert", _raise_after_insert)
    try:
        with pytest.raises(RuntimeError, match="simulated crash"):
            await migrated_repo.append_chunk(job_id, chapter_idx=0, chunk_idx=0, state="completed")
    finally:
        event.remove(JobChunk, "after_insert", _raise_after_insert)

    assert raised["count"] == 1, "event listener should have fired exactly once"

    # NEITHER write is visible.
    chunks = await migrated_repo.list_chunks(job_id)
    assert chunks == []

    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert job["last_chunk_id"] is None


async def test_append_chunk_duplicate_raises_integrity_error(
    migrated_repo: Any,
) -> None:
    """Second ``append_chunk`` with the same ``(job_id, chapter_idx, chunk_idx)``
    raises ``IntegrityError`` (PRIMARY KEY on ``job_chunks.id``)."""
    job_id = await migrated_repo.create_job(
        epub_id="e7",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    await migrated_repo.append_chunk(job_id, chapter_idx=0, chunk_idx=0, state="completed")
    with pytest.raises(IntegrityError):
        await migrated_repo.append_chunk(job_id, chapter_idx=0, chunk_idx=0, state="completed")


async def test_append_chunk_chunk_namespace_default_is_tx(
    migrated_repo: Any,
) -> None:
    """D-04 translation namespace default is ``tx_``."""
    job_id = await migrated_repo.create_job(
        epub_id="e8",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    chunk_id = await migrated_repo.append_chunk(
        job_id, chapter_idx=5, chunk_idx=2, state="completed"
    )
    assert chunk_id == "tx_ch5_s2"


# ---------------------------------------------------------------------------
# list_chunks
# ---------------------------------------------------------------------------


async def test_list_chunks_orders_by_created_at_ascending(
    migrated_repo: Any,
) -> None:
    """``list_chunks`` returns rows ordered by ``created_at`` ASC."""
    job_id = await migrated_repo.create_job(
        epub_id="e9",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    # Insert chunks in a known order. created_at is set to datetime.now(UTC)
    # inside the repo, so wall-clock order matches insertion order.
    await migrated_repo.append_chunk(job_id, chapter_idx=0, chunk_idx=0, state="completed")
    await migrated_repo.append_chunk(job_id, chapter_idx=0, chunk_idx=1, state="completed")
    await migrated_repo.append_chunk(job_id, chapter_idx=1, chunk_idx=0, state="completed")

    chunks = await migrated_repo.list_chunks(job_id)
    assert [c["chunk_idx"] for c in chunks] == [0, 1, 0]
    assert [c["chapter_idx"] for c in chunks] == [0, 0, 1]


async def test_list_chunks_empty_when_no_chunks(migrated_repo: Any) -> None:
    """``list_chunks`` on a job with zero chunks returns ``[]``."""
    job_id = await migrated_repo.create_job(
        epub_id="e10",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    assert await migrated_repo.list_chunks(job_id) == []


# ---------------------------------------------------------------------------
# count_active / pop_next_queued
# ---------------------------------------------------------------------------


async def test_count_active_counts_only_running_jobs(migrated_repo: Any) -> None:
    """``count_active`` returns the count of rows with ``status='running'``."""
    j1 = await migrated_repo.create_job(
        epub_id="e11",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    j2 = await migrated_repo.create_job(
        epub_id="e12",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    j3 = await migrated_repo.create_job(
        epub_id="e13",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )

    # All queued.
    assert await migrated_repo.count_active() == 0

    await migrated_repo.update_status(j1, "running")
    await migrated_repo.update_status(j2, "running")
    assert await migrated_repo.count_active() == 2

    await migrated_repo.update_status(j2, "completed")
    assert await migrated_repo.count_active() == 1

    # j3 still queued → no change
    _ = j3


async def test_pop_next_queued_returns_oldest_first_and_promotes_to_running(
    migrated_repo: Any,
) -> None:
    """``pop_next_queued`` returns the FIFO row and promotes it to ``running``."""
    j1 = await migrated_repo.create_job(
        epub_id="e14",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    j2 = await migrated_repo.create_job(
        epub_id="e15",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    j3 = await migrated_repo.create_job(
        epub_id="e16",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )

    first = await migrated_repo.pop_next_queued()
    assert first is not None
    assert first["id"] == j1  # FIFO by created_at
    assert first["status"] == "running"
    assert first["job_type"] == "translation"

    second = await migrated_repo.pop_next_queued()
    assert second is not None
    assert second["id"] == j2

    third = await migrated_repo.pop_next_queued()
    assert third is not None
    assert third["id"] == j3

    # Queue empty now.
    assert await migrated_repo.pop_next_queued() is None


async def test_pop_next_queued_returns_none_when_empty(migrated_repo: Any) -> None:
    """``pop_next_queued`` on an empty queue returns ``None``."""
    assert await migrated_repo.pop_next_queued() is None


# ---------------------------------------------------------------------------
# mark_orphaned_running_as_failed (worker-queue-stuck-after-first-job fix)
# ---------------------------------------------------------------------------


async def test_mark_orphaned_running_as_failed_sweeps_running_rows(
    migrated_repo: Any,
) -> None:
    """``mark_orphaned_running_as_failed`` transitions ``status='running'`` rows to ``failed``.

    Used by ``worker_supervisor`` on startup to recover from orphaned
    rows — a workflow can die (container restart, OOM, signal, an
    unhandled exception that bypasses ``_safe_dispatch``) and leave
    the row in ``running`` state. Without the sweep the supervisor's
    ``count_active()`` permanently reads 1, the ``active <
    MAX_ACTIVE`` guard never opens, and the queue stalls.

    The method is idempotent: it only touches ``running`` rows.
    Queued + completed + failed + cancelled rows are untouched.
    """
    j_orphan = await migrated_repo.create_job(
        epub_id="e_orphan",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    j_queued = await migrated_repo.create_job(
        epub_id="e_queued",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    j_completed = await migrated_repo.create_job(
        epub_id="e_completed",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    j_failed = await migrated_repo.create_job(
        epub_id="e_failed",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    j_cancelled = await migrated_repo.create_job(
        epub_id="e_cancelled",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )

    # Put the orphan into running (simulates a workflow that died
    # mid-processing). Leave the rest in their natural states.
    await migrated_repo.update_status(j_orphan, "running")
    await migrated_repo.update_status(j_completed, "completed")
    await migrated_repo.update_status(j_failed, "failed")
    await migrated_repo.update_status(j_cancelled, "cancelled")

    # Sanity: the orphan counts as active.
    assert await migrated_repo.count_active() == 1

    # Sweep.
    swept_ids = await migrated_repo.mark_orphaned_running_as_failed()
    assert swept_ids == [j_orphan]

    # The orphan is now failed; count_active() drops back to 0.
    assert await migrated_repo.count_active() == 0
    orphan_after = await migrated_repo.get_job(j_orphan)
    assert orphan_after is not None
    assert orphan_after["status"] == "failed"

    # The other rows are untouched.
    for jid, expected in [
        (j_queued, "queued"),
        (j_completed, "completed"),
        (j_failed, "failed"),
        (j_cancelled, "cancelled"),
    ]:
        job = await migrated_repo.get_job(jid)
        assert job is not None
        assert job["status"] == expected


async def test_mark_orphaned_running_as_failed_is_idempotent_when_no_orphans(
    migrated_repo: Any,
) -> None:
    """Sweep with no ``running`` rows returns an empty list and mutates nothing."""
    await migrated_repo.create_job(
        epub_id="e_idem",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    # No rows in running state.
    assert await migrated_repo.count_active() == 0

    swept_ids = await migrated_repo.mark_orphaned_running_as_failed()
    assert swept_ids == []


async def test_mark_orphaned_running_as_failed_sweeps_multiple_orphans(
    migrated_repo: Any,
) -> None:
    """Sweep handles multiple ``running`` rows in one pass."""
    ids: list[str] = []
    for i in range(3):
        jid = await migrated_repo.create_job(
            epub_id=f"e_multi_{i}",
            job_type="translation",
            chapter_ids=[],
            source_language="en",
            target_language="de",
        )
        await migrated_repo.update_status(jid, "running")
        ids.append(jid)
    assert await migrated_repo.count_active() == 3

    swept_ids = await migrated_repo.mark_orphaned_running_as_failed()
    # Order is by id ASC (no created_at guarantee across rapid
    # inserts in a single transaction).
    assert sorted(swept_ids) == sorted(ids)
    assert await migrated_repo.count_active() == 0


# ---------------------------------------------------------------------------
# Composite PK on (job_id, id) — the worker-queue-stuck-after-first-job
# follow-up. ``JobChunk.id`` is the D-04 namespace chunk_id, which is
# the SAME across jobs (``tx_ch1_s0`` for every job targeting chapter
# 1, sentence 0). The PK is the tuple ``(job_id, id)`` so the same
# chunk_id can coexist in different jobs. Without the composite PK,
# the second job for the same EPUB would hit
# ``UNIQUE constraint failed: job_chunks.id`` on the first chunk.
# ---------------------------------------------------------------------------


async def test_same_chunk_id_allowed_across_different_jobs(
    migrated_repo: Any,
) -> None:
    """The composite PK lets two jobs use the same chunk_id.

    Reproduces the full collision case: Job A writes ``tx_ch1_s0``
    and dies (or completes), Job B for the same EPUB writes
    ``tx_ch1_s0`` for its own first chunk. With the composite PK
    ``(job_id, id)``, both rows coexist. With the old single-column
    PK on ``id``, the second insert raised
    ``UNIQUE constraint failed: job_chunks.id``.
    """
    jid_a = await migrated_repo.create_job(
        epub_id="e_collide",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    jid_b = await migrated_repo.create_job(
        epub_id="e_collide",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    # Both jobs use the same chunk_id ``tx_ch1_s0`` — the composite
    # PK (job_id, id) lets both rows exist.
    await migrated_repo.append_chunk(jid_a, 1, 0, "completed")
    await migrated_repo.append_chunk(jid_b, 1, 0, "completed")
    # Each job's list_chunks returns only its own chunk.
    assert [c["id"] for c in await migrated_repo.list_chunks(jid_a)] == ["tx_ch1_s0"]
    assert [c["id"] for c in await migrated_repo.list_chunks(jid_b)] == ["tx_ch1_s0"]


async def test_same_chunk_id_still_unique_within_one_job(
    migrated_repo: Any,
) -> None:
    """The composite PK still rejects duplicate ``(job_id, id)`` rows.

    Defense: a single job must not be able to write the same
    chunk_id twice. The composite PK on ``(job_id, id)`` enforces
    this — the second insert with the same (job_id, id) raises
    ``UNIQUE constraint failed``.
    """
    from sqlalchemy.exc import IntegrityError

    jid = await migrated_repo.create_job(
        epub_id="e_dup",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    await migrated_repo.append_chunk(jid, 1, 0, "completed")
    # Second insert with the same (job_id, id) — must raise.
    with pytest.raises(IntegrityError):
        await migrated_repo.append_chunk(jid, 1, 0, "completed")


# ---------------------------------------------------------------------------
# list_jobs
# ---------------------------------------------------------------------------


async def test_list_jobs_orders_by_created_at_desc(migrated_repo: Any) -> None:
    """``list_jobs`` returns rows in reverse-chronological order."""
    j1 = await migrated_repo.create_job(
        epub_id="e17",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    j2 = await migrated_repo.create_job(
        epub_id="e18",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )
    j3 = await migrated_repo.create_job(
        epub_id="e19",
        job_type="translation",
        chapter_ids=[],
        source_language="en",
        target_language="de",
    )

    rows = await migrated_repo.list_jobs(limit=50)
    ids = [r["id"] for r in rows]
    assert ids == [j3, j2, j1]  # newest first


async def test_list_jobs_respects_limit(migrated_repo: Any) -> None:
    """``list_jobs(limit=N)`` returns at most ``N`` rows."""
    for i in range(5):
        await migrated_repo.create_job(
            epub_id=f"e_limit_{i}",
            job_type="translation",
            chapter_ids=[],
            source_language="en",
            target_language="de",
        )
    rows = await migrated_repo.list_jobs(limit=3)
    assert len(rows) == 3


# ---------------------------------------------------------------------------
# chapter_ids JSON round-trip
# ---------------------------------------------------------------------------


async def test_chapter_ids_json_round_trip_preserves_list(
    migrated_repo: Any,
) -> None:
    """``chapter_ids`` is stored as JSON TEXT; ``get_job`` decodes back to a list."""
    job_id = await migrated_repo.create_job(
        epub_id="e20",
        job_type="translation",
        chapter_ids=["chapter_1", "chapter_2", "chapter_3"],
        source_language="en",
        target_language="de",
    )
    job = await migrated_repo.get_job(job_id)
    assert job is not None
    assert isinstance(job["chapter_ids"], list)
    assert job["chapter_ids"] == ["chapter_1", "chapter_2", "chapter_3"]


# ---------------------------------------------------------------------------
# Verify the row on disk is JSON-encoded (regression — proves the
# persistence layer doesn't just hold the list in memory).
# ---------------------------------------------------------------------------


async def test_chapter_ids_persisted_as_json_text(migrated_repo: Any, db_path: Any) -> None:
    """The ``chapter_ids`` column is stored as JSON-encoded TEXT on disk."""
    import aiosqlite

    await migrated_repo.create_job(
        epub_id="e21",
        job_type="translation",
        chapter_ids=["c1", "c2"],
        source_language="en",
        target_language="de",
    )
    async with aiosqlite.connect(str(db_path)) as raw:
        cursor = await raw.execute("SELECT chapter_ids FROM jobs LIMIT 1")
        row = await cursor.fetchone()
    assert row is not None
    stored_text = row[0]
    assert stored_text == json.dumps(["c1", "c2"])
