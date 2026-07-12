# Domain Glossary

Shared vocabulary for Invoice Maker. Use these terms consistently in code, docs, and UI copy.

> **Authoritative behavior** lives in `openspec/specs/<capability>/spec.md`.
> This file is the quick glossary for agents and contributors.

| Term | Definition |
| --- | --- |
| **Supplier profile** | Saved ФОП (sole entrepreneur) details: bilingual name/address, tax ID, bank details, IBANs per currency. Stored in the browser; never committed to the repo or server. |
| **Client** | External party billed on an invoice. Saved in a browser-side client directory; prefills the form but does not define issued document content. |
| **Invoice** | A bilingual bill document generated from `docs/invoice-template.html`. The issued record is a snapshot of everything printed. |
| **Invoice line** | Single service row on an invoice (bilingual description, quantity, unit price, line amount). |
| **Invoice register** | Browser-side list of invoice records (metadata + snapshot fields). Not stored on the server. |
| **Draft** | Invoice being edited; not yet marked sent. |
| **Sent** | User marked the invoice as delivered to the client (manual; no email integration). |
| **Paid** | User marked the invoice as settled (manual; no payment recording). |
| **Cancelled** | User cancelled the invoice; no longer active. Replaces legacy term `void`. |
| **Overdue** | **Derived display status only**: `sent` and the payment deadline has passed. Never stored. |
| **NACE entry** | Catalog row keyed by NACE 2.1-UA class code with bilingual invoice line text (MVP seeds creative-services subset). |
| **Snapshot** | Copy of supplier, client, service, amounts, dates, and NACE text frozen on an issued invoice. Editing a directory entry must not rewrite past invoices. |

## Out of scope (MVP)

Do not use these terms for MVP features:

- **Organization** / multi-tenancy — post-MVP; no tenant boundary in MVP.
- **Payment** (as a recorded entity) — no payment ledger; `paid` is a manual label only.
