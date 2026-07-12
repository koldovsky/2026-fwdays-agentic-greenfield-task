# Proposal: add-banking

## Why

Invoices for foreign clients must show the correct bank account for the invoice
currency: a USD invoice pays into the supplier's USD IBAN, a EUR invoice into
the EUR IBAN (FR-BANK-01). Supplier profiles (shipped in S2, PR #5) already
store both IBANs plus bank name and SWIFT (FR-BANK-02), but nothing maps an
invoice's currency to the right account or assembles the SUPPLIER block for the
document. `banking` is the last S2 capability and the sole blocker of
`document-render` (S3), which is on the critical path to the M4 demo.

## What Changes

- New pure domain module `src/lib/banking/` (framework-free, no UI):
  - `selectIban(profile, currency)` — returns the IBAN matching `USD | EUR`
    from a supplier profile; typed error when the IBAN for that currency is
    missing or blank (defensive path, BC-UX-01 wording).
  - `buildSupplierBlock(profile, currency)` — assembles the supplier block
    variables consumed by `document-render`, keyed to the
    `docs/invoice-template.html` placeholders: `SUPPLIER_NAME_EN`,
    `SUPPLIER_NAME_UA`, `SUPPLIER_ADDRESS_EN`, `SUPPLIER_ADDRESS_UA`,
    `SUPPLIER_TAX_ID`, `SUPPLIER_BANK`, `SUPPLIER_SWIFT`, `SUPPLIER_IBAN`
    (currency-selected).
- Shared `Currency` type (`"USD" | "EUR"`) exposed for form-input and
  document-render to reuse.
- Vitest coverage for both functions, including the missing-IBAN error path.
- `openspec/capability-map.yaml`: `banking` → `shipped` on completion,
  unblocking `document-render`.

## Capabilities

### New Capabilities

<!-- none — the banking spec already exists in openspec/specs/banking/spec.md -->

### Modified Capabilities

- `banking`: sharpen existing requirements into implementable scenarios —
  add the EUR selection scenario to FR-BANK-01, specify the missing-IBAN
  error behavior (BC-UX-01), and pin the supplier block variable contract
  (template placeholder names) under FR-BANK-03.

## Non-goals

- No UI: the currency field and profile dropdown wiring land with
  `form-input` (S4); Settings already manages profiles (S2).
- No template filling: `document-render` (S3) consumes the supplier block;
  this change only produces it.
- No storage changes: profiles are read via the existing
  `src/lib/storage/supplier-profiles.ts` API; no new persistence.
- No currency conversion, no additional currencies beyond `USD | EUR`
  (map.md settled scope).

## Impact

- New: `src/lib/banking/select-iban.ts`, `src/lib/banking/supplier-block.ts`
  (or a single module — design decides), `src/lib/banking/*.test.ts`.
- Modified: `openspec/specs/banking/spec.md` (via delta), capability map
  status, `docs/capability.md` / `docs/capabilities/banking.md` statuses.
- Unblocks: `document-render` (S3) — the last dependency;
  also feeds `form-input` (S4) currency handling.
- Requirements covered: FR-BANK-01, FR-BANK-03 (FR-BANK-02 stays with
  `supplier-profile`, shipped).

## Success criteria

- `selectIban(profile, "USD")` returns `profile.ibanUsd`; `"EUR"` returns
  `profile.ibanEur` (FR-BANK-01).
- Missing/blank IBAN for the requested currency produces a typed error whose
  message names the currency and the fix (BC-UX-01) — never a silent empty
  string on the document.
- Supplier block payload contains IBAN, bank name, SWIFT and bilingual
  name/address/tax id matching the template placeholders exactly (FR-BANK-03).
- Vitest covers USD/EUR selection, both missing-IBAN paths, and the payload
  contract; `npm run typecheck && npm run lint && npm run build` pass.
- `npm run capability:check -- --capability document-render` reports OK once
  `banking` is marked shipped.
