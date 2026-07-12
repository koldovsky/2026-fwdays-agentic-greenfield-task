# Proposal: add-invoice-registry (S5)

## Why

`invoice-registry` is the first slice delivered through the full G4 loop with
EARNED evidence (tests-first red→green, review-gate, `Slice:` trailer touching
`src/`). Every prior slice is RETROFITTED. It gives the app a persistent record
of issued invoices — the store `invoice-edit` (S6) depends on.

## What

The **storage + domain-logic layer only** (approved scope). No register UI page
in this slice; that is a follow-on.

- `src/lib/storage/invoice-register.ts` — versioned localStorage register
  following the `clients.ts` / `supplier-profiles.ts` pattern (list/get/save/
  setStatus/delete, SSR guards, corrupt-store fallback, subscribe).
- validation is INLINE in the storage module (hand-written type guards), matching
  the `clients.ts` / `supplier-profiles.ts` pattern — **not** a separate zod module
  (that first-sketch deliverable was dropped for consistency; see design D2 / tasks 3.2).
- `deriveOverdue(record, todayIso)` — a pure, display-only derivation.

## Requirements delivered

| Id | Behavior |
| --- | --- |
| FR-REG-01 | stored status ∈ {draft, sent, paid, cancelled}, set manually |
| FR-REG-02 | `overdue` derived for display (sent + deadline < today); never stored |
| FR-REG-03 | issued snapshot is immutable to later supplier/client directory edits |
| TC-DATA-01 | register persists in browser storage, no server copy |

## Out of scope

- The `/invoices` register UI page (recording-verified; a separate slice).
- `invoice-edit` (FR-EDIT-01/02, S6) — this slice only provides the store it needs.

## Acceptance

All four requirements are `local-verifiable`: unit tests annotated `@trace`,
observed to fail before implementation. No behavior is proven by narrative.
