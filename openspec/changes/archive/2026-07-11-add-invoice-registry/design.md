# Design: add-invoice-registry

> **D2 note (validation):** the first sketch below mentioned a separate zod
> module. It was NOT built — validation is inline hand-written guards, matching
> `clients.ts` / `supplier-profiles.ts`. Consistency with the surrounding storage
> layer beats introducing zod for one module.

## D1 — Storage module (`src/lib/storage/invoice-register.ts`)

Mirror the established browser-storage pattern (`clients.ts`) — including
`readStore()` fresh on every operation (no cached store object, so a cross-tab
write is never lost), a reference-stable frozen list snapshot, a server snapshot,
and **write-before-invalidate** ordering so a failed persist leaves no phantom:

- Versioned key `invoice-maker:invoices:v1`.
- In-memory cache + `subscribe`/`getServerSnapshot` for React `useSyncExternalStore`.
- SSR guard (`typeof window`), try/catch around `localStorage`, corrupt-JSON
  fallback to an empty store (drop invalid records, keep valid ones).
- `InvoiceStorageError`, `InvoiceValidationError`, `InvoiceNotFoundError`.
- Public API: `listInvoices`, `getInvoice`, `saveInvoice(input)`,
  `setInvoiceStatus(id, status)`, `deleteInvoice(id)`,
  `__resetInvoiceCacheForTests`.

## D2 — Record shape (FR-REG-03 immutability)

```ts
type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled";

interface InvoiceSnapshot {          // everything printed on the document
  supplier: Record<string, string>;  // name/address/IBAN/... captured at issue
  customer: Record<string, string>;
  serviceRows: ReadonlyArray<Record<string, string | number>>;
  totals: Record<string, number>;
  termsText: { en: string; ua: string };
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;             // assigned by invoice-calc numbering
  status: InvoiceStatus;
  issueDateIso: string;              // YYYY-MM-DD
  paymentDeadlineIso: string;        // computed at issue (invoice-calc)
  snapshot: InvoiceSnapshot;
  createdAt: string;
  updatedAt: string;
}
```

**Immutability (FR-REG-03):** `saveInvoice` deep-clones the incoming snapshot
(`structuredClone`) before storing, so a caller mutating the source object it
passed in — e.g. after editing a supplier IBAN in the directory — cannot reach
into a stored snapshot. Read isolation: `getInvoice` returns a fresh value
because `readStore()` re-parses localStorage on every call, and `listInvoices`
returns a reference-stable snapshot whose records are **deep-frozen** — a
deliberate strengthening over `listClients`' shallow `Object.freeze`, required so
the list path has the same isolation as `getInvoice` (a consumer cannot mutate a
nested snapshot field and pollute the shared cache). The persisted register is
the source of truth; the snapshot is a value captured at issue time, never a
live reference.

## D3 — Derived overdue (FR-REG-02, display-only)

```ts
function deriveOverdue(record: InvoiceRecord, todayIso: string): boolean {
  return record.status === "sent" && record.paymentDeadlineIso < todayIso;
}
```

ISO `YYYY-MM-DD` strings compare lexicographically = chronologically, so no Date
math and no timezone hazard. `overdue` is **never** a field on `InvoiceRecord` —
a test asserts the stored/serialized record has no `overdue` key.

## D3b — Supporting CRUD primitives

`saveInvoice` also handles update-by-id, and `deleteInvoice` removes a record.
These have no dedicated FR-REG scenario — they are the standard register CRUD
that `invoice-edit` (S6, which `invoice-registry` blocks) will consume, present
in the sibling `clients.ts` / `supplier-profiles.ts` stores for the same reason.
They are exercised by unit tests, not left dead.

## D4 — Status transitions (FR-REG-01)

`setInvoiceStatus` accepts any of the four statuses (manual, no workflow
enforcement per spec — the user sets them). It updates `updatedAt` and persists.
No email side effect on `sent`.

## Risks

- `structuredClone` is available in the Node/browser targets used (Node 22, modern
  browsers). A test exercises the clone-on-save path directly.
- The snapshot type is intentionally structural (`Record<string,…>`) to avoid
  coupling the store to the render layer's evolving types; the render layer maps
  into it at issue time in a later UI slice.
