## Context

Fifth and FINAL MVP slice, and the headline asked-for feature. Stack is fixed by
ADR-0001: Next.js 16 (App Router) + TypeScript + Tailwind 4, **SQLite + Drizzle**,
**Recharts** (already installed, TC-05), Vitest, Playwright. UI copy is Ukrainian
(NFR-LOC-01); code identifiers, spec text, and trace ids stay English. The app is
single-user and auth-less (NFR-SEC-01, TC-04) — there are NO unauthorized /
forbidden paths, so the shared "unauthorized -> login, forbidden -> home" UI rules
do not apply here (deliberate exclusion, see the baseline spec).

By this slice the plant detail page (`app/plants/[id]/page.tsx`) is a
`force-dynamic` server component that ALREADY loads both `listMeasurements(db, id)`
(FR-GROWTH-02) and `listWaterings(db, id)` (FR-WATER-03) and renders each as a list
ordered date descending. The data is logged and readable; it is not yet
visualized. This slice adds two Recharts line charts fed by the SAME row arrays —
no new query, no new DB table, no migration. The shared date conventions (SC-1,
display `DD.MM.YYYY`) and helpers (`lib/dates.ts`, promoted by slice 3) are FROZEN
and reused verbatim. The growth and watering capabilities are CONSUMED as the data
source, not reshaped.

The defining constraint is that Recharts is a CLIENT library
(`ResponsiveContainer` measures the DOM; `LineChart` paints SVG). jsdom does not
lay out or paint, so a unit test cannot prove a chart's pixels, axis ticks, or
legibility. The slice's TESTABLE seam is therefore a pair of PURE, Recharts-
agnostic data-shaping functions; the rendered chart is validated in Phase 6
(vision-verify + axe + the 500 ms perf gate).

## Goals / Non-Goals

**Goals:**
- A watering chart on `/plants/[id]` plotting that plant's watering events over
  time — the headline feature (FR-CHART-01).
- A growth chart on `/plants/[id]` plotting that plant's height (cm) over time
  (FR-CHART-02).
- A clear, error-distinct empty state per chart when the plant has no
  corresponding data (FR-CHART-03).
- Charts that reflect add/edit/delete of events/measurements (FR-CHART-04) —
  achieved with NO new machinery (D5).
- A PURE, unit-testable data-shaping seam (`lib/charts/series.ts`) that sorts
  chronologically ASCENDING (time axis) and formats display dates `DD.MM.YYYY` via
  `@/lib/dates` (SC-1), independent of Recharts (D1, D2, D3).
- The underlying values stay readable as the existing growth + watering lists —
  charts are never the only way to read data (NFR-A11Y-03), satisfied by the
  already-present sections (D4).
- Each chart carries an accessible label/role and any interactive control is
  keyboard-operable (SC-6, NFR-A11Y-04 at the jsdom level; rendered gate Phase 6).
- Render within 500 ms for <= 365 points (NFR-PERF-02, verified Phase 6).

**Non-Goals:**
- No bucketed/aggregated granularity and no selectable date range — per-event
  points on a daily timeline only (FR-CHART-05, Future).
- No derived insights — average watering interval, growth rate, trend lines
  (FR-CHART-06, Future).
- No new query, DB table, or migration — the charts read the SAME arrays the page
  already loads.
- No client-side data fetching or chart-local state for "live updates" — the
  server re-render via `revalidatePath` is the update mechanism (D5).
- No auth/accounts/sessions (NFR-SEC-01, TC-04).
- No reshaping of the growth/watering capabilities, the `lib/dates.ts` helpers, or
  the detail page's data path — they are consumed verbatim.
- No proof of rendered pixels / axis legibility / 500 ms budget in unit tests —
  that is Phase 6 vision-verify + perf (D6).

## Decisions

### D1 — The testable seam is PURE functions, NOT the rendered chart (ADR-worthy)
Recharts renders in the browser; jsdom cannot lay out `ResponsiveContainer`
(width/height resolve to 0) or paint SVG, so asserting on a rendered chart in
Vitest proves nothing about what the Owner sees. Decision: extract ALL data
shaping into pure functions in `lib/charts/series.ts` that take the already-loaded
row arrays and return plain, serializable series-point arrays — no Recharts import,
no React, no DOM. These are the slice's red->green unit target. The chart
components become thin: "take a series prop, hand it to `LineChart`, or render the
empty state." This is the testability seam decision and is ADR-worthy because it
sets the pattern (logic in pure functions; rendering validated by vision) for any
future visualization.

Trade-off: the pure functions do NOT prove the chart looks right (correct axis,
legible labels, no overlap) — only that the DATA fed in is correct, sorted, and
formatted. That visual proof is explicitly deferred to Phase 6 vision-verify
(D6). The alternative — a jsdom render assertion — would be a false sense of
security (it would pass on a blank/broken chart). We accept the split:
deterministic unit tests on data + a human/vision gate on pixels.

### D2 — Watering chart shape: COUNT PER DAY line (FR-CHART-01)  (decision + justification)
A watering event has no numeric value (FR-WATER-06 amount is Future) — only a
date. To plot "watering events over time" the chart needs a y-value. Options
considered:
- (a) one marker per event at y=1 — overlaps illegibly when a plant is watered
  several times in a period and reads as a flat line;
- (b) a count-per-DAY line: y = number of waterings on that calendar day;
- (c) cumulative count — answers "how many total", not "how often", which is the
  Owner's question.

Decision: **(b) count per day.** `toWateringSeries(waterings)` groups the events by
`wateredOn` (`YYYY-MM-DD`), emits one point per day with `count` = events that day,
sorted by date ASCENDING. Justification: a money-tree owner wants to SEE watering
FREQUENCY over time — a count-per-day line legibly shows clusters ("I watered a
lot in June") and gaps ("nothing for three weeks") at a glance, which a flat row of
y=1 markers cannot. Days with zero waterings are simply absent points (no
zero-filling) — per-event on a daily timeline, NOT a bucketed/continuous calendar
(FR-CHART-05 bucketing stays Future); a single watering renders one point without
error.

Trade-off: a count-per-day collapses multiple same-day events into one point with a
count, so the chart shows "3 waterings on this day" as one y=3 point rather than
three stacked markers. That is the intended legible reading (frequency), and the
exact per-event rows remain visible in the waterings LIST (NFR-A11Y-03), so no
information is lost. Within-day ordering is irrelevant to a date-only daily
timeline.

### D3 — Growth chart shape: height (cm) line over measurement dates (FR-CHART-02)
`toGrowthSeries(measurements)` emits one point per measurement,
`{ date, label, heightCm }`, sorted by `measuredOn` ASCENDING (time axis). The
y-value is the stored numeric `heightCm` (a Drizzle `real` column — slice 3 stored
it as a NUMBER precisely so the chart has a true numeric axis, no re-parse). The
exact stored value is preserved: a decimal-comma input accepted by FR-GROWTH-05
(e.g. "12,5") was already normalized to the number 12.5 upstream, so the series
carries 12.5 unchanged — the series function does NOT round, drop trailing zeros,
or re-locale-parse (value validation is owned by FR-GROWTH-05, not re-enforced
here). A single measurement renders one point.

Two measurements on the SAME date are kept as TWO distinct points (growth, unlike
watering, has a per-measurement value worth plotting); the ASC sort is tie-broken
by row `id` ASC so the order is deterministic and reproducible — matching the
list's deterministic ordering (the list is DESC; the chart is ASC for a left->right
time axis, the same total order reversed).

### D4 — Empty state per chart, distinct from error (FR-CHART-03)  (NFR-A11Y-03 reference)
When `toGrowthSeries` / `toWateringSeries` returns an empty array (the plant has no
measurements / no waterings), the corresponding chart renders `ChartEmptyState`
with a clear Ukrainian message ("Ще немає вимірювань для графіка" /
"Ще немає поливів для графіка") INSTEAD of a `ResponsiveContainer`/`LineChart` with
no data (which would paint a blank panel with zeroed/degenerate axes). The empty
state is a distinct component with its own message and styling, semantically and
visually distinguishable from a loading or error state.

NFR-A11Y-03 is ALREADY satisfied independent of this slice: the same plant detail
page renders the measurements list (`MeasurementsSection`, FR-GROWTH-02) and the
waterings list (`WateringsSection`, FR-WATER-03), so the underlying values are
readable as lists/tables whether or not a chart renders. The charts reference (do
not re-implement) those lists; if a chart failed to render, the lists still expose
every value. This slice does NOT introduce a chart-specific table.

### D5 — FR-CHART-04 "updates on add/edit/delete" needs NO new machinery (explicit)
The plant detail page is `export const dynamic = "force-dynamic"` and loads the
rows server-side per request. Every existing growth/watering server action
(`create/update/delete`) already calls `revalidatePath('/plants/<plantId>')` on
success. Therefore: the Owner adds/edits/deletes -> the action revalidates the
detail path -> Next re-renders the server component with the fresh
`listMeasurements` / `listWaterings` arrays -> the charts re-derive their series
from the new arrays and re-paint. No subscription, no client store, no chart-local
fetch, no optimistic state. Decision: rely on the existing
`force-dynamic` + `revalidatePath` contract; this slice asserts the behavior in the
spec but builds nothing for it. A deleted last point makes the series empty, so the
chart transitions to its empty state (D4) automatically.

Trade-off: a full server re-render per mutation (vs. client-side optimistic chart
update) costs a round-trip, but it is well within NFR-PERF-01's 300 ms locally and
keeps the chart a pure derivation of server truth (no client/server divergence).
Accepted — simplest correct mechanism for the final slice.

### D6 — `components/charts/` are thin CLIENT islands over Recharts
`GrowthChart` and `WateringChart` are `'use client'` components (Recharts needs the
DOM). Each takes its already-shaped series as a prop (the SERVER page calls the
pure `toGrowthSeries` / `toWateringSeries` and passes the result down, so the
shaping runs on the server and the client gets plain data) and:
- if the series is empty, renders `ChartEmptyState` with the per-chart message;
- otherwise renders `<ResponsiveContainer><LineChart ...>` with an `XAxis` keyed on
  the `label` (`DD.MM.YYYY`), a `YAxis` (height cm / count), a `Line`, a `Tooltip`,
  and a `CartesianGrid`.

Each chart is wrapped in a `<figure>` with an accessible name (the chart title via
`aria-label`/`figcaption`, Ukrainian copy) so a screen reader announces what the
region is (SC-6, NFR-A11Y-04). Recharts' default tooltip/legend interactions are
keyboard-considered at the jsdom level by the empty-state + label tests; the
RENDERED a11y (axe light+dark) and the rendered LEGIBILITY/contrast/responsive and
the 500 ms render budget are validated in Phase 6 (vision-verify + axe + perf
gate) — jsdom/Recharts cannot prove pixels. The charts are placed on
`app/plants/[id]/page.tsx` above (or beside) their corresponding existing sections,
fed the arrays the page already loads.

### D7 — Ukrainian copy in `lib/i18n/uk.ts` (NFR-LOC-01)
A new `charts` block: `growthTitle`, `wateringTitle`, `growthEmpty`,
`wateringEmpty`, axis labels (`heightAxis` = "Висота (см)", `dateAxis` = "Дата",
`countAxis` = "Поливів за день"), and the per-chart accessible-name strings.
Ukrainian text, English identifiers — reusing the established copy-module pattern.

## Data model

No schema change. No new table, no migration. The charts read the SAME rows the
detail page already loads:

```
growth_measurements (existing, slice 3)   ->  toGrowthSeries(measurements)
  id, plantId, heightCm (REAL), measuredOn (YYYY-MM-DD)   ->  [{ date, label: DD.MM.YYYY, heightCm }] sorted measuredOn ASC, id ASC

watering_events (existing, slice 4)        ->  toWateringSeries(waterings)
  id, plantId, wateredOn (YYYY-MM-DD), note ->  group by wateredOn -> [{ date, label: DD.MM.YYYY, count }] sorted date ASC

-- Series order: ASCENDING for a left->right time axis (the lists are DESC; same
--   total order, reversed for display).
-- No bucketing (FR-CHART-05 Future): watering = count-per-DAY points, no week/month
--   rollup; growth = one point per measurement.
-- Empty array -> the chart renders ChartEmptyState (FR-CHART-03), not a blank plot.
```

## Error handling strategy

- **No data (empty plant)**: the series function returns `[]`; the chart renders
  `ChartEmptyState` with a clear Ukrainian message — distinct from an error, never
  a blank/zeroed plot (FR-CHART-03, D4).
- **Data could not be loaded**: data loading is owned by the existing
  `listMeasurements` / `listWaterings` on the server page; a query failure surfaces
  through the page's normal error boundary (not a chart concern), and the lists —
  the canonical readable view — are on the same page (NFR-A11Y-03), so a chart
  problem never makes the values unreadable.
- **Chart render failure**: the charts are prop-driven client islands (no
  chart-level async load), but a Recharts render error would otherwise bubble to
  Next's full-page error and present the "raw 500" the spec forbids. Each chart is
  therefore wrapped in `ChartErrorBoundary` (a small `'use client'` class
  boundary): on a render error it shows an inline non-blocking Ukrainian fallback
  ("chart unavailable — see the list below") in a `role="alert"` region — distinct
  from `ChartEmptyState`'s `role="status"` empty panel — so the blast radius is one
  chart and the measurements/waterings LISTS on the same page stay readable
  (FR-CHART-03, NFR-A11Y-03). The cause is logged server-side via
  `componentDidCatch`, not swallowed silently.
- **Malformed/edge values**: the series functions are defensive on shaping only —
  they preserve the exact stored numeric height (no rounding/dropping) and skip a
  row only if its date is structurally unusable, never throwing; value VALIDATION
  is upstream (FR-GROWTH-05, SC-1/SC-2) and is NOT re-enforced here.
- The charts are CLIENT components but introduce NO server action and NO user input
  — they only render derived data — so there is no mutation/validation/raw-500 path
  owned by this capability (those live in growth/watering).

## Risks / Trade-offs

- **R1 — A jsdom/Recharts test gives false confidence.** Asserting a rendered chart
  in Vitest can pass on a blank or broken chart because `ResponsiveContainer`
  resolves to 0x0 and nothing paints. Mitigation: D1 — test the PURE series
  functions (sort, label format, count grouping, value preservation, empty -> [])
  and the empty-state branch; defer rendered legibility/a11y/perf to Phase 6
  vision-verify. The tasks call this out explicitly.
- **R2 — Watering "events over time" rendered as an illegible flat line.** Plotting
  one y=1 marker per event overlaps on busy days and reads as a flat line, hiding
  frequency. Mitigation: D2 — count-per-day line so clusters and gaps are visible;
  unit-test that N events on one day collapse to a single point with `count = N`
  and that distinct days produce distinct ascending points.
- **R3 — Series sorted the wrong way (DESC) so the time axis runs backwards.** The
  lists are DESC (newest first); a chart time axis must run oldest->newest left to
  right. Mitigation: D3/D2 — both series sort ASCENDING (tie-broken by id ASC for
  determinism); a unit test asserts ascending order including a same-date tie-break.
- **R4 — Decimal/locale height dropped or misplotted.** A height like 12.5 (entered
  "12,5", normalized upstream) could be rounded or re-parsed and misplotted.
  Mitigation: D3 — the series preserves the exact stored number; a unit test feeds
  12.5 and the FR-GROWTH-05 upper-bound value and asserts the plotted value is
  carried through unchanged (no round, no drop, no NaN).
- **R5 — Empty state mistaken for / styled like an error.** A blank chart or an
  error-styled "no data" panel confuses the Owner. Mitigation: D4 — a distinct
  `ChartEmptyState` component with its own Ukrainian message and styling; a
  component test asserts the empty branch renders the empty message (not a chart,
  not an error) when the series is empty.
- **R6 — Charts drift out of sync after a mutation.** If the charts cached or
  fetched data independently, an add/edit/delete could leave them stale.
  Mitigation: D5 — the charts are pure derivations of the server-loaded arrays on a
  `force-dynamic` page; the existing actions' `revalidatePath` re-renders the page,
  so the charts always reflect current data with no extra machinery. The spec
  asserts add/edit/delete reflection; the smoke test proves it end to end.
- **R7 — Two charts + two sections crowd `/plants/[id]`.** Four data regions on one
  page could collide or overflow at 360 px. Mitigation: D6 — each chart is its own
  labelled `<figure>` placed with its section; the 360 px responsive check + the
  rendered layout are validated in Phase 6 (NFR-COMPAT-01, vision-verify).
- **R8 — Performance above the supported maximum.** NFR-PERF-02 guarantees 500 ms
  only up to 365 points; a plant with 400+ events must still render every point,
  not truncate. Mitigation: the series functions never cap/bucket/drop points (D2,
  D3); the 500 ms budget and the >365-point graceful-degradation are verified in
  Phase 6 (perf gate), the spec records the requirement.

## Known advisories

- **PostCSS `<8.5.10` — GHSA-qx2v-qp2m-jg93 (moderate, accepted/transitive).**
  Same disposition as slices 1-4 (app-shell, plants, growth, watering). `npm audit`
  flags PostCSS 8.4.31 with an XSS-via-unescaped-`</style>`-in-CSS-stringify
  advisory. It is **transitive**: pulled in only through the nested
  `node_modules/next/node_modules/postcss` of the pinned `next@16.2.9`; our own
  top-level PostCSS (`@tailwindcss/postcss`) already resolves to a patched 8.5.x.
  It is **not introduced by this slice** — add-charts adds no dependencies
  (Recharts was already installed) and touches no CSS/PostCSS path — and is **not
  reachable here**: no user-controlled CSS is stringified. No non-breaking fix
  exists. **Action:** accepted as a transitive advisory; revisit when a Next.js
  patch release depends on PostCSS `>=8.5.10`.

## Accepted limitations (MVP)

- **Per-event on a daily timeline only.** No weekly/monthly buckets and no
  selectable date range (FR-CHART-05, Future). Accepted: Q7 fixed per-event/daily
  as the MVP granularity; bucketing is a later enhancement.
- **No derived insights.** No average watering interval, growth rate, or trend line
  (FR-CHART-06, Future). Accepted: the charts SHOW the history; computing
  statistics is out of MVP scope.
- **Watering collapses same-day events to a count point.** The chart reads
  frequency, not individual same-day events; the exact per-event rows stay in the
  waterings list (NFR-A11Y-03). Accepted per D2.
- **No chart-specific data table.** NFR-A11Y-03 is satisfied by the EXISTING
  growth + watering lists on the same page; this slice does not add a redundant
  table. Accepted — the lists already expose every value.
- **Rendered-result a11y / AA-contrast / 360 px-responsive / vision verification AND
  the 500 ms render budget (NFR-PERF-02) are DEFERRED to Phase 6** (the
  cross-cutting axe light+dark + vision-verify + perf gate runs once over the whole
  app). jsdom/Recharts cannot prove rendered pixels, axis legibility, or render
  time, so the rendered chart is validated there; the slice's unit tests cover the
  pure series shaping and the empty-state branch. Honestly tracked deferral, not a
  dropped NFR (SC-6 accessible-label association is asserted at the jsdom level
  here; the NFR-A11Y-* / NFR-PERF-02 rendered gates remain owned by Phase 6).
  NOTE (NFR-PERF-02): the ≤500 ms render-time budget for ≤365 points is measured
  in Phase 6 (vision-verify + a dedicated perf check); the slice's unit layer
  proves only the data-side guarantee — `toGrowthSeries`/`toWateringSeries` carry
  365+ points through with no cap/drop/bucket/truncate (asserted in
  `lib/charts/series.test.ts`).
