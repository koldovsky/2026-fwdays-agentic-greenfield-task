# 004 - categories - implementer

> Note: the `capability-implementer` sub-agent was interrupted by an API connection error
> mid-run and later stopped by the orchestrator to end a shared-DB test race (see the trace,
> STAGE 2). This record was **reconstructed by the orchestrator** from the on-disk result and
> independently-run gates, not authored by the sub-agent. Every Verification line below is real
> output the orchestrator captured, not a claim carried over from the interrupted agent.

## Run

- **Date:** 2026-07-10 19:05 (Europe/Kyiv, EEST)
- **Slice:** 002-categories
- **Role:** implementer (capability-implementer, interrupted; orchestrator-reconstructed record)
- **Branch:** feat/002-categories
- **Commits:** (produced by the orchestrator after verification) the slice-002 RED + GREEN commits

## Objective

Implement slice 002 (per-user categories CRUD + delete-as-archive) to green against the
`test-engineer`'s 10 RED acceptance tests, reusing the slice-001 auth/isolation, without
weakening any test.

## What was done

- **Backend (new modules, user_id-scoped):**
  - `backend/app/models/category.py` - `Category` per architecture §2.1: partial unique index
    `uq_categories_user_active_name` via `postgresql_where=text("archived_at IS NULL")`, `user_id`
    FK `ON DELETE CASCADE`.
  - `backend/app/repos/categories.py` - every method takes `user_id` and scopes by it; `get` returns
    `None` for a non-owned id (→ 404); `create`/`update` flush so the partial-index violation surfaces
    as `IntegrityError`.
  - `backend/app/services/categories.py` - owns the transaction; maps `IntegrityError` → 409
    (`DuplicateCategoryNameError`) the race-safe rollback way (mirrors `AuthService.register`); 404 via
    `CategoryNotFoundError`. `delete` always archives (design Open question 1).
  - `backend/app/api/categories.py` - thin router; `CurrentUser` on all routes, `require_csrf` on all
    mutations (NFR-SEC-02); 201 / 200 / 204; 409 duplicate; 404 cross-user. `PATCH` uses
    `model_dump(exclude_unset=True)` for true partial update.
  - `backend/app/schemas/categories.py` - `CategoryCreate` / `CategoryUpdate` / `CategoryRead`; name &
    color required non-empty; hex-format validation intentionally deferred (design Open question 5).
  - `backend/alembic/versions/0002_categories.py` - creates `categories` + the partial unique index;
    `down_revision = "0001_auth_email"`; hand-reviewed.
- **Allowlisted entry-point edits (additive):** `backend/app/main.py` (register router, +2/-0),
  `backend/app/models/__init__.py` (register `Category`, +2/-1), `frontend/src/api.ts` (Category HTTP,
  +32/-0), `frontend/src/App.tsx` (mount `CategoriesPage` over a slim identity/sign-out bar, +19/-9 -
  replaces the slice-001 placeholder that was explicitly a "later slice" stand-in).
- **Coverage config:** `backend/pyproject.toml` adds `[tool.coverage.run] concurrency = ["greenlet"]`
  - an accuracy fix so coverage.py traces async SQLAlchemy lines through greenlet context switches
  (documented mode for greenlet async); not a floor change.
- **Supplementary tests (implementer-owned, separate file, not the acceptance bar):**
  `backend/tests/test_categories_extra.py` - archived-name re-creation, blank-name 422, CSRF-required
  403, auth-required 401, cross-user list isolation, PATCH partial-update. Own `@cat-extra.local`
  cleanup domain.
- **Frontend:** `frontend/src/pages/Categories/CategoriesPage.tsx` + `categories.css` - DESIGN §7.4:
  responsive 3-col grid, ~80px color swatch, native `<input type="color">`, hover edit/delete with a
  confirm affordance, inline SVG icons (no emoji), delete=archive; all HTTP via `api.ts`; no per-card
  stats (out of scope).

## Verification

Real output captured by the orchestrator on a clean **serial** run (no concurrent DB access):

```
$ python scripts/gate-slice        # system python (rebuilds venv), full battery
==> [3/4] Backend: lint + types + migrations + tests (with DB)
All checks passed!                                   # ruff
Success: no issues found in 26 source files          # mypy
... 27 passed in 30.06s                              # pytest (verify.ps1)
==> [4/4] Frontend: install + typecheck + build
✓ built in 257ms                                     # tsc + vite (categories.css bundled)
==> Verification complete - stack wired end-to-end. OK
... 27 passed in 33.10s                              # pytest under coverage (ratchet)
==> gate-slice: backend coverage = 97.04%
gate-slice: coverage ratchet OK (97.04% >= floor 82%).
gate-slice: GREEN - stack verified and coverage ratchet held.
EXIT=0
```

The 10 acceptance tests pass unweakened (verified by reading `test_categories.py` - specific status +
DB-row assertions, no `xfail`/`skip`/`assert True`). Backend coverage 97.04% is earned by the
acceptance suite + the genuine supplementary tests, not padding.

## Findings

- `[MINOR] backend/tests/test_categories.py:121` (and slice-001 `test_auth.py`) - the autouse cleanup
  `DELETE FROM users WHERE email LIKE '%@<domain>.local'` deletes ALL of a domain's users, so the
  DB-backed suite is not safe under **concurrent** pytest processes on one Postgres (surfaced as a
  transient 4-failure when the stop-verify hook raced a background gate-slice; serial runs are 27/27).
  Not a slice-002 regression; a latent harness property. Follow-up: per-worker DB isolation if parallel
  test execution is ever adopted.

## Verdict

GREEN - the full `gate-slice` battery passes serially and all 10 acceptance tests pass without
weakening. Ready for the independent gate + review stages.

## What was NOT done / follow-ups

- Did not commit (the orchestrator commits). Did not wire a nav shell (later slice) - the Categories
  screen is mounted directly under a minimal identity bar. Did not implement anything from the
  spec's Out-of-scope (sessions/timer/metrics/coach, unarchive, per-card stats, sync cursor, hex
  validation). The concurrent-test-isolation MINOR above is the one honest caveat.
