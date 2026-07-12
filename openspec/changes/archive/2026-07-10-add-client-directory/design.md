# Design: add-client-directory

## Context

S0 `shell` shipped: clients route at `src/app/(dashboard)/clients/page.tsx` with
header + Ukrainian explainer only. `src/types/client.ts` defines a minimal
`Client` (`name`, `email`, optional `company`, `address`, `taxId`) but no
phone/website fields required by `docs/invoice-template.html` customer block
(`CUSTOMER_NAME`, `CUSTOMER_ADDRESS_1`, `CUSTOMER_EMAIL`, `CUSTOMER_PHONE`,
`CUSTOMER_WEBSITE`). No storage module exists yet.

Constraint: parallel lane D — must not touch settings/supplier files.

## Goals / Non-Goals

**Goals:**

- Extend `Client` type and localStorage CRUD module.
- Clients page with list + create/edit/delete UI (WEG3D Fin conventions).
- Storage API ready for `form-input` prefill mapping.
- Vitest tests for CRUD; document prefill-only contract in spec.

**Non-Goals:**

- Invoice form client picker (`form-input`).
- Invoice registry / snapshot persistence (`invoice-registry`).
- Search indexing beyond simple client-side filter on name/email.
- Supplier profile work.

## Decisions

### D1 — Storage envelope: separate versioned localStorage key

Key: `invoice-maker:clients:v1`

```ts
type ClientsStore = {
  version: 1;
  clients: Client[];
};
```

Functions: `listClients`, `getClient`, `saveClient`, `deleteClient`. Same SSR/
try-catch guards as supplier profiles (D1 pattern in sibling change).

*Why:* namespace isolation from supplier profiles; TC-DATA-01 compliance.

### D2 — Client type aligned to template placeholders

```ts
interface Client {
  id: string;
  name: string;           // → CUSTOMER_NAME (company or person)
  address: string;        // → CUSTOMER_ADDRESS_1
  email: string;          // → CUSTOMER_EMAIL
  phone: string;          // → CUSTOMER_PHONE
  website: string;        // → CUSTOMER_WEBSITE (empty string if none)
  company?: string;       // optional subtitle; if set, name may be contact person
  taxId?: string;         // optional; not on frozen template today — kept for Future
  createdAt: string;
  updatedAt: string;
}
```

Required on save: `name`, `address`, `email` (trimmed, non-empty). `phone` and
`website` optional but stored as strings (empty allowed).

*Why:* prefill mapping to template is 1:1; optional `company` preserves existing
field without breaking type consumers.

### D3 — Prefill mapping export for form-input

Export pure helper (same module or `src/lib/clients/to-form-fields.ts`):

```ts
function clientToInvoiceCustomerFields(client: Client): {
  customerName: string;
  customerAddress1: string;
  customerEmail: string;
  customerPhone: string;
  customerWebsite: string;
}
```

Uses `company ? `${client.name} (${client.company})` : client.name` or similar
— exact formatting finalized in `form-input`; helper returns raw fields.

*Why:* gives form-input a stable contract without wiring UI now.

### D4 — Clients page UI

Client component `ClientsPageContent`:

- Header with `wf-display` + "Додати клієнта" primary `Button`.
- `Input` search filter (client-side, debounced optional).
- Table or card list (`Table` + shadcn) showing name, email, company.
- Row actions: edit, delete (`AlertDialog`).
- Create/edit in shadcn `Dialog` with `ClientForm` (`h-9` inputs, `wf-label`).

Empty state: muted copy + CTA button.

Invoke `weg3d-fin-design` at apply (🎨 banner).

### D5 — Snapshot immutability (contract only)

Directory edits never mutate issued invoices — enforced later by
`invoice-registry` storing customer fields on issue. This change documents the
rule in spec; no invoice storage implemented here.

### D6 — Tests and ordering

Vitest: create/update/delete, list sort by `updatedAt` desc (most recent first).
No barrel files.

## Risks / Trade-offs

- [Template lacks taxId placeholder] → keep optional on Client; not shown on doc
  until template changes.
- [company vs name ambiguity] → document mapping in helper; form-input may refine
  display formatting.
- [No picker yet] → manual QA limited to CRUD + reload persistence until S4.

## Migration Plan

Greenfield. Rollback = revert commit. After ship: sync spec, mark capability
shipped in map (partial contribution to form-input gate).

## Open Questions

- None blocking. Whether `taxId` appears on future template revision is out of
  MVP scope.
