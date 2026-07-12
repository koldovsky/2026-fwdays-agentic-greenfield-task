# Capability: `invoice-registry`

[← Capability map](../capability.md) · **Depends on:** [form-input](form-input.md), [document-render](document-render.md), [invoice-calc](invoice-calc.md) · **Unblocks:** [invoice-edit](invoice-edit.md)

| Field | Value |
| --- | --- |
| Slice | S5 — Persistence |
| Order | #6 |
| Owner | ui |
| Gate status | not_started |
| OpenSpec spec | [invoice-registry/spec.md](../../openspec/specs/invoice-registry/spec.md) |
| OpenSpec change | `add-invoice-registry` |

## Purpose

Browser-side invoice register: list, save, manual statuses, immutable snapshots
of everything printed. Directories only prefill — issued invoices are snapshots.

## Requirements

| ID | Description | Status |
| --- | --- | --- |
| TC-DATA-01 | Register + directories in browser storage only | accepted |

OpenSpec scenarios:

- Stored statuses: `draft`, `sent`, `paid`, `cancelled` (user-set, manual)
- `overdue` derived at display (`sent` + deadline passed) — never stored
- Snapshot includes all printed fields at issue time
- Directory edits do not rewrite past invoices

## Implementation scope

| Area | Planned path |
| --- | --- |
| Types | `src/types/invoice.ts` (extend with snapshot shape) |
| Storage | `src/lib/storage/invoices.ts` |
| List UI | `src/app/(dashboard)/invoices/page.tsx` |
| Status UI | `<InvoiceStatusBadge />` + manual status actions |
| Issue action | freeze snapshot from form + render output |

## Verification

- [ ] Save draft → reload → still listed
- [ ] Mark sent/paid/cancelled persists
- [ ] Overdue badge when sent + past deadline (not stored as status)
- [ ] Change supplier IBAN → old invoice snapshot unchanged
- [ ] No server API for invoice CRUD

## Done when

- Browser persistence for invoice records
- Stored statuses draft|sent|paid|cancelled
- Snapshot immutability for issued invoices
- Derived overdue display only

## After shipping

Unlocks **invoice-edit**.
