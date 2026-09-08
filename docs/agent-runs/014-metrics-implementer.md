# 014 — metrics — implementer

## Run

- **Date:** 2026-07-11 09:20 (Europe/Kyiv, EEST)
- **Slice:** 004-metrics
- **Role:** capability-implementer (the maker; fresh isolated context, rework pass — no
  memory of the original `6a1c799` implementation session)
- **Branch:** feat/004-metrics (git worktree at
  `.claude/worktrees/004-metrics`, HEAD `6a1c799` at start)
- **Commits:** none — left uncommitted for the owner/orchestrator to review and commit,
  per the task instructions

## Objective

Rework pass on 3 independent-review findings against the already-green slice 004
(`gate-slice` GREEN before this pass: 132 tests, coverage 97.50%): one `[BLOCKING]`
security finding (unbounded `window` span, resource-exhaustion) and two `[MINOR]`
code-review findings (M1/M3 net-minutes disagreement on overlapping pauses; a missing
boundary test for M2's 3-active-days floor). Fix without weakening any of the 54
original acceptance tests and without stepping outside slice-004-owned files.

## What was done

- **Finding 1 (BLOCKING, fixed) — `backend/app/api/stats.py:24-35,58-60`.** Added
  `_MAX_WINDOW_DAYS = 366` and a span check in `_parse_window` (after the existing
  `end < start` check): `span_days = (end - start).days + 1; if span_days >
  _MAX_WINDOW_DAYS: raise _bad_request(...)`. 366 days (~1 year, +1 for a leap year)
  mirrors the heatmap endpoint's own longest period (`year` = 365 days,
  `app/core/metrics/heatmap.py`'s `_PERIOD_SPAN_DAYS`) — same order of magnitude as work
  the service already does routinely, comfortably covers any legitimate custom-range
  query, and is directionally consistent with architecture §1's NFR-PERF-01 budget
  ("computing the full snapshot... completes in < 500 ms... at 10k sessions" — that
  budget is scoped to the default 30-day window, not custom ranges, so it does not fix
  an exact number for this cap; 366 is my own documented judgment call inside the
  finding's suggested 366-732 range). New tests in
  `backend/tests/test_stats_api_extra.py:97-146`: exactly-at-cap (366 days, 200),
  one-day-over-cap (367 days, 422), and the literal attack shape from the finding
  (`0001-01-01..9999-12-31`, 422).
- **Finding 2 (MINOR, fixed) — new `backend/app/core/metrics/intervals.py`,
  `backend/app/core/metrics/days.py:1-21,55-58`,
  `backend/app/core/metrics/m3_focus.py:1-21`.** Extracted the overlap-merging sweep
  that used to be `days.py`'s private `_net_intervals` into a new shared pure module,
  `app/core/metrics/intervals.py` (`net_intervals` + a new `net_seconds`). `days.py` now
  imports `net_intervals` from it (behavior-preserving — the sweep algorithm is
  byte-for-byte the same, just relocated); `m3_focus.py` now imports `net_seconds` from
  it instead of slice 003's `app.core.durations.net_seconds` (which sums each pause's
  own duration naively and double-subtracts on overlap). `app/core/durations.py` itself
  was **not touched** (still slice-003-owned, still read-only/off-limits; the fix is
  entirely inside slice-004 files, per the finding's explicit instruction). New tests in
  `backend/tests/test_metrics_extra.py:80-165`: a direct contrast test
  (`intervals.net_seconds` == 1200s vs. the naive `durations.net_seconds` == 0s for the
  same overlapping-pause session) and an end-to-end agreement test (`days.daily_net_minutes`
  and `m3_focus.compute_focus`'s `deep_share` denominator both now report 20 net minutes
  for the same session, verified via `deep_share == 60/(60+20)`, not the old `60/(60+0)`).
- **Finding 3 (MINOR, fixed) — `backend/tests/test_metrics_extra.py:167-203`.** Added
  `test_exactly_3_active_days_meets_the_m2_floor_and_is_not_low_confidence`, pinning the
  ratified ">= 3 active days" boundary at the edge (mirrors the acceptance file's
  existing 2-active-days low-confidence case). No code change — the code-reviewer had
  already verified `m2_consistency.py`'s existing `< _MIN_ACTIVE_DAYS` check is correct
  at this boundary; this closes a coverage gap only.

None of the 54 original acceptance-test files were touched (confirmed via `git status`
below); only the two implementer-owned supplementary test files
(`test_stats_api_extra.py`, `test_metrics_extra.py`) gained new tests. Did not touch
`app/core/model.py`, `app/repos/sessions.py`, `app/repos/categories.py`, or
`app/core/durations.py`.

## Verification

Backend venv (`.venv/Scripts/python.exe`) for granular checks; system `python` to drive
`scripts/gate-slice` (which recreates the venv — see repo memory on this hazard).
`COMPOSE_PROJECT_NAME=2026-fwdays-agentic-greenfield-task` pinned for the `gate-slice`
run — see Risks/Follow-ups for why.

```
$ .venv/Scripts/python.exe -m ruff check .
All checks passed!

$ .venv/Scripts/python.exe -m mypy app
Success: no issues found in 59 source files

$ RUN_DB_TESTS=1 .venv/Scripts/python.exe -m pytest -q
........................................................................ [ 52%]
..................................................................       [100%]
138 passed in 179.25s (0:02:59)

$ COMPOSE_PROJECT_NAME=2026-fwdays-agentic-greenfield-task python scripts/gate-slice
==> [1/4] Starting PostgreSQL (docker compose up -d db)
 Container 2026-fwdays-agentic-greenfield-task-db-1 Running
==> Waiting for PostgreSQL to become healthy
    db health: healthy
==> [2/4] Backend: venv + install
==> [3/4] Backend: lint + types + migrations + tests (with DB)
All checks passed!
Success: no issues found in 59 source files
[alembic upgrade head -> no-op, 0003_timer_sessions already head, no migration this slice]
138 passed in 180.83s (0:03:00)
==> [4/4] Frontend: install + typecheck + build + unit tests
found 0 vulnerabilities
[tsc && vite build -> built in 288ms]
Test Files  1 passed (1) / Tests  4 passed (4)
==> Verification complete - stack wired end-to-end. OK
==> gate-slice: measuring backend coverage (pytest under coverage, RUN_DB_TESTS=1)
138 passed in 172.56s (0:02:52)
==> gate-slice: backend coverage = 97.52%
gate-slice: coverage ratchet OK (97.52% >= floor 82%).
  Coverage is 15.5 points above the floor - consider `--bump-floor` to lock in the gain.

gate-slice: GREEN - stack verified and coverage ratchet held.
EXIT=0
```

Test count: 132 (pre-rework baseline) -> 138 (+6: 3 window-cap tests in
`test_stats_api_extra.py`, 3 in `test_metrics_extra.py` for findings 2/3). Coverage:
97.50% -> 97.52%, both comfortably above the 82% floor.

## Findings

None of my own beyond what was already routed to this rework pass. The three findings
in the task packet were independently re-derived before fixing (recomputed the
`0001-01-01..9999-12-31` span at ~3.65M days via `date.fromisoformat` arithmetic;
traced `days.py`'s `_net_intervals` sweep by hand to confirm it already merges overlap
correctly, which is exactly why extracting/reusing it — rather than patching
`durations.py` — was the correct-shaped fix; confirmed `m2_consistency.py`'s
`len(window_active) < _MIN_ACTIVE_DAYS` is already correct at the boundary before adding
only a test).

## Verdict

**GREEN.** All three findings addressed (see below); `gate-slice` passes end-to-end;
none of the 54 acceptance tests were modified.

- **Finding 1 (BLOCKING):** FIXED. `backend/app/api/stats.py:24-35,58-60` — span cap of
  366 days, 422 on violation. Evidence: 3 new passing tests
  (`test_stats_api_extra.py:97-146`).
- **Finding 2 (MINOR):** FIXED. New `backend/app/core/metrics/intervals.py`; `days.py`
  and `m3_focus.py` now share the same overlap-merging net-time computation.
  `durations.py` untouched (still off-limits). Evidence: 2 new passing tests
  (`test_metrics_extra.py:109-164`) showing the old naive path gave 0 net minutes for a
  session whose true net was 20, and that M1/M3 now agree at 20.
- **Finding 3 (MINOR):** FIXED. One new boundary test at exactly 3 active days
  (`test_metrics_extra.py:170-203`); no code change needed (reviewer had already
  confirmed correctness there).

## What was NOT done / follow-ups

- Did not touch `app/core/durations.py`, `app/core/model.py`, `app/repos/sessions.py`,
  `app/repos/categories.py`, git history, or any of the 54 acceptance test files, per
  the task's explicit boundaries.
- Did not commit — left uncommitted for the owner/orchestrator, per instructions.
- **Operational note, not a slice defect:** the first `gate-slice` attempt failed with a
  Docker port conflict — `docker compose up -d db` tried to (re)create this worktree's
  own `004-metrics-db-1` container, but host port 5432 was already bound by a
  **different, concurrently-running session's** `2026-fwdays-agentic-greenfield-task-db-1`
  container (up 23h at the time, healthy, `alembic current` confirmed it was already at
  this branch's own head revision `0003_timer_sessions` — i.e. schema-compatible).
  Resolved non-destructively by pinning `COMPOSE_PROJECT_NAME=2026-fwdays-agentic-greenfield-task`
  for the `gate-slice` invocation so `docker compose` targeted that same shared,
  already-healthy container instead of colliding on the port — matches this repo's own
  prior-documented pattern for concurrent-worktree sessions sharing one DB. Did not stop,
  remove, or otherwise touch the other session's container. No data loss, no schema
  drift; the DB-scoped test suites in this slice clean up only their own
  `@stats004*.local` test accounts, so sharing the instance with a concurrent session is
  safe by construction.
- 366-day span cap is my own judgment call (finding explicitly allowed 366-732, "your
  call") — flagging for the owner in case product intent wants a different number; easy
  to change (one constant, `backend/app/api/stats.py:35`).
