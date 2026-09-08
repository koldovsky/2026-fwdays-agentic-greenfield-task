# 010 — timer-sessions — code-review

## Run

- **Date:** 2026-07-11 00:05 (Europe/Kyiv)
- **Slice:** 003-timer-sessions
- **Role:** code-review (independent, read-only, fresh isolated context — did not author the code)
- **Branch:** feat/003-timer-sessions
- **Commits:** (none — read-only)

## Objective

Independent correctness review of the slice diff `git diff ee63e98..HEAD`, verifying every ratified
scenario against the implementation without running the shared-DB test suite (the orchestrator
supplied the authoritative serial gate; a security review ran concurrently).

## What was done

Traced all 33 scenarios to code + a substantive test; independently re-ran `ruff check` (clean) and
`mypy app` (43 files clean) — no DB touched. Spot-verified: atomic stop (`services/timer.py:130-142`,
one commit); discrete never-merged pauses; net/gross derived read-time, `app/core` framework-free;
optimistic `version` per action with stale→409 (`timer.py:83,96,114`); single-active via
`UNIQUE(user_id)`→409 (`timer.py:72-75`); undo compensating restores incl. discard-conflict→409 with
the token left unconsumed for retry (`services/undo.py:96-112`); every repo `user_id`-scoped
(FR-AUTH-07); cross-user→404. Migration `0003` matches the ORM field-for-field (FK cascades,
`UNIQUE(user_id)`, both CHECKs, JSONB `'[]'`, `version` default, indexes). Stop-while-paused closes
the open span into a final excluded segment (`timer.py:128-129`) — a correct, non-scope-creeping
resolution of architecture Open question 2. Test integrity: `git diff f359689..HEAD -- tests/` = only
the ADDED maker test; no acceptance test modified/narrowed/deleted. Emoji sweep clean; no raw
`fetch`; HTTP via `src/api.ts`.

## Verification

```
$ ruff check (17 new backend files)            -> All checks passed!
$ mypy app                                     -> Success: no issues found in 43 source files
$ git diff f359689..HEAD -- backend/tests/     -> only test_timer_stop_paused.py added (+93)
$ grep emoji frontend/src/pages/Timer + api.ts -> NO EMOJI FOUND
$ grep sqlalchemy|fastapi in app/core          -> No matches (framework-free)
(Did NOT run pytest/gate-slice/verify — read-only DB constraint; relied on the orchestrator's
 serial gate: 70 passed, coverage 96.33%, alembic parity, npm build+test green.)
```

## Findings

- `[MINOR] backend/app/services/undo.py:48,58` — undo apply is not atomic vs a concurrent
  double-submit of the same fresh token (SELECT-then-UPDATE without a row lock / rowcount guard); two
  near-simultaneous undo-of-delete could duplicate the restored row. Safe at personal scale;
  single-use is asserted serially. Fix: conditional UPDATE on `consumed_at IS NULL` acting only if one
  row was affected (or `SELECT … FOR UPDATE`).
- `[MINOR] backend/app/services/sessions.py:137-138` — `PATCH` cannot clear `notes` back to null
  (`notes is not None` conflates explicit null with omission). Not a contract violation.
- `[MINOR] backend/app/repos/categories.py:52-60 (via timer.py:64, sessions.py:80)` — start /
  manual-add accept an *archived* category (no `archived_at` filter on the ownership lookup), silently
  resolving design Open question 5 in the "allow" direction. Owner to confirm.
- Informational: undo-of-delete re-inserts via `SessionRepo.create`, so the restored row gets a fresh
  IDENTITY id (forced by `Identity(always=True)`); correct within the slice (no in-scope reference to
  the old id).

## Verdict

**PASS** — 0 BLOCKING, 3 MINOR (all non-blocking follow-ups).

## What was NOT done / follow-ups

Did not run the DB test suite (read-only + concurrent security review) — relied on the orchestrator's
serial gate. The 3 minors are carried to the Judge as accepted follow-ups; the archived-category one
is an owner decision the design deliberately deferred.
