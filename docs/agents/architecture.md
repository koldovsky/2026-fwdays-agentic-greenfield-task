# Architecture

Source: PRD §6 + ADRs 0003–0005. Read this for any backend task.

## Shape

Layered **modular monolith** with hexagonal (Ports & Adapters) provider abstraction, co-hosted in a **single container**: FastAPI API + in-process async worker + static SPA artifact served from persistent volume.

- **Domain services** own workflow logic; they do NOT import provider SDKs directly.
- **Ports** (Protocols) define the seams; adapters implement them. The sprint binds **mock adapters** at the FastAPI DI composition root — mocks are first-class production adapters this sprint, not test doubles.
- **`JobOrchestrator`** dispatches on the `job_type` discriminator to one of two independent workflow services.

See [Sprint scope](sprint-scope.md) for which adapters ship this sprint.

## Workflow separation is structural, not a UI toggle

- `TranslationWorkflowService` and `VoiceOverWorkflowService` are **independent domain services**.
- The Voice-Over body schema uses Pydantic `extra="forbid"` on the translation block → a `voiceover` job with translation fields is rejected at the schema layer (enforces F4-AC1 mechanically, not by convention).
- **F4 Voice-Over-only must transitively require only F1**, never F2/F3. Do not let voiceover code import translation services.

## `job_type` discriminator

Values: `translation` | `voiceover` | `translation+voiceover`. Stored as one column; drives request validation, orchestrator dispatch, progress event shape, and export artifact kind.

## In-process worker

- Single `asyncio.Task` sharing FastAPI's event loop. **No Celery, no Redis, no separate worker process.**
- 3 active slots + overflow rows marked `queued` in SQLite. Single-runner is acceptable for the demo (full queue + overflow is PRD Phase 4).
- Resume is **persisted** via `last_chunk_id` on every chunk commit, but the HTTP resume **endpoint** is deferred (PRD Phase 4). The seam is observable; the surface is not.

## Combined workflow (`translation+voiceover`)

**Scaffolded this sprint, NOT run end-to-end.** Schema, dispatch, persistence, and the WebSocket envelope exist so F5-AC1 (union) and F6-AC3 (combined artifact) hold, but the runtime chained loop is gated `--enable-combined-runtime=off`. The `@integration @smoke` combined scenarios in `voice-over-generation.feature` and `export-and-download.feature` are tagged `@defer-combined` so the live demo runner skips them. PRD Phase 3 flips the flag.

## SQLite (WAL)

Single-writer. Use the connection's single writer for job-state mutations; reads can fan out. WAL deadlock under 3 concurrent jobs is a known F5 risk — keep the writer path short and transactional.

## Persistence contract (observable)

- `translation_jobs` / `job_state` / `audio_files` tables via SQLModel 0.0.39 (unifies Pydantic schema + SQLAlchemy 2.0 ORM so `job_type` is one field).
- Schema lives in the codebase (SQLModel models); Alembic 1.18.5 for migrations.

## Buildtime configuration (Phase 1 plan 05 / D-06)

The repo-root `Dockerfile` declares four `ARG` constants + the NLTK punkt + punkt_tab bake:

- `ARG DEFAULT_OLLAMA_URL` (default `http://localhost:11434/v1`) — exposed as `ENV` for the runtime container; consumed by `backend/src/epubtv/config.py::Settings.default_ollama_url` (with `AliasChoices` env-var fallback to `EPUBTV_DEFAULT_OLLAMA_URL` + `DEFAULT_OLLAMA_URL`).
- `ARG DEFAULT_OPENAI_URL` (default `https://api.openai.com/v1`) — same shape; consumed by `Settings.default_openai_url`.
- `ARG NEXT_PUBLIC_DEFAULT_OLLAMA_URL` + `ARG NEXT_PUBLIC_DEFAULT_OPENAI_URL` — the same values exposed to the frontend static-export build (Next.js inlines `NEXT_PUBLIC_*` env vars at `next build` time). The SPA's `lib/buildtimeDefaults.ts` reads these via `process.env.NEXT_PUBLIC_*`.
- `RUN --mount=type=cache,target=/root/.cache/uv uv run python -m epubtv.tools.bake_nltk` — bakes the NLTK `punkt` + `punkt_tab` data into the image so the `SentenceChunker` does NOT trigger a network download on the first chunk (D-01 + Open Q 10).

The in-process `MockTranslationAdapter` + `MockTTSAdapter` (sprint default) IGNORE these values; the consolidated `mock_openai_service` (Plan 04) uses them as the URL fallback chain for `MOCK_OPENAI_URL` in custom mode.

Override at build time: `docker build --build-arg DEFAULT_OLLAMA_URL=http://other:11434/v1 --build-arg DEFAULT_OPENAI_URL=https://other.openai.com/v1 .`
