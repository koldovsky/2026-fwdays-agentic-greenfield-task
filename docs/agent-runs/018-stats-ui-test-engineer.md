# 018 - stats-ui - test-engineer

## Run

- **Date:** 2026-07-11 14:20 (Europe/Kyiv)
- **Slice:** 005-stats-ui (frontend-only)
- **Role:** test-engineer (test-first RED)
- **Branch:** spec/005-stats-ui (worktree feat/005-stats-ui)
- **Commits:** (none — left staged/unstaged for the orchestrator)

## Objective

Turn the ratified `add-stats-ui` acceptance scenarios (FR-STATS-01..05, NFR-DES-01) into
failing RED tests, test-first, before any product code — including a seam test grounded in
the real backend `SnapshotResponse` shape. Tests + test-infra only; no product code.

## What was done

- **Test infra (owned by this slice):**
  - `frontend/package.json` — added dev deps: `jsdom@^25`, `@testing-library/react@^16`,
    `@testing-library/dom@^10`, `@testing-library/jest-dom@^6` (all MIT, community-standard).
    Ran `npm install` (137 pkgs added, 0 vulnerabilities).
  - `frontend/vitest.config.ts` — `environment: 'jsdom'`, `include` now covers `*.test.tsx`,
    `setupFiles: ['./vitest.setup.ts']`.
  - `frontend/vitest.setup.ts` (new, root — outside `src`) — registers
    `@testing-library/jest-dom/vitest` matchers + RTL `cleanup` afterEach.
- **Seam fixture (real shape, not a mock):**
  - Regenerated `frontend/src/pages/Stats/__fixtures__/snapshot.schema.json` from the backend
    Pydantic model (built `backend/.venv`, ran `SnapshotResponse.model_json_schema()`).
  - `__fixtures__/sampleSnapshot.ts` — a `SnapshotResponse`-typed instance mirroring the
    shipped shape; its annotation is the seam's compile-time assertion.
- **RED tests** under `frontend/src/pages/Stats/__tests__/` (one per named scenario, each
  `@trace`d): `snapshotSeam.test.ts` (seam; traces FR-STATS-01..05), `SummaryTiles.test.tsx`
  (FR-STATS-01), `StatsView.test.tsx` (FR-STATS-01 empty+error, FR-STATS-02 loading, empty
  trigger), `StatsView.loaded.test.tsx` (FR-STATS-01/05 + NFR-DES-01 page no-emoji, charts
  mocked to dodge the jsdom-canvas limit), `ScoreCard.test.tsx` (FR-STATS-05 + NFR-DES-01),
  `StreakCard.test.tsx` (FR-STATS-05), `BarByDay.test.ts` (FR-STATS-02), `DonutByCategory.test.ts`
  (FR-STATS-03), `CategoryLine.test.ts` (FR-STATS-04).
- Chart components are tested via their **pure transforms** (`toBarData` / `toDonutData` /
  `toLineData`) — never `new Chart(canvas,…)` (jsdom has no canvas).

## Verification

```
$ cd frontend && npm test   # vitest run --passWithNoTests (jsdom)
 FAIL  src/pages/Stats/__tests__/BarByDay.test.ts        — Failed to resolve import "../BarByDay"
 FAIL  src/pages/Stats/__tests__/CategoryLine.test.ts    — Failed to resolve import "../CategoryLine"
 FAIL  src/pages/Stats/__tests__/DonutByCategory.test.ts — Failed to resolve import "../DonutByCategory"
 FAIL  src/pages/Stats/__tests__/ScoreCard.test.tsx      — Failed to resolve import "../ScoreCard"
 FAIL  src/pages/Stats/__tests__/StatsView.loaded.test.tsx — Failed to resolve import "../StatsView"
 FAIL  src/pages/Stats/__tests__/StatsView.test.tsx      — Failed to resolve import "../StatsView"
 FAIL  src/pages/Stats/__tests__/StreakCard.test.tsx     — Failed to resolve import "../StreakCard"
 FAIL  src/pages/Stats/__tests__/SummaryTiles.test.tsx   — Failed to resolve import "../SummaryTiles"
 FAIL  src/pages/Stats/__tests__/snapshotSeam.test.ts > … getStatsSnapshot() is exported from src/api.ts
        AssertionError: expected 'undefined' to be 'function'
 Test Files  9 failed | 1 passed (10)
      Tests  1 failed | 9 passed (10)
EXIT=1
```

- Every new component/transform test fails with a **missing-module** import error (the module
  the implementer must create) — the correct RED reason.
- The seam test **runs**: its 5 shape assertions PASS (the sample fixture matches the
  backend JSON Schema field-for-field, proving the fixture is grounded in the real producer),
  and its 6th assertion FAILS because `getStatsSnapshot()` is not yet appended to `src/api.ts`
  (missing-export) — the correct RED reason.
- The **pre-existing** `src/pages/Timer/resolveShortcut.test.ts` is the "1 passed" file — it
  still passes under the upgraded jsdom environment (jsdom is a superset of node for pure logic).

## Findings

- `[MINOR]` seam vitest-RED is carried by the typed fetch export `getStatsSnapshot`
  (`snapshotSeam.test.ts:134`), because TS type-only imports are erased by esbuild and cannot
  fail a Vitest run. The field-for-field TYPE match is enforced at build time by `tsc`
  (the `sampleSnapshot: SnapshotResponse` annotation) plus the runtime schema↔sample check.
- `[MINOR]` "no layout shift" (FR-STATS-02 loading) is asserted as presence of `.skeleton`
  placeholders only — jsdom cannot measure layout geometry.

## Verdict

RED bar ready — all named acceptance scenarios encoded and failing for the right reason
(missing module / missing typed seam export), with the pre-existing suite still green.

## What was NOT done / follow-ups

- Wrote **no product code** (no `types.ts`, components, `stats.css`, `getStatsSnapshot`,
  `StatsPage`) — that is the implementer's job to turn these RED.
- Did **not** import or test slice-003 `SessionLog` — it composes on the page (implementer's
  job), not a unit under test here. It IS importable (`frontend/src/pages/Timer/SessionLog.tsx`
  default-exports a component), so the slice is not BLOCKED on slice 003.
- Did **not** run backend `verify` / `tsc` build — pre-implementation those are expected RED
  (missing frontend modules); `npm test` is the RED evidence for this pass.
- `check-traceability` / `--write` not run here (backend-py harness); the `@trace FR-STATS-0X`
  annotations are in place for the loop to move those ids GAP -> COVERED.
