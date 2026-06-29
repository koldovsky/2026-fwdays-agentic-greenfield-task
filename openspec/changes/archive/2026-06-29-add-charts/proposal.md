## Why

This is the FIFTH and FINAL MVP slice and the headline asked-for feature. Slices
2-4 landed the plant aggregate and its two children: `add-plants` (the plant root
in SQLite + Drizzle, the cascade DIRECTION, the shared `ActionResult` /
`FieldError` / `FormErrorBanner` contract, SC-1/SC-2), `add-growth` (the first
child — height measurements; promoted the shared date helpers to `lib/dates.ts`),
and `add-watering` (the second child — date-only watering events with an optional
note). At this point the plant detail page (`/plants/[id]`) already RENDERS both
the measurements list (FR-GROWTH-02) and the waterings list (FR-WATER-03) ordered
date descending. The data is logged and readable as lists — but it is NOT yet
VISUALIZED. The Owner asked for a watering chart to SEE watering frequency over
time; the growth chart makes the tracked height history legible at a glance. With
the values present and the lists already satisfying NFR-A11Y-03, this slice is the
small, satisfying final step: turn the existing data into two charts.

This slice delivers FR-CHART-01 (watering chart: watering events over time — the
headline), FR-CHART-02 (growth chart: height over time), FR-CHART-03 (a clear
empty state per chart when there is no data), and FR-CHART-04 (charts reflect
add/edit/delete). It binds the travelling NFRs: NFR-A11Y-03 (the underlying values
are ALSO available as a list/table — ALREADY satisfied by the existing growth +
watering sections, so the charts are never the only way to read the data),
NFR-PERF-02 (each chart renders within 500 ms for <= 365 data points), and the
keyboard + accessible-label convention SC-6 / NFR-A11Y-04. It honours the shared
date conventions SC-1 (display dates `DD.MM.YYYY`) reusing `lib/dates.ts`
verbatim.

The new piece here is the DATA-SHAPING SEAM. Recharts is a CLIENT library
(`ResponsiveContainer` + `LineChart` need the DOM), and jsdom cannot prove pixels,
so the slice's testable unit is NOT the rendered chart — it is a pair of PURE,
chart-library-agnostic functions in `lib/charts/series.ts` that map the same row
arrays the lists consume (`listMeasurements` / `listWaterings`) into sorted,
display-ready series points. The pure functions are unit-tested (red -> green);
the rendered chart's legibility, a11y, and 500 ms budget are validated in Phase 6
(vision-verify + axe + perf gate). FR-CHART-04 "updates on add/edit/delete" needs
NO subscription/state machinery: the detail page is a server component, each
existing growth/watering action calls `revalidatePath('/plants/<id>')`, so the
page re-renders with fresh rows and the charts re-derive from them automatically —
this slice states that explicitly rather than building anything new for it.

## What Changes

- **New `lib/charts/series.ts`** — two PURE, framework-agnostic data-shaping
  functions (the slice's tested seam), with the db handle NOT involved (they take
  the already-loaded row arrays):
  - `toGrowthSeries(measurements)` -> points sorted by date ASCENDING (time axis),
    each `{ date: 'YYYY-MM-DD', label: 'DD.MM.YYYY', heightCm: number }`,
    preserving the exact stored numeric height (decimals, e.g. 12.5, intact).
  - `toWateringSeries(waterings)` -> a per-DAY series sorted by date ASCENDING,
    each `{ date: 'YYYY-MM-DD', label: 'DD.MM.YYYY', count: number }`, where
    `count` is the number of watering events on that day. Per-event points on a
    daily timeline with NO weekly/monthly bucketing (FR-CHART-05 is Future); a
    count-per-day line is the legible representation a money-tree owner reads as
    "how often did I water" (decision D2). Date labels via `formatAcquiredDate`
    from `@/lib/dates` (SC-1) — reused verbatim, no copy.
- **New `components/charts/` client components** (Recharts):
  - `GrowthChart` — a `ResponsiveContainer` + `LineChart` of height (cm) over the
    measurement dates, or the empty state when there are no points.
  - `WateringChart` — a `ResponsiveContainer` + `LineChart` of waterings-per-day
    over the watering dates, or the empty state when there are no points.
  - `ChartEmptyState` — a shared, clearly-distinct-from-error empty panel
    (FR-CHART-03) showing a Ukrainian message.
  - Each chart carries an accessible label/role (figure + label), and the
    existing data lists (rendered on the same page) satisfy NFR-A11Y-03.
- **Charts wired into `app/plants/[id]/page.tsx`** — both charts placed on the
  plant detail page (above or beside their corresponding lists), fed the SAME
  `measurements` / `waterings` arrays the page already loads. No new query, no new
  data path: the page is `force-dynamic`, so add/edit/delete (which already
  `revalidatePath` the detail) re-render the page and re-derive the series — that
  is how FR-CHART-04 is satisfied (decision D5).
- **Ukrainian copy** extended in `lib/i18n/uk.ts` (a `charts` block: chart titles,
  per-chart empty-state messages, axis/accessible labels).

## Capabilities

### New Capabilities
- `charts`: render a single plant's history on its detail view as two Recharts
  line charts — a watering chart (events-per-day over time, the headline feature)
  and a growth chart (height in cm over time) — each with a clear empty state when
  the plant has no data, both re-deriving from the same row arrays the lists
  consume so they stay in sync as events/measurements are added/edited/deleted.
  Owns the pure data-shaping seam `lib/charts/series.ts` (sort ASC, `DD.MM.YYYY`
  labels). Per-event-on-a-daily-timeline only — no bucketing/date-range
  (FR-CHART-05) and no derived insights (FR-CHART-06), both Future.

### Modified Capabilities
<!-- None. The growth capability (`listMeasurements`, the measurements section)
and the watering capability (`listWaterings`, the waterings section) are CONSUMED
verbatim as the charts' data source; their lists already satisfy NFR-A11Y-03 and
are not reshaped. The shared `lib/dates.ts` helpers (SC-1) and the plant detail
page's `force-dynamic` + per-action `revalidatePath` re-render (which gives
FR-CHART-04 for free) are reused, not changed. -->

## Impact

- New code: `lib/charts/series.ts` (+ colocated `series.test.ts`),
  `components/charts/{GrowthChart,WateringChart,ChartEmptyState}.tsx`
  (+ colocated empty-state behavior test), the two charts wired into
  `app/plants/[id]/page.tsx` (above/beside the existing sections), and a `charts`
  copy block in `lib/i18n/uk.ts`.
- Reused unchanged (frozen contracts): `lib/dates.ts` (`formatAcquiredDate` for
  axis labels — promoted by slice 3, no move here), `lib/growth/queries.ts`
  (`listMeasurements`) and `lib/watering/queries.ts` (`listWaterings`) as the data
  source, the existing `MeasurementsSection` / `WateringsSection` (which keep the
  values readable as lists — NFR-A11Y-03), Recharts (already installed, TC-05),
  and the detail page's `force-dynamic` + the slices' existing `revalidatePath`
  (FR-CHART-04 needs nothing new).
- Trace ids touched: FR-CHART-01, FR-CHART-02, FR-CHART-03, FR-CHART-04;
  NFR-A11Y-03, NFR-PERF-02, NFR-A11Y-04, SC-6, SC-1. (NFR-LOC-01 carries via the
  UI copy; NFR-A11Y-01/02 rendered-result gates verified in Phase 6.)
- No new dependency (Recharts already installed), no new DB table, no migration,
  no auth, no third-party integration (NFR-SEC-01, TC-04). Bucketed granularity /
  selectable date range (FR-CHART-05) and derived insights such as average
  watering interval or growth rate (FR-CHART-06) stay Future / out of scope and
  are intentionally excluded.
