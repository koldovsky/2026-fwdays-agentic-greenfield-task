## Context

`stats-ui` is the Stats analytics screen and the fifth capability, after auth (001), categories (002),
timer + sessions (003), and the metrics engine (004). It is authored before any code against
DESIGN §7.3 (the Stats screen), §3 (design tokens), §9 (inline-SVG iconography), §10 (empty / loading
/ error states), and the architecture §4.1 snapshot — the single data contract it consumes. Where
DESIGN or architecture already decided something, this design follows it; genuine gaps between what
the UI needs and what §4.1 exposes are listed under Open questions, not invented in a scenario.

The defining constraint of this slice is that it **renders and never computes**. Slice 004 owns every
metric formula, window, threshold, zone, and baseline (architecture §3-§4.1) and serves the result as
the read-only §4.1 snapshot at `GET /api/stats/snapshot`. This slice fetches that snapshot and draws
it: tiles, score cards, and charts. The score card's zone color and "building" state are snapshot
**fields** (architecture §3.6 / §3.8), rendered as color and copy — the UI derives no zone, no delta,
and no aggregate of its own. It reuses the credentialed `src/api.ts` boundary (slice 001) and composes
the slice-003 session-log component rather than re-implementing either, and adds no backend.

## Goals / Non-Goals

**Goals:**
- Render the summary tiles (today / week / month / all-time / streak) from the §4.1 snapshot
  (FR-STATS-01).
- Render the bar-by-day, donut-by-category, and per-category line charts from the snapshot series
  (FR-STATS-02/03/04), styled to the DESIGN §3 tokens via Chart.js (DESIGN §7.3).
- Render one score card per metric (M1-M5) with value + zone color (§3.6) + signed baseline delta and
  direction, and the neutral "building" state for <7-day baselines (§3.8) — all read from the
  snapshot's `baselines` (FR-STATS-05).
- Define all four states of the page's single snapshot fetch (empty / loading / error / rendered) per
  DESIGN §10.
- Compose the existing slice-003 session-log component onto the page.
- Reuse — never re-implement — `src/api.ts` (all HTTP, credentials + CSRF) and the slice-003
  session-log component.

**Non-Goals:**
- Computing any metric, zone, delta, baseline, or aggregate (slice 004 owns these; this slice renders
  the snapshot).
- The AI coach and its drawer (FR-COACH-*, DESIGN §7.5) — slice 006.
- The 5-second live poll / cross-device refresh (architecture §5) — slice 007; this slice fetches once
  on view load.
- Building or modifying the session log, its manual add / edit / delete, or the undo notification
  (slice 003) — it is only composed here.
- The activity heatmap UI (FR-HEAT-*, DESIGN §7.2) and the nav shell / three-route SPA (FR-SHELL-01) —
  separate slices (see Open questions).

## Decisions

- **Render-only; the §4.1 snapshot is the sole data contract.** The page fetches
  `GET /api/stats/snapshot` once on view load and draws it. No client-side metric math exists: the
  score card reads `baselines[metric].{value, delta, zone}` and maps `zone` to a token color; it never
  computes a zone or a delta. This is what keeps "the numbers the UI shows and the numbers the coach
  sees are one artifact" (architecture §4.1) true.
- **Zone color mapping (architecture §3.6, DESIGN §3).** `zone = "green" -> --zone-good`,
  `"yellow" -> --zone-warn`, `"red" -> --zone-bad`. The delta's up/down SVG arrow follows the **sign of
  the numeric `delta`** (up for positive, down for negative); the zone color, not the arrow, carries
  better-vs-worse, so a lower-better metric can show an up arrow on a yellow card. Per DESIGN §11 the
  color is always paired with the arrow/label, so the delta is never a color-only signal.
- **"Building" state (architecture §3.8, DESIGN §7.3).** When `zone = "building"` (and `delta` is
  null), the card renders a neutral "building" chip in place of any zone color and shows no delta. The
  card keys off the snapshot's `zone` value verbatim; it does not decide when a baseline is immature.
- **Charts via Chart.js (DESIGN §7.3).** Bar-by-day, donut-by-category, and per-category line use
  Chart.js styled to the DESIGN §3 tokens (rounded bars, no gridline clutter, mono tabular tooltips,
  category colors from the user's palette). Chart.js is a new MIT/OSS frontend dependency, admissible
  under BC-COST-01 and vetted per the dependency bar; a thin React binding wraps it so the chart canvas
  lives inside a normal component. No other charting approach is introduced.
- **Donut/line category colors come from the snapshot itself (shipped slice-004 shape).**
  `top_categories` entries are `{id, name, color, week_min}` and the line series is the separate
  top-level `per_category_per_day` block `{id, name, color, per_day: [{date, min}]}` (verified against
  `app/schemas/stats.py` `TopCategoryRead` / `CategoryPerDayRead`). The UI colors each arc/line from
  the entry's own `color`, keyed by `id` — no `listCategories()` join, no name-keyed fragility. The
  delta rule on score cards: up arrow for `delta > 0`, down for `delta < 0`, neutral `±0` with no
  arrow for `delta = 0`; the empty state triggers on `volume.all_time_min = 0` (a snapshot with
  history but `building` zones is not empty). **Two shipped-shape gaps, deferred to the
  metrics-snapshot-extension follow-up:** entries carry no `archived` flag (archived categories
  are not greyed here), and there is no `history_days` (the building chip is generic, without the
  "day N of 30" count). The M5 streak card renders from `streaks.current` as a plain value (the
  shipped `baselines` has no `streak` entry).
- **Compose, do not rebuild, the slice-003 session-log.** The session log (FR-SESS-03..06,
  FR-NOTIF-01) is slice-003 work that DESIGN §7.3 places on the Stats page; this slice imports and
  mounts that component and owns none of its behavior (see Open questions on the component boundary).
- **Fetch on view load now; poll later (slice 007).** A new read-only `getStatsSnapshot()` is appended
  to `src/api.ts`; the page calls it in an effect on mount. The 5-second poll that keeps it fresh
  across devices (architecture §5, NFR-DATA-01) is slice 007 and is deliberately absent here.
- **Entry-point appends only (CLAUDE.md `ENTRY_POINT_ALLOWLIST`).** Everything new lives in new files
  under `frontend/src/pages/Stats/`; the only edits to shared files are appending `getStatsSnapshot()`
  to `src/api.ts` and mounting the Stats page via `src/App.tsx` — both allowlisted. No other slice's
  module is edited.
- **States are states of one fetch (DESIGN §10).** Empty = the fetch succeeded but the snapshot is
  all-zero (first-run prompt, E-1 spirit); loading = the fetch is in flight (skeletons, no layout
  shift); error = the fetch failed (contained retryable card). Empty is not error and is not
  fabricated — an all-zero snapshot is a valid success.

## Risks / Trade-offs

- **The §4.1 seam is reconciled to the SHIPPED slice-004 shape.** This contract was aligned to what
  slice 004 actually built (`app/schemas/stats.py` `SnapshotResponse`), not an idealized §4.1:
  all-time volume (`volume.all_time_min`) ✓, the per-category series as the separate
  `per_category_per_day` block ✓, and category identity via `top_categories[].{id, color}` ✓ are all
  present and rendered. Three extension fields the shipped snapshot does **not** carry —
  `baselines.streak`, `history_days`, and `top_categories[].archived` — are captured as the
  `metrics-snapshot-extension` follow-up (a small slice-004 patch), and this slice degrades
  gracefully without them (plain streak card, generic building chip, no archived greying). The **seam
  test runs against the real `SnapshotResponse` shape, not a mock**, so any drift fails a test.
- **New charting dependency.** Chart.js adds bundle weight and a supply-chain surface; it is the
  DESIGN-mandated library and MIT-licensed, so the trade-off is accepted, but the dependency must clear
  the security/audit bar before it is added.
- **Category coloring is robust (resolved).** The shipped snapshot carries `id` + `color` on every
  `top_categories` / `per_category_per_day` entry, so coloring is keyed by `id` from the snapshot
  itself — no name-based join, immune to renames and duplicate names.
- **No nav shell yet.** Without FR-SHELL-01's router, the Stats page is reachable only through the
  minimal `src/App.tsx` composition; full routing/reachability is a shell concern, deferred.

## Open questions

All resolved into the contract before ratification (per the AGENTS.md seam rule: a ratified change
carries no textually open question).

1. **Session-log integration boundary (slice 003).**
   **Resolution (2026-07-11):** slice 003 exports the session log as a standalone, importable
   component; this slice only imports and mounts it. Recorded as an explicit task in
   `add-timer-sessions/tasks.md` (its §6) so the obligation lives with the owner, not in a side
   note. If the component is not exported by the time this slice runs, the slice BLOCKS on slice
   003 rather than editing its module (cross-slice ownership rule).
2. **All-time volume in the snapshot (FR-STATS-01).**
   **Resolution (2026-07-11):** `volume.all_time_min` is pinned in architecture §4.1 and in the
   slice-004 contract; FR-METR-01's requirement text in `docs/requirements.md` now includes
   all-time. This slice renders it.
3. **Per-category time series for the line chart (FR-STATS-04).**
   **Resolution (reconciled 2026-07-11 to shipped shape):** the series is the separate top-level
   `per_category_per_day` block (each `{id, name, color, per_day: [{date, min}]}`), produced by
   slice 004 (`CategoryPerDayRead`). One line per `per_category_per_day` entry — NOT nested under
   `top_categories`.
4. **M5 streak score card and its baseline (FR-STATS-05).**
   **Resolution (reconciled 2026-07-11 to shipped shape):** the shipped `baselines` carries only
   four entries (`volume`, `consistency`, `focus_share`, `switch_load`) — **no `streak`**. The M5
   card renders from `streaks.current` as a plain value card (no zone/delta). A zoned streak card
   awaits the `metrics-snapshot-extension` follow-up (add `baselines.streak`).
5. **"Building — day N of 30" day count (architecture §3.8).**
   **Resolution (reconciled 2026-07-11 to shipped shape):** the shipped snapshot has **no**
   `history_days` field, so the building chip is generic ("building") without the day count. Adding
   `history_days` is part of the `metrics-snapshot-extension` follow-up.
6. **Category identity in `top_categories` (FR-STATS-03/04).**
   **Resolution (reconciled 2026-07-11 to shipped shape):** entries carry `id` and `color` (no
   `archived`); the UI colors from the snapshot keyed by `id` and never joins by name.
   `listCategories()` is not used by this page. Archived-category greying awaits the follow-up
   (`archived` flag).
7. **Heatmap UI ownership (cross-slice).**
   **Resolution (2026-07-11):** the heatmap UI (FR-HEAT-01/02, DESIGN §7.2 — Timer home) is a
   **dedicated later heatmap-ui slice**; slice 004 prepares the data plane without claiming the
   ids, and it is out of scope here. All three anchors (003/004/005) now say the same.
