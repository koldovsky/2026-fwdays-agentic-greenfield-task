# 15 — Migration audit: the six vanished requirements, the surviving assertions, and what the green tick is worth

Audited: 2026-07-10, repo at `54b0715`. Migration commit under audit: `8d45456`
("Align MVP docs and OpenSpec with browser-first architecture", 2026-07-09,
co-authored by a Cursor agent). `openspec/specs/` has **not been touched since
that commit** (`git log -- openspec/specs/` shows exactly one commit), so every
spec finding below is current.

## Context that changed since the ticket was written

`docs/requirements.md` was restructured twice after the migration (`37640ae`
"capability map, gates, and ordered requirements split"; `c78f3c0` "split
roadmap into capability.md and expanded docs folder"). It is now a pure
traceability index; the per-requirement substance moved to
`docs/capabilities/<capability>.md`, and ID ownership is duplicated into
`openspec/capability-map.yaml`. **None of the six IDs vanished from the docs.**
They vanished only from `openspec/specs/`.

## (a) Per-ID verdict table

| ID | What it said (75cfd5a / 8d45456 wording) | Verdict | Evidence | Where it should land |
| --- | --- | --- | --- | --- |
| `FR-NACE-02` | 74.12 graphic & visual design: bilingual line-item text for logos, brand identity, brand book | **accident** | Still `proposed` at `docs/requirements.md:69`, `docs/capabilities/nace-catalog.md:24`, `openspec/capability-map.yaml:62`. `nace-catalog/spec.md` has no seed-entry requirement at all. No reason recorded anywhere. | `nace-catalog` spec, modelled per ticket 03(d)/08: entries *carry* a class code, not keyed by it |
| `FR-NACE-03` | 74.12 / 74.14 3D visualization: bilingual text for 360° virtual-tour points | **accident** | Same trail: `requirements.md:70`, `capabilities/nace-catalog.md:25`, `capability-map.yaml:63`. | `nace-catalog` spec, same modelling caveat |
| `FR-NACE-04` | 59.12 post-production: bilingual text for video editing, VFX, color correction | **accident — not a scope decision** | Still `proposed` at `requirements.md:71`, `capabilities/nace-catalog.md:26`, `capability-map.yaml:64`. `docs/current-state.md:85-86` explicitly expects the seed entries "restored". No *Out of scope* entry drops video anywhere. | `nace-catalog` spec. Video invoices stay in the product; the 09 conflict is resolved on the template side, not by deleting the catalog entry |
| `FR-TPL-02` | Fixed elements unchanged: title `INVOICE / РАХУНОК`, subtitle **`Graphic Design Service`**, TERMS block, signature block | **accident (half survived)** | The TERMS half landed in `document-render/spec.md` as `BC-LEGAL-01 Immutable terms block`; the title/subtitle/signature half is nowhere. Still `proposed` at `requirements.md:84`; `capabilities/document-render.md:24` restates it as "Fixed title, subtitle, TERMS, signature unchanged" (subtitle wording silently de-frozen — also unrecorded). | `document-render` spec — but only **after ticket 09 decides the subtitle**; restoring the original verbatim would re-freeze "Graphic Design Service" and re-create the 09 conflict with FR-NACE-04 |
| `FR-TPL-04` | Optional `{{PROJECT_BLOCK}}` rendered when project name provided; omitted otherwise | **accident** | Still `proposed` at `requirements.md:86`, `capabilities/document-render.md:26`, `capability-map.yaml:138`. `capabilities/document-render.md:53` "Done when" even requires "optional PROJECT_BLOCK expansion" — the roadmap demands what the spec omits. | `document-render` spec |
| `FR-CALC-05` | Payment deadline and execution term accept days, weeks, or explicit date; compute deadline dates | **accident, load-bearing** | Still `proposed` at `requirements.md:78`, `capabilities/invoice-calc.md:29`, `capability-map.yaml:84`. `invoice-registry/spec.md` "Derived overdue display" derives overdue from "the payment deadline date" — **which no spec requirement defines how to compute**. | `invoice-calc` spec |

**Why "accident" and not "decision", uniformly:** (1) the migration commit
itself **kept all six as `proposed`** in `docs/requirements.md` (8d45456
version, lines 62–64, 87, 103, 105) — the `dropped` status existed and was used
in that same file for `FR-CHAT-01..04` / `FR-INPUT-03`, so a deliberate drop had
an obvious, already-exercised way to say so; (2) the two post-migration
restructures re-affirmed all six with capability ownership and gate lists;
(3) the capability docs' Verification / Done-when sections require their
substance; (4) no commit message, ADR, or `docs/capabilities/` file records a
reason; (5) `docs/current-state.md:74-75, 85-86` treats their absence as a
defect this audit exists to confirm. The `FR-NACE-04` + `FR-TPL-02` pairing
looks like a resolved conflict but is just the migration agent skipping the two
requirements it could not reconcile — the conflict itself is untouched and
still owned by ticket 09.

**FR-NACE-06 (ticket 03 dropped it):** the drop has **not propagated
anywhere**. It survives as a `SHALL` in `openspec/specs/nace-catalog/spec.md:25-26`,
as `proposed` in `docs/requirements.md:73` and `docs/capabilities/nace-catalog.md:28`
(still with the disproven "audit trail" rationale), and in
`openspec/capability-map.yaml:66,229`. Ticket 03's resolution (printing the code
is an invention; the code is catalog-internal) exists only in the ticket file.

## (b) The three asserted-but-undecided requirements (current wording, verified)

1. `openspec/specs/invoice-calc/spec.md:22` — *"The system SHALL compute unit
   price as total amount ÷ quantity with amounts formatted to two decimal
   places."* Ticket 02 established the industry-wide authority direction is
   **unit × qty → total**, never `total ÷ qty`. The spec's own roadmap already
   disagrees with it: `docs/capabilities/invoice-calc.md:46` verifies "unit ×
   qty reconciles with line total (no inverted divide bugs)", and
   `src/types/invoice.ts:29-31` computes `quantity * unitPrice`. Spec, roadmap
   and code currently point in two directions; all pass their checks. → **06**.
2. `openspec/specs/invoice-registry/spec.md:29` — *"The invoice register SHALL
   persist in browser storage (localStorage or IndexedDB) with no server-side
   copy."* An "or" between storage backends is untestable as written. → **10**.
3. `openspec/specs/nace-catalog/spec.md:26` — *"The generated invoice SHALL
   display the NACE code alongside the service description when ticket 09
   resolves placement."* A `SHALL` deferring to an open ticket — and ticket 03
   has since resolved the substance the other way (do not print). → **09**
   (with 03's answer as input).

## (c) `src/types/invoice.ts` vs settled decision 7

Confirmed: the file is unchanged since `8d45456` and still contradicts decision
7 (an issued invoice stores a snapshot of everything printed on it):

- `Invoice.clientId: string` (`src/types/invoice.ts:17`) — a **reference** into
  the client directory, not a client snapshot. Editing a client would rewrite
  what an issued invoice displays.
- **No supplier data at all** — no supplier snapshot, no IBAN/SWIFT/bank
  fields, despite `banking/spec.md` FR-BANK-03's scenario reading "the EUR
  IBAN, bank name, and SWIFT **from the snapshot**" and
  `invoice-registry/spec.md`'s "Issued invoice snapshot" requirement.
- **No NACE field** on `LineItem` or `Invoice`, though the catalog's whole
  purpose is selecting bilingual line text by NACE entry.
- Bonus: `LineItem.unitPrice: number` is a float, not integer cents (ticket
  02 → 06), and `dueDate` is stored with no spec defining its computation
  (the vanished FR-CALC-05).

The migration thus committed a spec that promises snapshots and a type that
cannot hold one, in the same commit. → **08** (type shape), **06** (money
representation).

## (d) What `openspec validate --strict` actually checks

Observed: `openspec validate --all --strict --json` (CLI `@fission-ai/openspec`
v1.5.0) exits 0 with `"valid": true, "issues": []` for all 11 specs. From the
CLI's validation source (`dist/core/validation/{validator,constants}.js`,
`dist/core/schemas/base.schema.js`), a **main spec** is checked per file for:

- **Errors:** file parses; `## Purpose` and `## Requirements` headers exist;
  spec name and Purpose non-empty; at least one `### Requirement:` block; each
  requirement's text contains the literal token `SHALL` or `MUST`; scenarios
  use `#### Scenario:` level-4 headers.
- **Warnings (fail the strict verdict):** Purpose ≥ 50 characters; each
  requirement has at least one scenario.
- **Info (never fails):** requirement text over 500 characters.

Strict mode changes only the verdict formula (`errors === 0 && warnings === 0`
instead of `errors === 0`). That is the complete list.

**What the green tick therefore proves:** every spec file is well-formed
Markdown in the expected shape, and every requirement has a SHALL/MUST and a
scenario. **What it cannot prove — structurally, not as a gap in tuning:**

- **Coverage.** It has no concept of requirement IDs. `FR-*` is just heading
  text; it never reads `docs/requirements.md` or `capability-map.yaml`, so six
  owned IDs missing from specs is invisible to it. (Nor does the repo's other
  gate catch this: `scripts/check-capability-gates.mjs` reads only
  `capability-map.yaml` statuses/edges and never opens a spec file. **No tool
  in the repo cross-checks that an owned ID appears in its owning spec.**)
- **Semantics.** "localStorage or IndexedDB", "when ticket 09 resolves
  placement", and `total ÷ quantity` all contain SHALL and a scenario, so they
  pass. It cannot tell a decided requirement from a deferred or inverted one.
- **Consistency.** It validates one file at a time and never reads `src/`, so
  spec-vs-spec and spec-vs-code contradictions (FR-CALC-03 vs
  `calculateLineTotal`, snapshot promise vs `clientId`) are out of reach.

Every defect in this audit — all of (a), (b) and (c) — is in a category the
validator is structurally incapable of catching. The green tick is a linter
for spec *format*; it says nothing about spec *content*.
