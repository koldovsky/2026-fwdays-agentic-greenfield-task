# Tasks — add-reminders (slice 7, FINAL MVP slice)

TDD: write the red tests in section 1, make them green in sections 2–4, then
the Phase-6 a11y/vision bullets (section 5) and the final battery + manual
archive (section 6). The db handle is INJECTED as the first param of every
query/service so tests drive a fresh in-memory SQLite. `today` is injectable so
all date tests pin a fixed Europe/Kiev date. No raw 500s — every mutation
surfaces a friendly result (FR-SHELL-03).

## 1. Red tests (write first, watch them fail)

- [x] 1.1 `lib/dates.test.ts` — extend with `addDays(iso, n)`: adds N calendar
      days to a `YYYY-MM-DD` string with no timezone drift; cross month boundary
      (2026-06-30 + 1 → 2026-07-01), cross year boundary (2026-12-31 + 1 →
      2027-01-01), N = 0 identity, leap-day (2028-02-28 + 1 → 2028-02-29).
- [x] 1.2 `lib/reminders/status.test.ts` — `deriveStatus` PURE unit, all dates
      anchored to a fixed `today = "2026-06-30"`, `intervalDays = 7`:
      lastWatered 2026-06-28 → due 2026-07-05 → **healthy**; 2026-06-23 → due
      today → **soon**; 2026-06-24 → due today+1 → **soon**; 2026-06-25 → due
      2026-07-02 (today+2) → **healthy** (the soon/healthy boundary); 2026-06-20
      → due 2026-06-27 (past) → **overdue**; `lastWateredAt = null`
      (never watered) → **overdue**. (FR-REM-02)
- [x] 1.3 `lib/reminders/status.test.ts` — `isDue(status)`: true for soon and
      overdue, false for healthy. (FR-REM-02, FR-REM-03)
- [x] 1.4 `lib/reminders/status.test.ts` — `urgencyKey` ordering: a never-watered
      and longest-overdue plant sort FIRST, a soon-but-not-overdue plant sorts
      LAST; equal overdue gap breaks deterministically by name then id (stable,
      reproducible). (FR-REM-04)
- [x] 1.5 `lib/reminders/status.test.ts` — `intervalDays = 1` watered today →
      due = today+1 → **soon** (the row will still read done for today, see the
      water-now no-op). (FR-REM-05)
- [x] 1.6 `lib/plants/validation.test.ts` — extend: blank/omitted interval
      defaults to 7; "14" → 14; reject "0", "-3", "7.5", "7,5", "abc", "" past
      the default branch is the default (so test the present-but-bad cases) with
      `fieldErrors.intervalDays` set to `uk.plants.fieldErrors.intervalInvalid`
      and the raw value echoed under `values`; a valid edit keeps the other
      fields intact (all-or-nothing). (FR-REM-01, FR-SHELL-03)
- [x] 1.7 `tests/integration/reminders.test.ts` — real in-memory SQLite via the test
      DB: seed plants with various latest-watering dates + intervals (one
      overdue, one soon, one healthy, one never-watered) and pin `today`; assert
      `getHomeReminders` returns the correct `dueRows` (only soon/overdue),
      `dueCount`, `allDone`, and `allRows` (status per plant), and that
      `dueRows` are urgency-ordered most-overdue first. Latest-watering-per-plant
      uses MAX(watered_on), so a plant with several events derives from its most
      recent. (FR-REM-02..04, FR-REM-06)
- [x] 1.8 `tests/integration/reminders.test.ts` — `allDone` true when every plant is
      healthy AND when there are no plants (dueCount 0, no dueRows). (FR-REM-06)
- [x] 1.9 `lib/reminders/actions.test.ts` — real-DB: `waterNowAction(plantId)`
      logs a watering dated today (Europe/Kiev) for the plant and the plant is no
      longer due (count drops); a non-positive/non-integer id → friendly
      not-found; a deleted plant id → friendly not-found (no FK 500, no
      resurrection). (FR-REM-05)
- [x] 1.10 `lib/reminders/actions.test.ts` — already-watered-today is a no-op:
      calling `waterNowAction` when the latest event is already today returns
      `ok()` WITHOUT inserting a second event (event count unchanged), and the
      plant stays not-due. (FR-REM-05)
- [x] 1.11 `components/reminders/ReminderRow.test.tsx` — renders the thumb, name,
      and an urgency-colored due line (overdue → danger class, soon → soon
      class); the water-now control has an accessible label and is keyboard
      operable; clicking it invokes `waterNowAction` and the control swaps to the
      done state showing "Полито щойно ✓". (FR-REM-04, FR-REM-05, SC-6,
      NFR-A11Y-04)
- [x] 1.12 `components/reminders/SummaryCard.test.tsx` — renders the
      "Сьогодні полити" label and the due count; count 0 renders 0 (not blank).
      (FR-REM-03)
- [x] 1.13 `components/reminders/AllDoneState.test.tsx` — renders the leaf icon,
      "Усі политі! 🌱", and the reassurance line. (FR-REM-06)
- [x] 1.14 `components/plants/PlantCard.test.tsx` — extend: passing a real
      derived `status` renders the matching pill color + label (overdue →
      overdue chip). (FR-REM-07)

## 2. Domain logic (validation, status, ordering)

- [x] 2.1 Add `addDays(iso, n)` to `lib/dates.ts` — component arithmetic via
      `Date.UTC`, re-format to `YYYY-MM-DD`; pure, no timezone drift. (R1)
- [x] 2.2 Create `lib/reminders/status.ts` (PURE): `ReminderStatus` type
      (`'healthy' | 'soon' | 'overdue'`), `deriveStatus({ lastWateredAt,
      intervalDays }, today)` per the baseline rule (`due = addDays(lastWateredAt,
      intervalDays)`; `today > due` → overdue, `due == today || due ==
      addDays(today,1)` → soon, else healthy; `lastWateredAt == null` → overdue),
      `isDue(status)`, and `urgencyKey(row, today)` (numeric overdue gap; ties
      by name then id). (FR-REM-02, FR-REM-04)
- [x] 2.3 Extend `lib/plants/validation.ts`: add `intervalDays: number` to
      `PlantInput`; read/trim the `intervalDays` FormData field; blank/omitted →
      7; else require `/^\d+$/` and `>= 1`, otherwise
      `fieldErrors.intervalDays = uk.plants.fieldErrors.intervalInvalid`; echo the
      raw value under `values`. (FR-REM-01, FR-SHELL-03)

## 3. Schema, queries, services, and server actions

- [x] 3.1 Add `intervalDays: integer("interval_days").notNull().default(7)` to
      `db/schema/plants.ts`; run `npm run db:generate` to produce the migration
      (NOT NULL DEFAULT 7 backfills existing rows). (FR-REM-01, R4)
- [x] 3.2 Persist the interval in `lib/plants/queries.ts`
      (`insertPlant`/`updatePlant` write `intervalDays`). (FR-REM-01)
- [x] 3.3 Create `lib/reminders/queries.ts` (db injected): a grouped read
      returning the latest `watered_on` per plant (MAX(watered_on) GROUP BY
      plant_id) so the home load is two queries regardless of plant count. (D5)
- [x] 3.4 Create `lib/reminders/service.ts` `getHomeReminders(db = defaultDb,
      today = todayInKiev())`: compose plants + latest-watering dates →
      `deriveStatus` per plant → `{ dueRows, dueCount, allDone, allRows }`,
      `dueRows` filtered to due and sorted by `urgencyKey`. (FR-REM-02..04,
      FR-REM-06)
- [x] 3.5 Create `lib/reminders/actions.ts` `waterNowAction(plantId)`: guard the
      id; if the plant's latest watering is already today → `ok()` (no-op, no
      second insert); else REUSE `createWatering(plantId, { wateredOn:
      todayInKiev(), note: null })` from the watering service; map
      `plant-not-found` → friendly not-found; `revalidatePath('/')` and
      `revalidatePath('/plants/${plantId}')`; return `ActionResult`. Add
      `uk.reminders.notFound`. (FR-REM-05)

## 4. UI and route handlers

- [x] 4.1 Add `uk.reminders.*` copy (`summaryLabel` "Сьогодні полити",
      `summaryUnit`, `sectionTitle` "Потребують поливу", `waterNow` accessible
      label, `doneLabel` "Полито щойно ✓", `allDoneTitle` "Усі политі! 🌱",
      `allDoneReassurance`, overdue/soon due-line strings, `notFound`) and
      `uk.plants.intervalLabel` / `intervalHint` / `fieldErrors.intervalInvalid`.
      Ukrainian text, English identifiers. (NFR-LOC-01)
- [x] 4.2 Add an interval field to `components/plants/PlantForm.tsx` (number
      input, accessible label + hint, `aria-invalid`/`aria-describedby`, inline
      `FieldError`, repopulated from `result.values`). Default value 7 on add,
      the plant's value on edit. (FR-REM-01, SC-6, NFR-A11Y-04)
- [x] 4.3 Create `components/reminders/SummaryCard.tsx` (presentational; pine bg,
      paper text, radius 22; label + big due count). (FR-REM-03)
- [x] 4.4 Create `components/reminders/ReminderRow.tsx` (client island for the
      done-swap): thumb + name + urgency-colored due line + a water-now droplet
      `Button` (icon variant, `WaterDropIcon`, accessible label) that calls
      `waterNowAction(plantId)` and swaps to a mist+check done state with
      "Полито щойно ✓". (FR-REM-04, FR-REM-05, SC-6, NFR-A11Y-04)
- [x] 4.5 Create `components/reminders/AllDoneState.tsx` (centered leaf icon +
      "Усі политі! 🌱" + reassurance line). (FR-REM-06)
- [x] 4.6 Redesign `app/page.tsx`: load `getHomeReminders(db)`; render the
      `SummaryCard` (due count), then — when `dueCount > 0` — the section header
      + urgency-ordered `ReminderRow`s, or the `AllDoneState` when `allDone`; keep
      the plant card grid below with each `PlantCard` `status` wired to the real
      derived status from `allRows`; keep the empty state when no plants exist.
      `force-dynamic` stays. (FR-REM-03..07, FR-PLANT-04, FR-PLANT-08)
- [x] 4.7 Wire the status pill on the plant detail page (`app/plants/[id]/
      page.tsx`): derive the plant's status from its latest watering date +
      `intervalDays` via `deriveStatus` and render the pill. (FR-REM-07)

## 5. Phase-6 accessibility + vision verification (bullets, run in Phase 6)

- _(Phase 6)_ 5.1 Axe + keyboard-only pass on the settled home view: the water-now
      control is reachable and operable by keyboard with an accessible label, the
      summary card and reminder rows have no axe violations. (NFR-A11Y-04, SC-6)
- _(Phase 6)_ 5.2 Vision-verify the rendered home view on the «Поливайко» design: pine
      summary card legibility (paper text on pine), urgency-colored due lines
      (clay/soon vs danger/overdue) distinguishable and WCAG AA contrast, status
      pills on cards + detail legible, all-done state centered. (NFR-A11Y-01/02)
- _(Phase 6)_ 5.3 360px responsive check of the home view (summary card, rows, pills do
      not overflow/clip). (NFR-COMPAT-01)
- _(Phase 6)_ 5.4 Perf check: water-now reflects within 300 ms for <= 20 plants / <= 500
      events. (NFR-PERF-01)

## 6. Validation, docs, and archive prep (ALWAYS last)

- [x] 6.1 Run `npm run lint` — fix all findings.
- [x] 6.2 Run `npm run test:run` — all unit/integration tests green (including
      the new reminders + plant-interval tests).
- [x] 6.3 Run `npm run build` — clean production build.
- [x] 6.4 Run `npx openspec validate add-reminders --strict` — must pass.
- [x] 6.5 Run `npx openspec validate --all --strict` — must pass.
- [x] 6.6 Update `README.md` and `docs/current-state.md`: slice 7 add-reminders
      landed, `plants.interval_days` added (+ migration), the home view is now
      reminder-centric, status pills wired; note the Phase 6 vision/a11y/perf
      follow-ups (section 5).
- [x] 6.7 Manual real-DB smoke test (spell out, run against the real SQLite file,
      NOT in-memory):
      1. `npm run db:migrate` — applies the new migration; confirm it succeeds.
      2. `npm run db:seed` (or add plants manually) and confirm existing/new
         plant rows have `interval_days = 7` by default (the NOT NULL DEFAULT
         backfill, R4).
      3. `npm run dev`; open `/` — confirm the summary card shows a due count and
         reminder rows for plants whose `due` (lastWatered + interval) is today/
         past, ordered most-overdue first; a never-watered plant appears as
         overdue.
      4. Click a reminder row's water-now droplet — confirm the row swaps to
         "Полито щойно ✓", the due count decrements, and (for interval >= 2) the
         plant leaves the reminder list; the plant's card pill turns healthy.
      5. Click water-now again on a plant already watered today (if any) —
         confirm no second event is logged and the row stays done (no error).
      6. Edit a plant: set the interval to 0 / 7.5 / "abc" — confirm an inline
         error next to the interval field and no change persisted; set it to 14 —
         confirm it saves and the derived status recomputes.
      7. Water every due plant — confirm the home shows the all-done state
         ("Усі политі! 🌱"). Open a plant detail — confirm its status pill.
      8. Restart the app and reload `/` — confirm intervals + statuses persist
         (NFR-DATA-01).
- [x] 6.8 Only AFTER the smoke test in 6.7 passes:
      `npx openspec archive add-reminders --yes` (manual archive to
      `openspec/changes/archive/YYYY-MM-DD-add-reminders/`). This is the FINAL
      MVP slice — note MVP feature-complete in `docs/current-state.md`.
