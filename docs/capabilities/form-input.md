# Capability: `form-input`

[← Capability map](../capability.md) · **Depends on:** [shell](shell.md), [supplier-profile](supplier-profile.md), [client-directory](client-directory.md), [nace-catalog](nace-catalog.md), [banking](banking.md), [document-render](document-render.md) · **Unblocks:** [export-share](export-share.md), [invoice-registry](invoice-registry.md)

| Field | Value |
| --- | --- |
| Slice | S4 — Create flow |
| Order | #5a |
| Owner | ui |
| Gate status | **shipped** (2026-07-10, `add-form-input`) |
| OpenSpec spec | [form-input/spec.md](../../openspec/specs/form-input/spec.md) |
| OpenSpec change | `add-form-input` (archive after merge) |

## Purpose

Structured invoice creation form with validation, directory prefills, NACE service
selection, and live preview via document-render. Replaces deferred chat/LLM input.

## Requirements

| ID | Description | Status |
| --- | --- | --- |
| FR-INPUT-01 | Full structured input (client, address, contacts, currency, service, qty, amount, terms) | shipped |
| FR-INPUT-02 | Short key-value format (paste / power-user) | shipped |
| FR-INPUT-04 | Validate email, phone, amounts, USD\|EUR, prepay 0–100% | shipped |
| BC-UX-01 | Explain error + show correct example | shipped |

Also: NFR-A11Y-01, NFR-OBS-01, TC-STACK-05 (Zod)

## Implementation scope

| Area | Path |
| --- | --- |
| Page | `src/app/(dashboard)/invoices/new/page.tsx` |
| Page content | `src/components/invoices/new-invoice-page-content.tsx` |
| Form | `src/components/invoices/invoice-form.tsx` |
| Preview | `src/components/invoices/invoice-preview-panel.tsx` |
| Schema | `src/lib/validation/invoice-input.ts` (Zod) |
| Mapper | `src/lib/invoices/form-to-render.ts` |
| Payment terms | `src/lib/invoices/build-payment-terms-text.ts` |
| Short format | `parseShortFormat` in `invoice-input.ts` |

**Manual / QA:** [guides/quick-insert-manual-uk.md](../guides/quick-insert-manual-uk.md) · copy-paste samples in [guides/samples/](../guides/samples/)

## Verification

- [x] All required fields validated with accessible labels
- [x] Invalid input shows example format (BC-UX-01)
- [x] Client picker prefills fields from client-directory
- [x] Service text resolves via nace-catalog matcher (ambiguous → explicit choice)
- [x] Preview updates on valid state (debounced iframe `srcDoc`)
- [x] Keyboard can reach preview area (NFR-A11Y-01)

## Done when

- Structured and short-format input paths
- Zod validation with accessible error messages
- Live preview wired to document-render
- Client picker prefills invoice form from client-directory records

## After shipping

Unlocks **export-share** preview and **invoice-registry**.
