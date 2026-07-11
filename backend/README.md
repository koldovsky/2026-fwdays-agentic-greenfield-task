# EPUB Translator & Voice-Over — Backend

Python + FastAPI service, hexagonal ports, SQLite WAL, single `uvicorn --workers 1` process.

See `AGENTS.md`, `CONVENTIONS.md`, `TESTING.md` for conventions.

## Quickstart

```bash
uv sync
uv run alembic upgrade head
uv run uvicorn epubtv.main:app --workers 1 --reload
curl localhost:8000/health  # → {"status":"ok"}
```
