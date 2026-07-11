# 020 - stats-ui - judge

## Run

- **Date:** 2026-07-11 16:39 (Europe/Kyiv)
- **Slice:** 005-stats-ui
- **Role:** judge (also the run-slice orchestrator; did not author the code)
- **Branch:** feat/005-stats-ui
- **Commits:** 20c4469 (infra ruff-fix), 2e9eb01 (spec), 484cc46 (RED), 3f63e53 (impl); this judge close commit adds the review evidence, this record, the current-state flip, and the OpenSpec archive.

## Objective

Drive slice 005 (Stats UI) through the `/run-slice` maker≠checker≠judge loop and, as Judge, score it
against the Definition of Done — the only role that may mark the slice done.

## What was done

- **Preflight + ratify:** read the ratified contract (anchor `docs/specs/005-stats-ui.md`, OpenSpec
  `add-stats-ui`, the `metrics-snapshot-extension` follow-up) and the shipped `SnapshotResponse`;
  flipped the anchor draft→ratified, `openspec validate --strict` + `check-specs` green, committed
  spec-first (`2e9eb01`).
- **Loop (converged in one iteration):**
  - `test-engineer` → RED: 9 failing test files (8 missing-module, 1 seam on the absent
    `getStatsSnapshot` export), seam grounded in a backend-generated JSON Schema; pre-existing pure
    test still green under jsdom (`484cc46`, run record `018`).
  - `capability-implementer` → the Stats page, components, pure chart transforms, `stats.css` zone
    tokens, and the two allowlisted appends (`api.ts`, `App.tsx`) to green without touching the tests
    (`3f63e53`, run record `019`).
  - **Blocker handling:** the shared gate was red on an out-of-scope backend ruff-drift (floating
    `ruff>=0.6` → ruff 0.15.x flagging 8 pre-existing slice-004 import blocks). Escalated to the owner
    rather than editing slice-004's files or weakening a test; owner chose the autofix path; cleared by
    a traced infra commit (`20c4469`, `Refs: BC-PROC-01`, no `Slice:` trailer — inert import-sort).
  - Gate → parallel `code-reviewer` ‖ `security-reviewer` → `eval-judge` trajectory-eval. Evidence in
    `docs/qa/reviews/005.md`.
- **Judge close:** wrote `docs/qa/reviews/005.md` (Result: pass), this record, updated
  `docs/current-state.md`, and archived the OpenSpec change.

## Verification

```
$ python scripts/gate-slice            (COMPOSE_PROJECT_NAME pinned; committed state)
... 146 passed in 115.59s ; backend coverage = 97.47% (>= floor 82%)
gate-slice: GREEN - stack verified and coverage ratchet held.
EXIT=0

$ python scripts/check-traceability --check-fresh   -> fresh; FR-STATS-01..05 COVERED, 0 gap   EXIT=0
$ python scripts/check-trajectory                    -> No git-visible process violations         EXIT=0
$ python scripts/check-specs                          -> no violations                            EXIT=0

$ git diff --name-only 484cc46..3f63e53 -- frontend/src/pages/Stats/__tests__ .../__fixtures__
(empty)  -> implementation weakened no test                                                       EXIT=0

$ (frontend) npx vitest run   -> Test Files 10 passed (10) ; Tests 32 passed (32)                 EXIT=0
$ (frontend) npm run build    -> tsc strict + vite build clean                                    EXIT=0
```

- `code-reviewer` → PASS (0 BLOCKING, 2 non-blocking MINOR). `security-reviewer` → PASS (0 findings;
  `check-secrets` clean). `eval-judge` trajectory-quality → pass, score 92 (all 5 criteria met).

## Findings

- `[MINOR] frontend/src/pages/Stats/StatsPage.tsx` — async `setState` after `await` with no
  mounted/abort guard; benign no-op in React 18, promises are `try/catch`-wrapped.
- `[MINOR] frontend/src/pages/Stats/CategoryLine.tsx:34` — shared x-axis from `series[0].per_day`;
  correct today (slice-004 series are zero-filled over the same range), robustness note only.
- `[BLOCKING]` — None.

## Verdict

**DONE (engineering-DONE)** against the Definition of Done: (1) meets all five FR-STATS acceptance
scenarios (COVERED by passing tests + the real-shape seam); (2) `gate-slice`/`verify.*` GREEN and
`check-traceability`/`check-trajectory`/`check-specs` clean; (3) independent maker≠checker review
(code + security PASS, 0 BLOCKING) plus a passing trajectory-eval; (4) trailers present, no secrets,
no convention broken. The single outstanding sub-item is **CodeRabbit on the owner's PR**, identical
to slices 001–004 — not a blocker to engineering-DONE.

## What was NOT done / follow-ups

- **CodeRabbit** not run (no PR yet); requirements FR-STATS-01..05 stay `proposed` until it is clean on
  the owner's PR, then flip to `shipped`. The owner opens the PR; this loop does **not** push.
- The 2 code MINORs above and the 3 documented render gaps (`baselines.streak`, `history_days`,
  `top_categories[].archived`) are accepted non-blocking follow-ups (see
  `docs/followups/metrics-snapshot-extension.md`).
- Left to the owner: tighten the floating `ruff` dev pin at its root (`backend/pyproject.toml`) so the
  drift cannot recur; and whether the new jsdom + Testing Library frontend component-test pattern
  (introduced here) warrants an explicit note in AGENTS.md's Verify section (the `vitest.config.ts`
  and test files already encode it).
- No product/backend code was changed by the judge close (docs + OpenSpec archive only).
