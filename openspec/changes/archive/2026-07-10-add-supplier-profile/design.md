# Design: add-supplier-profile

## Context

S0 `shell` shipped: dashboard layout, settings route at
`src/app/(dashboard)/settings/page.tsx` with Ukrainian placeholder copy only.
No `src/types/supplier.ts`, no `src/lib/storage/` module yet, and no supplier
UI components. S1 domain libs (`invoice-calc`, `nace-catalog`) established the
pattern of framework-free modules under `src/lib/` with Vitest tests beside
sources.

FR-BANK-02 fields map directly to `docs/invoice-template.html` SUPPLIER
placeholders: `SUPPLIER_NAME_EN/UA`, `SUPPLIER_ADDRESS_EN/UA`, `SUPPLIER_TAX_ID`,
`SUPPLIER_IBAN` (selected by currency in `banking`), `SUPPLIER_BANK`,
`SUPPLIER_SWIFT`. NFR-SEC-01 forbids real tax IDs/IBANs in the client bundle.

Constraint: parallel lane C — must not touch `src/app/(dashboard)/clients/` or
`src/types/client.ts`.

## Goals / Non-Goals

**Goals:**

- Typed `SupplierProfile` model and localStorage CRUD with active-profile pointer.
- Settings page CRUD UI (WEG3D Fin: `wf-display`, `wf-label`, `h-9` controls).
- Reusable dropdown component reading from storage (used on settings; invoice form
  wiring deferred).
- Vitest tests for storage layer; manual + grep verification for NFR-SEC-01.

**Non-Goals:**

- Currency→IBAN selection (`banking`).
- Invoice form integration (`form-input`).
- IndexedDB (unless localStorage quota fails during apply — unlikely for profiles).
- Server persistence, auth, demo seed committed to repo.

## Decisions

### D1 — Storage envelope: versioned localStorage JSON

Persist under key `invoice-maker:supplier-profiles:v1` as:

```ts
type SupplierProfilesStore = {
  version: 1;
  activeProfileId: string | null;
  profiles: SupplierProfile[];
};
```

Pure functions in `src/lib/storage/supplier-profiles.ts` (`list`, `get`, `save`,
`remove`, `setActive`, `getActive`). Guard all `localStorage` access with
`typeof window !== "undefined"` and try/catch (private browsing throws).

*Why:* matches ADR-0002 browser-first pattern; simplest for a handful of profiles.
*Alternative rejected:* IndexedDB — heavier API for small records; defer until
invoice registry needs it.

### D2 — Profile identity: opaque UUID + display label

Each profile gets `id: crypto.randomUUID()`, `label` (short name for dropdown,
defaults to `nameEn`), plus FR-BANK-02 fields and `createdAt`/`updatedAt` ISO
strings.

*Why:* supports multiple profiles and stable active pointer across edits.
*Alternative rejected:* slug from name — collisions on rename.

### D3 — SupplierProfile type shape

```ts
interface SupplierProfile {
  id: string;
  label: string;
  nameEn: string;
  nameUa: string;
  addressEn: string;
  addressUa: string;
  taxId: string;
  bankName: string;
  swift: string;
  ibanUsd: string;
  ibanEur: string;
  createdAt: string;
  updatedAt: string;
}
```

Required on save: all fields non-empty (trimmed). IBAN format validation is
lightweight (length/prefix check) — full MOD-97 belongs in `banking` if needed.

*Why:* mirrors template placeholders and FR-BANK-02; both IBANs required so
`banking` never sees a half-configured profile.

### D4 — UI composition on settings page

Client component wrapper `SupplierSettingsPanel` mounted from the server page:

- **Left/top:** `SupplierProfileDropdown` + "Додати профіль" button.
- **Main:** `SupplierProfileForm` in a `Card` for create/edit.
- **Delete:** shadcn `AlertDialog` confirmation.

Strings Ukrainian per BC-LANG-01 app UI policy. Invoke `weg3d-fin-design` skill
at apply time (🎨 banner).

*Why:* matches existing dashboard page patterns (`wf-display` headers on clients/
settings stubs).

### D5 — React state: load-on-mount + storage events

Settings panel reads storage on mount, writes through storage module, then
re-reads. Optional `window` `storage` event listener for cross-tab sync (same
origin). No global context provider yet — `form-input` can add one later.

*Why:* minimal scope; avoids premature app-wide state.
*Alternative rejected:* React Context at root — premature before form-input.

### D6 — NFR-SEC-01 enforcement

- No default profiles in source or env vars.
- Tests grep `.next/static` chunks for UA IBAN pattern `UA\d{27}` and common
  demo tax IDs only if such strings appear in source (should not).
- If dev seed helper exists, use obviously fake values (`UA000…`, `0000000000`)
  behind `process.env.NODE_ENV === "development"` only — never shipped in
  production bundle as defaults.

### D7 — Module layout, no barrel

`src/types/supplier.ts`, `src/lib/storage/supplier-profiles.ts`,
`supplier-profiles.test.ts`, components under `src/components/supplier/`. No
`index.ts` barrel — direct imports per project convention.

## Risks / Trade-offs

- [localStorage quota / private mode] → try/catch with user-visible Ukrainian
  error toast or inline alert; tests mock `localStorage`.
- [Deleting active profile] → if active deleted, set `activeProfileId` to first
  remaining or `null`; form shows empty state.
- [Parallel apply with client-directory] → separate storage keys; no shared module
  yet (future `src/lib/storage/browser-store.ts` optional refactor).
- [FR-BANK-02 also listed under banking spec] → supplier-profile owns field
  storage; banking owns currency selection — no duplicate logic in this change.

## Migration Plan

Greenfield — no existing user data. Deploy with normal build; rollback = revert
commit. After ship: `/opsx:sync`, mark capability shipped, propose `add-banking`.

## Open Questions

- None blocking. Full IBAN checksum validation deferred to `banking` or form-input
  if product wants stricter UX (BC-UX-01).
