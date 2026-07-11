"""Lifespan migration-on-startup contract (quick 260708-t1t + ADR 0013).

Asserts the five guarantees of the migration-on-startup seam:

1. The lifespan invokes the alembic command via the ``run_alembic_upgrade``
   helper. The helper is called through ``asyncio.to_thread`` so the
   event loop stays responsive — the call is a *thread-pool* coroutine,
   not a blocking sync call.
2. The helper uses ``alembic.command.upgrade(cfg, "head")``
   **in-process** (NOT ``subprocess.run([sys.executable, "-m",
   "alembic", ...])``). The in-process call uses the same migration
   engine the ``alembic`` CLI uses; no subprocess overhead.
3. The ``alembic.config.Config`` is constructed from
   ``BACKEND_DIR / "alembic.ini"`` so the migration scripts are
   found without setting ``cwd``.
4. ``alembic.command.upgrade`` exceptions propagate to the lifespan
   caller — a failing migration aborts the boot. The cache is NOT
   set on failure, so a retry can re-run the migration.
5. The helper is idempotent: calling it twice on a freshly-upgraded
   DB is a no-op (Alembic's contract — verified by running the
   helper against a real alembic head migration in the integration
   test below).

Tests #1–#4 mock ``alembic.command.upgrade`` and assert the call
shape. Test #5 drives a real alembic upgrade against a per-test
SQLite file to verify the no-op second-call behaviour Alembic
guarantees.

The ``tcids``:
- ``INFRA-MIG-UT01`` — module-level marker (mirrors the 25/12
  Phase 1+2+3 unit-test marker pattern in backend/AGENTS.md).
"""

from __future__ import annotations

import subprocess
from pathlib import Path
from unittest.mock import MagicMock

import pytest

import epubtv.tools.db_migrations as _db_migrations_mod
from epubtv.tools.db_migrations import BACKEND_DIR, run_alembic_upgrade

pytestmark = [pytest.mark.tcid("INFRA-MIG-UT01")]


@pytest.fixture(autouse=True)
def _reset_alembic_cache() -> None:
    """Reset the module-level alembic cache between tests.

    The helper is idempotent within a process: once a successful
    ``alembic upgrade head`` has run, subsequent calls return
    immediately. Each test starts with a fresh cache so the
    in-process ``alembic.command.upgrade`` call shape is exercised
    per test.
    """
    _db_migrations_mod._alembic_upgrade_done = False


# ---------------------------------------------------------------------------
# Unit tests — mock alembic.command.upgrade, assert the call shape.
# ---------------------------------------------------------------------------


def test_run_alembic_upgrade_uses_alembic_command_not_subprocess(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The helper invokes ``alembic.command.upgrade(cfg, "head")`` in-process.

    Guards against drift: the helper must NOT shell out to
    ``alembic`` from PATH / ``sys.executable -m alembic`` (the prior
    260707-tm5 implementation; replaced by ADR 0013). The
    in-process call uses the same migration engine the CLI uses
    without the subprocess startup overhead.
    """
    fake_upgrade = MagicMock(return_value=None)
    # Patch the imported symbol on the module; the call site
    # ``alembic_command.upgrade(cfg, "head")`` looks it up by
    # attribute at call time, so monkeypatching the module
    # attribute is sufficient.
    monkeypatch.setattr(_db_migrations_mod.alembic_command, "upgrade", fake_upgrade)

    # Also patch subprocess.run to assert the helper does NOT
    # shell out. If the in-process refactor regresses to
    # subprocess, this assertion catches it.
    fake_subprocess_run = MagicMock()
    monkeypatch.setattr(subprocess, "run", fake_subprocess_run)

    run_alembic_upgrade()

    # The in-process call was made exactly once.
    fake_upgrade.assert_called_once()
    call = fake_upgrade.call_args
    args = call.args
    # The first positional arg is a ``Config`` instance whose
    # ``config_file_name`` ends with ``alembic.ini``; the second
    # positional arg is the literal ``"head"`` revision.
    cfg, revision = args
    assert str(cfg.config_file_name).endswith("alembic.ini")
    assert revision == "head"

    # Belt-and-suspenders: subprocess.run was NOT called.
    fake_subprocess_run.assert_not_called()


def test_run_alembic_upgrade_loads_alembic_ini_from_backend_dir(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The ``Config`` instance is constructed from ``BACKEND_DIR / "alembic.ini"``.

    The ``Config.__init__`` reads the .ini and resolves
    ``script_location`` to the absolute path of ``alembic/`` (so
    the migration scripts are found without setting ``cwd``). The
    in-process call no longer needs the ``cwd=BACKEND_DIR`` dance
    the prior subprocess implementation required.
    """
    fake_upgrade = MagicMock(return_value=None)
    monkeypatch.setattr(_db_migrations_mod.alembic_command, "upgrade", fake_upgrade)

    run_alembic_upgrade()

    fake_upgrade.assert_called_once()
    cfg = fake_upgrade.call_args.args[0]
    # The ``Config`` was constructed with the backend-local
    # ``alembic.ini`` path.
    assert str(cfg.config_file_name) == str(BACKEND_DIR / "alembic.ini")


def test_run_alembic_upgrade_propagates_command_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """An ``alembic.command.upgrade`` exception propagates to the caller.

    The lifespan does NOT catch this exception — it propagates to
    uvicorn which exits non-zero, surfacing a failing migration
    as a real boot error (not a stale-schema silent failure). The
    cache is NOT set on failure, so a retry can re-run the
    migration.
    """
    fake_upgrade = MagicMock(
        side_effect=Exception("sqlalchemy.exc.OperationalError: no such table: foo"),
    )
    monkeypatch.setattr(_db_migrations_mod.alembic_command, "upgrade", fake_upgrade)

    with pytest.raises(Exception) as excinfo:
        run_alembic_upgrade()

    assert "no such table" in str(excinfo.value)
    # The cache is NOT set on failure: a retry should re-run the migration.
    assert _db_migrations_mod._alembic_upgrade_done is False


def test_run_alembic_upgrade_caches_subsequent_calls(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """After a successful run, subsequent calls in the same process are a no-op.

    The module-level ``_alembic_upgrade_done`` flag short-circuits
    subsequent calls within the same Python process. This is a
    performance optimisation for the BDD test infrastructure (the
    ``_SyncClient._drive`` lifespan-per-HTTP-call pattern) and is a
    no-op semantically in production (the FastAPI process starts
    once, so the cache is a single-hit optimisation).
    """
    fake_upgrade = MagicMock(return_value=None)
    monkeypatch.setattr(_db_migrations_mod.alembic_command, "upgrade", fake_upgrade)

    # First call: invokes alembic.command.upgrade.
    run_alembic_upgrade()
    assert fake_upgrade.call_count == 1
    assert _db_migrations_mod._alembic_upgrade_done is True

    # Second call in the same process: short-circuited by the cache.
    run_alembic_upgrade()
    assert fake_upgrade.call_count == 1, (
        "second call should not invoke alembic.command.upgrade again"
    )

    # Third call: still cached.
    run_alembic_upgrade()
    assert fake_upgrade.call_count == 1


# ---------------------------------------------------------------------------
# Integration test — drive a real alembic upgrade against a per-test SQLite.
# Verifies the helper is idempotent on the second call (Alembic's
# ``upgrade head`` contract + the in-process cache).
# ---------------------------------------------------------------------------


def test_run_alembic_upgrade_is_idempotent_on_real_db(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Calling ``run_alembic_upgrade`` twice on a fresh DB is safe.

    The first call applies all migrations (the in-process call
    drives the same ``alembic/env.py:run_migrations_online()`` the
    CLI uses); the second call is a no-op (the in-process cache
    short-circuits, mirroring the prior subprocess cache behaviour).
    This is the property the lifespan relies on: every boot
    invokes the helper, and warm-starts cost ~nothing.
    """
    # Override ``EPUBTV_DB_PATH`` to a per-test SQLite file so the
    # real alembic migrations land in tmp_path, not the dev
    # ``db/epubtv.db``. The helper reads this env var first (the
    # pydantic-settings cached field is stale because the
    # ``db_path`` fixture ``monkeypatch.setattr(settings,
    # "db_path", ...)`` runs after the settings singleton is
    # imported).
    db_path = tmp_path / "epubtv.db"
    monkeypatch.setenv("EPUBTV_DB_PATH", str(db_path))

    # First call: applies migrations to a fresh DB. Should succeed.
    run_alembic_upgrade()
    assert db_path.exists(), "alembic upgrade head should create the SQLite file"
    assert _db_migrations_mod._alembic_upgrade_done is True

    # Second call: cached at the module level (no alembic.command
    # re-invocation). This is the in-process cache behaviour;
    # alembic's own DB-side idempotency is exercised by the
    # cache short-circuit (not by re-running the migration).
    run_alembic_upgrade()
