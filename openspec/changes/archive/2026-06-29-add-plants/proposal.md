## Why

Slice 1 (`add-app-shell`) delivered the navigational frame, the persisted theme,
and the shared inline-error contract (`lib/forms/result.ts`,
`components/forms/FieldError.tsx`, `FormErrorBanner.tsx`, `lib/i18n/uk.ts`), but
left the home route as a placeholder list plus a throwaway demo form. Nothing is
yet persisted.

This is the FIRST database slice. It stands up SQLite + Drizzle (ADR-0001) and
makes the plant the aggregate root of the tracker: the Owner can add, list, view,
edit, and delete plants, with a helpful empty state. It delivers FR-PLANT-01..08
and binds the travelling NFRs NFR-USA-02 (clear validation + confirmed deletes),
NFR-DATA-01 (persistence across reload/restart), NFR-DATA-02 (no silent data
loss; cascade only a plant's own children), and NFR-PERF-01 (mutations reflected
within 300 ms locally). It also establishes the date conventions SC-1 (native
`<input type="date">`, store ISO `YYYY-MM-DD`, display `DD.MM.YYYY`) and SC-2
(reject future acquired dates), and the delete-safety convention SC-5 (confirmed,
cascade only plant → its own children).

The plant table is the FK target that later slices (growth, watering) reference
with `ON DELETE CASCADE`; this slice owns the parent and the cascade direction,
so it must land before those children exist.

## What Changes

- **New persistence layer**: a SQLite + Drizzle `plants` table
  (`db/schema/plants.ts`, re-exported from `db/schema/index.ts`) plus the first
  committed migration (`npm run db:generate`). FK-cascade targets for child rows
  are introduced by later slices; this slice only documents the cascade
  direction and ensures `PRAGMA foreign_keys = ON` (already set in `db/client.ts`).
- **New `lib/plants/` module** split per AGENTS.md conventions:
  `validation.ts` (zod + formData mappers), `queries.ts` (Drizzle reads/writes),
  `service.ts` (orchestration + error translation), `actions.ts`
  (guard → validate → service → revalidate, returning the shared `ActionResult`).
- **Real plant list on `/`**: replaces the slice-1 placeholder list AND removes
  the `ExampleForm` / `example-form-action` demo (the slice-1 design flagged this
  as the slice-2 hand-off). Renders all plants or a helpful empty state
  (FR-PLANT-04, FR-PLANT-08).
- **Real plant detail on `/plants/[id]`**: replaces the placeholder; a real DB
  lookup, `notFound()` on a miss (the slice-1 boundary already exists).
- **Add / edit forms + delete-with-confirm**, all reusing the slice-1 inline-error
  contract: `FieldError`, `FormErrorBanner`, `ActionResult` (failure arm echoes
  `values` for repopulation). Ukrainian copy extended in `lib/i18n/uk.ts`.

## Capabilities

### New Capabilities
- `plants`: manage plants as the aggregate root — add (required name; species
  default editable; optional acquired date), list (with empty state), detail,
  edit, and delete with confirmation + cascade of the plant's own children. Home
  for the plant data model and the date/delete conventions SC-1/SC-2/SC-5.

### Modified Capabilities
<!-- None. The app-shell capability is reused (its frozen contract is consumed,
not changed). This change adds the plants capability and replaces the slice-1
placeholder home/detail content, which was explicitly an in-slice placeholder,
not an app-shell requirement. -->

## Impact

- New code: `db/schema/plants.ts` + `db/migrations/*` (first migration),
  `lib/plants/{validation,queries,service,actions}.ts` (+ colocated `*.test.ts`),
  add/edit/delete UI (`components/plants/`), reworked `app/page.tsx` and
  `app/plants/[id]/page.tsx`, new add/edit routes, extended `lib/i18n/uk.ts`.
- Removed: `components/forms/ExampleForm.tsx` (+ test) and
  `app/example-form-action.ts` — the slice-1 demo, now superseded by real forms.
- Reused unchanged (slice-1 frozen contract): `lib/forms/result.ts`,
  `components/forms/FieldError.tsx`, `components/forms/FormErrorBanner.tsx`,
  `db/client.ts`, `drizzle.config.ts`.
- Trace ids touched: FR-PLANT-01..08; NFR-USA-02, NFR-DATA-01, NFR-DATA-02,
  NFR-PERF-01; SC-1, SC-2, SC-5. (NFR-LOC-01 carries from slice 1 via the UI copy.)
- No auth, no third-party integrations (NFR-SEC-01, TC-04). Image upload
  (FR-PLANT-09) and search/filter (FR-PLANT-10) stay Future, intentionally excluded.
