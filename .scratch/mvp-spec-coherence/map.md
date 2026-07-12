# Map: MVP spec coherence

Label: `wayfinder:map`

## Destination

Every document in this repo, and the scaffold in `src/`, tell **one coherent
story about the MVP**. The authoritative spec lives in
`openspec/specs/<capability>/spec.md` and passes `openspec validate --strict`.
Every factual claim carries a primary source. The first vertical slice can be
implemented without taking a single new decision.

## Notes

**Domain.** A browser-only generator of bilingual (EN + UA) invoices for a
Ukrainian sole entrepreneur (ФОП) who bills foreign clients in USD or EUR.
No server, no database, no hosted invoice pages. The user receives a PDF file
and forwards it themselves.

**Primary sources.** NACE facts: `docs/191_2025.pdf` (Держстат order No. 191 of
28 Oct 2025 — verified: 651 classes, replaces ДК 009:2010, codes 74.12 / 74.14 /
59.12 exist with the quoted names). Product discovery: `docs/research.md`
(Ukrainian, not translated). Document layout: `docs/invoice-template.html`.

**Skills every session must consult.** `/grilling` and `/domain-modeling` for
decisions; `/prototype` for fidelity questions; `/research` for facts.

**The repo moves under you.** Concurrent sessions and the human commit while a
ticket is being worked. Commit `8d45456` executed most of this map — eleven
capability specs, `CONTEXT.md`, both ADRs, `src/` — before its decisions existed.
Re-read a file before asserting anything about it, and treat
`openspec/specs/` as a **draft under audit** until
[Six requirements vanished in the migration](issues/15-audit-the-migration.md)
closes. `openspec validate --strict` will not tell you it is wrong.

**Standing preferences.**

- Plan, don't do. Tickets produce decisions, not features.
- Simplify maximally — but the MVP must genuinely work end to end.
- Verify every factual claim against a primary source before recording it.
- App UI strings: Ukrainian. Project documentation: English. Invoice document:
  bilingual EN + UA.
- Tracker: local markdown, this directory. The resolved spec lands in
  `openspec/specs/`.

**Execution override.** This effort carries exactly two `task` tickets that
*do* rather than decide — `04` and `13` — because the destination demands that
the repository stop contradicting its own spec. No feature code is written by
this map.

**Settled while charting.** These are not tickets. They bound every ticket below.

1. **Destination is the whole doc set**, not only `product-brief.md` and
   `requirements.md`.
2. **Sharing is by file, and nothing is remembered.** The user receives a PDF
   and forwards it to Telegram / WhatsApp. **No database. No stored invoices. No
   public invoice URL. No accounts.**

   *Revised after [Browser-side PDF generation and Cyrillic fonts](issues/01-browser-pdf-and-cyrillic-fonts.md).*
   The original wording said "no server", which was factually wrong — the repo
   ships `GET /api/health` as a live Route Handler and sets no
   `output: 'export'`. It also proved too strong: in a browser-only app, vector
   text, `docs/invoice-template.html` as the source of truth, and a downloadable
   PDF cannot all hold at once.

   **The PDF is rendered by a stateless Vercel Route Handler**: it receives the
   invoice data, prints `docs/invoice-template.html` with headless Chromium
   (`puppeteer-core` + `@sparticuz/chromium`), returns `application/pdf`, and
   retains nothing. This keeps `TC-STACK-03` and `BC-LEGAL-01` meaningful, keeps
   the on-screen preview byte-identical to the PDF, and matches how Stripe, Wave
   and Zoho generate invoices.

   The **invoice register and both directories still live only in the browser.**
   The server holds no state and no data at rest — see
   [The render function must forget](issues/14-render-function-must-forget.md)
   for what that obliges us to prove.
3. **Input is a form** with a live preview. Chat backed by an LLM moves to
   Future; `FR-CHAT-01..04` and `FR-INPUT-03` belong to a later product version.
4. **Statuses stored:** `draft`, `sent`, `paid`, `cancelled` — all set by the
   user by hand. `overdue` is **derived** (`sent` and the payment deadline has
   passed) and is never stored. There is no payment tracking.
5. **Supplier (ФОП) data** is entered by the user and saved as a directory with
   a dropdown, held in the browser. It is never committed to the repo and never
   built into the bundle. Several supplier profiles is *not* authentication.
6. **Client data** follows the same pattern: a directory with a dropdown.
7. **An issued invoice stores a snapshot** of everything printed on it. The
   directories only prefill the form; they are not the truth of an issued
   document. Editing a supplier's IBAN must not rewrite last year's invoices.
8. **UI language is Ukrainian.**

## Decisions so far

<!-- one line per resolved ticket: gist + link. The detail lives in the ticket. -->

- [Browser-side PDF generation and Cyrillic fonts](issues/01-browser-pdf-and-cyrillic-fonts.md)
  — Geist, Geist Mono and Inter **all** ship Cyrillic, and `subsets: ["latin"]`
  never dropped it (only its preload); the real trap is that PDF libraries need
  one unsubsetted TTF/WOFF carrying both scripts. In the browser, vector text +
  template-as-source-of-truth + a shareable Blob are **mutually unsatisfiable** —
  a stateless server render is the only option that gives all three, and the repo
  already has a server.

- [What serious invoice makers actually do](issues/02-invoice-maker-best-practices.md)
  — the number is a unique **sequential counter assigned on issue**, separate
  from the date, so `FR-CALC-01`'s `DDMM/0YY` collides same-day (→ `07`);
  authority runs **unit × qty → total**, never `total ÷ qty`, so `FR-CALC-03` is
  inverted and can print a unit price that does not reconcile with the printed
  total — and the template shows both columns (→ `06`); money is integer cents,
  formatted **once for the whole document**, not per language column; sent
  invoices are immutable, corrected by cancel-and-reissue (→ `16`); and bilingual
  EN+UA is a **Ukrainian-language legal requirement**, not styling — a paid
  invoice can stand as the primary document under Law 996-XIV Art. 9.

- [When NACE 2.1-UA took effect](issues/03-nace-effective-date-and-code-display.md)
  — order No. 191 only **approved** the classifier; its body reads «ввести її в
  дію з **01 січня 2027 року**». So NACE 2.1-UA is **not yet in force**, today's
  ФОП register still carries legacy КВЕД codes, and a printed NACE code would not
  match the registration. `FR-NACE-06` is dropped — the classifier itself says a
  code «не створює прав чи обов'язків». One class code legitimately carries many
  line texts, so `FR-NACE-01`'s "keyed by class code" is wrong.

- [The money model](issues/06-money-model-and-rounding.md) — the user enters
  **unit price × quantity**; totals are derived, division never occurs, money is
  integer cents, `prepayment + balance == total` exactly, format `1,234.56` on
  the whole document. `FR-CALC-03` is inverted and replaced; the code was right.

- [The invoice number](issues/07-invoice-number-and-identity.md) — **per-year
  sequential counter (`YYYY-NNN`), assigned on issue**, per supplier profile,
  editable with uniqueness check, never reused after cancel. The human chose to
  retire `DDMM/0YY` outright (`FR-CALC-01` replaced). Drafts have no number and
  are addressed by record id.

- [Six requirements vanished in the migration](issues/15-audit-the-migration.md)
  — all six were **accidents, not decisions** (they survive as `proposed` in
  `docs/requirements.md` and the capability docs; only `openspec/specs/` lost
  them, and the migration proved it *could* record deliberate drops by marking
  FR-CHAT-* `dropped`). **FR-NACE-06** dropped in `requirements.md`,
  `capability-map.yaml`, and `nace-catalog/spec.md` (2026-07-10). **No repo tool
  checks that an owned FR id appears in its owning spec** — `validate --strict`
  lints format only, `capability:check` never opens a spec — so this loss can
  recur behind two green ticks. Repairs routed to `06` (done via `add-invoice-calc`
  delta), `08`, `09`, `10`, `16`.

- [Stop `openspec/config.yaml` from lying](issues/04-wire-openspec-into-claude-code.md)
  — done by a concurrent session (`8d45456`) before it was claimed. Spec format
  confirmed (`### Requirement:` + `#### Scenario:` with `**WHEN**`/`**THEN**`);
  stable `FR-*` ids survive in headings; greenfield may seed `specs/` directly,
  leaving no proposal behind. **`openspec validate --strict` checks structure
  only** — it passed a `SHALL` that defers to an open ticket, and an "or".

## Not yet specified

In scope, but not yet sharp enough to state as a question. Graduates into
tickets as the frontier advances.

- **Form field set and validation.** Which fields, in what order, with what
  error text (`BC-UX-01` demands "explain the problem, show a correct example").
  Sharpens once `08` fixes the invoice record and `02` reports what other
  invoice tools require.
- **Directory field sets and demo seed data.** What a saved supplier / client
  record holds, how duplicates are detected, and what obviously-fake demo data
  ships in the repo so the public demo works without real tax IDs.
- **Export surface.** Whether `.html` download (`FR-EXPORT-02`) and browser
  print (`FR-EXPORT-03`) survive alongside PDF, and what `FR-TPL-05`
  ("self-contained HTML, A4 print styles") means once `05` decides how the PDF
  is produced.
- **Share mechanics.** Web Share API versus plain download, on desktop and on
  mobile, and what the user actually sees.
- **Timezone and locale for "today".** The invoice number and both date formats
  depend on which day it is: `Europe/Kyiv`, UTC, or the device's clock.
- **Test strategy.** `TC-STACK-06` names Vitest, which is not installed. Whether
  the rendered document needs a golden-file snapshot test. Sharpens after `05`.
- **Zod.** `TC-STACK-05` names it; nothing uses it. Whether form types and
  document types are the same types.
- **Responsiveness, print and accessibility.** `FR-SHELL-02`, `NFR-A11Y-01`.
- **Course deliverable.** Which exact scenario the 1–2 minute demo shows
  (`BC-DEMO-01`), and what gate G4 needs.

## Out of scope

Ruled beyond this destination. Never graduates; returns only as a fresh effort.

- **Chat / LLM input.** `FR-CHAT-01..04` and `FR-INPUT-03` move to Future — see
  settled decision 3. The app stays a deterministic generator.
- **Authentication, multi-tenancy, RLS, Supabase, Drizzle** — everything
  `docs/ARCHITECTURE.md` and `docs/adr/0001-initial-stack.md` currently
  prescribe. Out of scope because there is **no data at rest on the server**,
  not because there is no server. Server Actions are likewise unused: every
  mutation happens in the browser. The one server endpoint is the stateless PDF
  renderer of settled decision 2.
- **Payment recording.** Consequence of settled decision 4.
- **Hosted invoice links and email delivery.** Consequence of settled decision 2.
- **The full NACE 2.1-UA taxonomy** (651 classes). The MVP seeds the
  creative-services subset only.
- **Creating a design system.** WEG3D Fin already exists (`Design.md`). Only
  *reconciling* it with the spec is in scope — that is ticket `11`.
- **Writing the first slice's code.** The map ends where implementation begins.
