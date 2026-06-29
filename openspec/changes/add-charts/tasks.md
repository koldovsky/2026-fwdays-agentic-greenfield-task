## 1. Failing tests first (red)

- [x] 1.1 Write unit tests for `toGrowthSeries(measurements)` in `lib/charts/series.ts` (the slice's tested seam, design D1, D3): given measurements it returns one point per measurement `{ date: 'YYYY-MM-DD', label: 'DD.MM.YYYY', heightCm: number }` sorted by `measuredOn` ASCENDING (tie-broken by row id ASC for two same-date measurements, deterministic), the `label` formatted via `@/lib/dates` `formatAcquiredDate`; an empty input returns `[]`; a single measurement returns one point; the exact stored numeric height is preserved unchanged — feed 12.5 (a decimal-comma value normalized upstream per FR-GROWTH-05) and the FR-GROWTH-05 upper-bound value and assert neither is rounded, dropped, NaN, or re-parsed (FR-CHART-02, SC-1). Confirm they FAIL.
- [x] 1.2 Write unit tests for `toWateringSeries(waterings)` in `lib/charts/series.ts` (design D1, D2): it groups events by `wateredOn` into one COUNT-PER-DAY point `{ date, label: 'DD.MM.YYYY', count: number }` sorted by date ASCENDING; N events on the SAME day collapse to a single point with `count = N`; events on distinct days produce distinct ascending points; a single watering returns one point with `count = 1`; an empty input returns `[]`; NO weekly/monthly bucketing and NO zero-filling of empty days (per-event on a daily timeline, FR-CHART-05 is Future) (FR-CHART-01, SC-1). Confirm they FAIL.
- [x] 1.3 Write a component/behavior test for `components/charts/ChartEmptyState.tsx` and the empty branch of `GrowthChart` / `WateringChart` (design D4): when the series is empty the chart renders the `ChartEmptyState` with the per-chart Ukrainian message ("Ще немає вимірювань для графіка" / "Ще немає поливів для графіка") and does NOT render a chart, and the empty state is semantically distinct from an error/loading state; when the series is non-empty the empty state is NOT shown (the chart region renders). Note: this asserts the EMPTY-STATE BRANCH and the accessible label/`<figure>` wrapper only — the RENDERED Recharts pixels/axes are validated in Phase 6 vision-verify, not jsdom (FR-CHART-03, NFR-A11Y-04, SC-6). Confirm they FAIL.

## 2. Implement to green

- [x] 2.1 Implement `lib/charts/series.ts` with the two PURE, Recharts-agnostic functions (design D1, D2, D3): `toGrowthSeries(measurements)` (one point per measurement, `{ date, label, heightCm }`, sorted `measuredOn` ASC then id ASC, exact height preserved, `label` via `@/lib/dates` `formatAcquiredDate`) and `toWateringSeries(waterings)` (group by `wateredOn` -> one `{ date, label, count }` per day, sorted date ASC, no bucketing, no zero-fill); both return `[]` for empty input and never throw. No Recharts/React/DOM import. Green for 1.1, 1.2.
- [x] 2.2 Extend `lib/i18n/uk.ts` with a `charts` copy block (design D7): `growthTitle`, `wateringTitle`, `growthEmpty`, `wateringEmpty`, axis labels (`dateAxis`, `heightAxis` = "Висота (см)", `countAxis` = "Поливів за день"), and the per-chart accessible-name strings — Ukrainian text, English identifiers (NFR-LOC-01).
- [x] 2.3 Implement `components/charts/ChartEmptyState.tsx` — a shared empty panel showing a passed Ukrainian message, visually and semantically distinct from an error/loading state (design D4). Green for the empty-state part of 1.3.
- [x] 2.4 Implement `components/charts/GrowthChart.tsx` (`'use client'`) — takes the growth series as a prop; renders `ChartEmptyState` when empty, otherwise `<ResponsiveContainer><LineChart>` with `XAxis` keyed on the `DD.MM.YYYY` label, a `YAxis` (height cm), a `Line`, `Tooltip`, `CartesianGrid`; wrapped in a labelled `<figure>` (accessible name from the `charts` copy) (design D6, FR-CHART-02, SC-6). Green for the growth part of 1.3.
- [x] 2.5 Implement `components/charts/WateringChart.tsx` (`'use client'`) — takes the watering count-per-day series as a prop; renders `ChartEmptyState` when empty, otherwise `<ResponsiveContainer><LineChart>` with `XAxis` keyed on the `DD.MM.YYYY` label, a `YAxis` (count per day), a `Line`, `Tooltip`, `CartesianGrid`; wrapped in a labelled `<figure>` (accessible name from the `charts` copy) (design D6, FR-CHART-01, SC-6). Green for the watering part of 1.3.
- [x] 2.6 Wire both charts into `app/plants/[id]/page.tsx` (design D5, D6): on the server, call `toGrowthSeries(measurements)` and `toWateringSeries(waterings)` over the arrays the page ALREADY loads (`listMeasurements` / `listWaterings`) and pass the results to `<GrowthChart>` / `<WateringChart>` placed above (or beside) their corresponding existing sections — no new query, no new data path. Confirm the page stays `force-dynamic` so each growth/watering action's existing `revalidatePath('/plants/<id>')` re-renders the page and the charts re-derive (FR-CHART-04 needs nothing new).
- [x] 2.7 Confirm all tests from group 1 now pass (green), and re-run the existing plants + growth + watering suites to confirm adding the charts to the detail page did not regress them.

## 3. Accessibility & rendered verification (Phase 6, deferred — plain bullets)

> DEFERRED to Phase 6 (cross-cutting QA: axe light+dark + vision-verify + perf
> across ALL capabilities). jsdom/Recharts cannot prove rendered pixels, axis
> legibility, or render time, so the RENDERED chart is validated there — honestly
> deferred, not skipped. The jsdom-level a11y for this slice (the chart `<figure>`
> accessible name, the empty-state branch) is covered by the slice's component
> test (1.3); the pure data shaping is covered by 1.1/1.2.

- (Phase 6) Run `npm run check:a11y` (axe) on the growth chart, watering chart, and their empty states in BOTH light and dark themes; resolve any violations (NFR-A11Y-01).
- (Phase 6) Verify WCAG 2.1 AA contrast for chart lines, axes, labels, tooltip, and the empty-state panel in both themes (NFR-A11Y-02).
- (Phase 6) Verify keyboard operation + accessible names for any interactive chart control (tooltip/legend), and that each chart region (`<figure>`) is announced with its accessible name (NFR-A11Y-04, SC-6).
- (Phase 6) VISION-VERIFY the RENDERED charts: the growth line rises/falls with the height history, the watering count-per-day line legibly shows frequency (clusters + gaps), the time axis runs oldest->newest left to right, dates read `DD.MM.YYYY`, a single-point chart and a same-day-collapsed watering point render correctly, and the empty state reads as "no data" (not an error) — the proof that the pure series actually render as legible charts (FR-CHART-01, FR-CHART-02, FR-CHART-03).
- (Phase 6) Verify NFR-PERF-02: each chart renders within 500 ms for a single plant with <= 365 data points; and that a dataset ABOVE 365 points (e.g. 400+) still renders EVERY point (no cap/drop/bucket/truncate, no render error, no fallback to empty/error), degrading on render time only.
- (Phase 6) Verify the two charts + the two existing sections on `/plants/[id]` at a 360 px viewport: content visible/operable with no horizontal overflow (NFR-COMPAT-01).

## 4. Validation, docs, and archive

- [x] 4.1 Run `npm run lint` — zero errors.
- [x] 4.2 Run `npm run test:run` — all unit tests pass (incl. the new series + empty-state tests and the re-run plants + growth + watering suites from 2.7).
- [x] 4.3 Run `npm run build` — production build succeeds.
- [x] 4.4 Run `npx openspec validate add-charts --strict` — no errors.
- [x] 4.5 Run `npx openspec validate --all --strict` — no errors.
- [ ] 4.6 Manual real-DB smoke test: with the existing SQLite file (no migration — this slice adds no schema), run `npm run dev` and:
  1. open a plant with NO measurements and NO waterings — confirm BOTH charts show their clear Ukrainian empty state (not a blank/zeroed plot, not an error), each in its own labelled region, sitting with the existing measurements + waterings sections without layout/label collision;
  2. log one height measurement — confirm the growth chart now shows a single point (no error, no empty state) and the measurements list still shows the value (NFR-A11Y-03);
  3. log a second and third measurement on LATER dates with different heights (incl. a decimal like 12,5) — confirm the growth chart plots the points along an ascending (oldest->newest left to right) time axis with `DD.MM.YYYY` dates and the decimal value placed correctly (not rounded/dropped);
  4. log one watering — confirm the watering chart shows a single count-per-day point and the waterings list still shows the event;
  5. log TWO more waterings on the SAME later date and one on an EARLIER date — confirm the watering chart shows the same-day pair COLLAPSED to a single point with count 2 (frequency reading) and the points run ascending by date, while the waterings list still shows every individual event (NFR-A11Y-03);
  6. EDIT a measurement's height (and a watering's date) — confirm the corresponding chart point MOVES to the new value/position without a full reload (FR-CHART-04 via revalidate);
  7. DELETE measurements/waterings one by one — confirm each chart point disappears, and when the LAST point of a chart is deleted the chart transitions back to its empty state (FR-CHART-03);
  8. reload the app — confirm the charts re-render from the persisted data and still match the lists;
  9. open `/plants/<bad-id>` — confirm the friendly not-found state (no chart render error).
- [x] 4.7 Update `docs/current-state.md` (date/time in Europe/Kiev, current phase, charts moved planned -> implemented, FINAL MVP slice landed: the watering chart [headline] + growth chart on the plant detail page, the pure `lib/charts/series.ts` seam, NFR-A11Y-03 satisfied by the existing lists, FR-CHART-04 via the existing `force-dynamic` + `revalidatePath`). README is the course/homework README with no charts/DB section — N/A there; the charts notes live in `docs/current-state.md`.
- [ ] 4.8 Only after the smoke test (4.6) passes, archive MANUALLY (this project archives change folders by hand to avoid the CLI conflicting with the pre-authored baseline specs): move `openspec/changes/add-charts/` to `openspec/changes/archive/YYYY-MM-DD-add-charts/` (date in Europe/Kiev). Do NOT run `npx openspec archive`.
