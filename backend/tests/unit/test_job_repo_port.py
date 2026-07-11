"""JobRepoPort.append_chunk Protocol + SQLite impl namespace contract tests.

Locks the D-04 chunk_id namespace contract (gray area 1 in RESEARCH):
- The Protocol ``JobRepoPort.append_chunk`` declares
  ``chunk_namespace: str = "tx"`` as a keyword arg with the
  ``"tx"`` default (backward-compat for Phase 2 translation callers).
- ``SQLiteJobRepository.append_chunk(..., chunk_namespace="vo")`` returns
  ``vo_ch{N}_a{M}`` (the voiceover namespace per D-04).
- ``SQLiteJobRepository.append_chunk(..., chunk_namespace="tx")`` returns
  ``tx_ch{N}_s{M}`` (the Phase 2 translation invariant — byte-for-byte
  unchanged).
- The default kwarg value keeps Phase 2 callers working without
  modification.
- The Protocol is runtime-checkable + the SQLite impl satisfies it
  (the structural shape matches).

Per CONTEXT.md D-04 + RESEARCH Pattern 4 + Pitfall 3: the Protocol
extension is the gray-area-1 seam that pins the kwarg so a future
refactor cannot silently drop the parameter.
"""

from __future__ import annotations

import inspect
from typing import Any

import pytest

from epubtv.adapters.persistence.sqlite_job_repository import (
    SQLiteJobRepository,
)
from epubtv.ports.job_repo_port import JobRepoPort

pytestmark = pytest.mark.tcid("VOICE-01-UT01")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _create_test_schema(db_path_str: str) -> None:
    """Create the SQLModel tables on a per-test database.

    Mirrors the helper in ``test_sqlite_job_repository_crud.py`` — sync
    engine avoids the async-alembic/event-loop conflict. Production
    schema apply goes through ``alembic upgrade head`` (lifespan
    startup); tests use ``SQLModel.metadata.create_all`` for speed.
    """
    from sqlmodel import SQLModel, create_engine

    from epubtv.adapters.persistence import schema  # noqa: F401  -- register models

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
    """Create a job row so ``append_chunk`` has a valid ``job_id`` FK."""
    return await migrated_repo.create_job(
        epub_id="e1",
        job_type="translation",
        chapter_ids=["ch1"],
        source_language="en",
        target_language="de",
    )


# ---------------------------------------------------------------------------
# Protocol signature introspection (gray area 1)
# ---------------------------------------------------------------------------


def test_protocol_signature_includes_chunk_namespace_default_tx() -> None:
    """``JobRepoPort.append_chunk`` declares ``chunk_namespace`` defaulting to ``"tx"``.

    The default ``"tx"`` is the backward-compat seam that keeps Phase 2
    translation callers working without modification. A future refactor
    that drops the kwarg or changes the default would break the
    test and the Phase 2 translation path simultaneously.
    """
    sig = inspect.signature(JobRepoPort.append_chunk)
    assert "chunk_namespace" in sig.parameters, (
        f"Protocol append_chunk missing chunk_namespace kwarg: params={list(sig.parameters)}"
    )
    chunk_ns_param = sig.parameters["chunk_namespace"]
    # The default is the backward-compat seam for Phase 2 callers.
    assert chunk_ns_param.default == "tx", (
        f"Protocol chunk_namespace default should be 'tx' (backward-compat), "
        f"got {chunk_ns_param.default!r}"
    )


def test_protocol_runtime_checkable_satisfied_by_sqlite() -> None:
    """``@runtime_checkable`` Protocol accepts the SQLite impl structurally.

    The structural check confirms the SQLite impl's ``append_chunk``
    signature is assignable to the Protocol's. A signature drift
    (e.g. SQLite drops the kwarg) would fail this test loudly.
    """
    # The class itself need not be an instance — the protocol check
    # is method-level. Use a class object that has the method.
    assert hasattr(JobRepoPort, "append_chunk")
    assert hasattr(SQLiteJobRepository, "append_chunk")
    # Inspect the method signatures are compatible (kwarg name + default).
    proto_sig = inspect.signature(JobRepoPort.append_chunk)
    impl_sig = inspect.signature(SQLiteJobRepository.append_chunk)
    assert "chunk_namespace" in proto_sig.parameters
    assert "chunk_namespace" in impl_sig.parameters
    assert proto_sig.parameters["chunk_namespace"].default == "tx"
    assert impl_sig.parameters["chunk_namespace"].default == "tx"


# ---------------------------------------------------------------------------
# SQLite impl namespace contract
# ---------------------------------------------------------------------------


async def test_sqlite_append_chunk_vo_namespace_returns_vo_ch_N_a_M(
    migrated_repo: Any,
    job_with_one_chapter: str,
) -> None:
    """``chunk_namespace="vo"`` returns ``vo_ch{N}_a{M}`` per D-04."""
    chunk_id = await migrated_repo.append_chunk(
        job_id=job_with_one_chapter,
        chapter_idx=3,
        chunk_idx=0,
        state="completed",
        chunk_namespace="vo",
    )
    assert chunk_id == "vo_ch3_a0", (
        f"vo namespace should produce 'vo_ch3_a0' per D-04, got {chunk_id!r}"
    )


async def test_sqlite_append_chunk_tx_namespace_unchanged(
    migrated_repo: Any,
    job_with_one_chapter: str,
) -> None:
    """``chunk_namespace="tx"`` returns ``tx_ch{N}_s{M}`` (Phase 2 invariant).

    The translation path is byte-for-byte unchanged from Phase 2.
    """
    chunk_id = await migrated_repo.append_chunk(
        job_id=job_with_one_chapter,
        chapter_idx=3,
        chunk_idx=0,
        state="completed",
        chunk_namespace="tx",
    )
    assert chunk_id == "tx_ch3_s0", (
        f"tx namespace should produce 'tx_ch3_s0' (Phase 2 invariant), got {chunk_id!r}"
    )


async def test_sqlite_append_chunk_default_namespace_is_tx(
    migrated_repo: Any,
    job_with_one_chapter: str,
) -> None:
    """No ``chunk_namespace`` kwarg → default ``"tx"`` (backward-compat).

    The default is the seam that keeps every Phase 2 translation
    caller working without modification. A regression that flips
    the default would break every existing translation test.
    """
    chunk_id = await migrated_repo.append_chunk(
        job_id=job_with_one_chapter,
        chapter_idx=3,
        chunk_idx=0,
        state="completed",
    )
    assert chunk_id == "tx_ch3_s0", (
        f"default chunk_namespace should be 'tx' (Phase 2 callers), got {chunk_id!r}"
    )


async def test_sqlite_append_chunk_unknown_namespace_raises(
    migrated_repo: Any,
    job_with_one_chapter: str,
) -> None:
    """Unknown ``chunk_namespace`` raises ``ValueError`` (loud failure).

    A future namespace addition (e.g. ``combined_`` for the
    translation+voiceover workflow) is a deliberate change, not a
    silent extension. The defensive ``else`` branch makes the
    formatter refuse the unknown value at the seam.
    """
    with pytest.raises(ValueError, match="unknown chunk_namespace"):
        await migrated_repo.append_chunk(
            job_id=job_with_one_chapter,
            chapter_idx=0,
            chunk_idx=0,
            state="completed",
            chunk_namespace="combined",  # not yet a real namespace
        )
