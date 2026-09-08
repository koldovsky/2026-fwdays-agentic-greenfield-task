# 022 — slice 006 coach — test-engineer (RED)

- **Slice:** 006-coach · **Role:** test-engineer (RED, test-first) · **Date:** 2026-07-12 (Europe/Kyiv)
- **Skills used:** none (followed the test-first discipline in AGENTS.md; mirrored existing test patterns in `backend/tests/test_stats_api.py`).

> **Process note (honest trail):** the test-engineer sub-agent was terminated by an API
> session limit **after** writing all three test files and running them to a clean RED, but
> **before** emitting its own final report / this run record. Per the slice-004 precedent for
> an interrupted agent, the orchestrator **independently verified** the output from the
> filesystem (read every test file; re-ran the suite) rather than trust a partial report, and
> wrote this record. No product code was produced by the test-engineer (verified: none of
> `app/core/grounding.py`, `app/services/coach.py`, `app/api/coach.py`, `app/models/coach.py`
> exist).

## Summary

Wrote RED (failing) tests for the ratified slice-006 acceptance scenarios, **test-only**, each
`@trace FR-COACH-0X`. All 7 owned ids are covered (34 traced test methods). No live LLM call
anywhere — the model transport is an injectable provider seam overridden with a deterministic
`ScriptedProvider`.

## Changes (tests only)

- `backend/tests/test_coach_grounding.py` — pure unit tests for `app/core/grounding.py`
  (`check_grounding(snapshot, text, *, user_message=None) -> GroundingResult{grounded, violations}`):
  E-9 out-of-snapshot number, derived percent/`h:mm` renderings, non-clean-share `43%`,
  date-exclusion + determinism, null low-confidence leaf, bare-0-9 exemption, user-message
  numbers. `@trace FR-COACH-02` (7).
- `backend/tests/test_coach_assembly.py` — pure tests for `trim_history(turns) -> list`
  (20-turn cap + ~2,000-token budget, newest-first) + the **producer-drift seam guard**
  (`SnapshotResponse` field-for-field, GREEN today). `@trace FR-COACH-04` (5).
- `backend/tests/test_coach_api.py` — DB/route acceptance tests (`RUN_DB_TESTS=1`) for
  `POST /api/coach/insight` + `POST /api/coach/chat` via the `get_coach_provider` seam:
  cache read-through + no-2nd-call, quiet card, out-of-range→schema-invalid→ladder,
  degraded-not-cached + self-heal, chat persist-both / corrective-retry-success /
  fallback-persist-neither / per-user isolation, empty+over-long→422, snapshot+history-only,
  §4.2 shape + server-set `fallback` marker, no-emoji, language en/uk, the full provider ladder
  (`models()==[PRIMARY, PRIMARY, FALLBACK]`), missing-key→fallback, provider-error→degrade.
  `@trace FR-COACH-01/03/04/05/06/07` (22).

## Verification (orchestrator-run, real output)

```
$PY -m pytest tests/test_coach_grounding.py tests/test_coach_assembly.py tests/test_coach_api.py -q
33 failed, 1 passed in ~7s
```
- **33 fail = clean RED:** `ModuleNotFoundError` on the absent coach modules (imports done
  inside per-test loaders / the route 404s), i.e. behavior absent — not a fixture/collection
  error.
- **1 pass = legitimate immediately-green drift-guard:**
  `test_coach_snapshot_fixture_conforms_to_shipped_snapshot_response` validates the coach's
  snapshot fixture against the **existing** slice-004 `SnapshotResponse` (it fails only on
  producer drift), exactly the "seam test, real shape not a mock" the spec calls for.
- `@trace` coverage across the three files: FR-COACH-01×6, -02×7, -03×6, -04×5, -05×4, -06×2, -07×4.

## What was NOT done / risks

- The test-engineer wrote **no** product code, migration, or eval fixtures (those are the
  implementer's). The eval suite (`evals/rubrics/coach-output.md`, `evals/cases/coach/*`,
  `docs/qa/eval/*.json`) does not exist yet.
- `check-traceability` still shows FR-COACH-01..07 as GAP until the implementer's product code
  makes the suite GREEN and the `@trace` docstrings are picked up on a committed diff.
- Not committed (the implementer commits the tests together with the code that turns them green).
