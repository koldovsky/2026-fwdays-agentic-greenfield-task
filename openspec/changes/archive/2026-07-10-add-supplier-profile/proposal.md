# Proposal: add-supplier-profile

## Why

`supplier-profile` is the first S2 UI capability (lane C in `docs/capability.md`) and
gates `banking`, which in turn blocks `document-render` and the demo path to
form → preview. S0 `shell` is shipped — settings route and placeholder copy exist
(`src/app/(dashboard)/settings/page.tsx`) — but there is no typed model, browser
storage, or CRUD UI for ФОП profiles. FR-BANK-02 (bilingual name/address, tax ID,
bank, SWIFT, USD+EUR IBANs) and NFR-SEC-01 (no real tax ID/IBAN in the client
bundle) are accepted in `docs/requirements.md` but the migrated
`openspec/specs/supplier-profile/spec.md` only states CRUD/switch/empty-install
scenarios without field-level requirements.

## What Changes

- New `SupplierProfile` domain type with FR-BANK-02 fields: bilingual name and
  address (EN + UA), tax ID, bank name, SWIFT, separate IBANs for USD and EUR.
- Browser-side CRUD module (`src/lib/storage/supplier-profiles.ts`) persisting
  profiles in localStorage (versioned key, JSON schema); no server DB.
- Settings UI on `src/app/(dashboard)/settings/page.tsx`: list profiles, create/
  edit/delete form, active-profile selector (dropdown).
- Reusable `SupplierProfileDropdown` component for future invoice-form integration
  (wired in settings now; invoice form wiring deferred to `form-input`).
- Multiple profiles without authentication — local directory only, not
  multi-tenancy.
- Delta spec expands `supplier-profile` with FR-BANK-02 field requirements,
  NFR-SEC-01 bundle check scenario, persistence and active-profile scenarios.
- Optional clearly-fake demo seed helper (dev-only or gated) — never real IBAN/tax
  IDs in compiled assets.

## Capabilities

### New Capabilities

(none — capability spec already exists)

### Modified Capabilities

- `supplier-profile`: add FR-BANK-02 field-level requirement and scenarios;
  sharpen storage, active-profile selection, and NFR-SEC-01 verifiability;
  clarify multiple-profile semantics.

## Impact

- **New files:**
  - `src/types/supplier.ts`
  - `src/lib/storage/supplier-profiles.ts` (+ tests)
  - `src/components/supplier/supplier-profile-form.tsx`
  - `src/components/supplier/supplier-profile-dropdown.tsx`
- **Modified files:**
  - `src/app/(dashboard)/settings/page.tsx` — full CRUD UI
- **Explicitly out of bounds:** `src/lib/banking/` (S2 `banking` change),
  invoice form wiring (`form-input`), document-render, PDF route, server APIs
  beyond existing `/api/health`.
- **Dependencies:** none added; WEG3D Fin + shadcn primitives only.
- **Traceability:** FR-BANK-02 `proposed → shipped` after sync;
  `openspec/capability-map.yaml` `supplier-profile: shipped` unblocks `banking`.
- **Parallel safety:** no overlap with `add-client-directory` (clients route vs
  settings route).

## Non-goals

- No currency→IBAN selection logic — that is `banking` (FR-BANK-01/03).
- No invoice form supplier picker wiring — deferred to S4 `form-input`; this
  change ships the dropdown component and storage API only.
- No auth, accounts, or multi-tenancy.
- No hardcoded real ФОП data in repo or client bundle (NFR-SEC-01).
- No IndexedDB migration path unless localStorage quota proves insufficient in
  apply (localStorage is the default per ADR-0002).

## Success criteria

- User can create, edit, delete, and switch active supplier profiles in Settings;
  reload preserves data (TC-DATA-01 browser storage).
- Saved profile exposes all FR-BANK-02 fields for downstream `banking` consumption.
- `grep` / build audit: no real tax IDs or IBANs in compiled client chunks.
- `npm run typecheck && npm run lint && npm run build` green; Vitest tests for
  storage CRUD and active-profile selection.
- `openspec validate add-supplier-profile --strict` passes.
- After `/opsx:sync`: `docs/requirements.md` FR-BANK-02 shipped,
  `docs/capabilities/supplier-profile.md` checklist complete,
  `capability-map.yaml` updated.
