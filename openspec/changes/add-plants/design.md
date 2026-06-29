## Context

First DB slice. Stack is fixed by ADR-0001: Next.js 16 (App Router) + TypeScript
+ Tailwind 4, **SQLite + Drizzle**, Vitest, Playwright. UI copy is Ukrainian
(NFR-LOC-01); code identifiers, spec text, and trace ids stay English. The app
is single-user and auth-less (NFR-SEC-01, TC-04) — there are NO unauthorized /
forbidden paths, so the shared "unauthorized → login, forbidden → home" UI rules
do not apply here (deliberate exclusion, see the baseline spec).

The plant is the aggregate root: growth measurements and watering events (later
slices) belong to a plant and are cascade-deleted with it. This slice owns the
parent table and the cascade DIRECTION; the child tables and their FK constraints
are added by their own slices. The slice-1 inline-error contract
(`lib/forms/result.ts` `ActionResult`, `FieldError`, `FormErrorBanner`) is FROZEN
and reused verbatim — this slice consumes it, it does not reshape it.

## Goals / Non-Goals

**Goals:**
- Persist plants in SQLite + Drizzle so they survive reload/restart (NFR-DATA-01,
  SC-4 for the plant entity).
- Add (required name; species default editable; optional acquired date), list
  (with empty state), detail, edit, delete-with-confirm — FR-PLANT-01..08.
- Date handling per SC-1 (native picker, store ISO `YYYY-MM-DD`, display
  `DD.MM.YYYY`) and SC-2 (reject a date after today in Europe/Kiev).
- Delete safety per SC-5 / NFR-DATA-02: explicit confirm, cascade ONLY the
  plant's own children, never beyond.
- Every form-backing server action returns the shared `ActionResult`; never
  throws raw on user input; echoes `values` on failure for repopulation
  (NFR-USA-02, FR-SHELL-03 contract).
- Mutations reflected within 300 ms locally for a realistic dataset
  (NFR-PERF-01).

**Non-Goals:**
- No growth/watering/chart schema, queries, or UI (later slices). This slice
  only documents the cascade target the child tables will reference.
- No image upload (FR-PLANT-09 Future) or search/filter (FR-PLANT-10 Future).
- No auth/accounts/sessions (NFR-SEC-01, TC-04).
- No reshaping of the slice-1 `ActionResult` / `FieldError` / banner contract.

## Decisions

### D1 — `plants` schema  (`db/schema/plants.ts`)
A single Drizzle `sqliteTable("plants", …)` re-exported from
`db/schema/index.ts` (per AGENTS.md):

| column        | type / Drizzle                                   | notes |
|---------------|--------------------------------------------------|-------|
| `id`          | `integer().primaryKey({ autoIncrement: true })`  | stable row id; the `[id]` route param. |
| `name`        | `text().notNull()`                               | required (FR-PLANT-01); trimmed + length-bounded in `validation.ts`, NOT enforced by a DB check. |
| `species`     | `text().notNull().default(SPECIES_DEFAULT)`      | DB-level default so a row never lacks a species (FR-PLANT-02); see D2. |
| `acquiredDate`| `text()` (nullable)                              | ISO `YYYY-MM-DD` string or `NULL` (FR-PLANT-03, SC-1); see D3. |
| `createdAt`   | `text().notNull().default(sql\`(CURRENT_TIMESTAMP)\`)` | row birth; used for stable list ordering (D6). |

Rationale for column types: SQLite has no native date type — storing the
acquired date as a `YYYY-MM-DD` `text` keeps it a pure calendar date (no
time-of-day, no timezone drift), exactly what SC-1 / NFR-USA-03 require. `id` is
an autoincrement integer (simple, monotonic, good tie-break key). Trade-off vs. a
UUID/text id: integer ids are smaller and order naturally for the list tie-break,
at the cost of being guessable — acceptable for a single-user local app with no
auth (NFR-SEC-01).

### D2 — Species default value  (canonical stored string)  (ADR-worthy-lite)
The species default is stored as the canonical Ukrainian display string
**`'Грошове дерево (Crassula ovata)'`** and is the DB column default AND the
`validation.ts` default, exported as a single `SPECIES_DEFAULT` constant (defined
in `lib/plants/validation.ts`, mirrored as the Drizzle column `.default(...)`).
The baseline spec phrases the default as "money tree / Crassula ovata"
(English, for the spec audience); the RUNTIME stored + displayed value is the
Ukrainian canonical string because UI copy is Ukrainian (NFR-LOC-01) and species
is free text the Owner sees and edits verbatim.

Decision: store the canonical Ukrainian string, not a locale key. Trade-off:
this couples the stored data to one locale, which would complicate a future
English translation (NFR-LOC-02, Future) — accepted because species is
user-editable free text (not an enum), the app is Ukrainian-only in MVP, and the
data model stores "money tree" as ordinary text either way. The single
`SPECIES_DEFAULT` source of truth keeps the DB default and the form prefill in
lock-step so a row inserted with no species and a form prefilled with the default
agree exactly. Flagging this as the explicit species-default decision the slice
brief asked to make load-bearing.

### D3 — Acquired date: native picker → ISO storage → DD.MM.YYYY display  (SC-1, SC-2)
- **Entry**: a native `<input type="date">` (FR-PLANT-03, SC-1). The browser
  emits its value as `YYYY-MM-DD` already; no free-text date parsing.
- **Storage**: the ISO `YYYY-MM-DD` string verbatim, or `NULL` when the field is
  left empty (acquired date is optional).
- **Display**: formatted to `DD.MM.YYYY` for the Owner (Ukrainian locale) by a
  pure helper `formatAcquiredDate(iso): string` in `lib/plants/` (own file, e.g.
  `date.ts`), tested directly.
- **Validation** (`validation.ts`, zod): empty → `null` (valid, optional). When
  present it must (a) match `^\d{4}-\d{2}-\d{2}$`, (b) be a real calendar date
  (reject `2026-02-30` — re-parse and compare components, not just regex), and
  (c) NOT be after today in Europe/Kiev (SC-2). "Today" is computed as the
  current LOCAL calendar date in Europe/Kiev (AGENTS.md: day-bound assertions use
  the local calendar date), compared as ISO strings so the comparison is
  timezone-stable. A future/malformed/out-of-range value yields an inline field
  error on the acquired-date field (NFR-USA-02, NFR-USA-03, FR-SHELL-03).

Trade-off: comparing ISO strings (not `Date` objects) for the future-date check
avoids UTC-vs-local off-by-one bugs at midnight boundaries — the well-known
date-comparison footgun — at the cost of a small "today in Kiev" helper. Accepted;
the helper is unit-tested with fixed clocks.

### D4 — `lib/plants/` module split  (AGENTS.md conventions)
- `validation.ts` — zod schemas (`createPlantSchema`, `updatePlantSchema`) +
  `formData → input` mappers; owns `SPECIES_DEFAULT`, the name trim/bound
  (non-empty, ≤ 200 chars after trim), species bound (≤ 200 chars, verbatim),
  and the acquired-date rule (D3). Maps zod issues → field-keyed Ukrainian
  messages.
- `queries.ts` — thin Drizzle reads/writes: `listPlants()`, `getPlant(id)`,
  `insertPlant(values)`, `updatePlant(id, values)`, `deletePlant(id)`. No
  business rules here.
- `service.ts` — orchestration: validate-already-done inputs in, returns a
  plain result/throws a typed domain error the action translates; owns the
  delete-cascade semantics (D5) and the "row gone" → not-found signal.
- `actions.ts` — `'use server'` server actions
  (`createPlantAction`, `updatePlantAction`, `deletePlantAction`):
  **guard → validate → service → revalidate**, returning the shared
  `ActionResult`. NEVER throws on user input — catches, translates
  (validation / FK / SQLite driver errors → human Ukrainian message via
  `lib/i18n/uk.ts`), and returns `{ ok: false, … }` with `values` echoed so the
  uncontrolled form repopulates (slice-1 D3 pattern). On success calls
  `revalidatePath('/')` and the detail path, then signals navigation.
- `date.ts` — pure `formatAcquiredDate` / "today in Kiev" helpers (own file).
- Colocated `*.test.ts` beside each.

### D5 — Delete: confirmed + cascade only the plant's own children  (SC-5, NFR-DATA-02)
Deletion requires an explicit confirmation step in the UI BEFORE any row is
removed (a confirm dialog / a dedicated confirm control — never a one-click
silent delete). On confirm, `deletePlantAction` deletes the plant row; its growth
measurements and watering events are removed by the FK `ON DELETE CASCADE` those
child tables will declare against `plants.id` (later slices). The cascade extends
ONLY to the plant's own children, never to other plants' data (SC-5).

This slice has no child tables yet, so the cascade is documented and the parent
is shaped to be a clean cascade target; the child-side `references(() => plants.id,
{ onDelete: "cascade" })` is added by the growth/watering slices. `PRAGMA
foreign_keys = ON` is already set in `db/client.ts`, so the cascade will be
enforced once the children exist. Deleting an already-deleted plant resolves to a
no-op not-found (no raw 500), affecting no other data.

Trade-off: DB-level `ON DELETE CASCADE` (declared on the children) vs.
application-level cascading deletes in `service.ts`. We choose DB-level cascade —
it is atomic, cannot be bypassed by a forgotten code path, and keeps `service.ts`
simple — at the cost of the cascade living in the child slices' migrations rather
than all in one place. Accepted: it is the safer default for "no silent data
loss" (NFR-DATA-02), and the direction is documented here so the child slices
honor it.

### D6 — Pages and routes  (thin server components)
- `/` (`app/page.tsx`): server component, calls `listPlants()`, renders each
  plant (name + species + acquired date when set) linking to its detail, OR the
  empty state (FR-PLANT-04, FR-PLANT-08). Replaces the slice-1 placeholder list
  and removes the `ExampleForm`. List order: `createdAt` then `id` descending
  (deterministic; SC-3 governs growth/watering lists, not the plant list, so we
  pick a stable newest-first order here).
- `/plants/[id]` (`app/plants/[id]/page.tsx`): server component, `getPlant(id)`,
  `notFound()` on miss (slice-1 boundary already wired), else renders detail +
  links to edit and the delete-with-confirm control.
- Add + edit forms: client form islands using `useActionState` over the actions,
  rendering `FormErrorBanner` (top) + `FieldError` (per field), repopulating
  uncontrolled inputs from `result.values` on failure (slice-1 D3/D4). Whether add
  lives on `/` or `/plants/new` and edit on `/plants/[id]/edit` is an
  implementation detail; both honor the ≤ 2-click reachability (NFR-USA-01).

### D7 — Migration workflow
The schema change is generated with `npm run db:generate` (drizzle-kit) into
`db/migrations/` (SQL + meta snapshot), committed. Applied locally with
`npm run db:migrate` for the smoke test. Migrations are committed artifacts
(AGENTS.md).

## Data model

```
plants
  id            integer  PK autoincrement
  name          text     NOT NULL                 -- trimmed, 1..200 chars (app-validated)
  species       text     NOT NULL DEFAULT 'Грошове дерево (Crassula ovata)'  -- free text, ≤200
  acquiredDate  text     NULL                      -- ISO 'YYYY-MM-DD' or NULL; ≤ today (Kiev)
  createdAt     text     NOT NULL DEFAULT (CURRENT_TIMESTAMP)

-- Later slices add child tables referencing plants.id with ON DELETE CASCADE:
--   growth_measurements.plantId -> plants.id  ON DELETE CASCADE
--   watering_events.plantId     -> plants.id  ON DELETE CASCADE
-- (declared by their own slices; cascade direction owned/documented here.)
```

## Error handling strategy

- **Validation failures** (missing/oversize name, oversize species,
  malformed/out-of-range/future acquired date): zod in `validation.ts` →
  field-keyed Ukrainian messages → `fieldError(messages, echoedValues)` →
  rendered inline by `FieldError`; the form repopulates from `result.values`
  (NFR-USA-02, FR-SHELL-03). No row is created/changed; edit is all-or-nothing
  (NFR-DATA-02).
- **Row-gone** (edit/delete/detail of a plant deleted in another tab):
  `service`/page signals not-found → `notFound()` (detail) or a not-found
  `ActionResult` (mutations) → friendly state, never a raw 500; no row resurrected
  (NFR-DATA-02).
- **SQLite / driver errors** (unexpected constraint, busy, I/O):
  `actions.ts` catches, logs the cause, and returns `formError(uk.errors.generic)`
  — a human Ukrainian banner, never a leaked driver message (AGENTS.md correctness
  rule).
- Server actions NEVER throw raw on user input.

## Risks / Trade-offs

- **R1 — Cascade declared in a later slice could drift / be forgotten.** If a
  child slice references `plants.id` WITHOUT `onDelete: "cascade"`, deleting a
  plant orphans or blocks on its children, breaking FR-PLANT-07. Mitigation: this
  design documents the required cascade direction; the plant delete smoke flow
  (tasks 1.4) is written now and re-run by each child slice to prove the cascade.
- **R2 — Future-date check off-by-one at the Kiev midnight boundary.** Comparing
  `Date` objects in UTC vs. local can reject/accept "today" wrongly near
  midnight. Mitigation: compare ISO `YYYY-MM-DD` strings using a "today in Kiev"
  helper, unit-tested with fixed clocks (D3).
- **R3 — Species default drifts between DB and form.** Two copies of the default
  string could disagree, so a no-species insert and a prefilled form differ.
  Mitigation: one `SPECIES_DEFAULT` constant is both the Drizzle column default
  and the form prefill (D2), pinned by a test.
- **R4 — React 19 form-action reset wipes typed input on a failed submit.**
  Mitigation: failure arm echoes `values`; uncontrolled inputs repopulate via
  `defaultValue` (inherited slice-1 D3 pattern), so one bad field never clears the
  others.
- **R5 — Locale-formatted display vs. ISO storage confusion.** Displaying
  `DD.MM.YYYY` while storing `YYYY-MM-DD` risks a round-trip bug (re-saving the
  displayed string). Mitigation: the form always binds the native picker to the
  ISO value; display formatting is a one-way pure helper, never fed back into
  storage (D3).

## Accepted limitations (MVP)

- **Plant list order is newest-first (`createdAt`, `id` desc), not user-sortable.**
  Search/filter/sort is FR-PLANT-10 (Future). Accepted: a single local Owner with
  ≤ 20 plants does not need sorting in MVP; the order is deterministic.
- **No optimistic UI.** Mutations round-trip to the server then revalidate.
  Accepted: well within NFR-PERF-01's 300 ms locally for the realistic dataset.
- **Rendered-result a11y / AA-contrast / 360 px-responsive / vision verification
  is DEFERRED to Phase 6** (the cross-cutting axe light+dark + vision-verify gate
  runs once over the whole app). The jsdom-level a11y for this slice's
  forms — accessible labels on every field + the `FieldError` association
  convention + keyboard-operable confirm — is covered by the slice's component
  tests. Honestly tracked deferral, not a dropped NFR (NFR-A11Y-* remain owned by
  the app-shell spec; SC-6 keyboard/labels are asserted at the jsdom level here).
