## Why

Slice 2 (`add-plants`) landed the plant as the aggregate root in SQLite + Drizzle
and owns the FK-cascade DIRECTION (deleting a plant removes its children). It also
froze the shared inline-error contract (`lib/forms/result.ts` `ActionResult`,
`FieldError`, `FormErrorBanner`, `lib/i18n/uk.ts`) and the date conventions SC-1
(native `<input type="date">`, store ISO `YYYY-MM-DD`, display `DD.MM.YYYY`) and
SC-2 (reject future dates). But a plant has no growth data yet: the detail page
shows the plant, not how it has grown.

This is the FIRST child slice of the plant aggregate. It makes growth trackable as
a single numeric metric — height in centimetres recorded on a calendar date — so
the Owner can log, view, edit, and delete height measurements for one plant. It
delivers FR-GROWTH-01..05 and binds the travelling NFRs NFR-USA-03 (local-calendar
date entry/display, no time-of-day), NFR-PERF-01 (mutation reflected within 300 ms
locally), and NFR-DATA-01/02 (measurements persist; no silent loss; single-row
delete with no cascade). It honors the cross-cutting conventions SC-1, SC-2,
SC-3 (list ordered by date descending, tie-broken by row id descending), SC-5
(single-row delete, no cascade beyond the deleted row), and SC-6 (keyboard +
labels at the jsdom level; rendered-result a11y deferred to Phase 6).

The critical new piece is the height-parsing rule (FR-GROWTH-05): it must accept a
decimal dot OR a decimal comma (`12,5` -> 12.5), accept trailing zeros (`12.50`),
reject blank/non-numeric/negative/zero, reject a grouping/thousands separator,
bound the value, and limit decimal precision. This is a pure function that gets
hammered with unit tests.

A measurement belongs to exactly one plant via a FK to `plants.id` with
`ON DELETE CASCADE`, honoring the cascade contract slice 2 pinned: deleting the
plant removes its measurements, but deleting a measurement removes only that row.

## What Changes

- **New child table**: a SQLite + Drizzle `growth_measurements` table
  (`db/schema/growth.ts`, re-exported from `db/schema/index.ts`) with a FK
  `plantId -> plants.id` declared `ON DELETE CASCADE` (honors slice-2 SC-5), plus
  a new committed migration (`npm run db:generate`). `db/client.ts` already
  auto-migrates on startup and sets `PRAGMA foreign_keys = ON`, so the cascade is
  enforced.
- **Shared date helpers promoted**: `todayInKiev` / `isAfterToday` /
  `formatAcquiredDate` move from `lib/plants/date.ts` to a shared `lib/dates.ts`
  (growth, watering, and plants all need them) and the plants imports are
  re-pointed, removing future triplication. The plants date tests are re-run after
  the move.
- **New `lib/growth/` module** split per AGENTS.md conventions:
  `validation.ts` (the height-parse rule + the date rule + formData -> input
  mappers -> field-keyed Ukrainian messages, echoing submitted values),
  `queries.ts` (thin Drizzle reads/writes, db handle INJECTED as the first param
  like plants), `service.ts` (orchestration + not-found signal), `actions.ts`
  (guard -> validate -> service -> revalidate, returning the shared `ActionResult`,
  never throwing raw on user input).
- **Measurements section on `/plants/[id]`**: a section on the existing plant
  detail page listing the plant's measurements ordered by date descending,
  tie-broken by row id descending (SC-3), each row showing height in cm and the
  measurement date as `DD.MM.YYYY`, with a clear empty state. Reuses
  `FieldError` / `FormErrorBanner` / `ActionResult`; add/edit forms repopulate
  uncontrolled inputs from `result.values` on failure; delete requires an explicit
  confirmation step before firing. Ukrainian copy extended in `lib/i18n/uk.ts`.

## Capabilities

### New Capabilities
- `growth`: track a plant's growth as a single numeric metric (height in cm on a
  calendar date) — log (date defaults to today in Europe/Kiev), view (list ordered
  date descending, deterministic same-date tie-break), edit (value + date), and
  delete (confirmed, single row, no cascade). Owns the strict height-parse rule
  (decimal dot/comma, trailing zeros, reject blank/non-numeric/negative/zero/
  grouping-separator/over-precision/over-bound).

### Modified Capabilities
<!-- None. The plants capability's frozen contract (the `plants` table and its
cascade DIRECTION, the shared `ActionResult` / `FieldError` / banner, SC-1/SC-2)
is CONSUMED, not changed. The shared date-helper move (lib/plants/date.ts ->
lib/dates.ts) is an internal refactor that preserves plant behavior (re-run plant
date tests); it does not alter the plants capability spec. -->

## Impact

- New code: `db/schema/growth.ts` + `db/migrations/*` (new migration),
  `lib/dates.ts` (promoted from `lib/plants/date.ts`),
  `lib/growth/{validation,queries,service,actions}.ts` (+ colocated `*.test.ts`),
  a measurements section + add/edit/delete UI (`components/growth/`), the
  measurements section wired into `app/plants/[id]/page.tsx`, extended
  `lib/i18n/uk.ts`.
- Refactor: `lib/plants/date.ts` content moved to `lib/dates.ts`; plants imports
  (`validation.ts`, and any others) re-pointed; the plants date tests re-run green
  after the move.
- Reused unchanged (frozen contracts): `lib/forms/result.ts`,
  `components/forms/FieldError.tsx`, `components/forms/FormErrorBanner.tsx`,
  `db/client.ts` (auto-migrates), the `plants` table as the FK cascade target.
- Trace ids touched: FR-GROWTH-01..05; NFR-USA-03, NFR-PERF-01, NFR-DATA-01,
  NFR-DATA-02; SC-1, SC-2, SC-3, SC-5, SC-6. (NFR-LOC-01 carries via the UI copy.)
- No auth, no third-party integrations (NFR-SEC-01, TC-04). Additional growth
  metrics (FR-GROWTH-06: leaf count, width, trunk diameter), imperial units, and
  time-of-day on a measurement stay Future and are intentionally excluded.
