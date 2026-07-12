# Capability: `banking`

[← Capability map](../capability.md) · **Depends on:** [supplier-profile](supplier-profile.md) ✅ · **Unblocks:** [document-render](document-render.md), [form-input](form-input.md)

| Field | Value |
| --- | --- |
| Slice | S2 — Directories |
| Order | #3c (next up — supplier-profile shipped in PR #5) |
| Owner | domain |
| Gate status | **shipped** (2026-07-10, `feat/banking`) |
| OpenSpec spec | [banking/spec.md](../../openspec/specs/banking/spec.md) |
| OpenSpec change | `2026-07-10-add-banking` (archived) |

## Purpose

Map currency selection (USD | EUR) to the correct IBAN from the active supplier
profile. Expose supplier block variables for document-render.

## Requirements

| ID | Description | Status |
| --- | --- | --- |
| FR-BANK-01 | USD → USD IBAN; EUR → EUR IBAN | shipped |
| FR-BANK-03 | IBAN, bank name, SWIFT on invoice SUPPLIER block | shipped |

## Implementation scope

| Area | Path |
| --- | --- |
| Selection logic + document vars | `src/lib/banking/supplier-block.ts` (`selectIban`, `buildSupplierBlock`) |
| Tests | `src/lib/banking/supplier-block.test.ts` (11 tests incl. template contract) |
| Form | currency field ties to active supplier profile — lands with `form-input` (S4) |

## Verification

- [x] USD invoice uses USD IBAN from selected profile (`selectIban` test)
- [x] EUR → EUR IBAN in supplier block vars (`buildSupplierBlock` test)
- [x] Missing IBAN for currency → typed `MissingIbanError` with BC-UX-01 message
- [x] Template contract: all `SUPPLIER_*` placeholders covered by `SUPPLIER_BLOCK_KEYS`

## Done when

- Currency selects correct IBAN from active supplier profile
- Supplier block variables available to document-render

## After shipping

Required for **document-render** (supplier section on invoice).
