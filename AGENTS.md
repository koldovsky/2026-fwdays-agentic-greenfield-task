# Agent Guidelines

Monorepo for an EPUB translation & voice-over web platform (hackathon sprint, mocked providers). Two package areas with **different package managers** (not npm):

- **[Backend](backend/AGENTS.md)** (`backend/`, Python + FastAPI) — managed with **uv**
- **[Frontend](frontend/AGENTS.md)** (`frontend/`, TypeScript + Next.js static export) — managed with **yarn**

The six BDD `.feature` files in `docs/features/` are the executable acceptance contract. Read the subdir `AGENTS.md` relevant to your task first; deep dives live in `docs/agents/`.

## Toolchain (ADRs 0007/0008/0009)

The toolchain runs on every commit via the repo-root [`.pre-commit-config.yaml`](.pre-commit-config.yaml). Install once: `pre-commit install` (host-level, NOT a project dep). Hooks run **ruff** on staged `*.py` and **biome** on staged `*.{ts,tsx,js,jsx,json,css}`. Type checking (`uv run pyrefly check` per ADR 0009) is intentionally NOT a commit gate — too slow for the inner loop. See `docs/adr/0007`, `0008`, `0009` for the rationale.

- **Spike findings for 2026-fwdays-agentic-greenfield-task** (lifespan startup logging patterns + alembic fileConfig gotchas) → `Skill("spike-findings-2026-fwdays-agentic-greenfield-task")`

## Source of truth hierarchy (later wins)

1. `docs/PRD.md` (v1.2) — full product contract
2. `docs/features/*.feature` — executable acceptance scenarios
3. `.planning/PROJECT.md` — sprint-scope overlay (relaxes/defers parts of the PRD)
4. `docs/adr/0001`–`0015` — locked stack decisions (ADRs 0001–0009) + Phase-2 NLTK decision (ADR 0010) + Phase 02.1 document-bdd-feature skill correction (ADR 0011, recording-config only, NOT in the locked stack tier) + Phase 1 provider SDKs (ADR 0012, openai + ollama Python clients, recording-config only, NOT in the locked stack tier) + Quick 260708-t1t in-process alembic (ADR 0013, migration-call-shape only, NOT in the locked stack tier) + Quick 260709-54r audioop-lts for pydub on Python 3.13 (ADR 0014, runtime-dep-install only, NOT in the locked stack tier) + Quick 20260711-0847 drop legacy punkt + flatten voice catalog (ADR 0015, D-09 response shape + voice-catalog router shape, NOT in the locked stack tier); do not re-litigate
5. `backend/AGENTS.md` / `frontend/AGENTS.md` + `docs/agents/*` + `docs/traceability/requirements-traceability.md` — distilled conventions + REQ-ID→tcid matrix; update if codebase drifts

## Decision documentation (ADRs for alternative-package / alternative-tool choices)

Whenever a phase (or any follow-up) picks one package, library, framework, tool, formatter, or service **over a credible alternative**, write an ADR under `docs/adr/` before merging the implementation. Use the existing template (e.g. `0006-use-mimesis-for-synthetic-epub-test-fixture-data-generation.md`):

- Numbered `NNNN-kebab-case-slug.md`. Pick the next number after the highest existing one in `docs/adr/`.
- Required sections: **Context and Problem Statement**, **Considered Options** (at least the chosen option + the strongest alternative), **Decision Outcome** (chose X, because …), **Consequences** (Good / Bad bullets).
- Cite the file:line or the BDD scenario that motivated the decision; reference the source-of-truth layer that locked it.
- Update the relevant sub-`AGENTS.md` (backend or frontend) with a one-line pointer to the new ADR.
- **Update the Source-of-truth hierarchy entry above** to extend the `docs/adr/0001`–`NNNN` range to the new max ADR number. This is MANDATORY on every new ADR — leaving the range stale silently demotes the new ADR below other source-of-truth tiers.
- If the new ADR joins the locked stack tier (typically only ADRs about core stack, formatter, or test-runner choices do), also add it to the hierarchy entry. If not, only update the max number — do not widen the locked tier scope.

This rule applies retroactively too: any open gray area from `02-CONTEXT.md` that was decided by picking a concrete tool (D-01 = NLTK, D-07 = `<span>` wrapper, D-08 = docker-compose, D-09 = regex fallback) gets a matching ADR if one does not exist yet. ADRs 0001–0009 are the existing locked stack; ADR 0010 covers D-01; ADR 0011 covers the document-bdd-feature skill defaults correction (D-03 + D-05 + D-06) and is recording-config only (NOT in the locked stack tier); ADR 0012 covers the Phase 1 provider-SDK choice (`openai` + `ollama` Python clients) and is recording-config only (NOT in the locked stack tier).

## Read before editing (deep dives)

- [Architecture](docs/agents/architecture.md) — hexagonal ports, `job_type` discriminator, in-process worker, single container. Read for any backend task.
- [Testing](TESTING.md) — end-to-end testing reference across the full stack.
- [API contract](docs/agents/api-contract.md) — endpoints, error envelope, thresholds.
- [Sprint scope](docs/agents/sprint-scope.md) — in/out scope, filename conventions.
- [Documentation](docs/agents/documentation.md) — how to document implemented features with video demonstrations.

## Demo with mocked external services

The fastest way to exercise the full stack without a GPU, an API key, or a
real translation provider is `docker compose up` from the repo root. The
compose file boots ONE service (the production image) on a loopback-only
host port binding (ADR-0003 single container — the image lives at the
repo-root `Dockerfile`).

### Quickstart

```bash
# From the repo root — boots the single backend container
# (FastAPI + SPA + in-process mocks). First run downloads
# images + bakes the NLTK data, so allow ~3 minutes.
docker compose up -d
docker compose ps  # wait until the service reports 'healthy'
```

### URLs

| Surface | URL | Notes |
| --- | --- | --- |
| SPA (Translation / Voice-Over chooser) | <http://localhost:8000> | Next.js static export served by uvicorn (same origin as the API) |
| API (auto-docs) | <http://localhost:8000/docs> | FastAPI OpenAPI UI |
| API (NLTK health) | <http://localhost:8000/api/v1/health/nltk> | D-09; reports `punkt_tab` install state (single NLTK package) |

### Stopping

```bash
docker compose down            # stop + remove containers (keeps images + named volumes)
docker compose down --volumes  # also drop the 4 named volumes (SQLite DB + scratch + audio + artifacts)
```

### Env vars

The compose file reads `EPUBTV_DEFAULT_OLLAMA_URL` and
`EPUBTV_DEFAULT_OPENAI_URL` from the `backend` service
environment (per WR-06 — the per-provider split replaces the
legacy single `MOCK_OPENAI_URL` env var); both default to
`http://mock-openai:8765/v1` (the in-network DNS name for the
`mock-openai` service in the compose stack per DOCKER-02). The
`mock-openai` service is the sprint default — a single uvicorn
app that exposes the consolidated OpenAI-compatible wire shape
(`/v1/chat/completions` + `/v1/audio/speech` + `/v1/models` +
`/v1/audio/voices` + `/healthz`) per
`epubtv.tools.mock_openai_service`. The backend lifespan
constructs the three per-provider HTTP adapter subclasses
(`OllamaHttpTranslationAdapter` + `OpenAIHttpTranslationAdapter` +
`OpenAIHttpTTSAdapter`) from these per-provider URLs — the Ollama
adapter reads `EPUBTV_DEFAULT_OLLAMA_URL`, the OpenAI-compatible
adapter + TTS adapter read `EPUBTV_DEFAULT_OPENAI_URL`. The
per-provider split lets the OpenAI-compatible adapter point at a
different upstream than the Ollama adapter without one URL
shadowing the other. The `MOCK_TRANSLATOR_BEHAVIOUR` /
`MOCK_TTS_BEHAVIOUR` per-chunk failure-injection env vars were
retired with the v1.1 in-process `MockTranslationAdapter` /
`MockTTSAdapter`; the failure-injection seam is now test-only
(the `tests/unit/_behaviour/test_behaviour_spec.py` module owns
it per plan 01-02 Task 1). The `MOCK_TRANSLATOR_URL` /
`MOCK_TTS_URL` per-service URL env vars + the
`CUSTOM_TRANSLATOR_URL` / `CUSTOM_TTS_URL` runtime-mode-toggle
env vars + the `/settings` runtime provider-mode toggle (and its
`app_settings` SQLite table + Alembic 0004 migration +
`AppSettingsRepo`) were all retired in plan 01-01; the demo
container has one mode, and the URL surface is the two
`EPUBTV_DEFAULT_*_URL` env vars.

### Architecture

```
┌──────────────┐  HTTP  ┌─────────────────────────────┐
│ Browser      │───────▶│ backend (single container)  │
│ (any client) │  8000  │  - FastAPI (--workers 1)    │
│              │◀───────│  - StaticFiles (SPA at /)   │
└──────────────┘        └─────────────────────────────┘
                               │      ▲
                               │      │ HTTP
                               │      │ (in-network)
                               ▼      │
                        ┌──────────────────────┐
                        │ mock-openai service  │
                        │ (same image; PID 1   │
                        │ runs mock_openai_    │
                        │ service uvicorn)     │
                        └──────────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ SQLite WAL   │
                        │ (db volume)  │
                        └──────────────┘
```

- The browser hits `http://localhost:8000` — same origin for the SPA
  and the API (no CORS in production; `EPUBTV_ENV=prod` disables
  `CORSMiddleware`).
- The backend is a single FastAPI process bound with `--workers 1`
  (mandatory per `backend/AGENTS.md`). On startup the lifespan
  composition root constructs the three per-provider HTTP adapter
  subclasses (`OllamaHttpTranslationAdapter` +
  `OpenAIHttpTranslationAdapter` + `OpenAIHttpTTSAdapter`) from
  the per-provider URL env vars (WR-06 — `EPUBTV_DEFAULT_OLLAMA_URL`
  for the Ollama adapter, `EPUBTV_DEFAULT_OPENAI_URL` for the
  OpenAI-compatible adapter + TTS adapter). The in-process
  `MockTranslationAdapter` + `MockTTSAdapter` are test-only
  fixtures (they live in `tests/unit/_adapters/`, not in
  production code).
- The `mock-openai` service runs in its own container (same
  image; different `command:`); it binds `0.0.0.0:8765` inside
  the container (per `MOCK_OPENAI_HOST` env var) and is reachable
  from the `backend` service via the in-network DNS name
  `mock-openai` (the compose default network resolves service
  names to container IPs). The host cannot reach the port because
  `expose:` does not publish a host binding.
- 4 named volumes (`epubtv-db`, `epubtv-scratch`, `epubtv-audio`,
  `epubtv-artifacts`) keep the demo state across `docker compose
  down`. Use `docker compose down --volumes` to reset. The db
  volume mounts the parent dir (`/app/db`) so the SQLite WAL/SHM
  sidecars stay on the same volume (Pitfall 3 in
  `260707-cxw-RESEARCH.md`).
