# 024 — slice 006 coach — orchestrator run record + Judge

- **Slice:** 006-coach · **Role:** `/run-slice` orchestrator + Judge · **Date:** 2026-07-12 (Europe/Kyiv)
- **Skills used:** author-slice (spec autopilot, run earlier), run-slice (this loop). Sub-agents:
  spec-author, spec-griller, eval-judge (fidelity), test-engineer, capability-implementer,
  code-reviewer, security-reviewer, eval-judge (trajectory) — each a fresh isolated context.
- **Branch:** `claude/sleepy-spence-101307` (dedicated, off `feat/006-coach`'s tip; the task's
  isolated worktree). No commits to `main`. **Verdict: engineering-DONE** (CodeRabbit pending the
  owner's PR, as for 001–005).

## Summary

Slice 006 — the **backend AI coach + eval suite** — built end-to-end through the automated factory:
`/author-slice 6` (spec loop → ratified contract) then `/run-slice 6` (code loop → Judge → archive).
The coach is a single structured LLM call over `(shipped slice-004 snapshot + per-user chat history)`
producing a fixed-shape insight card + grounded chat, a pure programmatic **grounding validator** (the
"no fabricated number" promise made mechanical), one provider/degradation ladder, and a deterministic
offline eval suite. It reuses (does not modify) the slice-004 snapshot and slice-001 auth; the React
coach drawer (FR-SHELL-02) is out of scope, a later shell slice.

## Trajectory (roles ran in fresh contexts; maker ≠ checker ≠ judge, structural)

1. **Spec loop (`/author-slice 6`)** — author → deterministic gate → griller ‖ fidelity-eval → judge →
   auto-ratify. Converged over 3 author passes (BLOCKING 6→1→1→0, fidelity 94→95→96); committed
   spec-first `f2f8fdc`. Record [`021`](021-coach-spec-author.md).
2. **RED tests (`test-engineer`)** — 3 files, 34 `@trace`d tests, provider mocked via an injectable
   seam. RED bar verified by the orchestrator (33 fail behavior-absent + 1 legit drift-guard). The
   sub-agent was cut off by an API session limit **after** producing complete, verified work;
   independently verified from the filesystem. Record [`022`](022-coach-test-engineer.md).
3. **Implement (`capability-implementer`)** — product code + `0004_coach` migration to green (`d2f2e56`
   slice, `e1739d7` infra config split, `45a0d1c` record). Record [`023`](023-coach-implementer.md).
4. **Iteration 1 — Gate (orchestrator, authoritative): GREEN.** gate-slice 97.91% ≥ 82;
   traceability 45/45; trajectory 0; specs 0; eval-ratchet 5 dims.
5. **Iteration 1 — Review (parallel, fresh):** `code-reviewer` 0 BLOCKING / 3 MINOR (all grounding
   edges, incl. one **false-negative fabrication passthrough**); `security-reviewer` 0 BLOCKING /
   2 MINOR. The orchestrator exercised discretion to route the 3 grounding MINORs (deviations from the
   CRITICAL grounding contract) + the 1-line log hardening as rework — rate-limiting deferred as an
   out-of-scope owner follow-up.
6. **Iteration 2 — rework (`capability-implementer`):** all 3 grounding fixes done **red-first**
   (fabricated `uk` `3,5` now caught; bare/worded `43` grounds; `150:00` grounds) + `exc_info`
   hardening (`f1403db`). No acceptance test weakened.
7. **Iteration 2 — Gate: GREEN** (re-run authoritative). **Trajectory-eval:** pass, **score 95** (both
   CRITICAL met: test-first, no-test-weakened).
8. **Judge (once, at the end):** Definition of Done met (below). Review evidence
   [`docs/qa/reviews/006.md`](../qa/reviews/006.md) (`Result: pass`). `openspec archive add-coach`
   applied. `docs/current-state.md` updated.

## Definition of Done (AGENTS.md)

1. **Meets every acceptance check** in [`docs/specs/006-coach.md`](../specs/006-coach.md) / the 36
   OpenSpec scenarios — the 3 `test_coach_*.py` files (grounding, assembly, api) all pass. ✓
2. **`gate-slice` / verify green; traceability + trajectory clean** — orchestrator-run, real output. ✓
3. **Independent Checker ran** (code-review ‖ security-review, both 0 BLOCKING; trajectory-eval pass
   95) — maker was not checker. ✓ **CodeRabbit** pending the owner's PR (the one open sub-item). ✗→PR
4. **Trailers present** (`Slice: 006-coach` / `Refs:` on the slice + rework commits; infra `e1739d7`
   `Refs: TC-STACK-02`); **no secret committed** (key git-ignored; no `AIza…` in history); no
   convention change requiring an AGENTS.md edit (the coach eval rubric+cases landed exactly as
   AGENTS.md anticipated for slice 006). ✓

## What was NOT done / accepted follow-ups (see 006.md for detail)

- **CodeRabbit** at PR time (owner opens the PR; this loop does not push). FR-COACH-01..07 stay
  `proposed` until then.
- **Rate-limiting** the coach endpoints (security MINOR) — out of slice scope; graceful degradation
  holds.
- **Thousands-separator grounding** — a §4.4 extraction-mechanism refinement (a pre-existing
  limitation; errs safe); an owner follow-up, not a slice defect.
- **Live Google AI Studio transport unverified** — `# pragma: no cover` (NFR-COST-01, no live LLM in
  the gate); the doc model ids `gemma-4-31b-it` / `Gemini 3 Flash` should be smoke-tested by the owner
  with the real key.

## Process note

A mid-run API session limit terminated the test-engineer sub-agent after it had produced complete,
verified RED tests. Per the slice-004 precedent for an interrupted agent, the orchestrator
independently re-verified that work from the filesystem (read every test file; re-ran the suite)
rather than trust the partial report, and documented it in record 022.
