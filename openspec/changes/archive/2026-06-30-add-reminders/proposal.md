## Why

The app is MVP feature-complete (plants, growth, watering, charts) and restyled
to «Поливайко» (slice 6), but its headline reminder behavior is still a static
placeholder: the plant-card status pill ships hard-coded "healthy", the home
view is a plain plant grid, and there is no concept of "what needs watering
today". The design's Home screen — a pine summary card with a due count, an
urgency-ordered list of reminder rows with a one-tap "water now" droplet, and an
all-done empty state — is unbuilt, and the watering interval that the whole
status calculation depends on does not exist on the plant model.

This is the **final MVP slice** (slice 7). It delivers FR-REM-01..07: a per-plant
watering interval (`intervalDays`), a derived healthy/soon/overdue status
computed from the latest watering event date + interval vs today (Europe/Kiev),
the home summary card + reminder list + water-now action + all-done state, and
the status pill wired on plant cards and the detail view. It reuses the existing
watering capability (water-now is just a today-dated watering log) and the
existing plant validation/forms (which gain the interval field). The last
watering date is DERIVED from the existing watering events — NO duplicate "last
watered" column. Push/OS notifications (FR-REM-08) stay Future.

## What Changes

- **Schema (migration):** add `interval_days` integer to `plants`, NOT NULL,
  default 7. New migration via `npm run db:generate`. This is the SOLE new
  persisted field; the last watering date stays derived from watering events
  (FR-REM-01).
- **Plant validation + forms:** amend `validatePlantInput` to read/validate
  `intervalDays` as a positive integer (whole number `>= 1`); reject
  missing/blank, 0, negative, decimal (e.g. 7.5), or non-numeric inline next to
  the field; default to 7 on a blank add. Add an interval field to the add/edit
  `PlantForm`; `insertPlant`/`updatePlant` persist it (FR-REM-01, FR-SHELL-03).
- **Status seam `lib/reminders/status.ts` (PURE):** `deriveStatus({ lastWateredAt,
  intervalDays }, today)` → `'healthy' | 'soon' | 'overdue'` per the baseline
  rule (`due = lastWateredAt + intervalDays`; never-watered = overdue); `isDue`
  = soon || overdue; an urgency/sort key (most overdue first, deterministic
  tie-break). String-only calendar math via `lib/dates`, no Date drift
  (FR-REM-02).
- **Reminders query/service `lib/reminders/{queries,service}.ts` (db injected):**
  load each plant + its latest watering date + `intervalDays`, derive status,
  return the urgency-sorted due list, the due count, and `allDone`
  (FR-REM-02..04, FR-REM-06).
- **Water-now action `lib/reminders/actions.ts`:** log a today-dated watering for
  a plant by REUSING the watering service, `revalidatePath('/')`, return an
  `ActionResult`; already-watered-today is a no-op for status (FR-REM-05).
- **Home UI redesign (`app/page.tsx`):** pine summary card ("Сьогодні полити" +
  due count), section header, urgency-ordered reminder rows (thumb + name +
  urgency-colored due line + water-now droplet Button that swaps to a
  done/"Полито щойно ✓" state), and the all-done empty state ("Усі политі! 🌱").
  Wire the `PlantCard` status pill (and the detail-page pill) to the real
  derived status (FR-REM-03..07). New `uk.reminders.*` copy.

## Impact

- **Specs:** `reminders` (new `## ADDED Requirements`, FR-REM-01..07); `plants`
  (`## MODIFIED Requirements` — the Add/Edit requirements gain `intervalDays`).
- **Schema/migration:** `plants.interval_days` (NOT NULL default 7) + one new
  Drizzle migration; existing rows backfill to 7 via the column default.
- **Code:** `db/schema/plants.ts`, `lib/plants/{validation,queries,service}.ts`,
  `components/plants/PlantForm.tsx`; new `lib/reminders/{status,queries,service,
  actions}.ts`; `app/page.tsx` redesigned; `components/plants/PlantCard.tsx` +
  the detail page pill wired; new `components/reminders/*` rows/card; `uk.ts`.
- **Behavior:** plants/growth/watering/charts CRUD, validation, ordering, and
  persistence are otherwise unchanged. The home view is reframed around
  reminders (the design's Home screen).
- **Deferred to Phase 6:** the rendered home view's legibility/contrast,
  urgency-color and pill a11y, 360px responsive, and the water-now perf budget
  (NFR-A11Y-01/02/04, NFR-COMPAT-01, NFR-PERF-01) are vision-verified on the
  settled screen.
