# 016 - metrics - run (orchestrator, /run-slice)

## Run

- **Date:** 2026-07-11 12:35 (Europe/Kyiv)
- **Slice:** 004-metrics
- **Role:** run-slice orchestrator (this session, throughout)
- **Branch:** feat/004-metrics (isolated worktree `.claude/worktrees/004-metrics`,
  branched from `feat/003-timer-sessions` tip `2b76fd2`)
- **Commits:** `93517e3`, `1d65762`, `130cf39`, `6a1c799`, `4afc084`, `95332e9` (6, all on
  `feat/004-metrics`; none on `main`) plus this record

## Objective

Run the ratified `add-metrics` OpenSpec change (docs/specs/004-metrics.md, 10
requirements, 50 scenarios, all 5 open questions resolved at ratification plus 3
owner-approved additive snapshot extensions) through the full maker/checker/judge loop
per `.claude/commands/run-slice.md`, in an isolated worktree, with a live trace.

## What was done

- **Setup:** isolated worktree `.claude/worktrees/004-metrics` on new branch
  `feat/004-metrics`, based on `feat/003-timer-sessions` (not `spec/004-metrics`, which
  forked before slice 003's implementation and carries only the ratified contract docs)
  — imported the ratified contract from `spec/004-metrics` path-scoped, avoiding a
  merge conflict on generated `docs/qa/*.md` reports.
- **Step 0 (RED):** `test-engineer` wrote 54 tests (50 ratified scenarios 1:1 + 4
  supporting) across 10 files; independently re-verified RED for the right reason
  (54 failed for `ModuleNotFoundError`/404, never a fixture bug).
- **Step 1 (green):** `capability-implementer` built the pure `app/core/metrics/`
  engine, `snapshot.py`, a new read-only category repo, the stats service, and the two
  endpoints; correctly escalated one self-contradictory RED-test literal instead of
  weakening it (independently re-verified the arithmetic before routing a fresh, narrow
  `test-engineer` fix); fixed a real `tzdata` environment gap.
- **The slice loop ran its full 3-iteration cap:**
  - **Iteration 1:** review found 1 BLOCKING (`window` query param had no span cap —
    single-request resource exhaustion, ~3.65M-entry structures from one crafted
    request) + 2 MINOR (M1/M3 net-minutes disagreement on overlapping pauses; a missing
    M2 boundary test). All three fixed (`4afc084`), independently re-verified by the
    orchestrator (reproduced the overlap bug directly: 0 min instead of the correct 20).
  - **Iteration 2:** fresh review found 2 further, independent BLOCKING findings that
    the iteration-1 fix did not and could not touch (neither goes through `window` at
    all): a single session's own pathological span drove an uncapped day-walk
    (measured 9.09s / ~3.65M iterations for one session, reachable via a bare
    parameterless `GET`); `m5_streaks.py`'s longest-run calculation cost scaled with
    calendar gap, not active-day count (reproducible with **entirely ordinary** data,
    two sessions years apart, no attack needed). Both fixed (`95332e9`) — a
    single choke-point defensive cap (`StatsService._load`, 90-day session-span
    exclusion) and an O(n log n) sorted-gap rewrite of `_longest_run`. The
    sub-agent's own report was lost to a mid-session machine restart; the orchestrator
    independently verified the resulting diff from scratch and wrote
    `docs/agent-runs/015-metrics-implementer.md` itself, disclosing that provenance
    gap plainly rather than fabricating a report. Independently reproduced both fixes
    working against the real code (not just green tests): 9.09s -> 0.047s;
    1.4s -> 0.055s.
  - **Iteration 3 (the cap):** fresh review found **3 more BLOCKING findings**, none a
    rediscovery of the four already-fixed vectors: unbounded `pauses` array length on a
    saved session (measured 5.0s at 100k pauses, already 0.53s at 10k); un-memoized
    recomputation (`daily_net_minutes`/`compute_volume`/`compute_consistency` called 21
    separate times per snapshot request, cProfile-confirmed) measuring 1.07-1.28s at
    10k ordinary sessions — architecture's own named NFR-PERF-01 scenario, >2x over its
    <500ms budget, no crafted input; an O(days x sessions) re-filter in the switching
    block measuring 5.84s (~11.7x over budget) at 10k sessions with a legitimate
    366-day window. Per `run-slice.md`'s explicit cap rule, **the loop stopped here.**

## Verification

Final gate state (before the iteration-3 review, still accurate — no code changed
since): `python scripts/gate-slice` -> ruff clean, mypy clean (59+ files), `alembic
upgrade head` no-op (no migration, as required), **142 passed**, frontend build + 4
vitest passed, coverage **97.46% >= floor 82%**, exit 0. `python
scripts/check-traceability` -> 33 claimed / 33 traced / 0 gap. `python
scripts/check-trajectory` -> 4 slices analyzed, **0 violations**.

5 independent review passes across the loop (2x code-reviewer, 2x security-reviewer
across iterations 1-3 plus the initial pair) — every `[BLOCKING]`/`[MINOR]` finding
either independently reproduced by the orchestrator before being accepted, or (for the
3 still-open iteration-3 findings) independently corroborated at the code level by the
orchestrator reading the cited lines directly. Full evidence, commands, and real output
for every stage: `docs/agent-runs/013-metrics-trace.md` (the live trace, STAGE 0a
through the END OF LOOP block).

## Findings

The 3 open `[BLOCKING]` items from iteration 3 (full detail, `path:line`, and
remediation direction each in `docs/agent-runs/013-metrics-trace.md`'s END OF LOOP
block):

- `[BLOCKING]` Unbounded `pauses` array length on a saved session — no cap in
  `backend/app/schemas/sessions.py` (slice 003), and this slice's own new choke-point
  guard (`backend/app/services/stats.py::_within_session_span_cap`) checks only span,
  never pause count.
- `[BLOCKING]` `daily_net_minutes`/`compute_volume`/`compute_consistency` recomputed 21
  times per snapshot request with no memoization (`backend/app/core/snapshot.py`,
  `backend/app/core/metrics/m6_baseline.py`).
- `[BLOCKING]` `_build_switching_block` is O(reporting_days x total_sessions), not
  O(reporting_days + total_sessions) (`backend/app/core/snapshot.py:79-81`).
- `[MINOR]`, disclosed since iteration 2, unchanged: M2's `start_stability` denominator
  can include a spillover-only active day that can never land in its own numerator.

## Verdict

**NOT DONE — escalated to the owner.** The loop ran its full, process-mandated
3-iteration cap and stopped per `run-slice.md`'s explicit rule rather than attempt a
4th automated fix. This is **not** a judgment call the orchestrator made; it is the
loop's designed behavior when independent review keeps finding genuine, differently-shaped
issues in the same recurring shape (this slice's compute-on-read design repeatedly
recomputing over a caller's full history, unbounded on one axis or another) three
iterations running. The Judge step per `run-slice.md` gates on the loop exiting green,
which it did not — **the Judge did not run**, and this slice is correctly **not** marked
done. `openspec archive add-metrics` was **not** run (DONE-only step).

What is solid, independently verified across 5 review passes: correctness of all 6
metric formulas (M1-M6) against architecture §3, the §3.7 day-attribution/midnight-split
logic (including DST), per-user isolation on every read path, no raw-session-row leakage
in the snapshot/heatmap responses, test-suite integrity (no acceptance test weakened
across any of the 6 commits), and 2 of the 5 total BLOCKING findings this loop
surfaced already fixed and independently confirmed working.

## What was NOT done / follow-ups

- The 3 open BLOCKING findings above are not fixed. Recommended next step (not
  self-authorized by the orchestrator): either resume `/run-slice 004` for one more
  explicitly owner-approved iteration focused on these 3 items (all appear to be
  ordinary, same-shape algorithmic/defensive fixes fully within slice 004's own files,
  comparable in scope to the two already shipped this loop — no cross-slice edit or
  reopened ratified decision appears needed), or have the owner make an explicit call
  on architecture §1's compute-on-read/no-caching design and its NFR-PERF-01 budget
  given it is not, in practice, "trivially satisfied" at the 10k-session scale the
  architecture doc itself names.
- No push, no PR — out of scope regardless of outcome per the run mandate.
- The 1 open MINOR (M2 spillover-day denominator) needs an owner ruling, not a fix, and
  is not blocking.
- `docs/current-state.md` updated to reflect this escalated status (Phase 4 entry,
  Kyiv-timestamped) rather than left showing the prior slice-003-DONE state as current.
