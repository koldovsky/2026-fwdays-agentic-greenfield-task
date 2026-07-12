# 08 — What a stored invoice record contains

Type: grilling
Status: open
Blocked by: 06, 07

## Question

This is the centre of the map. Run it with `/grilling` **and**
`/domain-modeling` — the output replaces `CONTEXT.md` wholesale and seeds the
`invoice-registry` capability in `openspec/specs/`.

We do not store the PDF (map, settled decision 2). We store a row and
regenerate the document from it. Two consequences must be nailed down.

**(a) Snapshot versus reference.** Map decision 7 says the row holds a snapshot
of everything printed on the document. Enumerate exactly what that is: supplier
details, client details, service description text, NACE code, quantity, amounts,
prepayment, both deadlines, both date renderings, place of issue, signatory.
State plainly which fields — if any — are references into the supplier and
client directories rather than copies. The failure this prevents: the user edits
their IBAN in settings, and every past invoice silently starts showing it.

**(b) Stored versus derived.** `overdue` is derived (map decision 4). What else?
`unit price` is derived from ticket `06`'s decision — or is it the stored one?
The invoice date's two renderings (`FR-CALC-02`: `May 03, 2025` and
`03.05.2025`) are surely derived from one instant. The payment purpose string
(`FR-CALC-06`) is derived from the number and the date. Persisting a derived
value is how a system starts contradicting itself.

**(c) The status type.** Storing `draft | sent | paid | cancelled` while
*displaying* `draft | sent | paid | overdue | cancelled` means these are two
different types. `src/types/invoice.ts:1-7` conflates them, and so does
`src/lib/design-system.ts:5-11`. Name both types and state which is persisted.

**(d) Retire the wrong glossary.** `CONTEXT.md` currently defines
`Organization`, `Payment`, `LineItem`, `Sent`, `Paid`, `Overdue`, `Void` — and
instructs every reader to "use these terms consistently in code, docs, and UI".
Decide, term by term, what each becomes: kept, renamed, or deleted. Note that
`Organization` and `Payment` are already out of scope, and `Void` was replaced
by `cancelled` while charting.

**(e) The NACE catalog entry.** Ticket `03(d)` establishes whether one class
code may carry several invoice line texts — `docs/requirements.md:69-74` keys
two different rows on `74.12`. Model the catalog entry accordingly: the code is
probably an attribute, not the key.

## Consumers

Tickets `10`, `11`, `12` and `13` all wait on this. Two **Not yet specified**
entries — the form field set, and the directory field sets — graduate from here.
