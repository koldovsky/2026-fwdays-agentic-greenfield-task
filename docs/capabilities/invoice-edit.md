# Capability: `invoice-edit`

[← Capability map](../capability.md) · **Depends on:** [invoice-registry](invoice-registry.md), [form-input](form-input.md), [invoice-calc](invoice-calc.md) · **Unblocks:** — (MVP complete)

| Field | Value |
| --- | --- |
| Slice | S6 — Lifecycle |
| Order | #7b |
| Owner | ui |
| Gate status | not_started |
| OpenSpec spec | [invoice-edit/spec.md](../../openspec/specs/invoice-edit/spec.md) |
| OpenSpec change | `add-invoice-edit` |

## Purpose

Edit existing invoices by number (with recalculation) and duplicate with new
number/date. Phrases and UX copy per `docs/research.md`.

> Open decision: sent invoice immutability vs edit-after-send (issue 16).

## Requirements

| ID | Description | Status |
| --- | --- | --- |
| FR-EDIT-01 | Edit by number; dependent fields recalculated | proposed |
| FR-EDIT-02 | Duplicate with new number/date, same client/service | proposed |

## Implementation scope

| Area | Planned path |
| --- | --- |
| Edit route | `src/app/(dashboard)/invoices/[id]/edit/page.tsx` |
| Actions | load snapshot → form → recalc via invoice-calc |
| Duplicate | clone snapshot, new number from calc, new date |

## Verification

- [ ] Edit draft recalculates totals and dates
- [ ] Duplicate gets new number, preserves line content
- [ ] Cancelled invoice not editable (or explicit rule from spec)
- [ ] Edit phrases match research.md expectations

## Done when

- Edit by number with recalculation
- Duplicate with new number and date

## After shipping

**MVP feature set complete** for course deliverable (with export-share pdf).
