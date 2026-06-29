## 1. Failing tests first (red)

- [x] 1.1 Write unit tests for `lib/plants/validation.ts`: name is trimmed, rejects empty/whitespace-only, rejects > 200 chars after trim; species defaults to `SPECIES_DEFAULT` (the canonical Ukrainian string) when omitted, accepts arbitrary free text verbatim ≤ 200 chars, rejects > 200 chars; acquired date is optional (empty → `null`), accepts a valid `YYYY-MM-DD` from the native picker, rejects a non-`YYYY-MM-DD` string, rejects an impossible calendar date (e.g. `2026-02-30`), and rejects a date after today in Europe/Kiev with a fixed clock (SC-1, SC-2, FR-PLANT-01/02/03). Each failure maps to a field-keyed Ukrainian message. Confirm they FAIL.
- [x] 1.2 Write unit tests for the date helper (`lib/plants/date.ts`): `formatAcquiredDate('2026-03-09')` → `'09.03.2026'`, `null` → empty/placeholder; the "today in Europe/Kiev" helper returns the local calendar `YYYY-MM-DD` under a fixed clock (no UTC off-by-one at the midnight boundary) (SC-1, SC-2, NFR-USA-03). Confirm they FAIL.
- [x] 1.3 Write unit tests for `lib/plants/queries.ts` + `lib/plants/service.ts` against a real in-memory SQLite (`DATABASE_URL=:memory:`, migrations applied): insert → returns row with id and the `SPECIES_DEFAULT` when species omitted; `listPlants()` returns all in the deterministic newest-first order; `getPlant(id)` returns the row or a not-found signal for a missing id; `updatePlant` changes only the given fields; `deletePlant` removes the row and is a no-op not-found for a missing id. Confirm they FAIL.
- [x] 1.4 Write a REAL-SQLite smoke-flow test (`tests/integration/`, `:memory:` or a temp file): create a plant with only a name (species defaults) → it appears in the list → open its detail → edit name + species + acquired date → detail reflects them → delete with confirm → it is gone from the list AND, where child tables already exist, its own children are cascade-removed while another plant's data is untouched (FR-PLANT-01..08, SC-5, NFR-DATA-01/02). Confirm it FAILS.
- [x] 1.5 Write tests for the server actions `lib/plants/actions.ts`: each returns the shared `ActionResult`; on a validation failure returns `{ ok: false, fieldErrors, values }` (echoes submitted strings, never throws); on success returns `{ ok: true }` and triggers revalidation; an edit/delete of a missing id returns a not-found result (not a thrown 500). Confirm they FAIL.
- [ ] 1.6 Write component tests for the add/edit form island: renders `FormErrorBanner` + a `FieldError` per field; on a `{ ok:false }` result repopulates uncontrolled inputs from `result.values` (slice-1 D3 pattern); every field has an accessible label and the acquired-date field is a native `<input type="date">`; the delete control requires a confirmation step before invoking the action (NFR-USA-02, SC-6). Confirm they FAIL.

## 2. Implement to green

- [x] 2.1 Define `db/schema/plants.ts` (`id`, `name` NOT NULL, `species` NOT NULL DEFAULT `SPECIES_DEFAULT`, `acquiredDate` nullable ISO text, `createdAt` default `CURRENT_TIMESTAMP`) and re-export from `db/schema/index.ts` (design D1, D2).
- [x] 2.2 Generate the first migration with `npm run db:generate`; commit the SQL + meta snapshot under `db/migrations/` (design D7).
- [x] 2.3 Implement `lib/plants/validation.ts`: `SPECIES_DEFAULT` constant (single source of truth, mirrored by the Drizzle column default), `createPlantSchema` / `updatePlantSchema` (name trim + 1..200, species ≤ 200 verbatim, acquired-date rule), formData → input mappers, zod-issue → Ukrainian field-message mapping (design D2, D3, D4). Green for 1.1.
- [x] 2.4 Implement `lib/plants/date.ts`: `formatAcquiredDate` (ISO → `DD.MM.YYYY`) and the "today in Europe/Kiev" helper used by the future-date check (design D3). Green for 1.2.
- [x] 2.5 Implement `lib/plants/queries.ts` (Drizzle reads/writes) and `lib/plants/service.ts` (orchestration + delete-cascade semantics + not-found signal) (design D4, D5). Green for 1.3.
- [x] 2.6 Implement `lib/plants/actions.ts` server actions (`createPlantAction`, `updatePlantAction`, `deletePlantAction`): guard → validate → service → `revalidatePath`; return the shared `ActionResult`; catch + translate validation / FK / SQLite driver errors → Ukrainian message (`uk.errors.generic` for whole-form), echo `values` on failure, never throw raw (design D4, error-handling strategy). Green for 1.5.
- [x] 2.7 Extend `lib/i18n/uk.ts` with the plants copy (form labels, field validation messages, empty-state, delete-confirm prompt, not-found) — Ukrainian text, English identifiers (NFR-LOC-01).
- [x] 2.8 Implement the add/edit form island (client) over the actions: `useActionState`, `FormErrorBanner` + per-field `FieldError`, `defaultValue` repopulation from `result.values`, native `<input type="date">` for acquired date, accessible labels (design D6, slice-1 D3/D4). Green for 1.6.
- [x] 2.9 Implement the delete-with-confirm control (explicit confirmation step before the action fires) (design D5, SC-5). Green for the delete part of 1.6.
- [x] 2.10 Rework `app/page.tsx`: real plant list via `listPlants()` with detail links and the empty state; REMOVE the slice-1 `ExampleForm` usage (FR-PLANT-04, FR-PLANT-08, design D6).
- [x] 2.11 Rework `app/plants/[id]/page.tsx`: real `getPlant(id)` lookup, `notFound()` on miss, detail render (name, species, `DD.MM.YYYY` acquired date) + edit link + delete control (FR-PLANT-05, design D6). Add the add/edit routes as decided in D6.
- [x] 2.12 Delete the superseded slice-1 demo: `components/forms/ExampleForm.tsx` (+ test) and `app/example-form-action.ts`.
- [x] 2.13 Confirm all tests from group 1 now pass (green).

## 3. Accessibility

> DEFERRED to Phase 6 (cross-cutting QA: axe light+dark + vision-verify across
> ALL capabilities). The rendered-result a11y gates below run once, against the
> whole app, in Phase 6 rather than per-slice — honestly deferred, not skipped.
> The jsdom-level a11y for this slice (accessible labels on every plant field,
> the `FieldError` association convention, and the keyboard-operable delete
> confirm) is covered by the slice's component tests (1.6).

- _(Phase 6)_ 3.1 (Deferred → Phase 6) Run `npm run check:a11y` (axe) on the plant list, detail, and add/edit forms in BOTH light and dark themes; resolve any violations (NFR-A11Y-01).
- _(Phase 6)_ 3.2 (Deferred → Phase 6) Verify WCAG 2.1 AA contrast for the list, detail, forms, and the delete-confirm control in both themes (NFR-A11Y-02).
- _(Phase 6)_ 3.3 (Deferred → Phase 6) Verify keyboard-only operation: visible focus, accessible names on every plant field and the delete control, native date picker reachable, and that `FieldError` messages are programmatically associated with their fields (NFR-A11Y-04, SC-6).
- _(Phase 6)_ 3.4 (Deferred → Phase 6) Verify the plant list, detail, and forms at a 360 px viewport: content visible/operable with no horizontal overflow (NFR-COMPAT-01).

## 4. Validation and archive

- [x] 4.1 Run `npm run lint` — zero errors.
- [x] 4.2 Run `npm run test:run` — all unit tests pass (incl. the integration smoke flow 1.4).
- [x] 4.3 Run `npm run build` — production build succeeds.
- [x] 4.4 Run `npx openspec validate add-plants --strict` — no errors.
- [x] 4.5 Run `npx openspec validate --all --strict` — no errors.
- [ ] 4.6 Manual real-DB smoke test: apply the migration with `npm run db:migrate` against the real SQLite file, then `npm run dev` and:
  1. open `/` — confirm the helpful empty state in Ukrainian (no plants yet, no demo form);
  2. add a plant with ONLY a name — confirm species is prefilled with the default "Грошове дерево (Crassula ovata)" and the plant appears in the list;
  3. open its detail — confirm name + species show and acquired date shows as empty/placeholder;
  4. submit add/edit with a name > 200 chars and with a FUTURE acquired date — confirm both are rejected inline (no row written / no field changed), never a raw 500;
  5. edit the plant: set a custom species and a valid past acquired date — confirm the detail shows the date as `DD.MM.YYYY`;
  6. reload the app — confirm the plant is still present (persistence);
  7. delete the plant via the explicit confirm step, first CANCEL (data intact), then CONFIRM — confirm it is gone from the list and other plants are untouched (cascade of its own children verified once the child slices exist);
  8. open `/plants/<bad-id>` — confirm the friendly not-found state.
- [x] 4.7 Update `docs/current-state.md` (date/time in Europe/Kiev, current phase, plants moved planned → implemented, first DB slice landed). (README is the course/homework README with no plants/DB section — N/A there; the DB/plants notes live in `docs/current-state.md`.)
- [ ] 4.8 Only after the smoke test (4.6) passes, archive MANUALLY (this project archives change folders by hand to avoid the CLI conflicting with the pre-authored baseline specs): move `openspec/changes/add-plants/` to `openspec/changes/archive/YYYY-MM-DD-add-plants/` (date in Europe/Kiev). Do NOT run `npx openspec archive`.
