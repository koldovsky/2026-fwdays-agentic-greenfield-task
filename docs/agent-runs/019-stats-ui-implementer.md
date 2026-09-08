# 019 - 005-stats-ui - implementer

## Run

- **Date:** 2026-07-11 15:32 (Europe/Kyiv)
- **Slice:** 005-stats-ui (frontend-only)
- **Role:** implementer (maker)
- **Branch:** feat/005-stats-ui (worktree `.claude/worktrees/005-stats-ui`)
- **Commits:** (none — left uncommitted for the orchestrator)

## Objective

Implement the Stats UI product code until the test-engineer's 9 RED test files go green
without weakening any test, and keep the `scripts/verify.*` battery green. Render-only:
no metric recomputed, no backend endpoint / schema / migration.

## What was done

New files under `frontend/src/pages/Stats/` (all Stats-owned):

- `types.ts` — `SnapshotResponse` + nested reads mirroring `backend/app/schemas/stats.py`
  field-for-field (satisfies the seam test + the `: SnapshotResponse`-typed fixture).
- `SummaryTiles.tsx` — Today / This Week / This Month / All-time / Streak tiles, mono
  tabular, reads `volume.*` + `streaks.current` verbatim (FR-STATS-01).
- `ScoreCard.tsx` — value + token-mapped zone dot (`zone-dot--{green,yellow,red}`,
  `data-zone`) + signed delta (`+N`/`-N` inline-SVG arrow, `±0` no arrow) + neutral
  `building` chip when `zone==="building"` / `delta===null`; no hex, no emoji (FR-STATS-05,
  NFR-DES-01).
- `StreakCard.tsx` — plain value card from `streaks.current`, no zone/delta (FR-STATS-05).
- `BarByDay.tsx` / `DonutByCategory.tsx` / `CategoryLine.tsx` — named pure transforms
  `toBarData`/`toDonutData`/`toLineData` (values verbatim, keyed/colored by the entry's
  own `id`/`color`) + thin `useRef`+`useEffect` Chart.js bindings (FR-STATS-02/03/04).
- `StatsView.tsx` — discriminated-union `state` (loading/error/empty/loaded) + named
  `isEmptySnapshot` (strictly `volume.all_time_min === 0`); imports the three charts as
  separate modules so the loaded test can mock them.
- `StatsPage.tsx` — owns the single `getStatsSnapshot()` fetch on mount, maps to the view
  state, composes `SessionLog` (fetched `listCategories()`+`listSessions()`), 5s
  auto-dismiss undo wired to `applyUndo`.
- `UndoNotice.tsx` + `icons.tsx` — Stats-owned bottom-left undo notice and inline-SVG
  delta/undo icons (no Timer imports).
- `stats.css` — scoped styles + the metric-zone tokens (`--zone-good/warn/bad`), which are
  not in `index.css`.

Allowlisted entry-point appends only:

- `frontend/src/api.ts` — appended `getStatsSnapshot()` + a bottom `import type` of
  `SnapshotResponse` (no existing line rewritten).
- `frontend/src/App.tsx` — appended the `'stats'` tab: `Tab` union member, `StatsPage`
  import, nav button, render branch (both existing timer/categories branches preserved).
- `frontend/package.json` — added `chart.js ^4.4.6` (MIT/OSS, BC-COST-01; `npm install`
  reported 0 vulnerabilities) and updated `package-lock.json`.

No backend, schema, or migration touched.

## Verification

```
$ npx vitest run   (frontend/)
 Test Files  10 passed (10)
      Tests  32 passed (32)
EXIT=0
```

```
$ npm run build    (frontend/  — tsc strict + vite bundle)
tsc && vite build
✓ 41 modules transformed.
dist/assets/index-CbPAr9gc.js   379.69 kB │ gzip: 124.28 kB
✓ built in 241ms
EXIT=0
```

```
$ COMPOSE_PROJECT_NAME=2026-fwdays-agentic-greenfield-task python scripts/gate-slice
...
FAILED: ruff (exit 1)
gate-slice: FAIL - verify.* battery did not pass.
EXIT=1
```

The ONLY gate failure is ruff, and all 8 errors are I001 "Import block is un-sorted" in
BACKEND slice-004 test files — none touched by this slice:

```
tests/test_metrics_days.py:51        tests/test_metrics_m3_focus.py:37
tests/test_metrics_heatmap.py:50     tests/test_metrics_m4_switching.py:68
tests/test_metrics_m1_volume.py:37   tests/test_metrics_m5_streaks.py:33
tests/test_metrics_m2_consistency.py:47   tests/test_metrics_snapshot.py:84
```

Reproduced directly with the venv ruff (independent of my run):

```
$ backend/.venv/Scripts/ruff.exe check .
Found 8 errors.  [*] 8 fixable with the `--fix` option.
EXIT=1
$ backend/.venv/Scripts/ruff.exe --version
ruff 0.15.21
```

`git status --short` shows those files unmodified; they are committed at branch HEAD from
slice 004 (`1d65762 test(metrics): RED acceptance tests`). The autofix diff is purely a
blank line removed between two first-party imports — a newer ruff's isort now merges them.

## Findings

- `[BLOCKING] backend/tests/test_metrics_*.py` (8 files) — pre-existing ruff I001
  import-order failures from ruff version drift (config last changed in slice-004's own
  commit `6a1c799`; freshly-resolved ruff 0.15.21 is stricter). Blocks the shared
  `verify.*`/`gate-slice` battery for every slice. NOT caused by this frontend slice and
  NOT fixable here without editing slice-004's modules (cross-slice ownership + trajectory
  overlap gate). Fix belongs to a backend/infra owner: `ruff check backend --fix` (or pin
  ruff). I did not apply it — out of this slice's scope.
- No findings in the frontend slice's own surface: all 9 RED test files go green (32/32),
  tsc strict + vite build green, no test weakened.

## Verdict

NOT DONE against the full-battery bar (item 2 of the Definition of Done), and BLOCKED on a
pre-existing, out-of-scope backend blocker. The slice-005 frontend implementation itself is
complete and green: the 9 RED acceptance files pass unmodified and the frontend build is
clean. What remains is entirely backend/infra: clear the ruff version-drift failure in the
slice-004 test files so the shared gate can go green.

## What was NOT done / follow-ups

- Did NOT edit any backend file (including the 8 failing test files) — out of scope for a
  frontend slice and a cross-slice ownership/trajectory violation. Escalated instead.
- Could NOT observe the mypy / alembic / pytest / frontend stages of `gate-slice`: the
  battery short-circuits at the ruff failure. The frontend surface was verified directly
  (build + vitest, both green above); the backend beyond ruff is unchanged by this slice.
- Follow-up (owner/infra): `ruff check backend --fix` on the 8 `test_metrics_*.py` files
  (or pin ruff in `backend/pyproject.toml`), then re-run `gate-slice`.
- Pre-existing non-blocking product follow-up already captured by the spec
  (`metrics-snapshot-extension`): no `baselines.streak` (plain streak card), no
  `history_days` (generic building chip), no `top_categories[].archived` (no greying).
