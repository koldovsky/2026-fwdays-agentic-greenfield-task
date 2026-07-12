# Proposal: add-client-directory

## Why

`client-directory` is the parallel S2 UI capability (lane D in `docs/capability.md`)
and contributes to the `form-input` gate. S0 `shell` is shipped — the clients
route and placeholder exist (`src/app/(dashboard)/clients/page.tsx`) — and a
minimal `Client` type lives in `src/types/client.ts`, but there is no browser
storage layer or CRUD UI. The migrated `openspec/specs/client-directory/spec.md`
states CRUD and prefill-only semantics but lacks field-level requirements aligned
with `docs/invoice-template.html` customer placeholders
(`CUSTOMER_NAME`, address, email, phone, website). TC-DATA-01 (browser storage)
applies to directories but is not yet exercised in code.

## What Changes

- Extend `Client` type with invoice-relevant fields matching the frozen template
  customer block (name, address line, email, phone, website; company optional).
- Browser-side CRUD module (`src/lib/storage/clients.ts`) persisting clients in
  localStorage (versioned key, separate namespace from supplier profiles).
- Clients page UI: searchable list, create/edit/delete dialog or sheet, empty
  state.
- Storage API designed for future form prefill (`form-input`) — no invoice-form
  picker or prefill wiring in this change.
- Delta spec adds field requirements, TC-DATA-01 persistence scenario, and
  clarifies that issued invoice snapshots are owned by `invoice-registry`, not
  the directory.
- Vitest coverage for storage CRUD and list ordering.

## Capabilities

### New Capabilities

(none — capability spec already exists)

### Modified Capabilities

- `client-directory`: add client field requirements aligned with invoice template;
  add browser-persistence scenario (TC-DATA-01); sharpen prefill-only vs snapshot
  immutability scenarios.

## Impact

- **New files:**
  - `src/lib/storage/clients.ts` (+ tests)
  - `src/components/clients/client-form.tsx`
  - `src/components/clients/client-list.tsx` (or inline in page if small)
- **Modified files:**
  - `src/types/client.ts` — extend fields
  - `src/app/(dashboard)/clients/page.tsx` — full CRUD UI
- **Explicitly out of bounds:** invoice form client picker (`form-input`),
  `invoice-registry` snapshot logic, supplier-profile files, banking, PDF.
- **Dependencies:** none added; WEG3D Fin + shadcn primitives only.
- **Traceability:** `client-directory` marked `shipped` in `capability-map.yaml`
  after sync (contributes to, but does not alone unlock, `form-input`).
- **Parallel safety:** no overlap with `add-supplier-profile`.

## Non-goals

- No client dropdown on the new-invoice form — deferred to S4 `form-input`.
- No issued-invoice snapshot implementation — `invoice-registry` owns that;
  this change only documents the directory's prefill-only contract.
- No auth, import/export, or server persistence.
- No duplicate supplier-profile work.

## Success criteria

- User can create, edit, and delete clients on `/clients`; reload preserves data
  (TC-DATA-01).
- Client records carry fields sufficient to populate template customer placeholders
  when `form-input` wires the picker.
- Editing a client after a hypothetical issue does not mutate stored invoice
  snapshots (contract documented; full proof when `invoice-registry` ships).
- `npm run typecheck && npm run lint && npm run build` green; Vitest tests for
  storage CRUD.
- `openspec validate add-client-directory --strict` passes.
- After `/opsx:sync`: `docs/capabilities/client-directory.md` checklist complete,
  `capability-map.yaml` updated.
