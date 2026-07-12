# 02 — What serious invoice makers actually do

Research summary for ticket
[`02-invoice-maker-best-practices.md`](../issues/02-invoice-maker-best-practices.md).
Every claim below carries a primary-source link (official product
documentation, official help centres, or statutory / State Tax Service texts).
Where a source could not be verified against a primary source, the claim is
marked **UNVERIFIED**.

**Products surveyed.** Stripe Invoicing, Zoho Invoice / Zoho Books, Wave,
FreshBooks, Invoice Ninja. This is the defensible full set named in the ticket.
Stripe is weighted most heavily because it publishes the deepest developer
documentation on the invoice *lifecycle* (draft → finalize → open → paid/void),
which is exactly the seam our spec is fuzzy on. Zoho, Wave and FreshBooks are
weighted for the *manual, no-payment-integration* case, which is closest to ours.
Invoice Ninja (open source, self-hostable) is weighted for numbering mechanics.

**A note on method.** A handful of official pages (`*.tax.gov.ua`,
`zakon.rada.gov.ua`) block automated fetching (HTTP 403 / SPA shell). Their
content was verified from search excerpts served from those same official
domains; the canonical URLs are cited so a human can confirm. This is called out
inline where it applies.

---

## 1. Numbering

**Consensus across all five products: the invoice number is a *sequential
counter*, separate from the date, unique, editable, and assigned when the
document is issued — not when a draft is started.**

- **Scheme.** A constant (often configurable) prefix followed by an
  incrementing counter: `INV-001, INV-002, …`. Zoho: "The Prefix … will remain
  constant, however, the Next Number will be incremented by 1 for every
  subsequent invoice."
  ([Zoho Invoice — auto-generation](https://www.zoho.com/us/invoice/kb/invoices/auto-generation.html))
  Invoice Ninja generalises this to a pattern language with variables
  (`$counter`, `$year`, `$date:Y-m-d`, …) and a configurable counter padding
  (default 3 → `0001`): "Combine … inside a number pattern" such as
  `{$date:y}-{$counter}`.
  ([Invoice Ninja — advanced settings](https://invoiceninja.github.io/docs/user-guide/advanced-settings))
  Stripe uses a random per-customer prefix plus a sequential suffix, e.g.
  `586A2E-0139` or a custom `MYSHOP-1203`.
  ([Stripe — invoice numbering logic](https://support.stripe.com/questions/invoice-numbering-logic-in-stripe-billing),
  [Stripe — customize invoices](https://docs.stripe.com/invoicing/customize))
- **The date is never *the* number.** In every product the number is an
  independent counter; the invoice date is a separate field. A date can be
  *embedded* in a number pattern (Invoice Ninja `$year`), but only *alongside* a
  `$counter`, and Invoice Ninja warns the pattern "must resolve to a UNIQUE
  number" or the save is blocked / the number is auto-modified.
  ([Invoice Ninja — advanced settings](https://invoiceninja.github.io/docs/user-guide/advanced-settings))
- **Uniqueness is enforced.** Wave: you may edit a number "as long as the
  invoice number is unique and not associated with another invoice."
  ([Wave — invoicing FAQ](https://support.waveapps.com/hc/en-us/articles/8052061799444-Frequently-asked-questions-about-invoicing))
  Invoice Ninja: "duplicates are not allowed and the generated number will not be
  applied - or - will be modified to be unique."
  ([Invoice Ninja](https://invoiceninja.github.io/docs/user-guide/advanced-settings))
- **Editable — yes, everywhere.** Zoho lets you "Enter invoice numbers manually";
  FreshBooks "will create an invoice number that you're free to use, modify, or
  replace"; Wave and Invoice Ninja allow direct edits of the number/counter.
  ([Zoho](https://www.zoho.com/us/invoice/kb/invoices/auto-generation.html),
  [FreshBooks — what is an invoice number](https://www.freshbooks.com/hub/invoicing/what-is-an-invoice-number),
  [FreshBooks API — invoices](https://www.freshbooks.com/api/invoices))
- **When is it assigned? On issue, not on draft.** This is the single most
  important numbering finding. Stripe assigns the number **at finalisation**, not
  at draft creation, *specifically to keep the sequence gapless*: "To ensure
  invoices are sequentially and gaplessly numbered, invoices that can be deleted
  (drafts) are only assigned numbers upon finalization."
  ([Stripe changelog — sequential numbering](https://docs.stripe.com/changelog/2020-03-02/sequentially-number-invoices))
  Finalisation is the draft→open transition; after it, "It is ensured that an
  invoice number is present."
  ([Stripe — status transitions & finalization](https://docs.stripe.com/invoicing/integration/workflow-transitions),
  [Stripe — how invoicing works](https://docs.stripe.com/invoicing/overview))
  A draft that is abandoned and deleted therefore consumes no number.
- **Collision handling.** Stripe prevents collisions by centralising the counter
  and assigning late; Invoice Ninja blocks or mutates a colliding number; Wave
  refuses a non-unique number. No product lets two live invoices share a number.
- **Account-level vs customer-level sequencing.** Stripe defaults EU/UK accounts
  to *account-level* sequential numbering (one continuous sequence for the whole
  business) because that is what those tax regimes expect; elsewhere it defaults
  to per-customer sequences.
  ([Stripe — numbering logic](https://support.stripe.com/questions/invoice-numbering-logic-in-stripe-billing),
  [Stripe changelog](https://docs.stripe.com/changelog/2020-03-02/sequentially-number-invoices))
  For a single Ukrainian ФОП, the relevant analogue is a single account-level
  sequence.

## 2. Rounding and authority (unit price vs total)

**Consensus: the user enters the *unit price* (rate) and *quantity*; the line
amount and the invoice total are *derived*. Unit price is authoritative; the
total is computed, never entered.**

- Zoho: "For each item, you enter the quantity, the rate will be auto-filled …
  and you can modify it." The line amount is quantity × rate; the total is the
  sum of line amounts.
  ([Zoho Books — invoices help](https://www.zoho.com/us/books/help/invoice/))
- Stripe models a line as `unit_amount` × `quantity`; `unit_amount` is "a
  positive integer in the smallest currency unit … representing how much to
  charge," and the invoice total is the sum.
  ([Stripe API — price object](https://docs.stripe.com/api/prices/object),
  [Stripe API — charge object](https://docs.stripe.com/api/charges/object))
- FreshBooks, Wave and Invoice Ninja follow the same rate × quantity → amount →
  total direction.
- **What happens when it doesn't divide evenly?** Because the direction is
  *unit → line → total*, the printed total is *defined as* the sum of rounded
  line amounts, so `unit × quantity` always reconciles with what is printed. Any
  sub-cent residue is a property of the sum, not a contradiction. Where a
  business wants a clean grand total, tools add an explicit **rounding-adjustment
  line** or a "Round off the total to the nearest whole number" toggle rather
  than silently making `unit × quantity` disagree with the total.
  ([Zoho — round-off / decimal handling, community + settings](https://help.zoho.com/portal/en/community/topic/round-off-adjustment-of-invoices))
- **Is `unit × quantity` ever allowed to disagree with the printed total?**
  In no surveyed product does the *default* line-item math print a unit price
  that fails to reconcile with its line amount. The number that could disagree
  (a fractional cent) is absorbed into the derived total, never into a
  contradiction between two printed columns. Deriving *unit price from total by
  division* (`total ÷ quantity`) — the inverse direction — is **not** how any
  surveyed tool works, and it is precisely the operation that can print a unit
  price which, times quantity, does not equal the printed total (e.g.
  `100.00 ÷ 3 → 33.33`; `33.33 × 3 = 99.99 ≠ 100.00`).

## 3. Currency formatting

- **Format is a currency / locale property set once, then applied uniformly to
  the whole document.** Decimal places and the thousands/decimal separators are
  organisation- or currency-level settings in Zoho, not per-line or per-language
  choices.
  ([Zoho — currency & decimal settings, help/community](https://help.zoho.com/portal/en/community/topic/ability-to-move-the-decimal-place))
  Stripe stores every amount as an integer in the *smallest currency unit*
  (cents for USD/EUR) and renders it per the currency's convention.
  ([Stripe — supported currencies](https://docs.stripe.com/currencies),
  [Stripe API — charge object](https://docs.stripe.com/api/charges/object))
- **USD and EUR are two-decimal currencies.** Both use 2 minor-unit digits
  (unlike zero-decimal currencies such as JPY). The conventional presentation for
  a USD/EUR invoice to an international client is `1,234.56` — comma thousands
  separator, dot decimal.
  ([Stripe — supported currencies](https://docs.stripe.com/currencies))
- **Does a bilingual document format numbers differently per language column?**
  **No — and our own template already agrees.** No surveyed product renders a
  single invoice with two different numeric formats; each invoice is one document
  in one number format. Our `docs/invoice-template.html` places the money value
  in a *single* shared cell (`{{TOTAL_AMOUNT}}`, `{{PREPAYMENT_AMOUNT}}`,
  `{{REMAINING_AMOUNT}}`) that serves both the EN and UA columns, and prints the
  currency once per header (`PRICE ({{CURRENCY}})` / `ЦІНА ({{CURRENCY}})`). So
  amounts are formatted once; only the *date* is localised per language
  (`May 03, 2025` EN vs `03.05.2025` UA), which is correct localisation. Formatting
  the money as `1 234,56` in the UA half and `1,234.56` in the EN half would be
  non-standard and matches neither the tools nor the template. *(Vendor docs do
  not address per-column money formatting because none of them produce a single
  bilingual document; this conclusion is grounded in the template plus the
  uniform-format behaviour above.)*

## 4. Status models without a payment integration

**Consensus: a small set of statuses; the ones tied to *time* (overdue) are
*derived*, and the ones tied to *the client's behaviour or a payment rail*
(viewed, partially paid, paid-by-integration) require server-side tracking that a
browser-only, no-payments app cannot produce.**

| Product | Statuses (invoice) | Derived from a date? |
| --- | --- | --- |
| Stripe | `draft`, `open`, `paid`, `void`, `uncollectible` | `open` past due is surfaced as "past due"; `paid`/`void` are terminal ([overview](https://docs.stripe.com/invoicing/overview), [transitions](https://docs.stripe.com/invoicing/integration/workflow-transitions)) |
| Wave | Draft, Unsent, Sent, Viewed, Partial, Overdue, Paid, Overpaid | **Overdue** = unpaid & past due date ([Wave — invoice statuses](https://support.waveapps.com/hc/en-us/articles/39378150396820-Invoice-statuses)) |
| Zoho | Draft, Sent, Unpaid, Partially Paid, **Overdue**, Paid (+ approval states) | **Overdue** = past due date, auto-set ([Zoho ERP — understanding invoices](https://www.zoho.com/en-in/erp/help/sales/invoices/understanding.html), [Zoho Books — life cycle](https://www.zoho.com/us/books/kb/invoices/invoice-life-cycle.html)) |
| FreshBooks | Draft, Sent, Viewed, Outstanding, **Overdue**, Partially Paid, Paid, Auto-Paid, Disputed | **Overdue** = unpaid & past due date ([FreshBooks — manage invoices](https://support.freshbooks.com/hc/en-us/articles/4404632032013-How-do-I-manage-my-invoices)) |

Key observations for our design:

- **Overdue is derived from the due date in every product** (Wave, Zoho,
  FreshBooks all define it as "unpaid and past the due date"). This exactly
  validates our settled decision to *derive* `overdue` from `sent` + payment
  deadline, and never store it.
- **`viewed` / `partial` / `auto-paid` cannot exist for us.** `viewed` needs a
  hosted page that reports when the client opens it; `partial`/`auto-paid` need a
  payment rail. A browser-only generator with no server state and no payments
  cannot observe any of these, so dropping them is correct, not a shortcoming.
- **`draft`/`sent`/`paid`/`cancelled` is a legitimate subset.** Our `draft` and
  `sent` map to Stripe `draft`/`open`; `paid` is the manual terminal state
  (matching that `paid` is user-set everywhere without an integration);
  `cancelled` maps to Stripe `void` / Wave "write off."
  ([Stripe — overview](https://docs.stripe.com/invoicing/overview),
  [Wave — write off an invoice](https://support.waveapps.com/hc/en-us/articles/115000031243-Write-off-an-invoice))
- **Terminal states lock editing.** Stripe forbids revising an invoice that is
  `void` or `paid`; only `draft` (and `open`) are editable. The analogue for us:
  once `paid` or `cancelled`, the document is frozen.
  ([Stripe — edit invoices](https://docs.stripe.com/invoicing/invoice-edits))

## 5. Editing after send, and duplicating

**Editing after send — the serious model is: a sent invoice is an issued
financial document; you correct it by *cancel + reissue with a new number*, not
by silently mutating it in place.**

- Stripe is the strictest and clearest: a finalised invoice is edited only by
  **voiding the old invoice and finalising a new one, which gets a new number**;
  the replacement "references the old invoice number." You *cannot* revise a
  `void` or `paid` invoice at all.
  ([Stripe — edit invoices](https://docs.stripe.com/invoicing/invoice-edits))
- Zoho / Wave / FreshBooks are more permissive — they allow in-place edits of a
  sent invoice — but treat it as a bookkeeping event and restrict some fields once
  sent (e.g. Wave's reminder settings apply only to invoices "that have not been
  marked as sent"), and payment reconciliation constrains what can change.
  ([Wave — how Wave bookkeeps your invoices](https://support.waveapps.com/hc/en-us/articles/115000202863-Understand-how-Wave-bookkeeps-your-invoices))
- Net best practice: **drafts are freely editable; issued (sent) invoices should
  be immutable in identity/amount**, with corrections flowing through a
  cancel-and-reissue (new number). This aligns with the register's snapshot
  principle (an issued invoice stores a snapshot of what was printed).

**Duplicating — universally supported, and it always mints a *new* number on a
fresh draft.**

- Zoho "Clone": "A new invoice creation page opens with details pre-populated
  from the previous invoice … The system will automatically assign a new invoice
  number to the cloned invoice when you save it." Saved as a draft.
  ([Zoho — clone an invoice](https://www.zoho.com/us/invoice/kb/invoices/invoice-clone.html))
- FreshBooks and Wave offer the same "duplicate / save as" that copies client and
  line data into a new draft with a new number and today's date.

## 6. Sharing: file vs link

**Every surveyed product defaults to a *link* — a hosted invoice page at a
secret URL — with PDF download as a secondary affordance.**

- Stripe's **Hosted Invoice Page** is "a secure, private URL where your customers
  can view, pay, and download copies of the invoice"; its URL is exposed as
  `hosted_invoice_url`, embedded in emails and in the PDF footer.
  ([Stripe — hosted invoice page](https://docs.stripe.com/invoicing/hosted-invoice-page))
- Zoho, Wave and FreshBooks likewise send a link to a hosted invoice/payment page
  and let the client download the PDF from there.

What the *link* model exposes that a *file* model does not: a persistent,
server-hosted page carrying the invoice contents, its **live status**, a **pay**
action, and download — and it is *tracked*, which is exactly what powers the
`viewed` status. Our app deliberately ships the **file** only (a PDF rendered by
a stateless function and forgotten): no hosted page, no link, no server state,
nothing tracked. The trade-off is explicit and already settled — we forgo online
payment and `viewed` tracking; we gain zero server state and privacy. Our choice
is a deliberate divergence from every product here, consistent with the map's
settled decision 2.

---

## 7. Invoice content for a Ukrainian ФОП billing a foreign client

Distinguishing **legal requirement** from **convention**. Note that Ukraine has
**no statutory mandatory *form* for a рахунок / invoice**; the requirements below
attach either to the general "primary document" rules or to banking / currency
control.

### Legal requirements

1. **There is no податкова накладна (VAT tax invoice).** A single-tax (єдиний
   податок) ФОП who is not a VAT payer issues no VAT invoice and adds no VAT line.
   The commercial document is the рахунок / інвойс. *(Consequence: the template's
   lack of any tax/VAT line is correct for the target user.)*
2. **If the invoice functions as the *primary document*, it must carry the Law
   996-XIV Art. 9 mandatory requisites.** The State Tax Service's position is that
   a рахунок-фактура (інвойс) "can serve as the basis for recording a business
   transaction … without a separate acceptance-transfer act, provided that the
   invoice has been paid," with payment confirmed by a bank/payment document.
   ([ДПС — on the application of invoices (рахунків-фактур/інвойсів)](https://od.tax.gov.ua/media-ark/news-ark/669798.html))
   The Art. 9 mandatory requisites of a primary document are: **name of the
   document (form); date of drawing up; name of the entity on whose behalf it is
   drawn up; content and volume of the business operation and unit of measure;
   positions of the persons responsible; personal signature or other identifying
   data.**
   ([Law of Ukraine 996-XIV "On Accounting and Financial Reporting", Art. 9](https://zakon.rada.gov.ua/go/996-14))
   *(The template's `SIGNATURE` block, the "SUBJECT MATTER" table with quantity
   and unit price, the invoice number/date, and supplier name all map onto these
   requisites.)*
3. **The document must exist in Ukrainian; a foreign-language document that
   underlies accounting entries must have an authentic Ukrainian translation.**
   ДПS: "Primary documents, accounting registers, and financial reporting are
   drawn up in Ukrainian. Documents that are the basis for entries in accounting
   and are drawn up in a foreign language must have an ordered authentic
   translation into Ukrainian."
   ([ДПС Kyiv — primary documents must be in Ukrainian](https://kyiv.tax.gov.ua/media-ark/news-ark/551354.html),
   [ДПС Chernivtsi — same](https://cv.tax.gov.ua/media-ark/news-ark/678863.html),
   [ДПС — may an invoice be issued in English only, without translation?](https://zp.tax.gov.ua/media-ark/news-ark/1006008.html))
   *(This is the legal foundation for the invoice being **bilingual EN + UA**: the
   UA column is not decoration, it satisfies the Ukrainian-language requirement,
   while EN serves the foreign client. This elevates our bilingual requirement
   from convention to a compliance driver.)*
4. **For export of services, the confirming documents in ЗЕД are the act and/or
   the invoice.** ДПS: "Documents confirming the export of works/services in
   foreign-economic activity are documents certifying their provision, in
   particular an act of completed works (services rendered), an invoice (інвойс)."
   A foreign-economic services contract "may be concluded … including by issuing
   an invoice, including in electronic form."
   ([ДПС Odesa — documents confirming export of works/services](https://od.tax.gov.ua/media-ark/news-ark/613497.html),
   [ДПС Zaporizhzhia — same](https://zp.tax.gov.ua/media-ark/news-ark/668850.html))
   The currency-control payment-settlement deadline for exported services runs
   from the date of the act or invoice.
   ([ДПС — export confirmation documents](https://zp.tax.gov.ua/media-ark/news-ark/668850.html);
   Law of Ukraine 2473-VIII "On Currency and Currency Operations")
5. **Income is recognised in UAH at the NBU rate on the date the currency is
   received**, and the servicing bank performs currency supervision on the inflow.
   ([Taxer knowledge base — foreign-currency income for a single-tax ФОП](https://taxer.ua/uk/kb/yak-fop-platniku-yep-otrimati-dohid-z-za-kordonu-u-valyuti);
   Law 2473-VIII) *(Bank-side; not printed on the invoice, but it is why the
   invoice must be accurate and traceable.)*

### Conventions (strongly expected, but not a statutory invoice form)

- **Supplier block:** ФОП full name (as registered), tax number (РНОКПП / "ІПН"),
  registration address. Present in the template.
- **Bank block for a currency inflow:** beneficiary name, **IBAN**, beneficiary
  bank name and location, **SWIFT/BIC**, and typically the **correspondent bank**;
  clause that the client bears all bank and correspondent-bank (SWIFT) charges.
  These are what a Ukrainian bank needs to credit USD/EUR correctly; they are
  banking practice, not a statutory list. Present in the template (SUPPLIER bank
  info + TERMS item 1).
- **Client block:** name and address of the foreign customer.
- **Line items:** description of services, quantity, unit price, amount, currency.
- **"Invoice is an offer; payment is acceptance."** The template's TERMS items 2
  and 5 encode the Ukrainian civil-law construction of a рахунок as a public offer
  whose payment (a) forms the contract and (b) simultaneously evidences delivery /
  acceptance (standing in for the акт). This is convention, but it is what lets a
  *paid* invoice act as the primary document per finding (2).
- **Purpose-of-payment line** (`Payment by the invoice №… from …`): banking
  convention so the inbound SWIFT payment references the invoice.

**Overall:** for our target user the invoice is primarily a *commercial /
currency-control* instrument and a *conditional primary document* (valid as such
once paid). The hard legal levers are: Ukrainian-language presence (→ bilingual),
Art. 9 requisites if it is to stand as the primary document, and accurate
supplier/bank identification for the currency inflow. Everything about the number
format, layout, and terms wording is convention.

---

## 8. Divergence table (keyed by requirement ID)

`docs/requirements.md` vs. what the research found. "Severity" flags how much a
downstream decision depends on it.

| Req ID | What the spec says | What best practice / law says | Divergence | Severity |
| --- | --- | --- | --- | --- |
| **FR-CALC-01** | Invoice number = `DDMM/0YY` (date-derived), e.g. `0305/025`. No counter. | Number is a **unique sequential counter separate from the date**; uniqueness is enforced; a date may appear only *alongside* a counter. ([Zoho](https://www.zoho.com/us/invoice/kb/invoices/auto-generation.html), [Invoice Ninja](https://invoiceninja.github.io/docs/user-guide/advanced-settings), [Wave](https://support.waveapps.com/hc/en-us/articles/8052061799444-Frequently-asked-questions-about-invoicing)) | **Two invoices on the same calendar day collide** (`DDMM/0YY` has no per-day counter). The scheme guarantees non-uniqueness, the one property a number must have. Feeds **07**. | High |
| **FR-CALC-01 (timing)** | Spec is silent on *when* the number is assigned. | Assigned **on issue/finalise, not on draft**, to keep the sequence gapless; abandoned drafts consume no number. ([Stripe changelog](https://docs.stripe.com/changelog/2020-03-02/sequentially-number-invoices), [Stripe transitions](https://docs.stripe.com/invoicing/integration/workflow-transitions)) | Spec never states the assignment moment; our analogue of "finalise" is `draft → sent`. Must be decided. Feeds **07**. | High |
| **FR-CALC-01 (editable/unique)** | Not stated. | Number is **editable but must be unique** within the register; collisions are blocked or auto-resolved. ([Wave](https://support.waveapps.com/hc/en-us/articles/8052061799444-Frequently-asked-questions-about-invoicing), [Invoice Ninja](https://invoiceninja.github.io/docs/user-guide/advanced-settings)) | Spec omits editability + uniqueness enforcement. Feeds **07**. | Medium |
| **FR-CALC-03** | "**Unit price = total amount ÷ quantity**"; user authority is the **total**. | Authority is the **unit price × quantity → amount → total**; total is derived, never entered. ([Zoho](https://www.zoho.com/us/books/help/invoice/), [Stripe price object](https://docs.stripe.com/api/prices/object)) | **Inverted authority.** Dividing total by quantity can print a unit price that, ×quantity, ≠ the printed total (`100.00÷3=33.33; 33.33×3=99.99`). Our template has *both* a PRICE and an AMOUNT column, so the mismatch would be visible. Feeds **06**. | High |
| **FR-CALC-03 (rounding)** | "amounts formatted with 2 decimal places" — presentation only; no money model. | Amounts held as **integer minor units (cents)**; 2-dp is intrinsic to USD/EUR; rounding residue absorbed into the derived total or an explicit adjustment line. ([Stripe currencies](https://docs.stripe.com/currencies), [Stripe charge object](https://docs.stripe.com/api/charges/object), [Zoho round-off](https://help.zoho.com/portal/en/community/topic/round-off-adjustment-of-invoices)) | Spec treats decimals as formatting, not as a stored money type; no rounding rule defined. Feeds **06**. | High |
| **FR-CALC-02** | Date rendered EN `May 03, 2025` + UA `03.05.2025`. | Dates *are* localised per language; money is *not*. Matches template. | **No divergence** — correct localisation. Recorded for contrast with money formatting. | None |
| **FR-CALC-04 / FR-CALC-06** | Prepayment = total × %; balance = total − prepayment; purpose-of-payment line. | Consistent with convention; purpose-of-payment line matches banking practice. | **No divergence** (but inherits the FR-CALC-03 money-model issue). | Low |
| **Currency formatting (FR-INPUT-04 / template)** | USD \| EUR only; no separator/format rule stated. | One uniform format per document (`1,234.56` for USD/EUR); **not** split per language column; template already uses a single shared money cell. ([Stripe currencies](https://docs.stripe.com/currencies), [Zoho decimals](https://help.zoho.com/portal/en/community/topic/ability-to-move-the-decimal-place)) | Spec leaves separators/format unspecified; should pin one format. Feeds **06**. | Medium |
| **FR-EDIT-01** | "Edit existing invoice by number; dependent fields recalculated." | Drafts freely editable; an **issued invoice should be immutable** — correct via cancel + reissue (new number). ([Stripe edit invoices](https://docs.stripe.com/invoicing/invoice-edits)) | Spec implies unrestricted in-place edit of any invoice by number, including sent ones — conflicts with the snapshot principle and with terminal-state locking. Feeds **07**. | Medium |
| **FR-EDIT-02** | "Duplicate with new number/date, same client/service data." | Duplicate/clone copies data into a **fresh draft with a new number**. ([Zoho clone](https://www.zoho.com/us/invoice/kb/invoices/invoice-clone.html)) | **Aligned.** Only clarify it produces a draft and mints the new number on save. | None |
| **Status model (invoice-registry)** | Stored: draft, sent, paid, cancelled; overdue derived. | Overdue is derived from due date everywhere; `viewed`/`partial` need server/payment tracking we lack. ([Wave](https://support.waveapps.com/hc/en-us/articles/39378150396820-Invoice-statuses), [Zoho](https://www.zoho.com/en-in/erp/help/sales/invoices/understanding.html), [FreshBooks](https://support.freshbooks.com/hc/en-us/articles/4404632032013-How-do-I-manage-my-invoices)) | **Aligned** with the settled decision; validated against industry. Add: lock editing in `paid`/`cancelled`. | None |
| **FR-EXPORT-05 (share)** | Share PDF via download or Web Share API. | Industry defaults to a **hosted link**; file-only is a deliberate divergence. ([Stripe hosted page](https://docs.stripe.com/invoicing/hosted-invoice-page)) | Intentional divergence (settled decision 2). No action; documented so it is a choice, not an omission. | None |
| **BC-I18N-01 / NFR-I18N-01** | Invoice bilingual EN + UA (stated as product/convention). | Ukrainian-language presence is a **legal** requirement for a document underlying accounting; foreign-language docs need an authentic UA translation. ([ДПС](https://kyiv.tax.gov.ua/media-ark/news-ark/551354.html), [ДПС](https://cv.tax.gov.ua/media-ark/news-ark/678863.html)) | Not a divergence in behaviour, but the spec **under-states the reason**: bilingual is compliance, not styling. Strengthen the rationale. | Low |
| **BC-LEGAL-01 (TERMS immutable)** | TERMS 1–8 immutable. | TERMS 2 & 5 encode "invoice = offer; payment = acceptance/act," which is what lets a *paid* invoice act as the primary document. ([ДПС](https://od.tax.gov.ua/media-ark/news-ark/669798.html)) | **Aligned**, and load-bearing legally — worth annotating why items 2 & 5 must not be edited. | None |
| **BC-NACE-06 / template** | No VAT line (implicit). | A non-VAT single-tax ФОП issues no податкова накладна and no VAT line. ([ДПС context](https://od.tax.gov.ua/media-ark/news-ark/669798.html)) | **Aligned**; recorded so the absence of VAT is an explicit, justified choice. | None |

### Sources index

Stripe: [overview](https://docs.stripe.com/invoicing/overview) ·
[transitions/finalization](https://docs.stripe.com/invoicing/integration/workflow-transitions) ·
[sequential-numbering changelog](https://docs.stripe.com/changelog/2020-03-02/sequentially-number-invoices) ·
[numbering logic](https://support.stripe.com/questions/invoice-numbering-logic-in-stripe-billing) ·
[edit invoices](https://docs.stripe.com/invoicing/invoice-edits) ·
[hosted invoice page](https://docs.stripe.com/invoicing/hosted-invoice-page) ·
[currencies](https://docs.stripe.com/currencies) ·
[price object](https://docs.stripe.com/api/prices/object) ·
[charge object](https://docs.stripe.com/api/charges/object).
Zoho: [auto-generation](https://www.zoho.com/us/invoice/kb/invoices/auto-generation.html) ·
[invoices help](https://www.zoho.com/us/books/help/invoice/) ·
[understanding invoices](https://www.zoho.com/en-in/erp/help/sales/invoices/understanding.html) ·
[life cycle](https://www.zoho.com/us/books/kb/invoices/invoice-life-cycle.html) ·
[clone](https://www.zoho.com/us/invoice/kb/invoices/invoice-clone.html).
Wave: [invoice statuses](https://support.waveapps.com/hc/en-us/articles/39378150396820-Invoice-statuses) ·
[invoicing FAQ](https://support.waveapps.com/hc/en-us/articles/8052061799444-Frequently-asked-questions-about-invoicing) ·
[bookkeeping](https://support.waveapps.com/hc/en-us/articles/115000202863-Understand-how-Wave-bookkeeps-your-invoices) ·
[write off](https://support.waveapps.com/hc/en-us/articles/115000031243-Write-off-an-invoice).
FreshBooks: [manage invoices](https://support.freshbooks.com/hc/en-us/articles/4404632032013-How-do-I-manage-my-invoices) ·
[what is an invoice number](https://www.freshbooks.com/hub/invoicing/what-is-an-invoice-number) ·
[API invoices](https://www.freshbooks.com/api/invoices).
Invoice Ninja: [advanced settings](https://invoiceninja.github.io/docs/user-guide/advanced-settings).
Ukraine legal / tax: [Law 996-XIV Art. 9](https://zakon.rada.gov.ua/go/996-14) ·
[ДПС — invoices as primary docs](https://od.tax.gov.ua/media-ark/news-ark/669798.html) ·
[ДПС — export confirmation docs](https://od.tax.gov.ua/media-ark/news-ark/613497.html) ·
[ДПС — export docs (Zaporizhzhia)](https://zp.tax.gov.ua/media-ark/news-ark/668850.html) ·
[ДПС — Ukrainian-language requirement](https://kyiv.tax.gov.ua/media-ark/news-ark/551354.html) ·
[ДПС — same (Chernivtsi)](https://cv.tax.gov.ua/media-ark/news-ark/678863.html) ·
[ДПС — English-only invoice?](https://zp.tax.gov.ua/media-ark/news-ark/1006008.html) ·
[Taxer KB — ФОП foreign-currency income](https://taxer.ua/uk/kb/yak-fop-platniku-yep-otrimati-dohid-z-za-kordonu-u-valyuti).
</content>
</invoke>
