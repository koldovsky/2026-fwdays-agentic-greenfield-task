# Use in-process alembic.command.upgrade in the FastAPI lifespan

## Context and Problem Statement

The FastAPI lifespan in `backend/src/epubtv/api/app.py` runs an
`alembic upgrade head` step on startup so the schema is always at
head before the first request (quick 260707-tm5 — wired the prior
implementation via `asyncio.to_thread(subprocess.run([sys.executable,
"-m", "alembic", "upgrade", "head"], cwd=BACKEND_DIR, env=env,
check=True, capture_output=True, text=True))` in
`backend/src/epubtv/api/_startup.py:84-158`). The subprocess path
paid a ~0.6s Python-interpreter + alembic import + alembic config
parse overhead per cold start (local `uv run uvicorn`, `docker
compose up`, the Playwright `webServer`, `TestClient` /
`ASGITransport` tests) + the same ~0.6s overhead per HTTP call in
the BDD test infrastructure's `_SyncClient._drive` lifespan-per-
HTTP-call pattern. The subprocess implementation also required an
env-var + cwd dance (forwarding `EPUBTV_DB_PATH` to the subprocess
+ setting `cwd=BACKEND_DIR` so alembic could find `alembic.ini`
without `-c`). How do we keep the migration-on-startup contract
while removing the subprocess overhead and the env-var / cwd
plumbing?

## Considered Options

* `alembic.command.upgrade(alembic_cfg, "head")` in-process via
  `alembic.config.Config` (chosen)
* Keep the `subprocess.run([sys.executable, "-m", "alembic",
  "upgrade", "head"], ...)` path (the prior 260707-tm5
  implementation)
* Async bridge via `loop.run_in_executor` to call
  `alembic.command.upgrade` directly from the lifespan async path
  — Alembic is sync, so the executor approach is equivalent to
  `asyncio.to_thread`; reject as not adding value

## Decision Outcome

Chosen option: "in-process `alembic.command.upgrade`", because the
alembic Python API is the same migration engine the `alembic` CLI
uses, with no behaviour change in the migration pipeline (the
same `alembic/env.py:run_migrations_online()` machinery runs; the
same migration scripts apply; the same PRAGMAs are configured).
The in-process call saves the subprocess startup cost
(Python-interpreter spawn + alembic import + alembic config parse,
~0.6s on the demo image) per cold start + per BDD test lifespan in
the `_SyncClient._drive` pattern. The env-var + cwd dance the
subprocess needed is gone — `alembic.config.Config(BACKEND_DIR /
"alembic.ini")` + `cfg.set_main_option("sqlalchemy.url", _db_url())`
makes the configuration explicit (the Config carries the URL, the
in-process call passes the Config to alembic, env.py's
`run_migrations_online()` reads the URL from the Config via
`config.get_main_option("sqlalchemy.url")`).

The helper was also moved from `backend/src/epubtv/api/_startup.py`
to `backend/src/epubtv/tools/db_migrations.py` — the `tools/`
namespace is the canonical home for cross-cutting runtime
utilities (mirrors `bake_nltk.py` + `safe_filename.py` +
`mock_openai_service.py`); `api/` is reserved for FastAPI routers
+ the app factory. The helper's `BACKEND_DIR` constant + the
`_alembic_upgrade_done` module-level cache + the same `db_path`
resolution (env-var-first, fallback to `settings.db_path`) + the
same fail-loud contract (re-raise on failure; cache NOT set on
failure; uvicorn / docker compose surface the failing boot) are
preserved verbatim.

This is **not** a locked-stack-tier change. It does not affect the
`alembic` dependency choice itself (locked at the repo-root
`backend/pyproject.toml` `[project] dependencies` line) nor the
tooling tier. It is recording-config only — the migration call
shape changes from subprocess to in-process, with no new
dependency, no version bump, no CLI flag change.

### Alternatives considered

- **Keep the subprocess path** would preserve the prior
  implementation; the subprocess is hermetic (the venv Python
  always wins on `sys.executable`) and the env-var forwarding
  keeps the migration's DB aligned with the FastAPI process. The
  ~0.6s subprocess overhead is the cost. For the BDD test
  infrastructure's `_SyncClient._drive` lifespan-per-HTTP-call
  pattern, this overhead multiplies by the number of HTTP calls in
  a scenario (a typical F5 happy-path scenario has 5-10 calls =
  3-6 seconds of pure subprocess overhead per scenario). The
  in-process call is the only way to remove this overhead without
  changing the migration semantics.
- **`loop.run_in_executor` bridge** would call
  `alembic.command.upgrade` directly from the lifespan async path
  via the default executor. Alembic is sync, so the executor
  approach is functionally equivalent to `asyncio.to_thread(...)`
  (the lifespan already uses `asyncio.to_thread(run_alembic_upgrade)`
  — line 105 of `app.py`); the executor adds no value. Reject.

### Consequences

* Good, because the in-process call saves ~0.6s of subprocess
  startup per cold start + per BDD test lifespan, multiplying to
  measurable per-scenario runtime savings in the BDD suite
  (a typical F5 happy-path scenario with 5-10 HTTP calls saves
  3-6 seconds of pure subprocess overhead).
* Good, because the env-var + cwd dance the subprocess needed is
  gone — `alembic.config.Config(BACKEND_DIR / "alembic.ini")` +
  `cfg.set_main_option("sqlalchemy.url", _db_url())` makes the
  configuration explicit. The Config carries the URL; env.py's
  `run_migrations_online()` reads it from the Config. A future
  reader of the helper sees one canonical place where the DB URL
  is set on the migration engine.
* Good, because the helper moves to the canonical
  `tools/db_migrations.py` namespace alongside the other
  cross-cutting runtime utilities (`bake_nltk.py` +
  `safe_filename.py` + `mock_openai_service.py`). The `api/`
  namespace stays reserved for FastAPI routers + the app factory.
* Bad, because the in-process call uses the same
  `env.py:run_migrations_online()` which calls
  `asyncio.run(run_async_migrations())` — this nests a new event
  loop inside the `asyncio.to_thread` worker thread, which is
  harmless (each `asyncio.run` creates a fresh event loop) but
  worth documenting. A future phase could refactor `env.py` to a
  pure-sync path if the nested-loop pattern ever bites
  (unlikely — the migration is a one-shot per process boot).
* Bad, because the helper now requires `env.py` to honour the
  Config's `sqlalchemy.url` (the prior `env.py` ignored the
  Config's URL and called its own `_db_url()` directly). The
  `env.py` change in this plan (replace `_db_url()` with
  `config.get_main_option("sqlalchemy.url") or _db_url()` in
  `run_migrations_offline()` + `run_async_migrations()`) is
  minimal — the `or _db_url()` fallback preserves the CLI
  invocation shape where the Config has no URL set.

### Implementation

- `backend/src/epubtv/tools/db_migrations.py` (new): the
  in-process helper. Imports `from alembic import command as
  alembic_command` + `from alembic.config import Config as
  AlembicConfig` at module top. Constructs
  `cfg = AlembicConfig(BACKEND_DIR / "alembic.ini")` and calls
  `cfg.set_main_option("sqlalchemy.url", _db_url())` before
  `alembic_command.upgrade(cfg, "head")`. The module-level
  `_alembic_upgrade_done` flag preserves the same-process
  short-circuit the prior subprocess path provided (one alembic
  call per backend process).
- `backend/src/epubtv/api/_startup.py` (deleted): the prior
  subprocess-based helper. The `api/` namespace no longer owns
  the migration call.
- `backend/src/epubtv/api/app.py` (line 76): the import changes
  from `from epubtv.api._startup import run_alembic_upgrade` to
  `from epubtv.tools.db_migrations import run_alembic_upgrade`.
  The `await asyncio.to_thread(run_alembic_upgrade)` call (line
  105) is unchanged — the in-process call is still sync (Alembic
  is sync), so the thread-pool wrapper stays.
- `backend/alembic/env.py` (lines 67-99): `run_migrations_offline()`
  + `run_async_migrations()` now read the URL from the Config via
  `config.get_main_option("sqlalchemy.url")` with a fallback to
  the env.py-resolved `_db_url()` for CLI invocations where the
  Config has no URL set. The `or _db_url()` fallback preserves
  the operator's manual `cd backend && alembic upgrade head`
  shape.
- `backend/tests/conftest.py` (lines 56-72): the
  `_reset_alembic_cache` autouse fixture now imports + resets
  from `epubtv.tools.db_migrations` instead of
  `epubtv.api._startup`.
- `backend/tests/unit/test_lifespan_migrations.py`: rewritten to
  assert the in-process call shape — 4 mock-based unit tests
  patch `alembic.command.upgrade` + assert `subprocess.run` is
  NOT called, plus 1 integration test that drives a real
  in-process alembic upgrade against a per-test tmp SQLite
  (`monkeypatch.setenv("EPUBTV_DB_PATH", str(db_path))`) to prove
  end-to-end equivalence. All 5 tests green.
- The repo-root `AGENTS.md` source-of-truth hierarchy range
  extends from `docs/adr/0001–0012` to `docs/adr/0001–0013`
  (per the mandatory rule in `AGENTS.md`: "leaving the range
  stale silently demotes the new ADR below other source-of-truth
  tiers"). ADR 0013 is NOT added to the locked stack tier — it
  is recording-config / migration-call-shape only, NOT core
  stack / formatter / test-runner.
- The repo-root `backend/AGENTS.md` "Read before editing"
  section gains a one-line pointer to ADR 0013 (the existing
  pointers to 0007/0008/0009/0010/0012 set the pattern).
