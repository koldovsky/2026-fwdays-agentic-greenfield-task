## Context

Third DB slice and the SECOND child of the plant aggregate. Stack is fixed by
ADR-0001: Next.js 16 (App Router) + TypeScript + Tailwind 4, **SQLite + Drizzle**,
Vitest, Playwright. UI copy is Ukrainian (NFR-LOC-01); code identifiers, spec
text, and trace ids stay English. The app is single-user and auth-less
(NFR-SEC-01, TC-04) — there are NO unauthorized / forbidden paths, so the shared
"unauthorized -> login, forbidden -> home" UI rules do not apply here (deliberate
exclusion, see the baseline spec).

A watering event belongs to exactly one plant. Slice 2 pinned the cascade
DIRECTION (deleting a plant removes its children); slice 3 (`add-growth`) FIRST
realized it on the child side with `growth_measurements.plantId -> plants.id
ON DELETE CASCADE`. This slice declares the SECOND such child FK,
`watering_events.plantId -> plants.id ON DELETE CASCADE`, while a watering delete
removes only its own row (SC-5). The slice-2 inline-error contract
(`lib/forms/result.ts` `ActionResult`, `FieldError`, `FormErrorBanner`), the date
conventions (SC-1, SC-2), and the shared date helpers (`lib/dates.ts`, promoted by
slice 3) are FROZEN and reused verbatim — this slice consumes them, it does not
reshape them. The `lib/growth/` module shape and `components/growth/` component
shape are the TEMPLATE this slice mirrors.

Unlike growth, watering carries no numeric metric and so has NO height-parse rule
and deliberately NO water amount (FR-WATER-06 is Future). The one new validation
concern is the OPTIONAL free-text note (FR-WATER-02).

## Goals / Non-Goals

**Goals:**
- Persist watering events in SQLite + Drizzle so they survive reload/restart
  (NFR-DATA-01, SC-4 for the watering entity).
- Log (date defaults to today in Europe/Kiev, optional note), view (list ordered
  date desc, deterministic same-date tie-break), edit (date + note),
  delete-with-confirm — FR-WATER-01..05.
- An OPTIONAL note rule (D2): trimmed; empty/whitespace-only -> stored as `NULL`;
  bounded to a sane maximum length; over-length rejected inline, never truncated.
- Date handling per SC-1 (native picker, store ISO `YYYY-MM-DD`, display
  `DD.MM.YYYY`) and SC-2 (reject a date after today in Europe/Kiev), REUSING the
  shared date helpers from `@/lib/dates` — no helper move, no copy (D3).
- List ordering per SC-3: date descending, tie-broken by row id descending.
- Delete safety per SC-5 / NFR-DATA-02: explicit confirm, single row, no cascade
  to the plant / other waterings / measurements.
- Every form-backing server action returns the shared `ActionResult`; never throws
  raw on user input; echoes `values` on failure for repopulation (FR-SHELL-03).
- Mutations reflected within 300 ms locally for a realistic dataset (NFR-PERF-01).

**Non-Goals:**
- No water amount — ml or any quantity (FR-WATER-06, Future); watering is date +
  optional note only.
- No watering reminders / notifications (FR-WATER-07, Future).
- No time-of-day on a watering (date-only); no imperial units anywhere.
- No watering CHART here — the chart is slice 5 (`add-charts`, FR-CHART-01). This
  slice delivers the underlying VALUES as a list (NFR-A11Y-03 is satisfied because
  the list, not only a chart, exposes the data).
- No auth/accounts/sessions (NFR-SEC-01, TC-04).
- No reshaping of the slice-2 `ActionResult` / `FieldError` / banner contract, the
  shared `lib/dates.ts` helpers, the plants table, or the growth capability.

## Decisions

### D1 — `watering_events` schema  (`db/schema/watering.ts`)
A single Drizzle `sqliteTable("watering_events", ...)`, re-exported from
`db/schema/index.ts` (per AGENTS.md):

| column      | type / Drizzle                                                              | notes |
|-------------|-----------------------------------------------------------------------------|-------|
| `id`        | `integer().primaryKey({ autoIncrement: true })`                             | stable row id; also the SC-3 tie-break key and the edit/delete target. |
| `plantId`   | `integer().notNull().references(() => plants.id, { onDelete: "cascade" })`  | FK to the parent plant; SECOND realization of the slice-2 cascade DIRECTION (D4, SC-5). |
| `wateredOn` | `text().notNull()`                                                          | ISO `YYYY-MM-DD` calendar date (no time-of-day, no timezone drift), SC-1. |
| `note`      | `text()` (nullable, NO `.notNull()`)                                        | OPTIONAL free-text note; `NULL` when omitted; trimmed + bounded (D2). |
| `createdAt` | `text().notNull().default(sql\`(CURRENT_TIMESTAMP)\`)`                       | row birth; informational (the SC-3 tie-break uses `id`, which is monotonic). |

Rationale for column types: SQLite has no native date type — storing `wateredOn`
as `YYYY-MM-DD` `text` keeps it a pure calendar date (SC-1 / NFR-USA-03).
`plantId` is `NOT NULL` because a watering cannot exist without a plant; the FK +
cascade enforce referential integrity at the DB level. `note` is the one nullable
column: it is OPTIONAL (FR-WATER-02), so its absence is modelled as SQL `NULL`
(not `""`) to keep "no note" distinct and queryable. `id` is an autoincrement
integer: monotonic, so "row id descending" is a stable proxy for "most recently
created" for the SC-3 same-date tie-break. There is intentionally NO amount column
(FR-WATER-06 is Future).

### D2 — Optional-note rule  (FR-WATER-02)  (the one validation decision)
The note is OPTIONAL bounded free text. A single normalization runs in
`lib/watering/validation.ts`, in order:

1. **Trim** leading/trailing whitespace.
2. **Empty -> NULL.** If, after trimming, the note is the empty string, it is
   stored as SQL `NULL` (not `""`). Decision: model "no note" as `NULL` so a
   present-but-empty submission and an omitted field are treated identically and
   neither creates a meaningless empty-string row. The note is NEVER required —
   logging or editing without a note succeeds.
3. **Max length `NOTE_MAX_LEN = 500` characters.** A trimmed note longer than 500
   characters is REJECTED with an inline field error — it is NOT truncated and NOT
   silently accepted. Decision + justification: 500 characters is a deliberate,
   testable bound that comfortably fits a realistic care note ("polyana fertilizer
   + rainwater, soil was dry") while preventing an unbounded paste from bloating a
   row in a small single-user SQLite file. The length is measured AFTER trimming,
   in characters (`String.length`, JS UTF-16 code units — adequate for the
   Ukrainian/Latin text the Owner types; no grapheme segmentation needed at this
   scale). Trade-off vs. an unbounded `TEXT` column: a bound risks rejecting a very
   long legitimate note, but 500 chars is generous for a watering memo and the
   alternative (unbounded) gives no protection against accidental bulk paste; we
   accept the bound and surface it inline so the Owner can shorten the note rather
   than lose it.

The note has NO format rules beyond length — any printable free text is allowed
(it is a memo, not a structured field). This is the slice's tested validation
unit: ACCEPT a typical note, an exactly-500-char note, an omitted note, and a
whitespace-only note (-> NULL); REJECT a 501-char note.

### D3 — Date rule reuses the shared `lib/dates.ts` helpers  (SC-1, SC-2)  (no move)
Slice 3 already PROMOTED `todayInKiev` / `isAfterToday` / `formatAcquiredDate` from
`lib/plants/date.ts` to a shared `lib/dates.ts`. This slice REUSES them verbatim —
there is NO helper move and NO copy (the wrong-direction dependency the slice-3
move avoided stays avoided). The watering date rule is identical in shape to the
measurement date rule:

- **Entry**: native `<input type="date">` (SC-1); the browser emits `YYYY-MM-DD`.
- **Storage**: the ISO `YYYY-MM-DD` string verbatim. The watering date is REQUIRED
  (a watering happened on some day); an omitted/empty date defaults to
  `todayInKiev()` (FR-WATER-01).
- **Display**: `formatAcquiredDate(iso)` formats to `DD.MM.YYYY` (the helper name
  is generic; it formats any ISO calendar date).
- **Validation**: the present-or-defaulted value must (a) match
  `^\d{4}-\d{2}-\d{2}$`, (b) be a real calendar date (reject `2026-13-40` /
  `2026-02-30` by re-parsing and comparing components, not just regex), and (c) NOT
  be after today in Europe/Kiev (SC-2). "Today" is the LOCAL calendar date in
  Europe/Kiev, compared as ISO strings so the comparison is timezone-stable (no
  midnight off-by-one). `today` is injectable for deterministic tests.

Trade-off: comparing ISO strings (not `Date` objects) for the future-date check
avoids the UTC-vs-local off-by-one footgun at midnight, at the cost of the small
"today in Kiev" helper — already written, shared, and unit-tested (D3 reused).

### D4 — FK cascade: SECOND child-side declaration of the slice-2 direction  (SC-5, NFR-DATA-02)
`watering_events.plantId` declares
`references(() => plants.id, { onDelete: "cascade" })`. This is the SECOND
child-side realization of the cascade DIRECTION slice 2 documented and owns
(growth was the first): deleting a plant removes its waterings automatically at the
DB level (atomic, cannot be bypassed by a forgotten code path). `db/client.ts`
already sets `PRAGMA foreign_keys = ON`, so the cascade and the FK constraint are
enforced.

A watering DELETE removes ONLY that single row — it does NOT cascade to the parent
plant, to other waterings, or to growth measurements (SC-5). Inserting a watering
for a non-existent `plantId` is rejected by the FK constraint; the action catches
the driver error and returns a friendly not-found `ActionResult`, never a raw 500.

Trade-off: DB-level cascade vs. application-level cascade in `service.ts`. We
follow the slice-2/slice-3 decision (DB-level) — atomic and unbypassable — at the
cost of the cascade behavior living partly in the migration; this is the safer
default for "no silent data loss" (NFR-DATA-02) and matches the contract slice 2
pinned. Because two children now cascade from the plant, the slice-2 contract is
exercised by both; the smoke flow proves a watering delete touches neither the
measurements nor the plant.

### D5 — `lib/watering/` module split  (AGENTS.md conventions; mirrors `lib/growth/`)
- `validation.ts` — owns the optional-note rule (D2), `NOTE_MAX_LEN`, the date
  rule (D3, via `lib/dates.ts`), the `formData -> WateringInput` mapper, and the
  issue -> field-keyed Ukrainian message mapping. On failure echoes the raw
  submitted strings under `values` so the uncontrolled form repopulates
  (FR-SHELL-03). Never throws.
- `queries.ts` — thin Drizzle reads/writes with the db handle INJECTED as the
  first param (exactly like `lib/growth/queries.ts`, so tests drive a fresh
  in-memory DB and the actions pass the singleton):
  `listWaterings(db, plantId)` (ordered date desc, then id desc — SC-3),
  `getWatering(db, id)`, `insertWatering(db, values)`,
  `updateWatering(db, id, values)`, `deleteWatering(db, id)`. No business rules
  here.
- `service.ts` — orchestration: a validated-input-in / row-or-null-out layer that
  owns the not-found signal (edit/delete of a row deleted in another tab) and the
  plant-exists check on logging. `db` defaulted to the singleton, injectable.
- `actions.ts` — `'use server'` actions
  (`createWateringAction`, `updateWateringAction`, `deleteWateringAction`):
  **guard -> validate -> service -> revalidate**, returning the shared
  `ActionResult`; defense-in-depth integer-id guard (reject float/0/negative/NaN
  ids as a friendly not-found, like growth/plants); catch + translate validation /
  FK / SQLite driver errors -> Ukrainian message; echo `values` on failure; never
  throw raw. On success `revalidatePath('/plants/<plantId>')` (only the detail
  path; the list shows no watering summaries in MVP).
- Colocated `*.test.ts` beside each.

### D6 — Waterings section on `/plants/[id]`  (UI; SC-3, SC-6, NFR-A11Y-03)
The waterings live in a SECTION on the existing plant detail page
(`app/plants/[id]/page.tsx`), ALONGSIDE the existing measurements section — they
are part of a plant's detail, not a separate route. The server component calls
`listWaterings(db, plantId)` and renders:
- a list ordered date descending, tie-broken by row id descending (SC-3), each row
  showing the watering date as `DD.MM.YYYY` and the note (if any);
- a clear empty state when the plant has no waterings (not an error / blank);
- an add form (client island, `useActionState`) with a native `<input type="date">`
  defaulting to today and an OPTIONAL note field; per-row edit (same form,
  prefilled) and a delete-with-confirm control (explicit confirmation step before
  the action fires — never one-click silent delete).

New components mirror `components/growth/`: `WateringForm`, `WateringRow`,
`WateringsSection`, `DeleteWateringButton`. All forms render `FormErrorBanner`
(top) + per-field `FieldError`, repopulate uncontrolled inputs from
`result.values` on failure (slice-2 D3/D4 pattern), give every field an accessible
label, and keep the delete confirm keyboard-operable (SC-6, NFR-A11Y-04 at the
jsdom level). The list — not only a future chart — exposes the underlying values
(NFR-A11Y-03). Reachable in <= 2 clicks from the plant detail (NFR-USA-01).

### D7 — Migration workflow
The schema change is generated with `npm run db:generate` (drizzle-kit) into
`db/migrations/` (SQL + meta snapshot), committed. `db/client.ts` auto-applies
committed migrations on startup (idempotent), so the runtime DB gains the
`watering_events` table and FK automatically; `npm run db:migrate` applies it for
the manual smoke test. Migrations are committed artifacts (AGENTS.md).

## Data model

```
watering_events
  id          integer  PK autoincrement                 -- SC-3 tie-break key; edit/delete target
  plantId     integer  NOT NULL  FK -> plants.id ON DELETE CASCADE   -- one plant per watering (D4)
  wateredOn   text     NOT NULL                          -- ISO 'YYYY-MM-DD', <= today (Kiev), date-only (D3)
  note        text     NULL                              -- optional, trimmed, <= 500 chars; empty -> NULL (D2)
  createdAt   text     NOT NULL DEFAULT (CURRENT_TIMESTAMP)

-- List order (SC-3):  ORDER BY wateredOn DESC, id DESC
-- Cascade (SC-5):     deleting a plant removes its waterings; deleting a watering
--                     removes only that one row (no cascade up/out; measurements untouched).
```

## Error handling strategy

- **Validation failures** (malformed/impossible/future date per D3; over-length
  note per D2): `validation.ts` -> field-keyed Ukrainian messages ->
  `fieldError(messages, echoedValues)` -> rendered inline by `FieldError`; the form
  repopulates from `result.values` (NFR-USA-02, FR-SHELL-03). No row is
  created/changed; edit is all-or-nothing (NFR-DATA-02).
- **Non-existent plant on logging** (or a FK violation): the action catches and
  returns a friendly not-found / form error `ActionResult`, never a raw 500; no
  watering is created.
- **Row-gone** (edit/delete of a watering removed in another tab): the service
  returns null / 0 changes -> the action returns a not-found `ActionResult` ->
  friendly state, never a resurrected row (NFR-DATA-02).
- **SQLite / driver errors** (unexpected constraint, busy, I/O): `actions.ts`
  catches, logs the cause, and returns `formError(uk.errors.generic)` — a human
  Ukrainian banner, never a leaked driver message (AGENTS.md correctness rule).
- Server actions NEVER throw raw on user input.

## Risks / Trade-offs

- **R1 — Empty note stored as "" instead of NULL.** A present-but-empty note field
  could persist an empty string, making "no note" indistinguishable from "" and
  cluttering future queries. Mitigation: D2 trims then maps empty -> `NULL`; a
  unit test asserts both an omitted note and a whitespace-only note persist as
  `NULL`, not `""`.
- **R2 — Unbounded note bloats the row.** A pasted wall of text could balloon a row
  in the single-user SQLite file. Mitigation: D2 bounds the trimmed note at 500
  characters and REJECTS over-length inline (never truncates); the 500/501 boundary
  is unit-tested.
- **R3 — Future-date check off-by-one at the Kiev midnight boundary.** Comparing
  `Date` objects in UTC vs. local can reject/accept "today" wrongly near midnight.
  Mitigation: compare ISO `YYYY-MM-DD` strings via the shared `todayInKiev` helper,
  unit-tested with fixed clocks (D3) — the approach slices 2 and 3 proved.
- **R4 — Same-date waterings rendered in a nondeterministic order.** Two waterings
  on one date could flip order between reads, confusing the Owner and flaking
  tests. Mitigation: SC-3 tie-break `ORDER BY wateredOn DESC, id DESC` makes the
  order total and reproducible (D5); asserted by a query test.
- **R5 — A watering delete accidentally cascades, or a plant delete fails to.**
  A wrong FK could delete the plant when a watering is deleted, or orphan waterings
  when a plant is deleted. Mitigation: the FK is declared ON the child with
  `onDelete: "cascade"` (D4); the smoke flow proves both directions — deleting a
  watering leaves the plant + its measurements + sibling waterings intact, and
  deleting a plant removes its waterings (and its measurements) while another
  plant's data survives.
- **R6 — React 19 form-action reset wipes typed input on a failed submit.**
  Mitigation: the failure arm echoes `values`; uncontrolled inputs (date + note)
  repopulate via `defaultValue` (inherited slice-2/3 pattern), so one bad field
  never clears the others.
- **R7 — Two sibling sections on one page collide.** The new waterings section and
  the existing measurements section share `/plants/[id]`; mismatched form names or
  ids could cross-wire submissions or break accessible-label association.
  Mitigation: namespaced field ids / form scope per section and a component test
  that renders the waterings section in isolation; the smoke flow confirms each
  section mutates only its own entity.

## Known advisories

- **PostCSS `<8.5.10` — GHSA-qx2v-qp2m-jg93 (moderate, accepted/transitive).**
  Same disposition as slices 1-3 (app-shell, plants, growth). `npm audit` flags
  PostCSS 8.4.31 with an XSS-via-unescaped-`</style>`-in-CSS-stringify advisory.
  It is **transitive**: pulled in only through the nested
  `node_modules/next/node_modules/postcss` of the pinned `next@16.2.9`; our own
  top-level PostCSS (`@tailwindcss/postcss`) already resolves to a patched 8.5.x.
  It is **not introduced by this slice** — add-watering adds no dependencies and
  touches no CSS/PostCSS path — and is **not reachable here**: no user-controlled
  CSS is stringified (only first-party Tailwind at build time). No non-breaking
  fix exists (`npm audit fix` resolves nothing; the only `--force` path is a major
  Next downgrade we do NOT apply). **Action:** accepted as a transitive advisory;
  revisit and bump when a Next.js patch release depends on PostCSS `>=8.5.10`.

## Accepted limitations (MVP)

- **No water amount.** A quantity (ml) is FR-WATER-06 (Future). Accepted: the
  customer asked to track WHEN a plant was watered; a date + optional note is the
  smallest meaningful slice and Q10 fixed amount as Future.
- **No reminders/notifications.** FR-WATER-07 (Future); out of MVP scope (TC-06).
- **No watering chart here.** The chart is slice 5 (FR-CHART-01). This slice
  delivers the underlying values as a list, which already satisfies NFR-A11Y-03;
  the chart consumes the `wateredOn` dates next slice.
- **Note bound at 500 characters; free text only.** No rich text, no format rules
  beyond length. Accepted: a watering note is a short memo.
- **No optimistic UI.** Mutations round-trip then revalidate. Accepted: well within
  NFR-PERF-01's 300 ms locally for the realistic dataset. The perf budget itself is
  not asserted per-slice; it is verified in Phase 6 (the cross-cutting performance
  gate), consistent with the other capabilities.
- **Rendered-result a11y / AA-contrast / 360 px-responsive / vision verification is
  DEFERRED to Phase 6** (the cross-cutting axe light+dark + vision-verify gate runs
  once over the whole app). The jsdom-level a11y for this slice's watering forms —
  accessible labels on the date + note fields + the `FieldError` association
  convention + the keyboard-operable delete confirm — is covered by the slice's
  component tests. Honestly tracked deferral, not a dropped NFR (SC-6 is asserted
  at the jsdom level here; NFR-A11Y-* rendered gates remain owned by Phase 6).
