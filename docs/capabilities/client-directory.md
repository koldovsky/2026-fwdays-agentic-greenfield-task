# Capability: `client-directory`

[← Capability map](../capability.md) · **Depends on:** [shell](shell.md) · **Unblocks:** [form-input](form-input.md)

| Field | Value |
| --- | --- |
| Slice | S2 — Directories |
| Order | #3b (parallel with supplier-profile) |
| Owner | ui |
| Gate status | shipped ([PR #4](https://github.com/eresemai/2026-fwdays-agentic-greenfield-task-INVOICE-MAKER-2026/pull/4), merged 2026-07-10) |
| OpenSpec spec | [client-directory/spec.md](../../openspec/specs/client-directory/spec.md) |
| OpenSpec change | `add-client-directory` (archived `2026-07-10-add-client-directory`) |

## Purpose

Browser-side client directory. Prefills invoice form only — does not define
content of already-issued invoice snapshots.

## Requirements

No numbered `FR-*` IDs. See OpenSpec spec scenarios.

| Related | ID |
| --- | --- |
| TC | TC-DATA-01 (browser storage) |

## Implementation scope

| Area | Planned path |
| --- | --- |
| Types | `src/types/client.ts` (exists — extend) |
| Storage | `src/lib/storage/clients.ts` |
| UI | `src/app/(dashboard)/clients/page.tsx` |
| Form integration | client picker on invoice form (with form-input) |

## Verification

- [x] CRUD clients in UI (`/clients`, PR #4)
- [ ] Select client on new invoice → fields prefilled (deferred — picker ships with form-input, S4)
- [ ] Edit client after issue → old invoice snapshot unchanged (deferred — needs invoice-registry snapshots, S5)

## Done when

- CRUD for clients in browser storage
- Client records expose invoice-form prefill fields (picker ships with form-input)

## After shipping

Contributes to **form-input** gate (with supplier-profile, banking, etc.).
