"""In-process alembic upgrade helper (quick 260708-t1t + ADR 0013).

The FastAPI lifespan calls :func:`run_alembic_upgrade` (via
``asyncio.to_thread``) on startup so the schema is always at head
before the first request — covering ``uv run uvicorn``,
``docker compose up``, the Playwright ``webServer``, and
``TestClient`` / ``ASGITransport`` tests with the same path.

The function invokes ``alembic.command.upgrade(...)`` **in-process**
(no subprocess). The in-process call uses the same migration
engine as the ``alembic`` CLI; the behaviour is unchanged (the
same migration scripts run; the same PRAGMAs are applied; the
same alembic ``env.py`` machinery is invoked).

The helper lives in the ``tools/`` namespace (alongside
``bake_nltk.py`` + ``safe_filename.py`` + ``mock_llm_service.py``)
— the canonical home for cross-cutting runtime utilities.

Design notes
------------

- Construct an ``alembic.config.Config`` from
  ``BACKEND_DIR / "alembic.ini"``. The ``Config.__init__`` reads
  the .ini and resolves the ``script_location`` to the absolute
  path of ``alembic/`` (so the migration scripts are found without
  setting ``cwd``).
- Set ``cfg.set_main_option("sqlalchemy.url", _db_url())`` so the
  migration ``env.py`` opens the same SQLite file the FastAPI
  process is bound to. The URL is built from the current
  ``settings.db_path`` (env-var-first, fallback to the cached
  Pydantic settings singleton).
- ``alembic.command.upgrade(cfg, "head")`` invokes
  ``alembic/env.py:run_migrations_online()`` which does
  ``asyncio.run(run_async_migrations())`` — the nested event loop
  is harmless because the call runs on a worker thread (via
  ``asyncio.to_thread``), not the FastAPI event loop.

Logging
-------

The helper logs at WARNING on failure (re-raises so the lifespan
propagates the boot failure; uvicorn / docker compose surface the
restart loop). The in-process call does not surface alembic's
stdout in a structured way; the migration's own logging is
configured via the ``alembic.ini`` ``[loggers]`` section.

Idempotency + process-level dedup
---------------------------------

``alembic upgrade head`` is a no-op when the DB is already at
head (one ``SELECT current_version`` round-trip per cold start).
The helper also caches a successful run via a module-level flag
so subsequent calls in the same Python process are an in-memory
no-op. In production, the FastAPI process starts once and the
lifespan runs once, so the cache is a single-hit optimisation. In
the BDD test infrastructure (``_SyncClient._drive``
lifespan-per-HTTP-call), the cache eliminates the
migration-on-startup cost per HTTP call while preserving the
contract: the *first* call still invokes the migration; later
calls trust the same-process result. The cache resets on process
restart, which matches the "migrations run on every backend
start" intent (one alembic call per backend process).
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

from alembic import command as alembic_command
from alembic.config import Config as AlembicConfig

_LOGGER = logging.getLogger("epubtv.tools.db_migrations")

# ``backend/`` is the directory that contains ``alembic.ini`` and
# ``alembic/``. Computed once at import time — the layout never
# changes at runtime.
# ``Path(__file__)`` = ``backend/src/epubtv/tools/db_migrations.py``;
# ``parents[3]`` is ``backend/``.
BACKEND_DIR = Path(__file__).resolve().parents[3]

# Module-level flag: set to ``True`` after the first successful
# ``alembic upgrade head`` invocation. Subsequent calls in the same
# process return immediately. Resets on process restart, which
# matches the "migrations run on every backend start" contract.
_alembic_upgrade_done: bool = False


def _db_url() -> str:
    """Build the sqlite+aiosqlite URL from the current ``db_path``.

    Mirrors ``backend/alembic/env.py:52-54``. The function
    resolves ``EPUBTV_DB_PATH`` first (the unit-test
    ``db_path`` fixture ``monkeypatch.setenv`` after the parent
    process imports ``epubtv.config.settings``, so the
    pydantic-settings cached field is stale); falling back to
    ``settings.db_path`` covers the production case where the
    env var is NOT set.
    """
    db_path = os.environ.get("EPUBTV_DB_PATH")
    if not db_path:
        from epubtv.config import settings

        db_path = str(settings.db_path)
    return f"sqlite+aiosqlite:///{db_path}"


def _snapshot_logging() -> dict:
    """Snapshot root level + root handlers + every named logger's state.

    ``alembic.config.fileConfig`` (invoked transitively via
    ``alembic.command.upgrade`` -> ``alembic/env.py``) walks the
    process-global ``logging.root.manager.loggerDict`` and sets
    ``disabled=True`` on every logger not named in
    ``alembic.ini``'s ``[loggers]`` section. It also resets the
    root level to ``WARNING`` per ``[logger_root]``. Without a
    snapshot/restore, the app's pre-existing loggers (``epubtv``,
    ``uvicorn``, etc.) go silent for the rest of the process
    lifetime after the lifespan-time migration runs.

    The snapshot covers only loggers that existed *before* the
    alembic call. Alembic's own loggers (``alembic.runtime.*``,
    ``sqlalchemy.engine``) are created *inside* the call and are
    left intact by the restore (the restore iterates the
    snapshotted loggers, not the post-alembic state).
    """
    root = logging.getLogger()
    loggers = {
        name: {
            "disabled": lg.disabled,
            "propagate": lg.propagate,
            "level": lg.level,
            "filters": list(lg.filters),
        }
        for name, lg in logging.root.manager.loggerDict.items()
        if isinstance(lg, logging.Logger)
    }
    return {
        "root_level": root.level,
        "root_handlers": list(root.handlers),
        "loggers": loggers,
    }


def _restore_logging(snap: dict) -> None:
    """Restore root level + root handlers + every named logger's state.

    Inverse of :func:`_snapshot_logging`. Replaces the root
    handler list (drop any handlers fileConfig added; re-add the
    ones that were there before) and resets the root level. For
    each snapshotted logger, restores ``disabled`` / ``propagate``
    / ``level`` / ``filters``.
    """
    root = logging.getLogger()
    for h in list(root.handlers):
        root.removeHandler(h)
    for h in snap["root_handlers"]:
        root.addHandler(h)
    root.setLevel(snap["root_level"])
    for name, st in snap["loggers"].items():
        lg = logging.getLogger(name)
        lg.disabled = st["disabled"]
        lg.propagate = st["propagate"]
        lg.level = st["level"]
        lg.filters = st["filters"]


def run_alembic_upgrade() -> None:
    """Apply pending alembic migrations in-process (ADR 0013).

    Sync helper; the lifespan calls it via ``asyncio.to_thread`` to
    keep the FastAPI event loop responsive while the migration runs.
    Cold start cost on the demo image is sub-second; warm starts
    are a no-op (one ``SELECT current_version`` round-trip).

    The helper is idempotent within a process: the first successful
    invocation sets a module-level flag, and subsequent calls
    return immediately without invoking alembic. This keeps the
    migration-on-startup contract in production (one alembic call
    per backend process = "every backend start") while avoiding the
    per-HTTP-call subprocess overhead in the BDD test
    ``_SyncClient._drive`` lifespan pattern.

    The in-process ``alembic.command.upgrade`` call uses the same
    migration engine the ``alembic`` CLI uses (no behaviour change
    in the migration pipeline). The env-var + cwd dance the prior
    subprocess implementation needed is gone — the
    ``alembic.config.Config(BACKEND_DIR / "alembic.ini")`` +
    ``cfg.set_main_option("sqlalchemy.url", _db_url())`` make the
    configuration explicit.

    Raises
    ------
    Exception
        When ``alembic.command.upgrade`` raises (any exception;
        alembic wraps the underlying SQLAlchemy error). The
        lifespan propagates this so uvicorn / docker compose /
        Playwright all see the failure as a startup error. The
        cache is NOT set on failure, so a retry can re-run the
        migration.
    """
    global _alembic_upgrade_done

    if _alembic_upgrade_done:
        # Same-process subsequent call: trust the first successful run.
        # Alembic's own idempotency would also make this a no-op at
        # the DB layer, but skipping the alembic.command call saves
        # the migration-engine startup overhead.
        return

    # Ensure the parent directory of the SQLite file exists; the
    # runtime engine opens the DB at lifespan startup so the
    # migration target must exist by the time alembic opens it.
    db_path = os.environ.get("EPUBTV_DB_PATH")
    if not db_path:
        from epubtv.config import settings

        db_path = str(settings.db_path)
    parent = Path(db_path).parent
    if parent and not parent.exists():
        parent.mkdir(parents=True, exist_ok=True)

    alembic_cfg_path = BACKEND_DIR / "alembic.ini"
    cfg = AlembicConfig(str(alembic_cfg_path))
    # Set the sqlalchemy URL so the migration env.py opens the
    # same SQLite file the FastAPI process is bound to.
    cfg.set_main_option("sqlalchemy.url", _db_url())

    _LOGGER.info("running alembic upgrade head (config=%s, db=%s)", alembic_cfg_path, db_path)
    # Snapshot the process-global logging state before the in-process
    # ``alembic_command.upgrade`` call. ``alembic/env.py`` runs
    # ``logging.config.fileConfig`` which clobbers the root level +
    # disables pre-existing loggers (the
    # ``disable_existing_loggers=True`` default). The ``finally``
    # block restores the snapshotted state so the app's loggers
    # (``epubtv``, ``uvicorn``, etc.) survive the migration and
    # continue to emit records for the rest of the process lifetime.
    try:
        snap = _snapshot_logging()
        try:
            alembic_command.upgrade(cfg, "head")
        finally:
            _restore_logging(snap)
    except Exception as exc:
        # Surface the alembic error at WARNING so a cold-start
        # failure is auditable in the lifespan log. The exception
        # is re-raised so the lifespan propagates the boot
        # failure.
        _LOGGER.warning("alembic upgrade head failed: %s", exc)
        raise
    _alembic_upgrade_done = True
