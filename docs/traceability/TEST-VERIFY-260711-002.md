# F7/F8/Demo test verifier — iteration 2 (2026-07-11)

## Scope

Re-run of the F7/F8 @web + DEMO gate after the URL fix + F7-SC02 page.route collapse + F8-SC08 provider-mock inline-stub fixes applied by the orchestrator in the same iteration (no separate subagent pass — the fixes are surgical and bounded to two files).

## Gates

| Gate | Result |
|---|---|
| Backend pytest (`tests/bdd` with `not slow and not defer_combined and not defer_scaling`) | **PASS** — 61 passed, 6 skipped, 3 deselected. 6/6 F7 BDD scenarios pass (no regression). |
| Backend ruff (`uv run ruff check .` + `ruff format --check .`) | **PASS** for files in scope. 1 pre-existing `I001` (imports) on `backend/src/epubtv/adapters/persistence/schema.py` from Quick 260710-oih (not from this pass; out of scope). |
| Frontend tsc (`yarn tsc --noEmit`) | **PASS** — clean. |
| Frontend lint (`yarn lint`) | **PASS** — clean. |
| Frontend Playwright (`npx playwright test` — full suite) | **PASS for 47/49**; 2 pre-existing failures documented below. |

## Per-file results

| Spec file | Tests | Pass | Fail | Notes |
|---|---|---|---|---|
| `workflow_cancellation_steps.spec.ts` | 4 | 4 | 0 | All F7 @web pass after URL fix + F7-SC02 page.route collapse |
| `navigation_back_to_chooser_steps.spec.ts` | 9 | 9 | 0 | All F8 @web pass after URL fix + F8-SC08 inline provider-mock stub |
| `demo_translation.spec.ts` | 1 | 0 | 1 | Pre-existing — the test webserver (started by `playwright.config.ts`) has no `mock-openai` service reachable; needs `docker compose up` for the model-list POST + translation latency; marked `Partial` in the test plan per the `@demo` convention |
| `job_status_steps.spec.ts` (pre-existing F5 happy-path) | — | 0 | 1 | Pre-existing — same root cause as DEMO-01-SC01: test webserver has no mock-openai; the test was originally verified under `docker compose up` per the test plan note. NOT in this plan's scope. |

## Status table delta (test plan)

| Before (TEST-VERIFY-260711-001) | After (this iter) |
|---|---|
| Full 107 / Partial 1 / Broken 13 / Pending 4 | **Full 120 / Partial 1 / Broken 0 / Pending 4** |

- 13 Broken rows (4 F7 @web + 9 F8 @web) all promoted to `Full`.
- DEMO-01-SC01 stays `Partial` per `@demo` convention.
- 4 Pending (F7 BDD impl-gap) stay `Pending` — out of scope, require backend impl changes.

## Verdict

**CONVERGED** (modulo the 2 pre-existing failures that are out-of-scope for this plan and already documented in the test plan as `Partial` / known-environment-dependency).

The writer's loop terminates here: 0 Broken rows, 0 pending writer-side work, 4 Pending impl-gap rows that the orchestrator should surface to the user in a follow-up plan.

## Open follow-ups for the orchestrator (NOT a verdict on this plan)

1. **F7 BDD impl-gap** (4 Pending rows): the `cancel_job` delete-pattern design from Quick 260710-oih + the missing `JOB_CANCELLED` constant in `error_codes.py` mean 4 Gherkin scenarios (JOBS-06-SC09 expired 409, SC11/12 `job_cancelled` 410, SC13 partial artifacts retained) cannot be bound until the impl grows an `expired` terminal-state branch + a `job_cancelled` 410 envelope on the download router + a partial-artifact retention path. These belong to a future plan (likely "Phase 4: cancel 410 + retention").
2. **F5-SC01 + DEMO-01-SC01 environment**: the test webserver started by `playwright.config.ts` does not have `mock-openai` reachable. The F5 happy-path + the demo happy-path both depend on a live provider. Options: (a) document `docker compose up` as a hard prerequisite for these tests, (b) extend the test webserver to spawn a per-process `mock-openai` (matches the demo container's behaviour per ADR 0003), (c) have the F5 happy-path + DEMO test stub the model-list + translation POSTs (re-scopes them to "SPA wire shape only, not provider integration").
3. **Pre-existing SPA bug** at `frontend/src/components/TranslationConfigStep.tsx:182`: `router.push("/jobs?id=...")` does not resolve via the Starlette `StaticFiles` mount. Fix: change to `router.push("/jobs.html?id=...")`. This was flagged in TEST-VERIFY-260711-001 but not in this plan's scope; should land as a separate quick fix.

VERDICT: CONVERGED
