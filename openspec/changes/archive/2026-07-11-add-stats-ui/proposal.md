## Why

Slice 004 computes every metric and serves the architecture §4.1 snapshot read-only at
`GET /api/stats/snapshot`, but nothing renders it — the numbers exist only as JSON. This change adds
the **Stats analytics UI**: the page that turns that snapshot into the summary tiles, per-metric score
cards, and charts of DESIGN §7.3, and composes the slice 003 session-log component onto the page. It
is a pure **frontend** slice — it **renders** the snapshot and **recomputes no metric** (that is slice
004); the score card's zone color and "building" state are read from the snapshot fields slice 004
already produced (architecture §3.6 / §3.8), not derived here.

Authored **before any code** (spec-first, per [`openspec/README.md`](../../README.md)): this is the
ratified contract the implementation is built against. It follows DESIGN §7.3 (the Stats screen), §3
(tokens), §9 (inline-SVG iconography), and §10 (empty / loading / error states), and consumes the
architecture §4.1 snapshot as its sole data contract. It **reuses** slice 001's credentialed
`src/api.ts` HTTP boundary and the slice 003 session-log component rather than re-implementing either,
and adds **no backend endpoint and no migration**.

## What Changes

- Render the **summary tiles** — today / this week / this month / all-time tracked time plus the
  current streak — from the snapshot's `volume` and `streaks` fields (architecture §4.1). **FR-STATS-01**
- Render the **bar-by-day chart** from the snapshot's `volume.per_day` series (architecture §4.1).
  **FR-STATS-02**
- Render the **donut-by-category chart** from the snapshot's `top_categories` series
  (`{id, name, color, week_min}`, shipped slice-004 shape), coloring each arc from the entry's own
  `color` keyed by `id` (DESIGN §7.3). **FR-STATS-03**
- Render the **per-category line chart** of tracked time over time from the snapshot's separate
  `per_category_per_day` block (`{id, name, color, per_day}`, shipped slice-004 shape), one line per
  entry colored from its own `color`. **FR-STATS-04**
- Render a **metric score card** for each of the four `baselines` entries (`volume`, `consistency`,
  `focus_share`, `switch_load`) showing its value, **zone color** (green / yellow / red per
  architecture §3.6), and **signed baseline delta** with an up/down SVG arrow; a baseline still
  forming renders the neutral **"building"** state instead of a zone color (architecture §3.8), never
  a fabricated delta. An M5 **streak** card renders from `streaks.current` as a plain value (the
  shipped snapshot carries no streak baseline — a zoned streak card is the metrics-snapshot-extension follow-up). **FR-STATS-05**
- Compose the existing **slice 003 session-log component** onto the Stats page (DESIGN §7.3); this
  slice does not re-implement the log, its manual add / edit / delete, or its undo notification.
- Define all four **states** for the page's single snapshot fetch (DESIGN §10): **empty** (no sessions
  → a calm first-run prompt with zeroed tiles, E-1 spirit), **loading** (skeletons that keep the final
  footprint, no layout shift), **error** (a contained, retryable card, never a blank screen), and the
  happy **rendered** state.
- Fetch the snapshot **on view load** through a new read-only `src/api.ts` call to
  `GET /api/stats/snapshot`; the 5-second live poll that later keeps it fresh is slice 007.
- **No emoji anywhere**; every icon (delta arrows, zone dots) is an inline SVG (DESIGN §9,
  **NFR-DES-01**).

## Capabilities

### New Capabilities
- `stats-ui`: the Stats analytics screen — summary tiles, per-metric score cards (value + zone +
  baseline delta, with the <7-day "building" state), and the bar-by-day / donut-by-category /
  per-category line charts — rendering the architecture §4.1 snapshot read-only and composing the
  slice 003 session-log component. This one slice-level capability delivers the `stats` requirement
  group (FR-STATS-01..05) of [`docs/requirements.md`](../../../docs/requirements.md) as one frontend
  slice.

### Modified Capabilities
<!-- None. `stats-ui` is a new capability. It CONSUMES the slice-004 `metrics` capability's read-only
     snapshot (GET /api/stats/snapshot) and COMPOSES the slice-003 `timer-sessions` session-log
     component, modifying neither. It appends to the entry-point-allowlisted src/api.ts and
     src/App.tsx (CLAUDE.md ENTRY_POINT_ALLOWLIST) and adds no backend. -->

## Impact

- **Requirements** (authoritative text in [`docs/requirements.md`](../../../docs/requirements.md)):
  FR-STATS-01..05; applies NFR-DES-01 (no emoji, inline SVG). Reuses the slice-004 snapshot
  (FR-METR-01..07, architecture §4.1) as read-only input and the slice-003 session-log component; the
  score card's zones and baseline deltas are FR-METR-06 output (architecture §3.6/§3.8) rendered, not
  recomputed.
- **Data contract consumed (no new endpoint):** `GET /api/stats/snapshot` — the **shipped**
  slice-004 `SnapshotResponse` (`app/schemas/stats.py`): `volume.all_time_min`, the separate
  `per_category_per_day` block, and `top_categories[].{id, color}`. This slice adds a read-only
  `getStatsSnapshot()` to `src/api.ts`; category colors come from the snapshot itself (no
  `listCategories()` join). It defines **no** new route. Three extension fields the shipped snapshot
  omits (`baselines.streak`, `history_days`, `top_categories[].archived`) are the
  `metrics-snapshot-extension` follow-up, not a blocker here.
- **Frontend (new files):** a `frontend/src/pages/Stats/` page with `StatsPage.tsx`, its component
  set (`SummaryTiles`, `ScoreCard`, `BarByDay`, `DonutByCategory`, `CategoryLine`), a `stats.css`
  scoped to DESIGN §3 tokens, and the snapshot-shaped TypeScript types. Charts use **Chart.js** styled
  to the tokens (DESIGN §7.3) — a new, MIT-licensed frontend dependency added under BC-COST-01
  (free/OSS) and vetted per the dependency bar. All HTTP goes through `src/api.ts`; SVG icons only, no
  emoji (NFR-DES-01).
- **Frontend (appended, entry-point-allowlisted only):** one `getStatsSnapshot()` export appended to
  `src/api.ts` and the Stats page mounted via `src/App.tsx` — both on the CLAUDE.md
  `ENTRY_POINT_ALLOWLIST`. No other slice's module is edited (the session log is **imported**, not
  modified — see the design Open questions if it is not yet a reusable component).
- **Tests:** component tests for `ScoreCard` (zone color per §3.6, signed delta + direction, the
  <7-day "building" state) and `SummaryTiles` first, then the chart components and the page's
  empty / loading / error states, each acceptance test carrying an `@trace <FR-ID>` docstring so
  `check-traceability` goes GAP -> COVERED. No backend or DB test.
- **Backend / migration:** **none.** This slice adds no router, no schema, and no Alembic migration.
- **Docs:** the thin anchor [`docs/specs/005-stats-ui.md`](../../../docs/specs/005-stats-ui.md) links
  to this change for the Python traceability harness (specs<->OpenSpec bridge,
  [`openspec/README.md`](../../README.md)).

## Out of scope

Belongs to other slices; this change must not implement it.

- **Metric computation** — every M1-M6 formula, window, threshold, zone, baseline, and the snapshot
  assembly (FR-METR-*, architecture §3-§4.1) — slice 004. This slice **renders** the snapshot and
  computes **no** number; if a value the UI needs is absent from §4.1, that is flagged for slice 004,
  never computed client-side.
- **The AI coach and its drawer** (FR-SHELL-02, FR-COACH-*, DESIGN §7.5) — slice 006. The coach also
  reads the §4.1 snapshot, but no coach UI, insight card, or chat ships here.
- **The live-poll transport** — the 5-second `GET /api/sync/state` poll and cross-device refresh
  (architecture §5, NFR-DATA-01) — slice 007. This slice fetches the snapshot **once on view load**.
- **The session log itself** — its list, manual add / edit / delete, and undo notification
  (FR-SESS-03..06, FR-NOTIF-01) — slice 003. This slice **composes** that component, it does not build
  or modify it.
- **The activity heatmap UI** (FR-HEAT-01/02, DESIGN §7.2 — the Timer home) — a **dedicated later
  heatmap-ui slice** (resolved; slice 004 prepares the data plane without claiming the ids).
- **The nav shell / three-route SPA** (FR-SHELL-01) — a separate slice; this page is mounted through
  the existing `src/App.tsx` composition until the shell lands.
- **Any new backend endpoint, schema, or Alembic migration.**
