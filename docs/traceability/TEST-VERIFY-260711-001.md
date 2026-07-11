# Test Verification — 2026-07-11 / 260711-001

**Scope token:** `component-module=bdd-f7-f8-demo`
**Verifier:** test-verifier subagent
**Test plan:** `docs/traceability/TEST-PLAN.md` (F7 section at lines 124-167, F8 section at 169-188, DEMO section at 189-194)
**Verdict file:** `docs/traceability/TEST-VERIFY-260711-001.md`

## Scope summary

| Row group | Count | Test surface |
|---|---|---|
| F7 backend BDD bound (SC03..SC08) | 6 | pytest-bdd |
| F7 backend BDD impl-gap (SC09, SC11, SC12, SC13) | 4 | pytest-bdd (NOT bound — impl gap) |
| F7 @web Playwright (SC01, SC02, SC10, SC14) | 4 | Playwright |
| F8 @web Playwright (SC01..SC09) | 9 | Playwright |
| DEMO @web @demo (SC01) | 1 | Playwright |
| **Total** | **24** | |

## Gate results (4 gates)

### Gate 1 — Backend pytest (CRITICAL) — PASS

```
$ cd backend && uv run pytest tests/bdd/test_workflow_cancellation.py -q --no-header
......                                                                   [100%]
6 passed, 29 warnings in 1.79s
```

All 6 bound F7 backend BDD scenarios pass. Re-run with the full BDD suite (the
`-m 'not slow and not defer_combined and not defer_scaling'` filter):

```
$ cd backend && uv run pytest tests/bdd -q --no-header -m 'not slow and not defer_combined and not defer_scaling' -v
collected 70 items / 3 deselected / 67 selected

tests/bdd/test_epub_upload_and_validation.py .........                   [ 13%]
tests/bdd/test_export_and_download.py .....s..sssss...                   [ 37%]
tests/bdd/test_html_aware_translation_pipeline.py ...........            [ 53%]
tests/bdd/test_job_management_and_persistence.py ...........             [ 70%]
tests/bdd/test_translation_configuration.py ...                          [ 74%]
tests/bdd/test_voice_over_generation.py ...........                      [ 91%]
tests/bdd/test_workflow_cancellation.py ......                           [100%]

========== 61 passed, 6 skipped, 3 deselected, 219 warnings in 20.85s ==========
```

**67 selected = 61 pre-existing + 6 new F7** (the 6 skipped are pre-existing
F6 export_and_download `@pytest.mark.skip` rows; the 3 deselected are
`slow`/`defer_*` filtered out). No regressions.

### Gate 2 — Backend ruff (CRITICAL) — PASS

```
$ cd backend && uv run ruff check tests/bdd/test_workflow_cancellation.py && \
    uv run ruff format --check tests/bdd/test_workflow_cancellation.py
All checks passed!
1 file already formatted
```

### Gate 3 — Frontend typecheck + lint (CRITICAL) — PASS

```
$ cd frontend && yarn tsc --noEmit
Done in 2.75s.

$ cd frontend && yarn lint
Checked 60 files in 74ms. No fixes applied.
Done in 0.23s.
```

### Gate 4 — Frontend Playwright (CRITICAL) — FAIL (URL bug in 14/14 tests)

**Setup:** ran `mock-openai` on `127.0.0.1:8765` (local) + `uvicorn epubtv.main:app --port 5173`
with `EPUBTV_DEFAULT_OLLAMA_URL=http://localhost:8765/v1` + `EPUBTV_DEFAULT_OPENAI_URL=http://localhost:8765/v1`.

**Per-spec results:**

```
$ cd frontend && timeout 240 npx playwright test workflow_cancellation_steps.spec.ts
3 passed (22.4s)
1 failed: JOBS-06-SC02 (Clicking Cancel on a running job calls DELETE and the button transitions to a disabled Cancelling label)

$ cd frontend && timeout 240 npx playwright test navigation_back_to_chooser_steps.spec.ts
8 passed (32.3s)
1 failed: JOBS-07-SC08 (A new job submitted after navigating back is a fresh POST with no implicit link to the prior job)

$ cd frontend && timeout 90 npx playwright test demo_translation.spec.ts
1 failed: DEMO-01-SC01 (model list empty after Load Model List)
```

**Root cause (URL bug):** the writer's POM helper at
`frontend/tests/pom/JobStatusPage.ts:211` (`gotoJobWithStatus`) and `:27`
(`gotoJob`) both call `page.goto('/jobs?id=...')`. The Starlette 1.3.1
`StaticFiles` mount at `backend/src/epubtv/api/app.py:272-276` does NOT
auto-resolve `/jobs` to `/jobs.html` — confirmed via
`curl -I http://127.0.0.1:5173/jobs` → 404 (the `out/jobs.html` file
exists but the lookup doesn't reach it). The existing F5/F6 @web specs
at `job_status_steps.spec.ts:178` + `:219` use `/jobs.html?id=...` to
work around this; the writer's POM does not.

**Fix:** change line 211 of `frontend/tests/pom/JobStatusPage.ts` from
`/jobs?id=` to `/jobs.html?id=`. After applying the fix, 11 of 14 new
@web tests pass (verified by patching the POM in-place and re-running).
The 3 remaining failures (F7-SC02, F8-SC08, DEMO-SC01) have additional
issues:

- **F7-SC02** (`workflow_cancellation_steps.spec.ts:127`): the test
  registers a second `page.route` for the DELETE that calls
  `route.continue()` for GET requests, which overrides the first
  `stubJobStatus` stub (the actual backend then returns 404 for the
  synthetic id, the panel never receives the `status: "running"`
  payload, and `data-status` stays `"connecting"`). Fix: collapse the
  two `page.route` handlers into one that handles both GET (200 +
  stubbed JobView) and DELETE (204 with 500ms delay).
- **F8-SC08** (`navigation_back_to_chooser_steps.spec.ts:302`): the
  test's `clickLoadModelList` hits the real Ollama `/api/tags` model
  list endpoint which the local mock-openai service does NOT serve
  (mock serves `/v1/models` only); the model select stays empty and
  `configPage.pickModel` fails. Pre-existing mock-openai issue, not a
  writer bug per se — but the test should stub `POST
  /api/v1/providers/ollama/models` with a synthetic model list to be
  hermetic.
- **DEMO-SC01** (`demo_translation.spec.ts:114`): same mock-openai
  issue as F8-SC08 + the `page.waitForURL(/\/jobs\?id=/)` regex never
  matches because the SPA's `router.push("/jobs?id=...")` at
  `TranslationConfigStep.tsx:182` is also affected (the static server
  returns 404 for `/jobs`). This is a pre-existing bug in the SPA's
  submit handler, not the writer's test code — but it means the
  submit-then-waitForURL pattern in the demo test never lands on the
  jobs page.

**Per-row verdict (Playwright):**

| TCID | Status | Reason |
|---|---|---|
| JOBS-06-SC01 | Broken | URL fix at `JobStatusPage.ts:211` (`/jobs` → `/jobs.html`) |
| JOBS-06-SC02 | Broken | URL fix + `page.route` override conflict at `workflow_cancellation_steps.spec.ts:127` |
| JOBS-06-SC10 | Broken | URL fix; re-scope is correct |
| JOBS-06-SC14 | Broken | URL fix; re-scope is correct |
| JOBS-07-SC01 | Broken | URL fix |
| JOBS-07-SC02 | Broken | URL fix |
| JOBS-07-SC03 | Broken | URL fix; re-scope is correct |
| JOBS-07-SC04 | Broken | URL fix |
| JOBS-07-SC05 | Broken | URL fix |
| JOBS-07-SC06 | Broken | URL fix |
| JOBS-07-SC07 | Broken | URL fix |
| JOBS-07-SC08 | Broken | URL fix + mock-openai Ollama `/api/tags` issue |
| JOBS-07-SC09 | Broken | URL fix |
| DEMO-01-SC01 | Partial | `@demo` convention (always Partial); the URL bug is in the SPA's `router.push` (`TranslationConfigStep.tsx:182`), not the writer's code |

## Test Plan update applied

Updated in-place at `docs/traceability/TEST-PLAN.md` per the gate results:

- **F7 backend BDD** (lines 142-152): 6 rows promoted from `Pending` to `Full` with the binding locations (`test_workflow_cancellation.py:183` for SC03, `:201` for SC04, `:222` for SC05, `:236` for SC06, `:251` for SC07, `:263` for SC08) + the re-scope notes for SC03, SC04, SC05 (delete-pattern impl; 204 instead of 202; row-is-gone instead of status-cancelled). 4 rows stay `Pending` with the impl-gap reasons (SC09 expired, SC11/12 JOB_CANCELLED, SC13 partial artifacts retained).
- **F7 @web Playwright** (lines 160-165): all 4 rows marked `Broken` with the binding locations (`workflow_cancellation_steps.spec.ts:97`, `:111`, `:183`, `:233`) + the URL-fix improvement note.
- **F8 @web Playwright** (lines 175-185): all 9 rows marked `Broken` with the binding locations (`navigation_back_to_chooser_steps.spec.ts:87`, `:108`, `:128`, `:145`, `:168`, `:184`, `:217`, `:272`, `:336`) + the URL-fix improvement note.
- **DEMO** (line 195): 1 row stays `Partial` per `@demo` convention with the binding location (`demo_translation.spec.ts:103`) + a note about the SPA's `router.push` pre-existing bug.
- **Summary statistics + Status breakdown** (lines 322-339): updated to reflect the new counts (107 Full, 13 Broken, 4 Pending, 1 Partial).

## Per-scope counts (post-update)

| Scope | Tests | Passed | Failed | Re-scoped | Pending | Broken | Partial |
|---|---|---|---|---|---|---|---|
| F7 backend BDD | 10 | 6 | 0 | 3 (SC03, SC04, SC05 — re-scoped to row-is-gone / 204) | 4 (SC09, SC11, SC12, SC13 — impl gap) | 0 | 0 |
| F7 @web Playwright | 4 | 0 (locally, without URL fix) | 4 | 2 (SC10, SC14 — re-scoped to button-absent / stubbed-row) | 0 | 4 | 0 |
| F8 @web Playwright | 9 | 0 (locally, without URL fix) | 9 | 1 (SC03 — re-scoped to stubbed-row) | 0 | 9 | 0 |
| DEMO | 1 | — | — | — | — | 0 (Partial per convention) | 1 |
| **Total** | **24** | **6** | **13** | **6 re-scoped** | **4 pending** | **13 broken** | **1 partial** |

## CONVERGED criteria check

| Criterion | Met? | Notes |
|---|---|---|
| All 6 bound F7 backend BDD scenarios are `Full` / `Partial` / `Stale` | YES | All 6 are `Full` |
| All 4 F7 @web Playwright scenarios are `Full` / `Partial` / `Stale` | **NO** | All 4 are `Broken` |
| All 9 F8 @web Playwright scenarios are `Full` / `Partial` / `Stale` | **NO** | All 9 are `Broken` |
| The 1 DEMO scenario is `Partial` | YES | `Partial` per convention |
| The 4 impl-gap F7 backend BDD scenarios are `Pending` | YES | All 4 are `Pending` (acceptable — not testable as-implemented) |
| All 4 gates ran without unhandled exceptions | YES | Gates 1-3 passed; Gate 4 ran (didn't time out) and produced a clean verdict per-test |

## Flagged follow-up actions for the orchestrator

1. **Apply the URL fix at `frontend/tests/pom/JobStatusPage.ts:211`** (and the deprecated `:27`) — change `/jobs?id=` to `/jobs.html?id=`. This single one-line fix unblocks 11 of the 14 failing Playwright tests. The 3 remaining failures (F7-SC02, F8-SC08, DEMO-SC01) have additional issues documented above.
2. **Fix the F7-SC02 `page.route` override conflict** at `workflow_cancellation_steps.spec.ts:127` — collapse the two `page.route` handlers into one.
3. **Fix the pre-existing SPA bug at `TranslationConfigStep.tsx:182`** — `router.push("/jobs?id=...")` should be `router.push("/jobs.html?id=...")` to match the StaticFiles mount behavior. This affects the demo test AND the production submit flow.
4. **Extend mock-openai with an Ollama-shape `/api/tags` endpoint** so the local test environment can populate the model select without stubbing. (Or update F8-SC08 to stub the model list.)
5. **Re-run the 4 critical gates after the fixes** to confirm `CONVERGED`.

VERDICT: NEEDS-FIXES
