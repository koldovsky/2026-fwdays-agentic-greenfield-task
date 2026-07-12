# Capability: `invoice-calc`

[← Capability map](../capability.md) · **Depends on:** — · **Unblocks:** [document-render](document-render.md), [invoice-registry](invoice-registry.md), [invoice-edit](invoice-edit.md)

| Field | Value |
| --- | --- |
| Slice | S1 — Domain core |
| Order | #2b (parallel with nace-catalog) |
| Owner | domain |
| Gate status | **shipped** |
| OpenSpec spec | [invoice-calc/spec.md](../../openspec/specs/invoice-calc/spec.md) |
| OpenSpec change | `add-invoice-calc` (synced; archive pending) |

## Purpose

Pure functions: invoice numbering, bilingual dates, money amounts, prepayment,
deadlines, payment purpose string. Framework-free — testable without Next.js.

> **Settled (Wayfinder 06+07, 2026-07-10):** integer cents; unit price × quantity
> → line amount → total (no `total ÷ qty`); sequential `YYYY-NNN` assigned on
> issue (`draft → sent`), per supplier profile. See
> `.scratch/mvp-spec-coherence/issues/06-money-model-and-rounding.md` and
> `07-invoice-number-and-identity.md`.

## Requirements

| ID | Description | Status |
| --- | --- | --- |
| FR-CALC-01 | Sequential `YYYY-NNN` on issue, per supplier; editable with uniqueness check | shipped |
| FR-CALC-02 | Date EN + UA formats | shipped |
| FR-CALC-03 | Unit price × qty → line total; integer cents; display `1,234.56` everywhere | shipped |
| FR-CALC-04 | Prepayment % and balance (`prepay + balance == total` exactly) | shipped |
| FR-CALC-05 | Deadline / execution term (days, weeks, date) | shipped |
| FR-CALC-06 | Payment purpose string (`Payment by the invoice №{number} from …`) | shipped |

## Implementation scope

| Area | Path |
| --- | --- |
| Numbering | `src/lib/invoice-calc/numbering.ts` |
| Dates | `src/lib/invoice-calc/dates.ts` |
| Money | `src/lib/invoice-calc/money.ts` |
| Purpose | `src/lib/invoice-calc/purpose.ts` |
| Validation | `src/lib/invoice-calc/validation.ts` |
| Tests | `src/lib/invoice-calc/__tests__/*.test.ts` |

## Verification

- [x] First invoice of year is `2026-001`; drafts have no number
- [x] Bilingual date pairs match FR-CALC-02
- [x] `unit × qty` equals line amount; no division in money model
- [x] Prepayment 50% on odd totals: `prepay + balance == total` exactly
- [x] Vitest edge cases: property tests on money split

## Done when

- Pure functions for numbering, dates, amounts, deadlines
- Integer-cents money model
- Vitest coverage for calc edge cases
- OpenSpec `add-invoice-calc` synced to `openspec/specs/invoice-calc/spec.md`

## After shipping

Required by **document-render**, **invoice-registry**, **invoice-edit**.
