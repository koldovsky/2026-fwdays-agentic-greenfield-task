# 005 - 002-categories - code-review

> The `code-reviewer` sub-agent is hard read-only and returned its findings inline; the
> orchestrator persisted this record verbatim from that return.

## Run

- **Date:** 2026-07-10 (Europe/Kyiv)
- **Slice:** 002-categories
- **Role:** code-review (correctness), independent fresh context
- **Branch:** feat/002-categories
- **Commits:** (none — read-only)

## Objective

Independent correctness review of the slice-002 diff `git diff 5a8a3b8..HEAD` (commits
`ec0c30d` RED tests, `3db7600` GREEN impl) against the spec, the 10 OpenSpec scenarios,
FR-CAT-01/02/03, and architecture §2.1/§7.

## What was done

- Read-only review of all backend product files (model/repo/service/api/schema/migration),
  the two test files, the entry-point appends (main.py, models/__init__.py), pyproject
  coverage config, and the frontend (api.ts, App.tsx, pages/Categories/*).
- Cross-checked migration↔model, verified the single Alembic head and `down_revision` chain.
- Confirmed the `IntegrityError→409` / `None→404` ordering in the service, and that
  `db.py` `expire_on_commit=False` makes `CategoryRead.model_validate` after `commit()` safe.
- Unicode-aware emoji scan of `frontend/src/pages/Categories` → no matches (SVG icons only).

## Verification

```
$ git log --oneline 5a8a3b8..HEAD
3db7600 feat(categories): per-user CRUD + delete-as-archive to green
ec0c30d test(categories): ratified contract + RED acceptance tests

# migration<->model cross-check: partial unique index (user_id, name) WHERE archived_at
# IS NULL, user_id FK ON DELETE CASCADE + ix, BIGINT Identity, created_at now(),
# nullable description/archived_at; chain 0002 -> 0001_auth_email -> None; single head.
# emoji scan of pages/Categories -> No matches.
```

Did NOT run pytest/gate-slice (orchestrator verified GREEN serially — 27 passed, 97.04%;
re-running risks the known DB-concurrency flake).

## Findings

- `[MINOR] backend/app/schemas/categories.py:48-51` (with `services/categories.py:60-62`) —
  a PATCH body `{"name": null}` passes validation (`_require_non_empty` returns None for
  None), `exclude_unset` yields `{"name": None}`, the repo sets `name=None` and `flush()`
  raises a NOT-NULL `IntegrityError`, which the broad `except IntegrityError` maps to
  `409 "…already exists"`. Malformed input → misleading duplicate-name conflict (rolled
  back, no corruption). Out of the 10 scenarios → non-blocking. Direction: reject None for
  name/color in the update validator, or narrow the `except` to the unique-index constraint.
- `[MINOR] backend/tests/test_categories.py:121-128` (and `test_categories_extra.py:76-83`) —
  autouse cleanup deletes users by email-domain `LIKE`, so the DB suite is not safe under
  parallel pytest (`-n`): two workers would delete each other's in-flight accounts (the
  observed transient flake). Serial `RUN_DB_TESTS=1` runs are unaffected. Test-robustness,
  not a weakened assertion or product defect. Direction: scope teardown to the specific
  ids/emails created, or mark the DB suite serial, before any parallelization.

Assessed, not findings: coverage `concurrency=["greenlet"]` is a legitimate accuracy fix
(cannot fabricate coverage; no floor lowered); the App.tsx placeholder→Categories change is
in scope (allowlisted entry point, placeholder was explicitly temporary); no frontend unit
tests (acceptable for this slice; note for later UI slices).

## Verdict

PASS-with-minors (up to the orchestrator) — 0 BLOCKING, 2 MINOR. All 10 acceptance scenarios
correctly implemented and genuinely tested; isolation, partial-unique 409, cross-user 404,
and delete-as-archive all hold; migration matches the model; no test was weakened. Only the
Judge marks the slice done.

## What was NOT done / follow-ups

- Did not run pytest/gate-slice (per constraint). Did not review slice 001 / infra / the
  gate-fix commit (out of the slice-002 diff). Did not write this file directly (read-only
  boundary) — content returned to the orchestrator to persist. The two MINORs are the
  accepted non-blocking follow-ups.
