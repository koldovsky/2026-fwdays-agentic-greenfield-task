# 09 — What the document freezes, and where the NACE code goes

Type: grilling
Status: open
Blocked by: 03, 05

## Question

Three accepted constraints cannot all be true at once.

**Conflict 1 — the frozen subtitle.** `FR-TPL-02` declares the subtitle
`Graphic Design Service` immutable. `FR-NACE-04` supports invoices for video
post-production under NACE `59.12`. A video-editing invoice therefore prints
"Graphic Design Service" across the top. Either the subtitle varies with the
service, or the product cannot bill for video.

**Conflict 2 — the missing placeholder.** `FR-NACE-06` requires the NACE code to
appear next to the service description. `docs/invoice-template.html` has **no
placeholder for it** — the full placeholder set was extracted during charting
and contains none. Meanwhile `TC-STACK-03`, `BC-BRAND-01` and `BC-LEGAL-01`
freeze the template. Ticket `03(c)` reports whether printing the code is even
correct practice; ticket `05` reports whether the template is still the
document's source of truth at all.

**Conflict 3 — placeholders nobody specified.** These exist in the template and
no requirement says how they are filled:

`{{PLACE_EN}}` · `{{PLACE_UA}}` · `{{PAYMENT_DETAILS}}` ·
`{{PREPAYMENT_TEXT_EN}}` · `{{PREPAYMENT_TEXT_UA}}` · `{{BALANCE_TEXT_EN}}` ·
`{{BALANCE_TEXT_UA}}` · `{{PAYMENT_DEADLINE_TEXT_EN}}` ·
`{{PAYMENT_DEADLINE_TEXT_UA}}` · `{{EXECUTION_TERM_TEXT_EN}}` ·
`{{EXECUTION_TERM_TEXT_UA}}` · `{{SIGNATORY_EN}}` · `{{SIGNATORY_UA}}` ·
`{{PROJECT_BLOCK}} `

Note `{{PROJECT_BLOCK}}`: `FR-TPL-04` renders it "when a project name is
provided", yet **no `FR-INPUT-*` collects a project name**. And note that
`docs/research.md:84-91` calls the supplier block and signature immutable, while
the template exposes `{{SUPPLIER_NAME_EN}}`, `{{SUPPLIER_TAX_ID}}`,
`{{SUPPLIER_IBAN}}` and `{{SIGNATORY_EN}}` as variables — the template is right
and `research.md` is wrong, given map decision 5.

## Decide

- Exactly which regions of the document are immutable (`BC-LEGAL-01` names the
  TERMS items 1–8 and the signature) and which are variable — as a list, not a
  gesture.
- Whether the subtitle becomes a function of the NACE class.
- Whether the NACE code is printed at all, and if so, where.
- The rule for each unspecified placeholder above, including the bilingual
  sentence templates.
- Whether a project name enters the form.
