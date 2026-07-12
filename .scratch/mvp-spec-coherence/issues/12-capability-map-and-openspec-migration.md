# 12 — The capability map, and which document an agent reads first

Type: grilling
Status: open
Blocked by: 04, 08, 09

## Question

**Eight** documents in this repository each behave as though they were
authoritative: `docs/requirements.md`, `docs/product-brief.md`,
`docs/research.md`, `docs/ARCHITECTURE.md`, `CONTEXT.md`, `Design.md`,
`AGENTS.md` — and `openspec/config.yaml`, whose `context:` block is injected
into every artifact OpenSpec generates. Ticket `04` stops it lying; this ticket
decides what it should finally say. The map's destination says exactly one
document may be authoritative, per subject.

With OpenSpec's format known from ticket `04`, and the domain settled by
tickets `08` and `09`, decide:

- **The capability set.** Which capabilities exist under `openspec/specs/`, and
  what each one owns. Starting hypothesis, to be argued with rather than
  accepted: `nace-catalog`, `invoice-calc`, `document-render`,
  `invoice-registry`, `supplier-profile`, `client-directory`, `export-share`,
  `shell`. Note that `docs/requirements.md:171-178` omits `banking` and
  `invoice-edit` from its own traceability table — the current capability list
  does not even cover the current requirements.

- **ID survival.** Do `FR-CALC-01`-style IDs live on inside OpenSpec requirement
  headings? The course traceability table and gate G4 reference them, so
  retiring them is a decision with a cost, not a cleanup.

- **The fate of each document.** For each of the seven: archived with a pointer,
  rewritten, folded into a spec, or deleted. Specifically:
  - `docs/requirements.md` — the current PRD, superseded in whole or in part.
  - `docs/ARCHITECTURE.md` — describes Supabase, Drizzle, RLS, multi-tenancy,
    payments, PDF services, email. All out of scope. It cannot merely be edited.
  - `docs/adr/0001-initial-stack.md` — status **Accepted**, records Supabase +
    Drizzle + Zod. Superseded, not amended.
  - `CONTEXT.md` — replaced by ticket `08(d)`.
  - `docs/research.md` — the original discovery notes, in Ukrainian.
    `BC-LANG-01` protects its language. Is it now a historical artifact?
  - `Design.md` — see ticket `11(d)`.
  - `AGENTS.md` — the one file every agent loads. What belongs in it?
  - `openspec/config.yaml` — `context:` plus `rules.{proposal,design,tasks,specs}`.
    Once specs exist, what should `context:` say, and should it say anything at
    all rather than pointing at `openspec/specs/`?

- **The first read.** Which single document does an agent opening this repo read
  first, and how does every other document point at it?

## Output

A migration plan precise enough that ticket `13` is mechanical.
