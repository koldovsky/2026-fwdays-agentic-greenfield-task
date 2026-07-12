# Design: add-banking

## Context

`banking` is a pure domain capability (owner: domain, S2 step 3c). Supplier
profiles shipped with both IBANs, bank name, and SWIFT
(`src/types/supplier.ts`, PR #5). `docs/invoice-template.html` defines eight
`SUPPLIER_*` placeholders that `document-render` (S3) will fill. The invoice
model already carries `currency: "USD" | "EUR"` (`src/types/invoice.ts`).
This module bridges the two: profile + currency → supplier block variables.

## Goals / Non-Goals

**Goals:**

- Deterministic, framework-free mapping: `(SupplierProfile, Currency)` →
  currency-correct IBAN and full supplier block variable map.
- Typed failure for the defensive missing-IBAN path with a BC-UX-01-grade
  message (names the currency, points to the fix).
- A named `Currency` type shared by invoice, banking, and future form-input.

**Non-Goals:**

- No UI, no storage reads (callers pass the profile object — keeps the module
  pure and testable; the active-profile lookup stays in callers).
- No template filling (document-render), no currency conversion, no
  IBAN checksum validation (profile save already shape-checks).

## Decisions

- **D1 — One module `src/lib/banking/supplier-block.ts`** holding
  `selectIban` and `buildSupplierBlock`, mirroring the flat structure of
  `src/lib/invoice-calc/`. Two files would spread ~60 lines too thin;
  the capability doc's `select-iban.ts` path is honored via the exported
  function name. Alternative (separate files) rejected: needless indirection.
- **D2 — Named `Currency` type extracted to `src/types/invoice.ts`**
  (`export type Currency = "USD" | "EUR"`) and reused in `Invoice` and
  banking. Alternative (define in banking) rejected: invoice is the type's
  home; banking consumes it.
- **D3 — Callers pass `SupplierProfile`, not a profile id.** Keeps the module
  synchronous, pure, and independent of storage; document-render works on
  invoice snapshots where the profile is embedded, so id-based lookup would
  be wrong there anyway.
- **D4 — Typed `MissingIbanError extends Error`** carrying the `currency`
  field; message in Ukrainian (UI surfaces it verbatim per BC-UX-01),
  e.g. «Немає IBAN для валюти USD. Додайте його в Налаштуваннях → профіль
  постачальника.» Alternative (return `null`) rejected: silent empties are
  exactly what the S2 review flagged; errors must be loud.
- **D5 — `SupplierBlockVars` is a `Readonly<Record<SupplierBlockKey, string>>`**
  with `SupplierBlockKey` a union of the eight literal placeholder names —
  the compile-time contract document-render will consume; a runtime
  `SUPPLIER_BLOCK_KEYS` tuple backs the exhaustiveness test.

## Risks / Trade-offs

- [Template placeholder drift] the eight keys are duplicated from
  `docs/invoice-template.html` → mitigation: test asserts every
  `SUPPLIER_*` placeholder found in the template file is covered by
  `SUPPLIER_BLOCK_KEYS` (reads the template at test time).
- [Whitespace-only profile fields from legacy data] → mitigation:
  `buildSupplierBlock` trims values and treats empty results for IBAN as
  the missing-IBAN error; other empty fields pass through (profile
  validation owns completeness, FR-BANK-02).
- [Doc-file conflicts with open PR #6] both touch `docs/capability.md` /
  `capability-map.yaml` → mitigation: keep status flips as isolated one-line
  edits; rebase before merge.

## Migration Plan

Additive module; no data migration. Ship = merge PR, flip
`banking: shipped` in `capability-map.yaml` (in-PR, as S2 did), sync delta
spec into `openspec/specs/banking/spec.md`, archive the change.

## Open Questions

None — scope settled by map.md decisions 06/07 and the S2 review residuals
do not touch this module.
