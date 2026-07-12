# 15 — Six requirements vanished in the migration. Was each a decision?

Type: research
Status: resolved
Blocked by: —

## Why this ticket exists

Commit `8d45456` ("Align MVP docs and OpenSpec with browser-first architecture")
executed most of this map before its decisions were taken. It created eleven
`openspec/specs/<capability>/spec.md` files, rewrote `docs/requirements.md`,
`CONTEXT.md`, `docs/ARCHITECTURE.md`, both ADRs, `Design.md`, `AGENTS.md` and
`openspec/config.yaml`, and touched `src/`.

Much of it is right, and it matches the map's settled decisions. But
`openspec validate --all --strict` reports **11 passed, 0 failed**, and that
green tick means only that the headings are well-formed. It checks structure,
not coverage, and not consistency.

## Question

**(a) Six requirement IDs exist in `docs/requirements.md` and appear in no spec.**
For each, establish whether the omission was a decision or an accident, and say
which:

| Dropped ID | What it said | Where it should have landed |
| --- | --- | --- |
| `FR-NACE-02` | 74.12 — graphic design seed entry | `nace-catalog` |
| `FR-NACE-03` | 74.12 / 74.14 — 3D visualisation seed entry | `nace-catalog` |
| `FR-NACE-04` | **59.12 — video post-production** seed entry | `nace-catalog` |
| `FR-TPL-02` | Fixed title, **subtitle `Graphic Design Service`**, signature | `document-render` |
| `FR-TPL-04` | Optional `{{PROJECT_BLOCK}}` | `document-render` |
| `FR-CALC-05` | Payment deadline and execution term computation | `invoice-calc` |

Note the shape of it: `FR-NACE-04` (video) and `FR-TPL-02` (frozen
graphic-design subtitle) are the two halves of the conflict ticket `09` exists to
resolve. **Both disappeared.** Dropping both does make the contradiction go
away — but it also silently removes video-editing invoices from the product. If
that was intended, it is a scope decision and belongs in the map's *Out of
scope*. If it was not, the catalog has lost a third of its seed data.

`FR-CALC-05` is not a conflict at all. Payment and execution deadlines are
printed on every invoice and drive the derived `overdue` status. Its absence
looks like an accident.

**(b) Three requirements survived but assert what nobody has decided.** Confirm,
and route each to the ticket that owns it:

- `invoice-calc/spec.md:22` — *"SHALL compute unit price as total amount ÷
  quantity, formatted to two decimal places."* No rounding rule. Meanwhile
  `src/types/invoice.ts` stores `unitPrice` on the line item and computes
  `calculateLineTotal = quantity × unitPrice` — **the opposite direction.** The
  new spec and the new code contradict each other, both were committed together,
  and both pass their checks. → ticket `06`.
- `invoice-registry/spec.md:29` — *"SHALL persist in browser storage
  (localStorage **or** IndexedDB)."* A requirement containing "or" cannot be
  implemented or tested. → ticket `10`.
- `nace-catalog/spec.md:26` — *"SHALL display the NACE code … **when ticket 09
  resolves placement**."* A `SHALL` that defers to an open planning ticket. And
  ticket `03` is at this moment establishing whether printing the code is a legal
  requirement, a convention, or an invention. → tickets `03`, `09`.

**(c) The `Invoice` type contradicts settled decision 7.**
`src/types/invoice.ts` holds `clientId` — a *reference* — and carries no supplier
snapshot and no NACE field. The map says an issued invoice stores a **snapshot**
of everything printed on it, precisely so that editing a supplier's IBAN does not
rewrite last year's invoices. → ticket `08`.

**(d) What does `openspec validate --strict` actually guarantee?** Establish its
checks, and state plainly which of the defects above it is structurally
incapable of catching. The team needs to know what the green tick is worth
before it is trusted again.

## Output

A markdown summary at `.scratch/mvp-spec-coherence/assets/15-migration-audit.md`:
a per-ID verdict table (decision / accident / open), and a short statement of
what `openspec validate --strict` does and does not prove.

---

## Answer

Full evidence trail (file:line per claim) in
[`assets/15-migration-audit.md`](../assets/15-migration-audit.md). Audited at
`54b0715`; `openspec/specs/` is unchanged since `8d45456`, so all findings are
current.

**(a) All six omissions are accidents — zero decisions, zero scope changes.**
The docs restructure (`37640ae`, `c78f3c0`) did not remove the IDs; it moved
them. All six survive as `proposed` in the restructured `docs/requirements.md`,
in `docs/capabilities/{nace-catalog,invoice-calc,document-render}.md`, and in
`openspec/capability-map.yaml` — they are missing **only** from
`openspec/specs/`. The clincher: the migration commit itself kept them
`proposed` in `docs/requirements.md` while using the `dropped` status, in the
same file, for `FR-CHAT-*` — a deliberate drop had an obvious way to say so and
didn't. No commit message, ADR, or capability doc records a reason.
Specifically: **video invoices (`FR-NACE-04`) were never removed from the
product** — the `FR-NACE-04`/`FR-TPL-02` disappearance is not a resolution of
ticket 09's conflict, just the migration agent skipping what it couldn't
reconcile. `FR-TPL-02`'s TERMS half did land as `BC-LEGAL-01`; its frozen
"Graphic Design Service" subtitle half is nowhere. `FR-CALC-05` is the most
load-bearing loss: `invoice-registry`'s overdue derivation depends on a payment
deadline that no spec defines how to compute.

**FR-NACE-06:** ticket 03 dropped it, but the drop propagated nowhere — it is
still a `SHALL` in `nace-catalog/spec.md:25-26` and still `proposed` in
`docs/requirements.md:73`, `docs/capabilities/nace-catalog.md:28`, and
`capability-map.yaml:66,229`.

**(b) All three undecided assertions confirmed, verbatim, at:**
`invoice-calc/spec.md:22` (unit price = total ÷ quantity — inverted vs ticket
02's authority *and* vs `docs/capabilities/invoice-calc.md:46`, which already
verifies the opposite direction); `invoice-registry/spec.md:29` ("localStorage
or IndexedDB"); `nace-catalog/spec.md:26` ("when ticket 09 resolves
placement").

**(c) Confirmed — `src/types/invoice.ts` still contradicts settled decision 7**
and is unchanged since the migration: `clientId` reference at line 17 (no
client snapshot), no supplier/banking fields at all (while `banking` and
`invoice-registry` specs promise data "from the snapshot"), no NACE field,
float `unitPrice` instead of integer cents. Spec and type were committed
together and cannot both be true.

**(d) `openspec validate --strict` is a per-file format linter, nothing more.**
Verified against CLI v1.5.0 source and observed output (11 valid, exit 0). It
checks: headers `## Purpose`/`## Requirements`, ≥1 requirement, the literal
token SHALL/MUST in each requirement, `#### Scenario:` formatting, and (strict
only, via warnings) Purpose ≥ 50 chars and ≥1 scenario per requirement. It has
no concept of requirement IDs, never reads `docs/`, `src/`, or a second spec
file. Coverage gaps, "or"s, ticket deferrals, inverted formulas, and
spec-vs-code contradictions — i.e. **every defect in this audit** — are
structurally outside its reach. Note also: `npm run capability:check` reads
only `capability-map.yaml`, so **no tool in the repo verifies that an owned ID
appears in its owning spec**.

**Repairs needed** (routed; not performed here):

- **→ 06:** rewrite `FR-CALC-03` in `invoice-calc/spec.md:22` to unit × qty →
  total, integer cents, explicit rounding; restore `FR-CALC-05` (deadline /
  execution term) into `invoice-calc/spec.md` — `invoice-registry`'s overdue
  rule is undefined without it.
- **→ 08:** rework `src/types/invoice.ts` to snapshot semantics (client +
  supplier snapshots on issued invoices, NACE on line items); restore
  `FR-NACE-02/03/04` seed entries into `nace-catalog/spec.md` using 03(d)'s
  modelling (entries *carry* a class code; the code is not a unique key).
- **→ 09:** decide the subtitle, then restore `FR-TPL-02` into
  `document-render/spec.md` with the decided wording (its TERMS half already
  lives there as `BC-LEGAL-01`); execute ticket 03's drop of `FR-NACE-06` in
  `nace-catalog/spec.md`, `docs/requirements.md:73`,
  `docs/capabilities/nace-catalog.md:28`, and `capability-map.yaml`.
- **→ 10:** replace `invoice-registry/spec.md:29`'s "localStorage or IndexedDB"
  with one chosen backend.
- **→ 16:** when specifying edit-after-send, also restore `FR-TPL-04`
  (`{{PROJECT_BLOCK}}`) into `document-render/spec.md` alongside the
  immutability rules, or hand it to 09 if template scope lands there first.
