# ADR 0001 — Technology stack for the greenfield app

- **Status:** accepted
- **Date:** 2026-07-09

## Context

Homework for *Agentic Engineering: Greenfield*. The stack is free; the grading is about the
engineering process. We want a small, familiar, production-shaped stack that runs locally with
one dependency (Docker for Postgres) and has a fast, scriptable verification loop.

## Decision

- **Backend:** FastAPI + Uvicorn — async-first, typed, great DX, first-class OpenAPI.
- **Data:** PostgreSQL with SQLAlchemy 2.0 async + Alembic migrations.
- **Config:** pydantic-settings (env-driven, no secrets in code).
- **Frontend:** React 18 + Vite + TypeScript (strict) — minimal, fast, widely understood.
- **Tests:** pytest with httpx `ASGITransport` for hermetic route tests; DB tests gated by an
  env flag and run against real Postgres in CI.
- **Tooling:** ruff + mypy (backend), `tsc` strict (frontend), Docker Compose for the DB.
- **Package manager (Python):** `pyproject.toml` is uv-compatible, but the repo drives setup
  with plain `venv` + `pip` so no extra global tool is required.

## Consequences

- Anyone can run the whole thing with Python, Node, and Docker — no `make`/`uv` required.
- Async choices mean all I/O paths must stay non-blocking (documented in the `python-fastapi`
  skill).
- The vertical slice (`/health`, `/health/db`, React status page) exists purely to prove the
  wiring; product features arrive via specs in `docs/specs/`.
