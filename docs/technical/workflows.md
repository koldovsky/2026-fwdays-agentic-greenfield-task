# Domain workflows — «Поливайко»

> The user flows and the code that implements them. Architecture:
> [`architecture.md`](./architecture.md). Data model: [`data-model.md`](./data-model.md).
> All UI copy is Ukrainian ([`lib/i18n/uk.ts`](../../lib/i18n/uk.ts), NFR-LOC-01).
> Manual steps for a non-developer: [`../qa/manual-test-plan.md`](../qa/manual-test-plan.md).

## Home / reminders ([`app/page.tsx`](../../app/page.tsx)) — FR-REM-03..07, FR-PLANT-04/08

Reminder-centric home. `getHomeReminders(db, today)`
([`lib/reminders/service.ts`](../../lib/reminders/service.ts)) loads plants + the
latest-watering-per-plant map, derives each plant's status ONCE, and returns:
`dueRows` (soon/overdue, urgency-ordered), `dueCount`, `allDone`, `allRows`.

- **Summary card** — "Сьогодні полити" with `dueCount` (FR-REM-03).
- **Status derivation** ([`lib/reminders/status.ts`](../../lib/reminders/status.ts),
  FR-REM-02): `due = lastWateredAt + intervalDays`;
  `overdue` if `today > due` (or never watered), `soon` if `due` is today/tomorrow,
  else `healthy`. A plant is "due" when soon or overdue.
- **Reminder rows** (FR-REM-04) — thumb, name, an urgency-colored due line
  ("Прострочено на N дн." / "Полити сьогодні" / "Полити завтра"), and a water-now
  droplet button. Ordered most-overdue-first via `compareUrgency` (never-watered
  floats to the top; ties by name then id — deterministic across reloads).
- **All-done state** (FR-REM-06) — "Усі политі! 🌱" when nothing is due.
- **Plant grid** below shows every plant with its status pill (FR-REM-07);
  empty state "ще немає жодної рослини…" when no plants exist (FR-PLANT-08).

## Water now ([`lib/reminders/actions.ts`](../../lib/reminders/actions.ts)) — FR-REM-05

`waterNowAction(plantId)`: validate id → if latest watering is already today,
**no-op** `ok()` (no duplicate event, idempotent status) → else log a watering
dated today via `createWatering` → `revalidatePath('/')` + `/plants/<id>`. A
malformed id or a missing plant resolves to a friendly not-found (no FK 500, no
resurrection). The row swaps to a "done" confirmation state on success.

## Plant CRUD — FR-PLANT-01..08

| Flow | Route / module |
|---|---|
| List + empty state | [`app/page.tsx`](../../app/page.tsx) (grid), `uk.plants.empty` |
| Add | [`app/plants/new/page.tsx`](../../app/plants/new/page.tsx) → `createPlant` |
| Detail | [`app/plants/[id]/page.tsx`](../../app/plants/%5Bid%5D/page.tsx), `notFound()` on stale/invalid id |
| Edit | [`app/plants/[id]/edit/page.tsx`](../../app/plants/%5Bid%5D/edit/page.tsx) → `editPlant` (returns null → not-found, never resurrects) |
| Delete | `DeletePlantButton` confirm island → `removePlant`; DB cascade removes the plant's own children (SC-5) |

Validation ([`lib/plants/validation.ts`](../../lib/plants/validation.ts)): name
required, species defaults to money tree, acquired date optional + future-date
rejected (SC-2). Errors surface inline via `ActionResult`
([`architecture.md`](./architecture.md)).

## Growth & watering logging — FR-GROWTH-01..05, FR-WATER-01..05

Both live as sections on the plant-detail page. Each has an add form (date
defaults to today Kiev), a list (date-desc, id-desc tie-break, SC-3), per-row
inline edit, and delete-with-confirm (single row).

- **Growth** ([`lib/growth/`](../../lib/growth/)): height in cm. `parseHeightCm`
  is the load-bearing rule — accepts decimals incl. decimal comma (`12,5` → 12.5)
  and trailing zeros, rejects non-numeric/negative/grouped (FR-GROWTH-05).
- **Watering** ([`lib/watering/`](../../lib/watering/)): date + optional note
  (≤500 chars, rejected not truncated). Note absence stored as `NULL` (FR-WATER-02).

## Charts ([`lib/charts/series.ts`](../../lib/charts/series.ts), components/charts/) — FR-CHART-01..04

Pure, Recharts-agnostic seam derives series from the arrays the detail page
already loaded — no extra query, no client fetch:

- `toGrowthSeries` — one point per measurement, height-over-time, sorted
  `measuredOn` ASC then id ASC; exact stored decimal preserved (FR-CHART-02).
- `toWateringSeries` — count-per-day line; same-day events collapse to one point;
  date ASC; no bucketing / zero-fill (FR-CHART-01, the headline feature).

Each chart is a Recharts `LineChart` in a labelled `<figure>` (accessible name =
title, SC-6) with a `DD.MM.YYYY` axis. Empty input → `ChartEmptyState` (Ukrainian
per-chart copy, distinct from loading/error, FR-CHART-03). A render error is
contained by `ChartErrorBoundary` (inline `role="alert"` fallback, not a raw 500).
**FR-CHART-04**: the existing `force-dynamic` page + each action's
`revalidatePath` re-render, so charts re-derive — no new machinery. The underlying
growth/watering lists remain so the data is readable without the chart
(NFR-A11Y-03).
