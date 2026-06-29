# Design — add-reminders (slice 7, FINAL MVP slice)

## Goals

- Give each plant a persisted, editable, validated watering interval
  (`intervalDays`, default 7) — the one new field this slice adds (FR-REM-01).
- Derive a healthy/soon/overdue status PURELY from the latest watering event
  date + `intervalDays` vs today (Europe/Kiev), with NO duplicate "last watered"
  state (FR-REM-02).
- Reframe the home view around watering reminders per the «Поливайко» Home
  screen: a summary card with the due count, an urgency-ordered reminder list
  with a one-tap water-now action, and an all-done empty state (FR-REM-03..06).
- Surface the same derived status as a pill on plant cards and the detail view
  (FR-REM-07).
- Reuse what exists: the watering service for water-now, `lib/dates` for all
  calendar math, the plant validation/queries/forms for the interval field, the
  `PlantCard`/`WaterDropIcon`/`Button` primitives for the UI.

## Non-goals

- Push/OS notifications (FR-REM-08) — Future, explicitly out of scope.
- A stored "last watered" column or any denormalized status — status is
  recomputed on read from the watering events (the SOLE source of the last
  watering date).
- Changing watering-event CRUD/validation/ordering (owned by the watering
  capability, FR-WATER-01..05) — water-now only TRIGGERS a watering log.
- Auth/authorization — single local Owner, no auth (NFR-SEC-01, TC-04); no
  unauthorized/forbidden paths exist, so none are specified.
- Per-day bucketing, multi-metric status, or configurable thresholds.

## Key decisions

### D1 — `intervalDays` is the ONLY new persisted field; last watering is derived
`plants.interval_days` integer, NOT NULL, default 7. The last watering date is
the date of the plant's latest watering event (read via a watering query), never
a stored column.

- **Trade-off:** a stored `lastWateredAt` would make the home query a single
  table scan, but it duplicates state that the watering events already own —
  editing/deleting a watering would have to keep it in sync, the classic
  denormalization bug. Deriving it keeps ONE source of truth (the events) so
  logging/editing/deleting a watering recomputes status for free (FR-REM-02
  scenario "Status recomputes ... with no duplicate state"). For the MVP dataset
  (<= 20 plants, <= 500 events, NFR-PERF-01) a derive-on-read is well within
  budget. **Decision: derive.**

### D2 — Migration via the column default (existing rows backfill to 7)
`npm run db:generate` produces a migration adding `interval_days` NOT NULL
DEFAULT 7. Existing plant rows get 7 from the default — no data backfill script.

- **Trade-off:** NOT NULL on an existing table normally needs a default to be
  safe; the design's default (7) doubles as the backfill value, so no separate
  step. **Decision: NOT NULL DEFAULT 7, single generated migration.** SQLite
  ALTER TABLE ADD COLUMN with a constant default is supported.

### D3 — PURE status seam `lib/reminders/status.ts`, string-only calendar math
`deriveStatus({ lastWateredAt: string | null, intervalDays: number }, today:
string)` returns `'healthy' | 'soon' | 'overdue'`. Rule (exactly the baseline
spec): `due = lastWateredAt + intervalDays` calendar days; `overdue` when
`today > due`; `soon` when `today == due` OR `due == today + 1`; `healthy` when
`due >= today + 2`. `lastWateredAt === null` (never watered) ⇒ `overdue`.
`isDue(status)` = `status !== 'healthy'`. `urgencyKey(plant, today)` returns a
sortable number = how many days past due (overdue gap), so the home list orders
most-overdue first; ties break deterministically by name then id.

- The interval arithmetic adds days to a `YYYY-MM-DD` string. To add N days to a
  calendar date without timezone drift, parse the components and use
  `Date.UTC(...)` purely for the arithmetic, then re-format to `YYYY-MM-DD` (the
  same pattern `lib/plants/validation.ts` already uses to VALIDATE a date — here
  we reuse a small `addDays(iso, n)` helper, added to `lib/dates.ts` so it stays
  the single date-math home). Comparison stays lexicographic on the ISO strings
  (already proven by `isAfterToday`). No `Date` object ever crosses a timezone.
- **Trade-off:** a numeric "days between" could be computed once and reused, but
  expressing the rule as `due` (an ISO date) + lexicographic compares keeps each
  branch readable against the spec's "due today / tomorrow / past" wording and
  reuses the proven string-compare path. **Decision: compute `due` as an ISO
  string, compare lexicographically; expose a separate numeric overdue gap only
  for sorting.**
- **Boundary cases the tests pin (concrete dates anchored to a fixed `today`):**
  due == today (soon), due == today+1 (soon), due == today+2 (healthy),
  due == today-1 (overdue), never-watered (overdue), `intervalDays = 1`
  watered-today ⇒ due == today+1 ⇒ soon (but not re-counted same day, see D6).

### D4 — Interval validation lives in the existing plant validator
Amend `validatePlantInput` (and its `PlantInput`) to read `intervalDays` from the
FormData: trim; blank/omitted ⇒ default 7 (FR-REM-01 default); else it must
parse as a positive INTEGER (`>= 1`). Reject 0, negative, a decimal (7.5), or
non-numeric text with one clear inline message keyed to the interval field
(`uk.plants.fieldErrors.intervalInvalid`). The integer check is strict: parse the
raw string, require it to match `/^\d+$/` after trim (so "7.5", "7,5", "-3", "x",
"" past the default branch are all rejected) and be `>= 1`. Echo the raw value
under `values` so the form repopulates (FR-SHELL-03 pattern, same as every other
field). Never throws.

- **Trade-off:** a separate `lib/reminders/validation.ts` would isolate the new
  rule, but the interval is a PLANT field submitted by the SAME add/edit form,
  validated all-or-nothing with name/species/date — splitting the validator
  would fork the one FormData→PlantInput mapper. **Decision: extend the plant
  validator** (the plants spec gains a MODIFIED requirement accordingly).

### D5 — Reminders query/service (db injected), reuses the watering query
`lib/reminders/queries.ts` exposes a read that, for every plant, returns the
plant row + its latest watering date (the max `wateredOn`, tie-broken like SC-3
but we only need the date). `lib/reminders/service.ts` `getHomeReminders(db =
defaultDb, today = todayInKiev())` composes: list plants → for each, find latest
watering date → `deriveStatus` → build `{ plant, status, lastWateredAt, dueDate
}` rows → filter to due (soon/overdue) → sort by `urgencyKey` → return
`{ dueRows, dueCount, allDone, allRows }`. `allRows` (every plant + its status)
feeds the card pills; `dueRows` feeds the reminder list + count.

- The latest-watering-per-plant read is a single grouped query (`MAX(watered_on)
  GROUP BY plant_id`) rather than N per-plant `listWaterings` calls, so the home
  load is two queries (plants + latest-waterings) regardless of plant count
  (NFR-PERF-01). The db handle is INJECTED first param (the project convention)
  so tests drive a fresh in-memory SQLite and the page passes the singleton.
- **Trade-off:** deriving in the service (TS) vs in SQL. Doing the status math in
  the PURE TS seam (D3) keeps it unit-testable with concrete dates and one
  source of the rule; SQL only supplies the raw latest-date. **Decision: SQL
  fetches latest date per plant; TS derives + sorts.**

### D6 — Water-now action reuses the watering service; already-watered-today no-op
`lib/reminders/actions.ts` `waterNowAction(plantId)`: guard the id (positive
integer, like every other action), then REUSE `createWatering(plantId,
{ wateredOn: todayInKiev(), note: null })` from the watering service, then
`revalidatePath('/')` (and `/plants/${plantId}` so the detail pill updates),
return `ActionResult`. A non-existent plant resolves to a friendly not-found
(the watering service already returns `plant-not-found`), never a raw FK 500.

- **Already-watered-today:** the baseline scenario says watering a plant whose
  latest event is already today is a "no-op for status" — the plant must not be
  double-counted and the row stays/returns to done. We honor this at the STATUS
  level: a second today-dated event does not change `due` (still `today +
  intervalDays`), so the status and the due count are unchanged and the row stays
  done. To avoid piling up redundant rows we make the action check first: if the
  plant's latest watering is already today, return `ok()` WITHOUT inserting a
  second event (a true no-op). This keeps the watering history clean and the
  status idempotent.
- **Trade-off:** extend the watering actions vs a new reminders action. Water-now
  has a different shape (no form, fixed today date, revalidates `/`, no-op guard)
  and a different trace (FR-REM-05, not FR-WATER-01), so a dedicated
  `lib/reminders/actions.ts` that DELEGATES to the watering service reads
  cleaner than overloading `createWateringAction`. **Decision: new reminders
  action, reuse the service.**
- After watering today with `intervalDays >= 2`, `due = today + intervalDays >=
  today + 2` ⇒ healthy ⇒ not due (the row leaves the list, count decrements). For
  `intervalDays = 1`, `due = today + 1` ⇒ soon — but the just-logged event is
  today, so it is not counted as needing water AGAIN today (the no-op guard +
  the "watered today" semantics); the row still shows done for today.

### D7 — Home UI redesign + pill wiring
`app/page.tsx` becomes the «Поливайко» Home: load `getHomeReminders(db)` →
render (1) a pine summary card (`bg-pine` text-paper, radius 22) with label
"Сьогодні полити" + the big due count; (2) when `dueCount > 0`, the uppercase
section header "Потребують поливу" + the urgency-ordered reminder rows; (3) when
`allDone`, the centered leaf icon + "Усі политі! 🌱" + a reassurance line.

- **Reminder row** (`components/reminders/ReminderRow.tsx`, client island for the
  done-swap): cloud card, 54px striped thumb, name (Quicksand 700), a due line
  whose color reflects urgency (clay/soon text vs danger/overdue text), and a
  trailing water-now droplet `Button` (icon variant, accessible label) that on
  click calls `waterNowAction(plantId)` and swaps to a `mist`+check done state
  with the due line "Полито щойно ✓" in forest. Keyboard-operable, labelled
  (SC-6, NFR-A11Y-04).
- **Summary card** + **all-done state** are presentational
  (`components/reminders/SummaryCard.tsx`, `AllDoneState.tsx`).
- **Pill wiring:** `PlantCard` already accepts a `status` prop (the slice-6
  placeholder); pass the real derived status from `allRows`. The detail page
  computes the plant's status (its latest watering date + interval via
  `deriveStatus`) and renders the same pill. The plant list (cards) still exists
  on the home below the reminders, OR the home is reminder-first with cards on a
  list view — per the design the Home is reminder-centric; the existing plant
  grid stays reachable (the design keeps the list). We keep the card grid on the
  home under the reminders so FR-PLANT-04/08 stay satisfied and the pill shows on
  every card.
- **Trade-off:** server-render the whole row vs a client island. The done-swap is
  an optimistic local UI transition (the design animates the swap), so the row's
  trailing control is a client island; the row content (thumb/name/due line) can
  be server-rendered and the island wraps the action + done state. **Decision:
  thin client island for the action + done state; data derived on the server.**

### D8 — Copy
New `uk.reminders.*`: `summaryLabel` ("Сьогодні полити"), `summaryUnit`
("рослини" / pluralization kept simple per design), `sectionTitle`
("Потребують поливу"), `waterNow` (accessible label for the droplet, e.g.
"Полити зараз"), `doneLabel` ("Полито щойно ✓"), `allDoneTitle` ("Усі политі!
🌱"), `allDoneReassurance`, plus the due-line strings (overdue/soon variants).
New `uk.plants.intervalLabel`, `intervalHint`, and
`fieldErrors.intervalInvalid`. Ukrainian text, English identifiers (NFR-LOC-01).

## Data model

```
plants
  id            integer pk
  name          text not null
  species       text not null default <SPECIES_DEFAULT>
  acquired_date text null            -- YYYY-MM-DD
  interval_days integer not null default 7   -- NEW (FR-REM-01)
  created_at    text not null default CURRENT_TIMESTAMP

watering_events (unchanged, owned by the watering capability)
  id, plant_id (fk ON DELETE CASCADE), watered_on (YYYY-MM-DD), note
```

Derived (not stored): `lastWateredAt` = MAX(watering_events.watered_on) per
plant; `status` = `deriveStatus({ lastWateredAt, intervalDays }, today)`.

## Error handling strategy

- **Interval validation:** every bad interval (blank-past-default is just the
  default; 0/negative/decimal/non-numeric) is an inline field error next to the
  interval field, all-or-nothing with the rest of the plant edit (no field
  persisted on failure) — never a raw error or silent failure (FR-SHELL-03,
  NFR-USA-02, NFR-DATA-02).
- **Water-now on a missing plant:** the watering service returns
  `plant-not-found`; the action maps it to a friendly not-found `ActionResult`,
  never a raw FK 500.
- **Water-now id guard:** a non-positive / non-integer `plantId` resolves to
  not-found (defense-in-depth, like the other actions).
- **Already-watered-today:** the action is a no-op returning `ok()` — no second
  event, no error, the row stays done (FR-REM-05 scenario).
- **No plants / nothing due:** the home shows the all-done empty state, never a
  blank reminder area or a raw error (FR-REM-06).
- **Auth:** N/A — single local Owner, no auth (NFR-SEC-01).

## Risks + mitigations

- **R1 — Timezone off-by-one in `due` math.** Adding days to an ISO date is the
  classic UTC-vs-Kiev footgun. *Mitigation:* a single `addDays(iso, n)` helper in
  `lib/dates.ts` doing component arithmetic (the same proven pattern as the
  existing validators), unit-tested across month/year boundaries; all comparisons
  stay lexicographic on `YYYY-MM-DD`; `today` is injectable so tests pin it.
- **R2 — Status duplicated between card pill, summary count, and reminder list.**
  *Mitigation:* ONE `getHomeReminders` service computes `allRows` (status per
  plant) once; the count, list, and pills all read from it — no second
  computation (the FR-REM-07 "same derived status" requirement).
- **R3 — Water-now spamming duplicate today events.** *Mitigation:* the no-op
  guard (D6) skips a second insert when the latest event is already today.
- **R4 — NOT NULL migration on a populated table.** *Mitigation:* DEFAULT 7
  backfills existing rows in the same ALTER; verified by the real-DB smoke test
  (existing plants show interval 7 after migrate).
- **R5 — Rendered legibility/contrast of urgency colors + pills not unit-checkable.**
  *Mitigation:* logic/data are unit/integration tested now; the rendered home
  view's contrast, urgency colors, pill legibility, 360px responsive, and the
  water-now perf budget are vision-verified + axe-checked on the SETTLED screen
  in Phase 6 (NFR-A11Y-01/02/04, NFR-COMPAT-01, NFR-PERF-01).

## ADR-worthy

- **D1 (derive last-watering, no stored column)** is the load-bearing modeling
  decision for this capability and is worth recording as a short ADR note (single
  source of truth for the last watering date). The rest are local implementation
  choices.

## Phase 6 follow-up

Rendered home view (summary card on pine, urgency-colored due lines, status
pills, all-done state, 360px responsive, water-now <300ms) → Phase 6
vision-verify + axe + perf gate. Noted here so it is not lost.
