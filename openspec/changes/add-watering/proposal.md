## Why

Slice 2 (`add-plants`) landed the plant as the aggregate root in SQLite + Drizzle
and owns the FK-cascade DIRECTION (deleting a plant removes its children). Slice 3
(`add-growth`) was the FIRST child of that aggregate: it pinned the child-side FK
pattern (`plantId -> plants.id ON DELETE CASCADE`), promoted the shared date
helpers to `lib/dates.ts` (`todayInKiev` / `isAfterToday` / `formatAcquiredDate`),
and proved the per-row module shape (`validation` / `queries` / `service` /
`actions` with the db handle INJECTED) plus the per-row UI shape (Form / Row /
Section / DeleteButton over the shared `ActionResult` / `FieldError` /
`FormErrorBanner` contract). But the plant still has NO watering history — the
detail page shows the plant and its growth, not when it was watered. Watering is
the headline asked-for feature (the watering chart, FR-CHART-01, consumes it next
slice).

This is the SECOND child slice of the plant aggregate. It makes watering trackable
as a date-only event with an optional free-text note, so the Owner can log, view,
edit, and delete watering events for one plant. It delivers FR-WATER-01..05 and
binds the travelling NFRs NFR-USA-03 (local-calendar date entry/display, no
time-of-day), NFR-PERF-01 (mutation reflected within 300 ms locally), and
NFR-DATA-01/02 (waterings persist; no silent loss; single-row delete with no
cascade). It honors the cross-cutting conventions SC-1 (native `<input type="date">`,
store ISO `YYYY-MM-DD`, display `DD.MM.YYYY`), SC-2 (reject a date after today in
Europe/Kiev), SC-3 (list ordered by date descending, tie-broken by row id
descending), SC-5 (single-row delete, no cascade beyond the deleted row), and SC-6
(keyboard + labels at the jsdom level; rendered-result a11y deferred to Phase 6).

Unlike growth, watering has NO numeric metric: there is no height-parse rule and
deliberately NO water amount (FR-WATER-06 is Future). The new piece here is the
OPTIONAL free-text note (FR-WATER-02): it may be left empty (empty -> stored as
`NULL`, not an empty string), is trimmed, and is bounded to a sane maximum length
so an unbounded paste cannot bloat the row — this is the slice's one validation
decision and is unit-tested.

A watering event belongs to exactly one plant via a FK to `plants.id` with
`ON DELETE CASCADE`, reusing the cascade contract slice 2 pinned and slice 3 first
realized: deleting the plant removes its waterings, but deleting a watering removes
only that row.

## What Changes

- **New child table**: a SQLite + Drizzle `watering_events` table
  (`db/schema/watering.ts`, re-exported from `db/schema/index.ts`) with a FK
  `plantId -> plants.id` declared `ON DELETE CASCADE` (reuses the slice-2 cascade
  DIRECTION first realized by slice 3 `growth_measurements`), plus a new committed
  migration (`npm run db:generate`). `db/client.ts` already auto-migrates on
  startup and sets `PRAGMA foreign_keys = ON`, so the cascade is enforced.
- **New `lib/watering/` module** split per AGENTS.md conventions, mirroring
  `lib/growth/`: `validation.ts` (the date rule reused from `@/lib/dates` + the
  optional-note rule [trim, empty -> null, max length] + formData -> input
  mapper -> field-keyed Ukrainian messages, echoing submitted values),
  `queries.ts` (thin Drizzle reads/writes, db handle INJECTED as the first param
  like growth/plants), `service.ts` (orchestration + not-found signal +
  plant-exists/FK handling), `actions.ts` (guard -> validate -> service ->
  revalidate, returning the shared `ActionResult`, never throwing raw on user
  input).
- **Waterings section on `/plants/[id]`**: a SECTION on the existing plant detail
  page — ALONGSIDE the existing measurements section — listing the plant's
  watering events ordered by date descending, tie-broken by row id descending
  (SC-3), each row showing the watering date as `DD.MM.YYYY` and its note (if any),
  with a clear empty state. Reuses `FieldError` / `FormErrorBanner` /
  `ActionResult`; add/edit forms repopulate uncontrolled inputs from
  `result.values` on failure; delete requires an explicit confirmation step before
  firing. Ukrainian copy extended in `lib/i18n/uk.ts`.
- **New `components/watering/`** mirroring `components/growth/`:
  `WateringForm` (date + note), `WateringRow`, `WateringsSection`,
  `DeleteWateringButton`.

## Capabilities

### New Capabilities
- `watering`: record a plant's watering as a date-only event (date defaults to
  today in Europe/Kiev) with an OPTIONAL free-text note — log, view (list ordered
  date descending, deterministic same-date tie-break), edit (date + note), and
  delete (confirmed, single row, no cascade). Owns the optional-note rule (trim,
  empty -> NULL, bounded max length). NO water amount (FR-WATER-06, Future).

### Modified Capabilities
<!-- None. The plants capability's frozen contract (the `plants` table and its
cascade DIRECTION, the shared `ActionResult` / `FieldError` / banner, SC-1/SC-2)
and the growth capability (the measurements section sharing the detail page) are
CONSUMED, not changed. The shared date helpers in `lib/dates.ts` are reused
verbatim — no refactor is needed (slice 3 already promoted them). -->

## Impact

- New code: `db/schema/watering.ts` + `db/migrations/*` (new migration),
  `lib/watering/{validation,queries,service,actions}.ts` (+ colocated `*.test.ts`),
  a waterings section + add/edit/delete UI (`components/watering/`), the waterings
  section wired into `app/plants/[id]/page.tsx` alongside the measurements section,
  extended `lib/i18n/uk.ts` (a `watering` copy block).
- Reused unchanged (frozen contracts): `lib/dates.ts` (`todayInKiev` /
  `isAfterToday` / `formatAcquiredDate` — promoted by slice 3, no move here),
  `lib/forms/result.ts`, `components/forms/FieldError.tsx`,
  `components/forms/FormErrorBanner.tsx`, `db/client.ts` (auto-migrates), the
  `plants` table as the FK cascade target, and the `lib/growth/` +
  `components/growth/` shapes as the template.
- Trace ids touched: FR-WATER-01..05; NFR-USA-03, NFR-PERF-01, NFR-DATA-01,
  NFR-DATA-02; SC-1, SC-2, SC-3, SC-5, SC-6. (NFR-LOC-01 carries via the UI copy;
  NFR-A11Y-03 is satisfied because the list, not only a future chart, exposes the
  values.)
- No auth, no third-party integrations (NFR-SEC-01, TC-04). A water amount
  (FR-WATER-06: e.g. ml) and watering reminders/notifications (FR-WATER-07), plus
  the watering CHART (FR-CHART-01, slice 5), stay Future / out of scope here and
  are intentionally excluded.
