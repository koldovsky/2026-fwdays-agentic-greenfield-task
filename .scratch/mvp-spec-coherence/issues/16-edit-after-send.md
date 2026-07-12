# 16 — May a sent invoice be edited, or only cancelled and reissued?

Type: grilling
Status: open
Blocked by: 07, 08

## Question

Graduated from the map's fog after
[What serious invoice makers actually do](02-invoice-maker-best-practices.md)
made it sharp. That research found that serious tools treat an **issued** invoice
as immutable: a mistake is corrected by cancelling and reissuing, never by
editing in place, because the client already holds the old document.

Two specs written by commit `8d45456` already disagree about this:

- `openspec/specs/invoice-registry/spec.md:3` — *"Browser-side invoice register
  with manual statuses and **immutable issued snapshots**."*
- `openspec/specs/invoice-edit/spec.md` — *"`FR-EDIT-01`: The user SHALL be able
  to open an existing invoice **by number** and edit fields **allowed for its
  status**."* Nothing anywhere defines which fields those are.

And a third contradiction hides in the wording. Ticket `02` concluded the number
should be assigned when an invoice is **issued**, not when the draft is created.
If that holds, a draft **has no number** — so `FR-EDIT-01`'s "open by number"
cannot address the very thing its own scenario edits, which is titled
*"Edit draft"*.

## Decide

- **What is editable at each stored status.** `draft` — presumably everything.
  `sent` — nothing, or a defined subset? `paid` and `cancelled` — ticket `02`
  recommends freezing both outright.
- **How a sent invoice is corrected.** Cancel and reissue, producing a second
  document with its own number? If so, does the cancelled one stay in the
  register, and does its number die with it (ticket `07`)?
- **How a draft is addressed** if it has no number yet. By the opaque record id
  from ticket `08`? Then `FR-EDIT-01` needs rewording, and `FR-EDIT-02`
  ("duplicate with a new number and date") needs to say *when* that new number is
  minted.
- **What `FR-EDIT-01` and `FR-EDIT-02` become**, and whether
  `openspec/specs/invoice-edit/spec.md` survives as a capability or folds into
  `invoice-registry`.

## Note

This is a decision, not a repair. But it is also an audit: whatever is decided
here must be reconciled against the two specs above, which already assert
incompatible answers. See
[Six requirements vanished in the migration](15-audit-the-migration.md).
