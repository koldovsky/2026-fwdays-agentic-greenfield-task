# 07 — The invoice number, and what identifies an invoice

Type: grilling
Status: resolved
Blocked by: 02

## Question

`FR-CALC-01` fixes the number format as `DDMM/0YY` — day, month, a literal `0`,
two-digit year. An invoice issued on 2025-05-03 is `0305/025`.

Two invoices issued on the same day therefore carry the **same number**. And
`FR-EDIT-01` identifies an invoice for editing **by its number**. The format
cannot both collide and serve as an identifier.

Decide, with the numbering survey from ticket `02` in hand:

- **What identifies an invoice record.** A number, or an opaque id with the
  number as a display field?
- **Must the number be unique**, and what happens on the second invoice of a
  day? A sequence suffix, a different format, or a refusal?
- **Is the number editable** by the user?
- **What is the literal `0`** in `DDMM/0YY`, and must it stay? `docs/research.md:26-32`
  states the rule but never explains the character.
- **When is the number assigned** — when the draft is created, or when the user
  marks it `sent`? A draft that reserves a number and is then cancelled leaves a
  gap; a number assigned on send means the draft has no name.
- **Is a cancelled number reused?** Map decision 4 keeps `cancelled` as a stored
  status precisely so the record survives — confirm that the number dies with it.
- **Is numbering per supplier profile, or global?** Map decision 5 allows several
  ФОП profiles in one browser. Two entrepreneurs sharing one number sequence is
  probably wrong; sharing one browser is not.

## Consumers

Ticket `08` needs the identity rule before it can describe the record.
The **Not yet specified** entry on edit and duplicate semantics graduates from
here.

---

## Answer

Grilled with the human on 2026-07-10. The human chose the **sequential counter**
over preserving `DDMM/0YY` — an explicit break with the legacy format, accepted
to eliminate same-day collisions by construction.

- **Scheme: per-year sequential counter**, default rendering `YYYY-NNN`
  (e.g. `2026-001`). `FR-CALC-01` (`DDMM/0YY`) is **replaced**, not amended.
- **Assigned on issue** (`draft → sent`). A draft has no number and is
  addressed by its opaque record id (ticket 08's identity).
- **Editable** by the user, with a uniqueness check against the register.
- **Sequence is per supplier profile** — two ФОПs in one browser never share
  a counter.
- **A cancelled invoice keeps its number; the number is never reused.**
- The opaque record id — not the number — identifies an invoice internally;
  `FR-EDIT-01` "edit by number" needs rewording (ticket 16).

Consumers: ticket `08` (identity + numbering fields), ticket `16` (draft
addressing), `openspec/specs/invoice-calc/spec.md` delta (FR-CALC-01 replaced),
`FR-CALC-06` payment purpose now reads `Payment by the invoice №2026-001 from …`.
