# Current state — handoff

> Persistent handoff aid (not the source of truth — if it conflicts with
> code/specs/tests, verify and update it). Timezone: Europe/Kiev.

- **Last updated:** 2026-06-30, Europe/Kiev.
- **Phase:** **Phase 7 (global review + docs) COMPLETE — project DONE (no deploy
  per ADR-0001).** The Phase 7 global review-gate + trajectory-eval (28/28 pass,
  ~93) landed earlier; this update records the final documentation pass. All 7
  changes archived; QA pack under `docs/qa/` is complete (eval 11/11, recordings
  6/6 + vision 6/6, traceability PASS, security-review clean, acceptance report
  ready for sign-off). **Technical docs authored** under `docs/technical/`:
  `architecture.md`, `data-model.md`, `workflows.md`, `testing.md`,
  `operations.md`. **Effort log** `docs/estimation.md` and the stakeholder
  **`docs/delivery-report.md`** are authored, evidence-linked to the QA pack.
  **No further phase** — deploy is out of MVP scope (ADR-0001).

### Phase 6 evidence (what exists, re-verified 2026-06-30)
- **Unit/component:** 433 passing (42 files) — `npm run test:run` rerun 11:00 Kiev.
- **Integration:** 5 real-SQLite suites (`tests/integration/*`).
- **E2E:** 11 Playwright tests, chromium (`tests/e2e/{plants,tracking,reminders,responsive}.e2e.ts`).
- **Coverage:** lines 77.23 / stmts 78.16 / funcs 92.94 / branches 86.28 — ratchet PASS (`quality/coverage-baseline.json`).
- **Eval:** 11/11 pass; error-clarity 89, usability-clarity 94 (`docs/qa/eval-report.md`, `evals/results/latest.json`).
- **Recordings:** 6/6 asserted real artifacts (`docs/qa/recordings-report.md`, `demo-recordings/manifest.json`); one-clip-per-viewport (1280×800 content + 360×800 responsive).
- **Vision:** 6/6 met + legible (`docs/qa/vision-report.md`).
- **A11y:** axe 0 serious/critical, paper theme (`npm run check:a11y`).
- **Traceability:** PASS, 0 failures, 22 by-design recording-coverage warnings (`docs/qa/traceability-report.md`).
- **Trajectory:** PASS, 3 in-scope overlap warnings (`docs/qa/trajectory-report.md`).
- **Gate status:** `npm run gate:status` → G0,G2,G4,G5,G6,G7,G8 PASS; G1/G3 = "needs sign-off" (judgment) and are signed off in Checkpoint 1/2.

### Validation expectations for Phase 7
- Re-run `npm run qa:verify` + `npm run gate:status`; expect the same PASS set.
- Phase 7 release actions still open (from risk register): R-04 manual
  cross-browser spot-check (Firefox/Safari/Edge); optional re-record of stills
  predating AA token darkening (R-06); reconcile eval `inlineMessageFor*` keys to
  the `fieldErrors.*` contract (R-08, cosmetic).

### Exact next task
None — MVP delivered and documented. If the customer signs off
`docs/qa/mvp-acceptance-report.md`, the project closes. Only remaining open
release action is the manual cross-browser spot-check (R-04). Do NOT renumber
requirements (BC-03). Future work / deploy would start a new ADR + change cycle.

<details><summary>Slice 5 detail (add-charts)</summary>

  **Slice 5 `add-charts` GREEN — FINAL MVP slice landed** (Phase 4c implement): the headline visualization slice. No schema change, no migration — the two charts read the SAME row arrays the `force-dynamic` `/plants/[id]` page already loads. The PURE, Recharts-agnostic seam `lib/charts/series.ts` (`toGrowthSeries` = one point per measurement, height-over-time, sorted `measuredOn` ASC then id ASC, exact decimal height preserved; `toWateringSeries` = COUNT-PER-DAY line, same-day events collapse, date ASC, no bucketing/zero-fill; both empty → `[]`, never mutate, never throw). Thin client islands `components/charts/{GrowthChart,WateringChart}.tsx` (Recharts `LineChart` in a labelled `<figure>`, DD.MM.YYYY axis via `@/lib/dates`) + shared `components/charts/ChartEmptyState.tsx` (Ukrainian per-chart empty state, distinct from error/loading). The watering chart (headline) sits above the waterings section, the growth chart above the measurements section. NFR-A11Y-03 satisfied by the EXISTING growth + waterings lists (charts add no redundant table). FR-CHART-04 needs NO new machinery — the page is `force-dynamic` and the existing growth/watering actions' `revalidatePath('/plants/<id>')` re-render the page so the charts re-derive. New `uk.charts.*` copy. All 290 unit tests pass, lint/build/`openspec validate --all --strict` green. **Review-gate fixes applied (2026-06-29):** (1) added `components/charts/ChartErrorBoundary.tsx` (client class boundary, `role="alert"` Ukrainian fallback `uk.charts.renderError`) wrapping each chart on `/plants/[id]` so a Recharts render error degrades to an inline fallback instead of a raw 500, with the measurements/waterings lists still readable (FR-CHART-03, NFR-A11Y-03) — baseline `specs/charts/spec.md` + the change delta reconciled (the two "Render data unavailable" scenarios replaced by "Chart render failure is contained"). (2) Growth chart X axis is now a NUMERIC index axis (`toGrowthXAxis` seam + `tickFormatter` → DD.MM.YYYY) so two same-date measurements stay distinct points instead of collapsing onto one categorical tick; watering chart (count-per-day, one point per day) unchanged. (3) Added a chart-level FR-CHART-04 test (`GrowthChart.update.test.tsx`) proving a new `series` prop re-renders the new point count / empty↔data transition. (4) `design.md` notes NFR-PERF-02's ≤500ms budget is measured in Phase 6; series tests now assert 365+ points carry through with no cap/drop. Remaining: real-DB smoke (4.6), then manual archive (4.8). Rendered legibility/contrast/360px/perf (NFR-A11Y-*, NFR-PERF-02) DEFERRED to Phase 6 vision-verify + axe + perf gate.

</details>

### Deferred to Phase 6 (cross-cutting QA, tracked here so it isn't lost)
- Rendered a11y for every capability: `npm run check:a11y` (axe light+dark), WCAG AA contrast, keyboard-only, 360px responsive (NFR-A11Y-01/02/04, NFR-COMPAT-01) — run once over the whole app in Phase 6 with vision-verify + recordings.
- E2E enforcement of NFR-USA-01 (≤2 clicks) and NFR-COMPAT-02 (evergreen browsers) — Phase 5/6.
- Global `review-gate` re-run at Phase 7 (the per-slice security/spec "findings" that were clean-dimension reports or by-design no-auth should clear there).

## What this is

A short, single-user web app to track succulent (money tree) growth and
watering, with a watering chart and a growth chart. Scope is deliberately small
(`docs/requirements.md`, `docs/product-brief.md`).

## Done so far

- **G0** — Project Factory loop installed (`/project-factory:init`): agents,
  workflows, `scripts/check-*`, git hooks (`core.hooksPath=.githooks`), CI,
  OpenSpec fallback layout, filled `AGENTS.md`/`CLAUDE.md`/context-architecture +
  ADR-0002.
- **Phase 0 scaffold** — Next.js 16 (App Router, TS) + Tailwind 4 + ESLint 9;
  SQLite + Drizzle (`db/client.ts`, `drizzle.config.ts`, `db/migrate.ts`,
  `db/seed.ts`, empty `db/schema/index.ts`); Recharts; Vitest (`vitest.config.ts`)
  + Playwright (`playwright.config.ts`); `.env.example`. Stack recorded in
  **ADR-0001**. `npm run build`, `tsc --noEmit`, `eslint .` all green.
- **G1 / Phase 1** — `docs/requirements.md` (25 MVP FRs + NFR/TC/BC, numbered),
  `docs/product-brief.md`. Checkpoint 1 signed off: all defaults + UI language
  **Ukrainian**, local SQLite run, no cloud deploy in MVP.
- **Slice 2 `add-plants` (Phase 4, implemented)** — first DB slice. `plants`
  table (`db/schema/plants.ts`, re-exported from `db/schema/index.ts`); first
  committed migration `db/migrations/0000_flippant_galactus.sql`. `lib/plants/`
  (validation, date, queries, service, actions) on the shared `ActionResult`
  inline-error contract. Pages: list + empty state at `/`, add at `/plants/new`,
  detail at `/plants/[id]`, edit at `/plants/[id]/edit`, delete-with-confirm
  island. Species default = `Грошове дерево (Crassula ovata)`; acquired date is
  ISO `YYYY-MM-DD` stored / `DD.MM.YYYY` displayed, future-date rejected against
  today in Europe/Kiev. Slice-1 `ExampleForm` demo removed.
- **Slice 3 `add-growth` (Phase 4, implemented)** — second DB slice, first plant
  child. `growth_measurements` table (`db/schema/growth.ts`, re-exported from
  `db/schema/index.ts`); committed migration `db/migrations/0001_dizzy_maggott.sql`
  with FK `plant_id → plants.id ON DELETE CASCADE` (deleting a plant cascades to
  its measurements; a measurement delete removes only its own row). `lib/growth/`
  (validation with the load-bearing `parseHeightCm` rule + height/date mappers,
  queries with the SC-3 `ORDER BY measured_on DESC, id DESC` tie-break, service,
  actions). Measurements section on `/plants/[id]`: add form, list, per-row inline
  edit + delete-with-confirm, empty state. Height stored as `REAL` (> 0, ≤ 1000 cm,
  ≤ 1 decimal place; decimal comma accepted, grouping rejected); `measured_on`
  ISO `YYYY-MM-DD` (default today Kiev, future rejected). **Shared date helpers
  promoted** `lib/plants/date.ts → lib/dates.ts` (`todayInKiev`/`isAfterToday`/
  `formatAcquiredDate`); plant importers re-pointed; old module + its test removed.
- **Slice 5 `add-charts` (Phase 4, implemented — FINAL MVP slice)** — the headline
  visualization slice. NO schema change, NO migration: the charts read the SAME
  `listMeasurements` / `listWaterings` arrays the `force-dynamic` `/plants/[id]`
  page already loads. Pure seam `lib/charts/series.ts` — `toGrowthSeries` (one
  point per measurement `{ date, label DD.MM.YYYY, heightCm }`, sorted `measuredOn`
  ASC then id ASC, exact stored decimal height preserved) and `toWateringSeries`
  (group by `wateredOn` → one count-per-day point `{ date, label, count }`, sorted
  date ASC, same-day events collapse, no bucketing/zero-fill); both `[]` for empty
  input, never mutate, never throw — no Recharts/React/DOM import. Thin client
  islands `components/charts/GrowthChart.tsx` (height-over-time line) and
  `WateringChart.tsx` (count-per-day frequency line, the headline), each a Recharts
  `LineChart` in a labelled `<figure>` (accessible name = chart title, SC-6) with a
  DD.MM.YYYY X axis; shared `components/charts/ChartEmptyState.tsx` renders the
  Ukrainian per-chart empty state (distinct from error/loading, FR-CHART-03) when a
  series is empty. Wired into `/plants/[id]`: growth chart above the measurements
  section, watering chart above the waterings section; the lists STAY (NFR-A11Y-03).
  FR-CHART-04 = the existing `force-dynamic` + `revalidatePath` (no new machinery,
  D5). New Ukrainian `uk.charts.*` copy block (titles, per-chart empty states, axis
  labels). Rendered a11y/contrast/360px/perf DEFERRED to Phase 6.

## Next step

Phase 2 — run the `spec-pipeline` workflow to author baseline OpenSpec specs
(one per capability; every MVP FR owned exactly once), then `openspec validate`.
Then Phase 3 capability plan → **Checkpoint 2** (plan sign-off) before the
autonomous build.

## Notes / gotchas

- UI copy is Ukrainian; code, specs, and trace ids stay English.
- `.claude/settings.json` (PostToolUse ESLint hook) was deferred at init — the
  self-modification guard blocked writing an agent hook. Not yet installed.
- npm v11 gates native install scripts; `better-sqlite3` prebuilt binary loaded
  fine. If it ever fails, `npm rebuild better-sqlite3`.
