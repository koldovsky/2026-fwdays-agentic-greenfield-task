"""Alembic env.py — async engine resolved from ``epubtv.config.settings``.

Configuration:
- ``target_metadata = SQLModel.metadata`` so autogenerate sees the
  ``adapters/persistence/schema.py`` tables.
- The async engine URL is built from ``settings.db_path`` (sqlite+aiosqlite)
  with the same connect-arg + PRAGMA posture as the runtime engine (Pattern 2):
  ``check_same_thread=False`` + WAL / busy_timeout / synchronous / foreign_keys
  PRAGMAs injected via a ``connect`` event listener on ``engine.sync_engine``.

Per RESEARCH.md note at line 431: prod schema apply goes through Alembic,
NOT ``SQLModel.metadata.create_all``. This env.py is the canonical place where
migrations are applied; the lifespan-bound SQLiteJobRepository ships the same
PRAGMA posture for runtime connections but does NOT create tables.
"""

from __future__ import annotations

import asyncio
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import event, pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel

# Ensure the src/ package is importable when alembic is invoked from backend/.
# ``prepend_sys_path = .`` in alembic.ini already prepends ``backend/``; we
# also add ``src`` so ``import epubtv`` works under editable + non-edit installs.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from epubtv.adapters.persistence import (
    schema,  # noqa: F401  -- register models on SQLModel.metadata
)
from epubtv.config import settings

# this is the Alembic Config object, which provides access to values within
# the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# ``disable_existing_loggers=False`` is the canonical alembic fix that
# keeps the app's pre-existing loggers (``epubtv``, ``uvicorn``, etc.)
# enabled after ``fileConfig`` walks ``logging.root.manager.loggerDict``.
# Without it, fileConfig's default ``disable_existing_loggers=True``
# silently sets ``disabled=True`` on every logger not named in
# ``alembic.ini``'s ``[loggers]`` section — which is every logger
# the app cares about. The snapshot/restore in
# ``epubtv.tools.db_migrations.run_alembic_upgrade`` is the primary
# fix; this is defense in depth.
if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

# Single source of truth for the metadata Alembic autogenerate consults.
target_metadata = SQLModel.metadata


def _db_url() -> str:
    """Build the sqlite+aiosqlite URL from ``settings.db_path``."""
    return f"sqlite+aiosqlite:///{settings.db_path}"


def _apply_pragmas(dbapi_connection, _connection_record) -> None:
    """Mirror the runtime PRAGMA posture (Pattern 2) inside the migration engine."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — emits SQL to the script output."""
    context.configure(
        # Use the URL the Config was constructed with (set by
        # ``alembic_command.upgrade(cfg, ...)`` via
        # ``cfg.set_main_option("sqlalchemy.url", ...)``); fall back
        # to the env.py-resolved URL for CLI invocations where the
        # Config has no URL set.
        url=config.get_main_option("sqlalchemy.url") or _db_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,  # SQLite ALTER support
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations against the live async engine (PRAGMAs + WAL)."""
    connectable = create_async_engine(
        # Use the URL the Config was constructed with (set by
        # ``alembic_command.upgrade(cfg, ...)`` via
        # ``cfg.set_main_option("sqlalchemy.url", ...)``); fall back
        # to the env.py-resolved URL for CLI invocations where the
        # Config has no URL set.
        config.get_main_option("sqlalchemy.url") or _db_url(),
        connect_args={"check_same_thread": False},
        poolclass=pool.NullPool,
    )
    event.listen(connectable.sync_engine, "connect", _apply_pragmas)

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode against the async engine."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
