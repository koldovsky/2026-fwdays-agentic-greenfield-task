# Product Brief — Invoice Maker 2026

> Companion to `docs/requirements.md`. The requirements document is the numbered,
> traceable source of truth; this brief is the business narrative behind it.
> See also `docs/research.md` (original discovery notes) and `CONTEXT.md` (domain glossary).

## What this is

Invoice Maker 2026 is a web app for **fast creation of bilingual
(Ukrainian–English) invoices** for international settlements. The product
generates a legally structured HTML document from a standardized template
(`docs/invoice-template.html`), automatically selects **service descriptions
by NACE 2.1-UA codes** (replacing the obsolete KVED DK 009:2010), and lets
users create and edit invoices through a **chat-like interface** or structured
input.

This is a small greenfield project for the Agentic Engineering course: modest
in scope, but run through the full engineering loop (specs → slice → verification).

## Who it is for

The primary actor is a **sole entrepreneur (FOP) / freelancer** who provides
creative services (graphic design, 3D visualization, video editing) to foreign
clients and invoices in **USD or EUR**. In MVP there is a single supplier
profile (FOP details and bank accounts); multi-tenancy and payment tracking are
out of the first slice (see Out of scope in `requirements.md`).

## The pain it addresses

Creating an invoice for an international client usually means:

- manually filling a bilingual Word/HTML template;
- picking a legally aligned service description for the registered activity type;
- calculating prepayment, deadlines, and unit price;
- choosing the correct IBAN per currency;
- repeating all of this for every new invoice.

Invoice Maker reduces this to one dialogue: the user describes the client,
service, and amount — the system returns ready-to-save, print, or send HTML.

## End-to-end usage

1. **Initiation.** User opens the app and starts invoice creation via triggers
   documented in `docs/research.md` (e.g. `#invoice`) or the UI
   (FR-CHAT-01, FR-SHELL-01).
2. **Data collection.** System accepts full structured input, short key-value
   format, or informal text and extracts required fields (FR-INPUT-01..04).
   Missing data → targeted follow-up questions (FR-CHAT-02).
3. **NACE mapping.** From service keywords the system picks a **NACE 2.1-UA**
   code and injects bilingual catalog text (FR-NACE-01..04). Example:
   3D/graphics → `74.12`; video editing → `59.12`.
4. **Calculations.** Number `DDMM/0YY`, EN/UA dates, unit price, totals,
   prepayment, payment and execution deadlines (FR-CALC-01..05).
5. **Bank details.** Currency (USD/EUR) selects the matching IBAN from the
   supplier profile (FR-BANK-01).
6. **Generation.** HTML template filled via `{{VARIABLE}}` placeholders;
   immutable blocks (legal terms, signature) are never modified (FR-TPL-01..03).
7. **Preview & export.** User previews and can save/print (FR-EXPORT-01).
   Edit by invoice number — FR-EDIT-01.

## Key workflows in prose

- **One-shot invoice.** User sends a block with client, currency, service,
  quantity, and amount — receives a complete document.
- **Step-by-step dialogue.** For beginners the system asks for address,
  contacts, and deadlines with hints and defaults (50% prepayment, 3-day
  payment term).
- **Edit.** Change amount on an existing invoice number; dependent fields
  (unit price, prepayment, balance) recalculate (FR-EDIT-01).
- **Duplicate.** New invoice from a previous one with fresh number and date
  (FR-EDIT-02).

## NACE 2.1-UA vs legacy KVED

**NACE 2.1-UA** was approved by State Statistics Service order No. 191 of
28 Oct 2025 and **takes effect on 1 January 2027** («ввести її в дію з
01 січня 2027 року» — order body; the appendix PDF carries no effective-date
clause). Until then **DK 009:2010 (KVED)** remains in force and the ФОП
register still holds legacy KVED codes. Codes and labels are updated; some
former entries are split. See the resolved research in
`.scratch/mvp-spec-coherence/issues/03-nace-effective-date-and-code-display.md`.

| Legacy (KVED DK 009:2010) | Current (NACE 2.1-UA) | Product use |
| --- | --- | --- |
| 74.10 — specialized design activities | **74.12** — graphic and visual design activities | logos, brand book, 2D graphics |
| 74.10 (3D / visualization) | **74.12** or **74.14** — other specialized design activities | 3D, 360° tours, interactive visualization |
| 59.12 — motion picture and video post-production | **59.12** — motion picture, video and television programme post-production | video editing, VFX, color grading |

Classification source: `docs/191_2025.pdf` (original Ukrainian text, not translated).

## MVP vs Future boundary

**In MVP (first vertical slice):**

- chat/UI for invoice creation with input validation;
- NACE 2.1-UA catalog with bilingual service wording;
- HTML generation from `docs/invoice-template.html`;
- calculations (number, dates, amounts, prepayment, deadlines);
- IBAN selection by currency (USD/EUR);
- preview and HTML download;
- basic edit by invoice number.

**Future (post-MVP):**

- full multi-tenant model (Organization, RLS) — see `docs/ARCHITECTURE.md`;
- PDF export, email delivery;
- payment tracking and `sent → paid → overdue` lifecycle;
- persisted invoices (Supabase + Drizzle);
- authentication and multiple FOP profiles;
- bank / e-invoicing integrations;
- expanded NACE catalog beyond creative services.

## Operating principles

- **Template is the contract.** TERMS AND CONDITIONS and signature blocks
  stay immutable (BC-LEGAL-01).
- **NACE, not KVED.** New docs and UI use **NACE 2.1-UA** only; legacy
  “KVED 74.10” references are not used (BC-NACE-01).
- **Bilingual documents.** Each service line, date, and term is EN + UA in the
  generated invoice (BC-I18N-01). User-facing chat phrases remain as defined in
  `docs/research.md`.
- **Honest failures.** Invalid input → clear explanation with format example;
  no silent errors (BC-UX-01).
- **Disclaimer.** The system does not provide legal advice; the user is
  responsible for regulatory compliance (BC-LEGAL-02).
