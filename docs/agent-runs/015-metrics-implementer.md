# 015 - metrics - implementer (iteration 3 rework)

## Run

- **Date:** 2026-07-11 12:05 (Europe/Kyiv)
- **Slice:** 004-metrics
- **Role:** capability-implementer (the maker; rework pass, iteration 3 of the slice loop
  — the loop's cap)
- **Branch:** feat/004-metrics (git worktree at `.claude/worktrees/004-metrics`)
- **Commits:** none by the sub-agent — left uncommitted for the orchestrator to review
  and commit, per this loop's standing convention

## Provenance note (read before trusting this record)

Unlike every other run record in this slice, this one is **written by the orchestrator
after the fact**, not transcribed from the sub-agent's own chat report. The user's
machine restarted mid-session; the `capability-implementer` dispatch for this rework
(iteration 3) evidently ran to completion and left its diff on disk, but its completion
notification/report never reached this conversation. Rather than fabricate a first-person
account that was never actually received, this record documents what the orchestrator
independently verified against the diff as it exists on disk — the same rigor applied to
every other stage in this loop, just without a sub-agent narrative to cross-check it
against. See `docs/agent-runs/013-metrics-trace.md` STAGE 6 for the live trace entry.

## Objective

Iteration-3 rework on 2 independent-review `[BLOCKING]` findings from iteration 2
(`docs/agent-runs/013-metrics-trace.md` STAGE 5): both reviewers converged on the same
root cause — pure `app/core/metrics/*` functions performing unbounded calendar-day
walks, reachable independently of the `window`-span cap iteration 1 already fixed.
Finding A (security-reviewer, corroborated by code-reviewer): a single session with a
pathological `started_at..ended_at` span drives `days.py::_split_seconds_by_local_day`
(an uncapped `while True` loop) through >= 5 call sites in `snapshot.py`, unconditional
on any query parameter — measured 9.09s / ~3.65M iterations for one such session, ~18x
architecture's <500ms/10k-session budget. Finding B (code-reviewer only): independent of
Finding A, `m5_streaks.py::_longest_run` walked every calendar day between the earliest
and latest *active* day, so its cost was O(calendar-gap) rather than O(active days) —
reproducible with **entirely ordinary, non-malicious data** (two real sessions years
apart), no crafted input needed.

## What was done (reconstructed from the diff, independently verified)

- **Finding B, fixed — `backend/app/core/metrics/m5_streaks.py`.** `_longest_run`
  rewritten from a day-by-day cursor walk between `min(days)` and `max(days)` to a single
  sort of the active-days set plus one linear pass over consecutive-pair gaps: O(n log n)
  in the *actual* number of active days, independent of how far apart the earliest and
  latest ones are in calendar time. Verified correct on the empty-set (returns 0),
  single-day (returns 1), all-consecutive, and sparse-with-gaps cases by hand-tracing the
  algorithm; verified it still agrees with the 4 existing M5 acceptance tests (all pass,
  see Verification).
- **Finding A, fixed — `backend/app/services/stats.py`.** A new, well-documented
  choke-point defense: `_MAX_SESSION_SPAN_DAYS = 90` and `_within_session_span_cap`,
  applied in `StatsService._load` (the single place every pure-core call gets its session
  list from) — any saved session whose own gross span exceeds 90 days is **excluded**
  from the mapped `CategorizedSession` list before it ever reaches `app/core/metrics/*`,
  rather than clipped (the code's own comment: "there is no 'correct' truncation to
  compute, and reporting a fabricated multi-month session... would be a worse outcome
  than simply omitting it"). 90 days is generous relative to any real work session while
  keeping the worst-case day-walk cheap. Does not touch `app/services/sessions.py`
  (slice-003-owned, off-limits) — the write path is unchanged; this is a read-side
  defensive filter only.
- **New tests** — `backend/tests/test_metrics_extra.py` and
  `backend/tests/test_stats_api_extra.py` gained 4 new tests (test count 138 -> 142)
  covering both fixes; none of the 54 original acceptance tests were touched (confirmed
  via `git diff --stat` against the acceptance file list).

## Verification (orchestrator, real output, post-restart)

Docker Desktop and the shared Postgres container (`2026-fwdays-agentic-greenfield-task-db-1`)
had to be restarted after the machine restart; confirmed the pinned
`COMPOSE_PROJECT_NAME` reattached to the same existing container rather than creating a
new one, then waited for health before running anything DB-touching.

```
$ COMPOSE_PROJECT_NAME=2026-fwdays-agentic-greenfield-task python scripts/gate-slice
[... ruff clean, mypy clean, alembic upgrade head no-op ...]
142 passed in 108.89s
[... frontend build + 4 vitest passed ...]
gate-slice: backend coverage = 97.46% (>= floor 82%)
gate-slice: GREEN - stack verified and coverage ratchet held.
```

Beyond the test suite, independently reproduced **both original attack scenarios against
the fixed code** (not just re-running the tests that were written to prove it):

```
$ ./.venv/Scripts/python.exe -c "<the exact pathological 0001-01-01..2026-01-01
  session from the security-reviewer's finding, mixed into an ordinary session list,
  fed through the real StatsService filter logic and build_snapshot()>"
sessions after defensive filter: 1 (pathological excluded: True)
build_snapshot() with the same pathological session present: 0.0469s (was 9.09s before the fix)
volume.all_time_min: 60

$ ./.venv/Scripts/python.exe -c "<compute_streaks over two ordinary sessions ~2 years apart>"
compute_streaks() over a ~2-year ordinary gap: 0.0551s (was 1.4s before the fix)
StreakMetrics(current=1, longest=1)
```

Independently swept `app/core/metrics/*.py` and `snapshot.py` for any other unbounded
date-range walk (`grep -n "while \|for .* in range(\|timedelta(days=1)"`): every
remaining day-by-day construct is now either (a) transitively bounded by the new 90-day
session-span cap (`days.py`'s own `while True` loop is unchanged but can no longer see an
unbounded span), (b) bounded by a small fixed constant (`heatmap.py`'s period enum <= 365
days, `m2_consistency.py`'s 14-day window), (c) bounded by the iteration-1 `window` cap
(`snapshot.py::_date_range`), or (d) self-limiting by construction (the *current*-streak
walk in `m5_streaks.py` only ever walks as far as the streak itself is long, which is
bounded by genuine work, not a single crafted input).

## Findings

None of the orchestrator's own beyond what was already routed to this rework pass.

## Verdict

**GREEN**, orchestrator-verified. Both iteration-2 `[BLOCKING]` findings fixed with
evidence reproduced independently of the sub-agent's (unrecovered) own report; `gate-slice`
fully green (142 passed, coverage 97.46% >= floor 82%); neither of the 54 original
acceptance tests nor any slice-001/002/003-owned file was touched.

## What was NOT done / follow-ups

- **The sub-agent's own first-person report and reasoning trail for this pass are lost**
  (machine restart) — this record substitutes independent orchestrator verification for
  it, but cannot speak to the sub-agent's own stated verification commands or any
  alternatives it considered. Flagged plainly rather than silently backfilled.
- Did not commit (orchestrator commits after this record, same as every prior stage).
- The 90-day session-span cap is a read-side compensating control, not a fix at the
  source: `app/services/sessions.py` (slice 003) still accepts a session of any positive
  length at write time. A cleaner long-term fix would bound session duration where it's
  created — out of this slice's reach (cross-slice overlap rule) and not attempted here;
  worth a follow-up for slice 003's owner.
- This is the slice loop's **iteration 3, the cap** — if the next independent review
  round finds another `[BLOCKING]` issue, run-slice.md requires stopping and escalating
  to the owner rather than looping again.
