# 017 - metrics - iteration-4 fix + judge (orchestrator)

## Run

- **Date:** 2026-07-11 (Europe/Kyiv)
- **Slice:** 004-metrics
- **Role:** orchestrator + Judge (owner-authorized iteration-4 targeted fix; did not author code)
- **Branch:** feat/004-metrics (isolated worktree `.claude/worktrees/004-metrics`)
- **Commits:** `2a7533f` (the perf fix) + this record / archive close
- **Cost:** 1 implementer pass + 2 parallel reviewers + orchestrator verification; ~1 gate run
  (146 tests, 110s) + 1 structural repro. No rework loop (converged first pass).

## Objective

Resolve the 3 open `[BLOCKING]` performance findings that escalated slice 004 at its 3-iteration
cap (`docs/agent-runs/016-metrics-run.md`), under explicit owner authorization for a targeted
iteration-4 pass, then judge the slice against the Definition of Done.

## What was done

- **Maker (`capability-implementer`, isolated):** fixed all 3 findings within slice-004's own files
  — pause-count cap in `services/stats.py` (`_MAX_SESSION_PAUSE_SEGMENTS=1000`, AND-composed with
  the span cap, skip-not-clip); memoized the full-history day-split (computed once in
  `build_snapshot`, threaded via keyword-only `daily_totals=None` into m1/m2/m5/m6); pre-bucketed
  sessions by `local_start_day` in `_build_switching_block`. +4 additive perf-regression tests.
  `schemas/sessions.py` (slice 003) not touched.
- **Checkers (`code-reviewer` ‖ `security-reviewer`, parallel, independent):** both PASS, 0 BLOCKING.
  Evidence in `docs/qa/reviews/004.md`.
- **Judge (orchestrator):** scored against the DoD (below).

## Verification

Real output captured by the orchestrator (independent of the maker's report):

```
$ ruff check app            -> All checks passed!
$ mypy app                  -> Success: no issues found in 59 source files
$ gate-slice --ratchet      -> 146 passed in 109.96s; coverage 97.47% >= floor 82%
$ (finding-2 repro)         -> daily_net_minutes call count = 3 (was ~21); shape intact
$ git diff --numstat        -> schemas/stats.py absent; test_metrics_extra.py 194/0
```

- `schemas/stats.py` **unchanged** — the snapshot wire shape slice 005 consumes is preserved.
- No acceptance test weakened (acceptance suites untouched; the extra tests are additions only).
- pre-commit on `2a7533f`: ruff clean, `check-traceability` 33/33/0, `check-trajectory` 4 slices /
  0 violations.

## Findings

- `[MINOR]` (security) `services/stats.py` — `selectin` hydrates a session's pause rows before the
  count cap skips it; weaker memory/IO vector, pre-existing + cross-slice. Follow-up.
- `[MINOR]` (code) `tests/test_metrics_extra.py` — memoization test asserts call-counts, not
  value-equality; value-correctness covered by `test_metrics_snapshot.py`. Optional.
- No `[BLOCKING]` from either reviewer.

## Verdict

**DONE (engineering-DONE).** DoD: (1) all 50 acceptance scenarios covered by green tests (146
passed, acceptance suite unweakened); (2) `gate-slice` GREEN, coverage 97.47%, `check-traceability`
33/33/0, `check-trajectory` 0 violations; (3) independent Checker (code + security, maker ≠ checker)
0 BLOCKING — CodeRabbit pending the owner's PR, as for slices 001–003; (4) trailers present
(`Slice: 004-metrics`, `Refs: NFR-PERF-01`), no secrets, no test weakened. The Judge did not author
the code. `openspec archive add-metrics` run on this verdict.

## What was NOT done / follow-ups

- The 2 MINORs above are accepted non-blocking follow-ups. The pre-existing M2 spillover-day
  denominator MINOR needs an owner ruling, not a fix.
- No push, no PR (owner-driven). The architecture §1 compute-on-read budget is met at the shipped
  scale after the fix, but the pure `build_snapshot` at 10k sessions (~356 ms) is the design's
  inherent minimal cost — noted for a future architecture call, not a regression.
