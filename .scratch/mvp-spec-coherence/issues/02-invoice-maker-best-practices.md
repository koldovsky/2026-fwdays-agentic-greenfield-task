# 02 — What serious invoice makers actually do

Type: research
Status: resolved
Blocked by: —

## Question

The user asked for the requirements to follow "best practices of invoice
makers". Establish what those practices are, from product documentation rather
than marketing pages, and name every place our current spec diverges.

Cover, for each of Wave, Zoho Invoice, Invoice Ninja, FreshBooks and Stripe
Invoicing (or a defensible subset — say which and why):

- **Numbering.** Scheme, uniqueness guarantees, collision handling, whether the
  number is editable, when it is assigned (on draft, or on send).
- **Rounding and authority.** Does the user enter the unit price or the total?
  Which is derived? What happens when `total ÷ quantity` does not divide
  evenly? Is `unit × quantity` ever allowed to disagree with the printed total?
- **Currency formatting.** Thousands and decimal separators, and whether a
  bilingual document formats numbers differently per language column.
- **Status models without a payment integration.** Which statuses exist, which
  are user-set, which are derived from dates.
- **Editing after send**, and duplicating an invoice.
- **Sharing**: file versus link, and what is exposed.

Then: **invoice content requirements** for a Ukrainian ФОП billing a foreign
client — what a compliant invoice must carry. Distinguish legal requirement
from convention, and cite the source for each.

Finally, list every point where `docs/requirements.md` diverges from what you
found, with the requirement ID.

## Output

A markdown summary at
`.scratch/mvp-spec-coherence/assets/02-best-practices.md`, with a source link
per claim, ending in a divergence table keyed by requirement ID.

---

## Answer

Full research with per-claim sources and the requirement-ID divergence table:
[`assets/02-best-practices.md`](../assets/02-best-practices.md). Conclusions that
change decisions, for a reader who won't open the asset:

**What every serious invoice maker does (Stripe, Zoho, Wave, FreshBooks, Invoice
Ninja), as conclusions:**

- **The invoice number is a unique sequential counter, kept separate from the
  date, editable, and assigned on *issue* — not on draft.** Stripe assigns the
  number at finalisation (draft → open), *not* on draft creation, precisely
  because drafts can be deleted and numbering must stay gapless: an abandoned
  draft must consume no number. Uniqueness is hard-enforced everywhere (Wave and
  Invoice Ninja block or auto-resolve collisions).

- **The user enters the unit price and quantity; the line amount and the total
  are derived (`unit × qty → amount → Σ = total`).** Unit price is authoritative;
  the total is never typed. Because the math runs in that direction, the printed
  unit price always reconciles with the printed total; any sub-cent residue lives
  in the total (or an explicit rounding-adjustment line), never as a contradiction
  between two printed columns.

- **Money is stored as integer minor units (cents) and formatted once per
  document.** USD and EUR are two-decimal currencies; `1,234.56` is the norm. No
  tool formats numbers differently per language, and neither should we — our own
  template already puts the amount in one shared cell for both the EN and UA
  columns. Only the *date* is localised per language.

- **Status models: overdue is always *derived* from the due date; `viewed` /
  `partial` / `paid-by-integration` require server or payment tracking we don't
  have.** Our stored set (draft, sent, paid, cancelled) with derived overdue is a
  legitimate subset — validated against industry. Add one rule from Stripe: once
  `paid` or `cancelled`, the invoice is frozen (no editing).

- **A sent invoice is an issued document.** The clean model (Stripe) corrects it
  by cancel + reissue with a *new* number, not by silently mutating it in place.
  Duplicating is universal and always mints a new number on a fresh draft — our
  FR-EDIT-02 matches.

- **Sharing defaults to a hosted *link* everywhere; we deliberately ship the
  *file* only.** That's a conscious divergence (settled decision 2), and it is
  what makes `viewed` tracking impossible for us — correctly dropped, not missed.

**Ukrainian ФОП billing a foreign client — legal vs convention:**

- Ukraine has **no statutory mandatory *form*** for a рахунок/invoice. A non-VAT
  single-tax ФОП issues **no VAT tax invoice and no VAT line** (template is right).
- **Legal levers:** (1) the document must exist **in Ukrainian** — foreign-language
  docs underlying accounting need an authentic Ukrainian translation, which is the
  real, compliance-grade reason the invoice is **bilingual EN+UA** (not styling);
  (2) if the invoice is to stand as the *primary document*, it must carry the
  **Law 996-XIV Art. 9 requisites** (name, date, entity, content/volume + unit,
  responsible persons, signature) **and be paid** — a paid invoice can replace the
  акт (which is exactly what template TERMS 2 & 5 encode); (3) for export of
  services, the ЗЕД confirming documents are the **act and/or the invoice**, and
  the invoice must accurately identify supplier (ФОП name, РНОКПП/ІПН, address) and
  bank (IBAN, SWIFT, correspondent bank) so the bank can credit USD/EUR. Income is
  recognised in UAH at the NBU rate on the date of receipt (bank-side).
- **Convention:** the exact layout, bank block, SWIFT-fees clause, prepayment
  terms, and purpose-of-payment line.

**Feeds downstream tickets:**

- **→ 06 (money model and rounding).** Reverse FR-CALC-03: make unit price × qty
  the authority and derive the total; never derive unit price by `total ÷ qty`
  (it prints a unit price that fails to reconcile — and our template shows *both*
  PRICE and AMOUNT columns, so the mismatch is visible). Store amounts as integer
  cents; pin USD/EUR to 2 dp, `1,234.56`, one format for the whole document.

- **→ 07 (invoice number and identity).** FR-CALC-01's `DDMM/0YY` is
  **date-derived with no counter → two invoices on the same day collide**; replace
  it with a unique sequential counter (date optional but only alongside a
  counter). Assign the number **when the invoice moves `draft → sent`** (our
  finalisation analogue), so abandoned drafts consume no number and the local
  sequence stays gapless. Make the number **editable but uniqueness-checked**
  against the browser register. Scope FR-EDIT-01: freely edit drafts; freeze a
  sent invoice's identity/amount and correct via cancel + reissue.

