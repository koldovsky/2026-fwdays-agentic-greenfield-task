---
name: python-fastapi
description: Best practices for this repo's Python backend — FastAPI, async SQLAlchemy 2.0, Pydantic v2, Alembic, and pytest. Use when writing or reviewing backend code (routes, models, schemas, DB access, config, tests) or when adding an AI-agent endpoint in Python.
---

# Python + FastAPI backend best practices

Conventions for the `backend/` service. Follow these when creating or reviewing Python code.

## Project layout

- `app/main.py` — `create_app()` factory + `app` ASGI object. Keep it thin.
- `app/config.py` — all configuration via `pydantic-settings`. **Never** read `os.environ`
  directly elsewhere; add a field to `Settings` and use `get_settings()`.
- `app/api/` — routers grouped by resource (`APIRouter`, tagged). One module per resource.
- `app/models/` — SQLAlchemy ORM models on the shared `Base`. Import new models in
  `app/models/__init__.py` so Alembic autogenerate sees them.
- `app/schemas/` — Pydantic request/response models (create this when the first resource
  lands). Keep API schemas separate from ORM models.
- `app/services/` — business logic. Routers stay thin: validate → call service → return.
- `app/repos/` — async SQLAlchemy repositories. **Every method that reads/writes a user's
  data takes `user_id` and scopes every query by it** (FR-AUTH-07); the only exceptions are the
  auth-bootstrap methods that *establish* identity (register, login, session-token lookup).
- `app/core/` — pure, framework-free helpers (no FastAPI/SQLAlchemy/I/O at import), e.g.
  `security.py` (bcrypt hashing + token generation).
- `tests/` — pytest, mirrors `app/`.

## Async everywhere

- Route handlers, DB access, and external I/O are `async def`. Never call blocking I/O in an
  async handler; use an async client or `anyio.to_thread.run_sync` for unavoidable blocking.
- Use the `SessionDep = Annotated[AsyncSession, Depends(get_session)]` pattern for DB access
  (avoids the `B008` "call in default arg" lint and reads cleanly).
- Commit explicitly (`await session.commit()`); the session factory uses
  `expire_on_commit=False`.

## Schemas & validation (Pydantic v2)

- Validate all input with Pydantic models; do not trust raw dicts.
- Separate `XCreate` (input), `XUpdate` (partial input), and `XRead` (output) models.
- Set `model_config = ConfigDict(from_attributes=True)` on read models to serialize ORM rows.
- Return typed responses (`response_model=...`) so the OpenAPI schema stays accurate.

## Database & migrations

- Every schema change ships with an Alembic migration:
  `alembic revision --autogenerate -m "add X"` then review the generated SQL by hand before
  committing — autogenerate is a draft, not the source of truth.
- Apply with `alembic upgrade head`. Migrations run in CI against a real Postgres.
- Prefer explicit column types and non-null defaults; add indexes for lookup columns.

## Errors & HTTP

- Raise `fastapi.HTTPException` (or a small custom exception + handler) for expected errors;
  let unexpected ones 500. Do not leak internal messages or stack traces to clients.
- Use correct status codes (201 on create, 204 on delete, 404 when missing).

## Security

- Secrets come from the environment only. `.env` is git-ignored; commit only `.env.example`.
- Keep CORS origins explicit (`Settings.cors_origins`); never `allow_origins=["*"]` with
  credentials in production.
- Validate and bound all user input; never build SQL by string concatenation — use SQLAlchemy
  constructs or bound parameters (`text("... :id")`, `{"id": id}`).
- **Auth (slice 001):** protected routes depend on `CurrentUser` (`app/api/deps.py`), which
  resolves the session cookie to a user or 401s. Hash passwords with bcrypt cost 12 via
  `passlib[bcrypt]`; never store or log plaintext. Session cookie is `HttpOnly; SameSite=None;
  Path=/` with env-driven `Secure`; mutating requests require the CSRF double-submit header.
  Enforce per-user isolation via the `user_id`-scoped repo rule above.

## Testing (the verification loop)

- Fast unit/route tests use httpx `ASGITransport` (in-process, no network) — see
  `tests/conftest.py`.
- DB-touching tests are gated behind `RUN_DB_TESTS=1` so the default `pytest` run stays
  hermetic; CI sets it with a live Postgres service.
- A change is "done" only when `ruff check .`, `pytest -q`, and (for schema changes)
  `alembic upgrade head` all pass. Prefer writing/adjusting a test with each behavior change.

## If you add an AI-agent endpoint (Python)

- Put the agent/LLM logic in `app/services/`, exposed via a thin router — keep transport
  (FastAPI) separate from reasoning (the agent).
- Read the `claude-api` skill first for current model IDs, pricing, tool-use, and the Agent
  SDK; do not hardcode model names from memory.
- Stream long responses; set explicit timeouts and token caps; never log full prompts that
  may contain secrets or PII.
- Treat the model as an untrusted input source: validate tool arguments and structured
  outputs before acting on them.
