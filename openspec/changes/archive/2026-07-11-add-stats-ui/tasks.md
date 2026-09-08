<!-- Authored before code (spec-first): every task is unchecked. The test-first tasks in each section
     go RED before the implementation makes them green. This slice is frontend-only: no backend, no
     migration. It renders the architecture §4.1 snapshot and computes no metric. -->

## 1. Data contract and HTTP (read-only)
- [ ] 1.1 Add snapshot-shaped TypeScript types mirroring the **shipped** slice-004 `SnapshotResponse` (`app/schemas/stats.py`): `window`, `volume` (incl. `all_time_min`), `consistency`, `focus`, `switching`, `streaks`, `baselines` (4 entries: volume/consistency/focus_share/switch_load), `top_categories` (`{id,name,color,week_min}`), and the separate `per_category_per_day` (`{id,name,color,per_day}`) — under `frontend/src/pages/Stats/`
- [ ] 1.2 Append a read-only `getStatsSnapshot()` to `src/api.ts` calling `GET /api/stats/snapshot` (credentials flow via the existing `apiFetch`); entry-point-allowlisted append only
- [ ] 1.3 Category colors come from the snapshot's `top_categories[].color` / `per_category_per_day[].color`, keyed by `id` (no `listCategories()` join)
- [ ] 1.4 **Seam test (real shape, not a mock):** one test that fetches/loads the real `GET /api/stats/snapshot` shape (or imports the slice-004 `SnapshotResponse` fixture) and asserts the TS types match field-for-field — `all_time_min`, the 4-entry `baselines`, `top_categories[].{id,color}`, and the separate `per_category_per_day` — so producer/consumer drift fails a test, not the integrated page

## 2. Score card + summary tiles (components + tests first)
- [ ] 2.1 Write RED tests, each with an `@trace <FR-ID>` docstring: `ScoreCard` (FR-STATS-05) — value + zone color per §3.6 (green/yellow/red), signed delta with an up/down SVG arrow following the delta sign, and the neutral "building" state when `zone = "building"` / `delta = null` (§3.8); `SummaryTiles` (FR-STATS-01) — today/week/month/all-time/streak from the snapshot
- [ ] 2.2 Implement `ScoreCard`: reads `baselines[metric].{value, delta, zone}`, maps `zone -> --zone-good/--zone-warn/--zone-bad`, renders the building chip for `zone = "building"`; recomputes nothing (FR-STATS-05)
- [ ] 2.3 Implement `SummaryTiles`: mono tabular tiles reading `volume` (today/week/month/all-time) and `streaks.current` (FR-STATS-01)
- [ ] 2.4 Four zoned score cards (one per `baselines` entry: volume/consistency/focus_share/switch_load) + an M5 streak card from `streaks.current` as a plain value (no streak baseline in the shipped snapshot); delta rule: up arrow `>0`, down arrow `<0`, neutral `±0` no arrow at `0`; building chip is generic (no `history_days`)

## 3. Charts (components + tests, styled to DESIGN §3 tokens)
- [ ] 3.1 Add the Chart.js dependency (DESIGN §7.3) after it clears the security/audit bar; wrap it in a thin React binding
- [ ] 3.2 Write RED tests for the chart components (each `@trace <FR-ID>`): bar renders from `volume.per_day` (FR-STATS-02), donut renders from `top_categories` colored from the palette (FR-STATS-03), line renders one series per category (FR-STATS-04)
- [ ] 3.3 `BarByDay` from `volume.per_day` — rounded bars, no gridline clutter, mono tabular tooltips (FR-STATS-02)
- [ ] 3.4 `DonutByCategory` from `top_categories` (`{id,name,color,week_min}`), arcs colored from each entry's own `color` keyed by `id` (FR-STATS-03); archived greying deferred to the metrics-snapshot-extension follow-up (no `archived` in the shipped shape)
- [ ] 3.5 `CategoryLine` from the separate `per_category_per_day` block (FR-STATS-04) — one line per entry, colored from its `color`; do not compute the series client-side

## 4. Page composition + states (DESIGN §7.3, §10)
- [ ] 4.1 `StatsPage` fetches the snapshot once on view load (effect on mount) and lays out tiles -> score cards -> charts as a vertical card stack (DESIGN §5 rhythm)
- [ ] 4.2 Compose the slice-003 session-log component onto the page (import only; if it is not yet a reusable component, coordinate with slice 003 per Open question 1 — do not edit its module)
- [ ] 4.3 Empty state: all-zero snapshot -> a calm first-run prompt with zeroed tiles, not a blank or error (§10, E-1)
- [ ] 4.4 Loading state: skeletons matching the final footprint, cards keep their height, no layout shift (§10)
- [ ] 4.5 Error state: failed snapshot fetch -> a contained, retryable card, never a full-screen error or blank (§10)
- [ ] 4.6 Mount the Stats page via `src/App.tsx` (entry-point-allowlisted append); full routing is the FR-SHELL-01 shell slice
- [ ] 4.7 `stats.css` scoped to DESIGN §3 tokens; all icons inline SVG (delta arrows, zone dots), no emoji anywhere (§9, NFR-DES-01)

## 5. Verify and review (maker != checker != judge)
- [ ] 5.1 Write the RED tests in sections 2-4 **before** implementation; cover the render paths AND the empty/loading/error states and the building state per the spec scenarios
- [ ] 5.2 `scripts/verify.*` fully green: ruff + mypy (unchanged backend), alembic (no new migration), pytest, and the **frontend build** (tsc strict + bundle) with the new page and dependency
- [ ] 5.3 An emoji grep and `check-a11y` pass confirm no emoji and inline-SVG icons (NFR-DES-01); each `@trace <FR-ID>` moves FR-STATS-01..05 GAP -> COVERED
- [ ] 5.4 Independent `/code-review` + `/security-review` (no secrets; HTTP only through `src/api.ts`; no other slice's module edited) plus CodeRabbit on the PR
- [ ] 5.5 Judge scores the change against the acceptance scenarios and marks the slice done; then `openspec archive add-stats-ui`
