# 008 — timer-sessions — test-engineer

## Run

- **Date:** 2026-07-10 22:55 (Europe/Kyiv)
- **Slice:** 003-timer-sessions
- **Role:** test-engineer (test-first; fresh isolated context; writes tests only)
- **Branch:** feat/003-timer-sessions
- **Commits:** committed by the orchestrator as `f359689` (test-first RED bar)

## Objective

Encode every ratified GIVEN/WHEN/THEN scenario (13 requirements) as failing RED tests before any
product code, each carrying `@trace <FR-ID>`.

## What was done

Wrote **42 backend tests + a 4-case frontend vitest** — one per scenario, distinct email domains per
file (`@timer003/@sess003/@undo003.local`) + per-file autouse cleanup (shared `conftest.py`
untouched):
- `backend/tests/test_timer.py` (14, FR-TIMER-01..06), `test_sessions.py` (18, FR-SESS-01..06),
  `test_undo.py` (6, FR-NOTIF-01), `test_durations.py` (4, pure/no-DB, FR-SESS-02).
- `frontend/src/pages/Timer/resolveShortcut.test.ts` (4, FR-TIMER-05 — pure mapper).
- Regenerated `docs/qa/traceability.md`.

## Verification

```
$ RUN_DB_TESTS=1 pytest -q test_timer test_sessions test_undo test_durations  -> 42 failed
  fingerprint: Not Found (route absent) / UndefinedTable+does not exist (tables absent)
               / No module named 'app.core...' (pure module absent) / assert 404 == 201|422
  wrong-reason (SyntaxError/NameError/fixture/collection): 0
$ npm test (frontend)   -> 1 file failed: Cannot find module './resolveShortcut' (collected, RED)
$ check-traceability    -> 24 claimed / 24 traced / 0 gap (all 13 slice-003 ids COVERED)
```

Independently re-verified by the orchestrator (see the trace, STAGE 1): 42 failed for the right
reason, 0 wrong-reason; negative tests carry real DB row-state probes so they cannot false-pass on the
absent route.

## Findings

- `[MINOR]` The physical schema names the raw-SQL probes assert (the four tables + `accumulated_pauses`
  JSONB + FK cascades) become the implementer's contract — flagged so the migration matches.
- None blocking. No weakening patterns (`xfail`/`skip`/`assert True`/bare `raises`).

## Verdict

**RED bar ready** — all named scenarios encoded and failing for the right reason.

## What was NOT done / follow-ups

Two UI-only scenarios have no unit seam and were deliberately NOT encoded as tests: FR-TIMER-04's
confirm-dialog-before-discard and FR-NOTIF-01's bottom-left-5s notification (their FR ids are covered
by the backend discard/undo tests). Did not touch product code, migrations, or `conftest.py`; did not
commit (orchestrator owns the RED commit).
