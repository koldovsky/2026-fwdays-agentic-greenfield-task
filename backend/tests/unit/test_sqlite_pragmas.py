"""SQLite PRAGMA unit tests (Task 2 TDD cycle).

Behaviour (per Pattern 2 + D-04 + INFRA-02): on every new connection the
SQLite engine MUST issue the four PRAGMAs at the connect listener:
- ``PRAGMA journal_mode=WAL`` → ``journal_mode == "wal"``
- ``PRAGMA busy_timeout=5000`` → ``busy_timeout == 5000``
- ``PRAGMA synchronous=NORMAL`` → ``synchronous in (1, "normal")``
- ``PRAGMA foreign_keys=ON`` → ``foreign_keys == 1``

Test path: open a session on the test engine (per-test tmp path), call
``verify_pragmas()`` (the repository's helper), and assert.
"""

from __future__ import annotations

from typing import Any

import pytest

from epubtv.adapters.persistence.sqlite_job_repository import SQLiteJobRepository

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("JOBS-02-UT22")]


async def test_wal_pragmas_on_connect(db_path: Any) -> None:
    """The connect listener sets all four PRAGMAs on every new connection."""
    repo = await SQLiteJobRepository.create(db_path=str(db_path))
    try:
        pragmas = await repo.verify_pragmas()
    finally:
        await repo.dispose()

    assert pragmas["journal_mode"].lower() == "wal"
    assert pragmas["busy_timeout"] == "5000"
    # synchronous=NORMAL maps to integer 1 in SQLite PRAGMA return.
    assert pragmas["synchronous"] in {"1", "normal"}
    assert pragmas["foreign_keys"] == "1"


async def test_pragmas_reapplied_on_each_connection(db_path: Any) -> None:
    """Two distinct sessions both observe the PRAGMAs (listener fires per
    connection, not once at engine init)."""
    repo = await SQLiteJobRepository.create(db_path=str(db_path))
    try:
        first = await repo.verify_pragmas()
        second = await repo.verify_pragmas()
    finally:
        await repo.dispose()

    assert first == second
    assert first["journal_mode"].lower() == "wal"
    assert first["foreign_keys"] == "1"


async def test_job_repo_dispose_is_idempotent(db_path: Any) -> None:
    """``dispose()`` on a freshly-constructed repo does not raise."""
    repo = await SQLiteJobRepository.create(db_path=str(db_path))
    await repo.dispose()


async def test_repository_path_parent_created(db_path: Any) -> None:
    """``SQLiteJobRepository.create`` ensures the parent dir of ``db_path``
    exists (so a fresh per-test path does not fail on engine open)."""
    nested = db_path.parent / "nested" / "epubtv.db"
    repo = await SQLiteJobRepository.create(db_path=str(nested))
    try:
        pragmas = await repo.verify_pragmas()
        assert pragmas["journal_mode"].lower() == "wal"
    finally:
        await repo.dispose()
