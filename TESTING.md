# Testing

End-to-end testing reference for the full stack (backend API + frontend SPA).

## Overview

The platform uses a **shared BDD contract**: the six Gherkin `.feature` files in `docs/features/` are consumed by both the backend (pytest-bdd) and frontend (Playwright) test suites. Tags on each scenario determine which layer executes it.

## Test layers

| Layer | Tool | Directory | Scope |
|---|---|---|---|
| Backend API + WS | pytest-bdd | `backend/tests/` | REST endpoints, WebSocket contracts, job orchestration, mock providers |
| Frontend SPA | Playwright | `frontend/tests/` | Browser interactions, page flows, static-export rendering |
| Integration | pytest-bdd + Playwright | both | Cross-layer flows (upload → translate → download) |

## Tag semantics (shared)

Every scenario carries exactly one **layer tag** and one **scope tag**:

**Layer tags:**

| Tag | Layer | Runner |
|---|---|---|
| `@web` | SPA / browser | Playwright |
| `@api` | REST + WS contract | pytest-bdd |
| `@integration` | end-to-end slice | pytest-bdd + Playwright |

**Scope tags:**

| Tag | When |
|---|---|
| `@smoke` | live demo path — judges run this |
| `@regression` | full CI gate |
| `@wip` / `@future` | deferred, skipped by sprint runner |
| `@defer-combined` | combined-workflow scenarios; live demo skips, CI may opt-in |

**Live demo runs `@smoke` only.** The full suite runs in CI.

## Running the full stack

```bash
# 1. Start the backend (required for Playwright)
cd backend && uv run uvicorn app.main:app --reload --workers 1

# 2. Backend tests (in-process, no server needed)
cd backend && uv run pytest                     # full suite
cd backend && uv run pytest -m smoke            # live demo slice

# 3. Frontend tests (against running backend)
cd frontend && yarn playwright test             # full suite
cd frontend && yarn playwright test --grep @smoke
```

## Cross-layer integration

Integration scenarios (`@integration`) exercise flows that span both layers:

1. User uploads EPUB via the SPA (Playwright drives the browser).
2. Backend processes the job (pytest-bdd asserts API contracts, job state transitions).
3. User downloads the result (Playwright asserts the download appears).

These scenarios require both the backend server and the frontend static export to be running. The backend serves the frontend build output, so starting the backend is sufficient.

## BDD test generation

The `.agents/skills/write-bdd-tests` skill orchestrates test generation with a planner → writer → verifier loop. See:

- [Backend testing](backend/TESTING.md) — pytest-bdd specifics, mock harness, pitfalls.
- [Frontend testing](frontend/TESTING.md) — Playwright, Page Object Model, step definitions.
