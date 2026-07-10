# Backend — FastAPI + PostgreSQL

Async FastAPI service. Full conventions: [`AGENTS.md`](../AGENTS.md) and the
[`python-fastapi`](../.claude/skills/python-fastapi/SKILL.md) skill.

## Quick start

```powershell
docker compose up -d db          # from repo root
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

- API: <http://localhost:8000>  ·  Interactive docs: <http://localhost:8000/docs>
- `GET /health` — liveness (no DB)
- `GET /health/db` — readiness (runs `SELECT 1` on Postgres)

## Checks

```powershell
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m mypy app
.\.venv\Scripts\python.exe -m pytest -q          # $env:RUN_DB_TESTS=1 to include the DB test
```

## Migrations (Alembic)

```powershell
.\.venv\Scripts\python.exe -m alembic revision --autogenerate -m "describe change"
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Add new ORM models under `app/models/` and import them in `app/models/__init__.py` so
autogenerate can see them. Always review generated SQL before committing.

## Layout

```
app/
  main.py        app factory + ASGI entrypoint (app.main:app)
  config.py      pydantic-settings
  db.py          async engine / session
  api/           routers (health.py)
  models/        ORM models on Base
tests/           pytest (conftest uses in-process ASGI transport)
alembic/         migration environment
```
