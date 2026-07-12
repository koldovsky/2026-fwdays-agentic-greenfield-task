# 13 — Retire the legacy scaffold and supersede ADR-0001

Type: task
Status: open
Blocked by: 12

## Why this is a task

Nothing is decided here — ticket `12` decides it all. This ticket carries the
decision into the repository, because the map's destination requires that the
scaffold stop contradicting the spec. It is the last ticket; when it closes, the
way is clear.

**No feature code is written.** This is removal and one ADR.

## What to do

Everything below encodes the abandoned enterprise product. Remove or rewrite it
per ticket `12`'s plan, and record what was removed and what was kept.

- `src/lib/db/index.ts` — a Drizzle placeholder for a database we will not have.
- `src/actions/invoices/index.ts`, `src/actions/clients/index.ts` — Server
  Action placeholders (`createInvoice`, `sendInvoice`, `voidInvoice`) for a
  server we will not have.
- `.env.example` — `DATABASE_URL`, Supabase keys, Clerk keys, Resend key, blob
  storage token. None of these exist in the MVP.
- `src/types/invoice.ts` — `organizationId` and `clientId` (out of scope),
  `taxRate` (a ФОП invoice under this template has no VAT line), the conflated
  `InvoiceStatus`, and `calculateInvoiceTotal`, which computes money in the
  direction ticket `06` may well have rejected.
- `src/types/client.ts` — check against ticket `08`'s client record.
- `src/app/(dashboard)/**` — pages that presuppose server-fetched data.
- `docs/ARCHITECTURE.md` — per ticket `12`.

Then write **ADR-0002**, superseding `docs/adr/0001-initial-stack.md`, which
currently records Supabase + Drizzle + Zod as *Accepted*. ADR-0002 records the
browser-only, file-sharing MVP and cites the decisions in this map.

## Definition of done

- `npm run lint && npm run typecheck && npm run build` all pass — `NFR-DX-01`.
  (Baseline measured while charting: lint ≈ 1.7 s, typecheck ≈ 0.3 s.)
- `openspec validate --strict` passes.
- No file in the repository describes a capability that the spec places out of
  scope.
