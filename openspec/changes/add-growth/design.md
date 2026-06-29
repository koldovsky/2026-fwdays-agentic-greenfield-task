## Context

Second DB slice and the FIRST child of the plant aggregate. Stack is fixed by
ADR-0001: Next.js 16 (App Router) + TypeScript + Tailwind 4, **SQLite + Drizzle**,
Vitest, Playwright. UI copy is Ukrainian (NFR-LOC-01); code identifiers, spec
text, and trace ids stay English. The app is single-user and auth-less
(NFR-SEC-01, TC-04) — there are NO unauthorized / forbidden paths, so the shared
"unauthorized -> login, forbidden -> home" UI rules do not apply here (deliberate
exclusion, see the baseline spec).

A growth measurement belongs to exactly one plant. Slice 2 pinned the cascade
DIRECTION: deleting a plant removes its children. This slice declares the
child-side FK `growth_measurements.plantId -> plants.id ON DELETE CASCADE` that
realizes that contract, while a measurement delete removes only its own row
(SC-5). The slice-2 inline-error contract (`lib/forms/result.ts` `ActionResult`,
`FieldError`, `FormErrorBanner`) and date conventions (SC-1, SC-2) are FROZEN and
reused verbatim — this slice consumes them, it does not reshape them.

## Goals / Non-Goals

**Goals:**
- Persist height measurements in SQLite + Drizzle so they survive reload/restart
  (NFR-DATA-01, SC-4 for the measurement entity).
- Log (date defaults to today in Europe/Kiev), view (list ordered date desc,
  deterministic same-date tie-break), edit (value + date), delete-with-confirm —
  FR-GROWTH-01..04.
- A strict, decidable, unit-tested height-parse rule — FR-GROWTH-05 (D2).
- Date handling per SC-1 (native picker, store ISO `YYYY-MM-DD`, display
  `DD.MM.YYYY`) and SC-2 (reject a date after today in Europe/Kiev), reusing the
  promoted shared date helpers (D3).
- List ordering per SC-3: date descending, tie-broken by row id descending.
- Delete safety per SC-5 / NFR-DATA-02: explicit confirm, single row, no cascade
  to the plant / other measurements / waterings.
- Every form-backing server action returns the shared `ActionResult`; never throws
  raw on user input; echoes `values` on failure for repopulation (FR-SHELL-03).
- Mutations reflected within 300 ms locally for a realistic dataset (NFR-PERF-01).

**Non-Goals:**
- No additional growth metrics — leaf count, width, trunk diameter (FR-GROWTH-06,
  Future); height in cm is the only metric.
- No imperial units (Future); no time-of-day on a measurement (date-only).
- No growth CHART here — the chart is slice 5 (`add-charts`, FR-CHART-02). This
  slice delivers the underlying VALUES as a list (NFR-A11Y-03 is satisfied because
  the list, not only a chart, exposes the data).
- No auth/accounts/sessions (NFR-SEC-01, TC-04).
- No reshaping of the slice-2 `ActionResult` / `FieldError` / banner contract or
  the plants table.

## Decisions

### D1 — `growth_measurements` schema  (`db/schema/growth.ts`)
A single Drizzle `sqliteTable("growth_measurements", ...)`, re-exported from
`db/schema/index.ts` (per AGENTS.md):

| column       | type / Drizzle                                                                              | notes |
|--------------|---------------------------------------------------------------------------------------------|-------|
| `id`         | `integer().primaryKey({ autoIncrement: true })`                                             | stable row id; also the SC-3 tie-break key and the edit/delete target. |
| `plantId`    | `integer().notNull().references(() => plants.id, { onDelete: "cascade" })`                  | FK to the parent plant; realizes the slice-2 cascade DIRECTION (D4, SC-5). |
| `heightCm`   | `real().notNull()`                                                                          | the parsed numeric height in cm; see D2 for the parse rule and the store-as-number justification. |
| `measuredOn` | `text().notNull()`                                                                          | ISO `YYYY-MM-DD` calendar date (no time-of-day, no timezone drift), SC-1. |
| `createdAt`  | `text().notNull().default(sql\`(CURRENT_TIMESTAMP)\`)`                                       | row birth; informational (the SC-3 tie-break uses `id`, which is monotonic). |

Rationale for column types: SQLite has no native date type — storing
`measuredOn` as `YYYY-MM-DD` `text` keeps it a pure calendar date (SC-1 /
NFR-USA-03). `plantId` is `NOT NULL` because a measurement cannot exist without a
plant; the FK + cascade enforce referential integrity at the DB level. `id` is an
autoincrement integer: monotonic, so "row id descending" is a stable proxy for
"most recently created" for the SC-3 same-date tie-break.

### D2 — Height parse rule + storage (the load-bearing pure function)  (FR-GROWTH-05)  (ADR-worthy-lite)
The height-parse rule is the critical pure function of this slice and is
hammered with unit tests. A single `parseHeightCm(raw: string): number | null`
(or a thin `ParseResult` wrapper) lives in `lib/growth/validation.ts` and applies
these DECIDABLE rules, in order:

1. **Trim** leading/trailing whitespace. A blank/whitespace-only value is REJECTED
   (height is required when logging — there is no "optional height").
2. **At most one separator, dot OR comma.** Reject any input containing more than
   one separator total (`12.5.5`, `1,000.5`) or any grouping/thousands separator
   (`1,000`, `1 200,5` — the space is also rejected as non-numeric). Such inputs
   are ambiguous in the Owner's Europe/Kiev locale, so they are treated as
   non-numeric, NOT silently reinterpreted.
3. **Normalize the comma to a dot.** A single comma is the decimal separator
   (`12,5` -> `12.5`), matching the Ukrainian locale.
4. **Numeric shape.** After normalization the value must match
   `^\d+(\.\d+)?$` — an optional integer part is NOT allowed to be empty (reject
   `.5` / `,5` as malformed; require a digit before the separator). A leading `+`
   or `-` sign is rejected here, so `-3` fails as non-numeric/negative.
5. **At most one decimal place.** `12.55` / `12,555` are rejected
   (over-precision) — height in cm to a tenth is the agreed granularity.
6. **Strictly greater than 0.** `0` / `0,0` / `0.0` are rejected. Decision:
   `> 0`, not `>= 0` — a zero-height plant is not a meaningful measurement and is
   almost always a typo; rejecting it is the safer default and is decidable.
7. **At most `HEIGHT_MAX_CM = 1000` cm (upper bound).** `1000.1` and
   `999999999` are rejected. 1000 cm (10 m) comfortably exceeds any indoor money
   tree, bounds the input against fat-finger/overflow entries, and is a round,
   testable number.

Trailing zeros are accepted because step 4 permits them and the parse collapses
them numerically: `12.50` and `12,50` both parse to `12.5`.

**Storage decision: store as a number (`REAL`), not a normalized string.**
We store the parsed numeric value (`12.5`) in the `heightCm` `REAL` column, not
the raw/normalized text. Rationale: the growth chart (slice 5, FR-CHART-02) plots
height over time and needs a true numeric axis; a number sorts, compares, and
aggregates correctly without re-parsing on every read; and "at most one decimal
place + <= 1000" means the values are small and exactly representable enough for
display to one decimal. Trade-off vs. storing the normalized string: a string
would preserve the exact typed form (e.g. distinguish `12.50` from `12.5`), but
that distinction is meaningless for a measurement (both are 12.5 cm) and would
force every reader — chart included — to re-parse. We accept the (here harmless)
float representation in exchange for a clean numeric model the chart slice can
consume directly. Display formats the number back with at most one decimal place,
using a dot or the Ukrainian comma as the display copy dictates (a one-way
formatting helper; never fed back into storage).

This is the slice's most-tested unit: every accept/reject case in the spec
(`12.5`, `12,5`, `12.50`, `12,50` accept; blank, `tall`, `-3`, `0`, `0,0`,
`1000.1`, `999999999`, `12.55`, `12,555`, `1,000`, `12.5.5`, `1 200,5` reject)
has a colocated test.

### D3 — Promote the shared date helpers to `lib/dates.ts`  (refactor; SC-1, SC-2)
Growth, watering, and plants ALL need `todayInKiev` / `isAfterToday` /
`formatAcquiredDate`. Leaving them in `lib/plants/date.ts` would force growth and
watering to import from the plants module (a wrong dependency direction) or to
copy them (triplication). Decision: **MOVE** the three helpers from
`lib/plants/date.ts` to a shared `lib/dates.ts`, re-point the plants imports
(`lib/plants/validation.ts` and any others), and move/keep their unit tests
(re-run green after the move to prove the plant behavior is unchanged). The
implementer performs this refactor as the first green step.

- **Entry**: native `<input type="date">` (SC-1); the browser emits `YYYY-MM-DD`.
- **Storage**: the ISO `YYYY-MM-DD` string verbatim. Unlike the plant acquired
  date (optional), the measurement date is REQUIRED; an omitted date defaults to
  `todayInKiev()` (FR-GROWTH-01).
- **Display**: `formatAcquiredDate(iso)` formats to `DD.MM.YYYY` (the helper name
  is generic enough to reuse; it formats any ISO calendar date).
- **Validation**: present-or-defaulted value must (a) match `^\d{4}-\d{2}-\d{2}$`,
  (b) be a real calendar date (reject `2026-13-40` / `2026-02-30` by re-parsing
  and comparing components, not just regex), and (c) NOT be after today in
  Europe/Kiev (SC-2). "Today" is the LOCAL calendar date in Europe/Kiev, compared
  as ISO strings so the comparison is timezone-stable (no midnight off-by-one).
  `today` is injectable for deterministic tests.

Trade-off: comparing ISO strings (not `Date` objects) for the future-date check
avoids the UTC-vs-local off-by-one footgun at midnight, at the cost of a small
"today in Kiev" helper — already written and unit-tested in slice 2, now shared.

### D4 — FK cascade: child-side declaration realizes the slice-2 direction  (SC-5, NFR-DATA-02)
`growth_measurements.plantId` declares
`references(() => plants.id, { onDelete: "cascade" })`. This is the child-side
realization of the cascade DIRECTION slice 2 documented and owns: deleting a plant
removes its measurements automatically at the DB level (atomic, cannot be bypassed
by a forgotten code path). `db/client.ts` already sets `PRAGMA foreign_keys = ON`,
so the cascade and the FK constraint are enforced.

A measurement DELETE removes ONLY that single row — it does NOT cascade to the
parent plant, to other measurements, or to watering events (SC-5). Inserting a
measurement for a non-existent `plantId` is rejected by the FK constraint; the
action catches the driver error and returns a friendly not-found `ActionResult`,
never a raw 500.

Trade-off: DB-level cascade vs. application-level cascade in `service.ts`. We
follow the slice-2 decision (DB-level) — atomic and unbypassable — at the cost of
the cascade behavior living partly in the migration; this is the safer default for
"no silent data loss" (NFR-DATA-02) and matches the contract slice 2 pinned.

### D5 — `lib/growth/` module split  (AGENTS.md conventions; mirrors `lib/plants/`)
- `validation.ts` — owns `parseHeightCm` (D2), `HEIGHT_MAX_CM`, the date rule
  (D3, via `lib/dates.ts`), the `formData -> GrowthInput` mapper, and the
  issue -> field-keyed Ukrainian message mapping. On failure echoes the raw
  submitted strings under `values` so the uncontrolled form repopulates
  (FR-SHELL-03). Never throws.
- `queries.ts` — thin Drizzle reads/writes with the db handle INJECTED as the
  first param (exactly like `lib/plants/queries.ts`, so tests drive a fresh
  in-memory DB and the actions pass the singleton):
  `listMeasurements(db, plantId)` (ordered date desc, then id desc — SC-3),
  `getMeasurement(db, id)`, `insertMeasurement(db, values)`,
  `updateMeasurement(db, id, values)`, `deleteMeasurement(db, id)`. No business
  rules here.
- `service.ts` — orchestration: a validated-input-in / row-or-null-out layer that
  owns the not-found signal (edit/delete of a row deleted in another tab) and the
  plant-exists check on logging. `db` defaulted to the singleton, injectable.
- `actions.ts` — `'use server'` actions
  (`createMeasurementAction`, `updateMeasurementAction`, `deleteMeasurementAction`):
  **guard -> validate -> service -> revalidate**, returning the shared
  `ActionResult`; defense-in-depth integer-id guard (reject float/0/negative/NaN
  ids as a friendly not-found, like plants); catch + translate validation / FK /
  SQLite driver errors -> Ukrainian message; echo `values` on failure; never throw
  raw. On success `revalidatePath('/plants/<plantId>')` (and `/` if the list shows
  measurement summaries — it does not in MVP, so only the detail path).
- Colocated `*.test.ts` beside each.

### D6 — Measurements section on `/plants/[id]`  (UI; SC-3, SC-6, NFR-A11Y-03)
The measurements live in a SECTION on the existing plant detail page
(`app/plants/[id]/page.tsx`), not a separate route — they are part of a plant's
detail. The server component calls `listMeasurements(db, plantId)` and renders:
- a list ordered date descending, tie-broken by row id descending (SC-3), each row
  showing the height in cm and the measurement date as `DD.MM.YYYY`;
- a clear empty state when the plant has no measurements (not an error / blank);
- an add form (client island, `useActionState`) with a height field and a native
  `<input type="date">` defaulting to today; per-row edit (same form, prefilled)
  and a delete-with-confirm control (explicit confirmation step before the action
  fires — never one-click silent delete).

All forms render `FormErrorBanner` (top) + per-field `FieldError`, repopulate
uncontrolled inputs from `result.values` on failure (slice-2 D3/D4 pattern), give
every field an accessible label, and keep the delete confirm keyboard-operable
(SC-6, NFR-A11Y-04 at the jsdom level). The list — not only a future chart —
exposes the underlying values (NFR-A11Y-03). Reachable in <= 2 clicks from the
plant detail (NFR-USA-01).

### D7 — Migration workflow
The schema change is generated with `npm run db:generate` (drizzle-kit) into
`db/migrations/` (SQL + meta snapshot), committed. `db/client.ts` auto-applies
committed migrations on startup (idempotent), so the runtime DB gains the
`growth_measurements` table and FK automatically; `npm run db:migrate` applies it
for the manual smoke test. Migrations are committed artifacts (AGENTS.md).

## Data model

```
growth_measurements
  id          integer  PK autoincrement                 -- SC-3 tie-break key; edit/delete target
  plantId     integer  NOT NULL  FK -> plants.id ON DELETE CASCADE   -- one plant per measurement (D4)
  heightCm    real     NOT NULL                          -- parsed number, > 0, <= 1000, <= 1 decimal (D2)
  measuredOn  text     NOT NULL                          -- ISO 'YYYY-MM-DD', <= today (Kiev), date-only (D3)
  createdAt   text     NOT NULL DEFAULT (CURRENT_TIMESTAMP)

-- List order (SC-3):  ORDER BY measuredOn DESC, id DESC
-- Cascade (SC-5):     deleting a plant removes its measurements; deleting a
--                     measurement removes only that one row (no cascade up/out).
```

## Error handling strategy

- **Validation failures** (blank/non-numeric/negative/zero/over-precision/
  over-bound/grouping-separator height per D2; malformed/impossible/future date
  per D3): `validation.ts` -> field-keyed Ukrainian messages ->
  `fieldError(messages, echoedValues)` -> rendered inline by `FieldError`; the
  form repopulates from `result.values` (NFR-USA-02, FR-SHELL-03). No row is
  created/changed; edit is all-or-nothing (NFR-DATA-02).
- **Non-existent plant on logging** (or a FK violation): the action catches and
  returns a friendly not-found / form error `ActionResult`, never a raw 500; no
  measurement is created.
- **Row-gone** (edit/delete of a measurement removed in another tab): the service
  returns null / 0 changes -> the action returns a not-found `ActionResult` ->
  friendly state, never a resurrected row (NFR-DATA-02).
- **SQLite / driver errors** (unexpected constraint, busy, I/O): `actions.ts`
  catches, logs the cause, and returns `formError(uk.errors.generic)` — a human
  Ukrainian banner, never a leaked driver message (AGENTS.md correctness rule).
- Server actions NEVER throw raw on user input.

## Risks / Trade-offs

- **R1 — Locale-ambiguous height input silently misread.** `1,000` could mean
  1000 (grouping) or 1.0 (decimal-comma) depending on locale; misreading corrupts
  data. Mitigation: D2 treats ANY input with a grouping separator or more than one
  separator as non-numeric and REJECTS it inline — never guesses. Every such case
  is unit-tested.
- **R2 — Future-date check off-by-one at the Kiev midnight boundary.** Comparing
  `Date` objects in UTC vs. local can reject/accept "today" wrongly near midnight.
  Mitigation: compare ISO `YYYY-MM-DD` strings via the shared `todayInKiev`
  helper, unit-tested with fixed clocks (D3) — the same approach slice 2 proved.
- **R3 — Same-date measurements rendered in a nondeterministic order.** Two
  measurements on one date could flip order between reads, confusing the Owner and
  flaking tests. Mitigation: SC-3 tie-break `ORDER BY measuredOn DESC, id DESC`
  makes the order total and reproducible (D5); asserted by a query test.
- **R4 — A measurement delete accidentally cascades or a plant delete fails to.**
  A wrong FK could delete the plant when a measurement is deleted, or orphan
  measurements when a plant is deleted. Mitigation: the FK is declared ON the child
  with `onDelete: "cascade"` (D4); the smoke flow proves both directions —
  deleting a measurement leaves the plant + its siblings + waterings intact, and
  deleting a plant removes its measurements.
- **R5 — Float representation of `heightCm`.** Storing `12.5` as `REAL` risks a
  display artifact (e.g. `12.500000001`). Mitigation: the parse caps precision at
  one decimal and bounds the value at 1000, and display formats to at most one
  decimal place, so no artifact reaches the Owner (D2).
- **R6 — Shared-helper move breaks plants.** Moving `lib/plants/date.ts` ->
  `lib/dates.ts` and re-pointing imports could break plant date handling.
  Mitigation: the plant date tests move/re-run green after the refactor before
  any growth code is written (D3); the refactor is its own task.
- **R7 — React 19 form-action reset wipes typed input on a failed submit.**
  Mitigation: the failure arm echoes `values`; uncontrolled inputs repopulate via
  `defaultValue` (inherited slice-2 D3 pattern), so one bad field never clears the
  others.

## Accepted limitations (MVP)

- **Single growth metric (height in cm).** Leaf count / width / trunk diameter are
  FR-GROWTH-06 (Future). Accepted: the customer asked only for "ріст"; one numeric
  metric is the smallest meaningful slice.
- **No growth chart here.** The chart is slice 5 (FR-CHART-02). This slice delivers
  the underlying values as a list, which already satisfies NFR-A11Y-03; the chart
  consumes the numeric `heightCm` column (D2).
- **One decimal place of precision; metric only.** Imperial units and finer
  precision are Future. Accepted: a tenth of a centimetre is ample for a houseplant.
- **No optimistic UI.** Mutations round-trip then revalidate. Accepted: well within
  NFR-PERF-01's 300 ms locally for the realistic dataset. The perf budget itself is
  not asserted per-slice; it is verified in Phase 6 (the cross-cutting performance
  gate), consistent with the other capabilities.
- **Rendered-result a11y / AA-contrast / 360 px-responsive / vision verification is
  DEFERRED to Phase 6** (the cross-cutting axe light+dark + vision-verify gate runs
  once over the whole app). The jsdom-level a11y for this slice's measurement
  forms — accessible labels on every field + the `FieldError` association
  convention + the keyboard-operable delete confirm — is covered by the slice's
  component tests. Honestly tracked deferral, not a dropped NFR (SC-6 is asserted
  at the jsdom level here; NFR-A11Y-* rendered gates remain owned by Phase 6).
