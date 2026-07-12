# 04 — Stop `openspec/config.yaml` from lying, and settle the tool wiring

Type: task
Status: resolved
Blocked by: —

## Why this is a task, and why it is urgent

Nothing here is decided — ticket `12` designs the capability layout. But this is
now the **highest-risk open item on the map**, and it is not the task originally
written here.

`openspec/config.yaml` carries a `context:` block whose own comment reads:

> *Injected into OpenSpec artifact instructions (propose, design, tasks, delta specs).*

Its contents describe **the product this map has abandoned**:

- "Chat-like … invoice creation" — moved to Future (settled decision 3).
- "PDF export, **email delivery, payment tracking**" — email and payments are out
  of scope.
- "**Server Actions** for mutations" — unused; every mutation is in the browser.
- "Planned: **Supabase (Postgres + Auth), Drizzle ORM**" — out of scope.
- "`src/lib/db/` — database client" — slated for deletion in ticket `13`.
- "Domain glossary (CONTEXT.md): **Organization**, … **Payment**; invoice
  statuses: draft, sent, paid, overdue, **void**" — `Organization` and `Payment`
  are out of scope, `void` was replaced by `cancelled`, and `overdue` is derived.
- `rules.design`: "Note **auth**, validation (Zod), and **Server Action
  security** for mutations."
- `rules.specs`: "Use domain terms from **CONTEXT.md** consistently" — the very
  glossary ticket `08` replaces.

So every one of the seven contradictory documents this map exists to reconcile is
now **automatically injected into every artifact OpenSpec generates**. Run
`/opsx:propose` today and it will faithfully produce a proposal for Supabase,
payments and a `void` status — and be correct to do so, because that is what it
was told.

`openspec/config.yaml` is the eighth authoritative surface, and the only one with
a delivery mechanism.

## Corrected state of the world

Verified against the working tree, not the plan:

- `openspec/config.yaml` **is committed** (`da0af3a`). `openspec/specs/` and
  `openspec/changes/` do not exist. `openspec list` → no changes; `--specs` → no
  specs.
- `AGENTS.md` **already carries** an `openspec-rules` block, committed.
- OpenSpec **is already wired into Claude Code**: `.claude/commands/opsx/*.md`
  and `.claude/skills/openspec-*/`. It is simply **untracked**.
- `openspec update` also generated **six** tool integrations. Only `.cursor/` was
  committed. Untracked: `.claude/`, `.codex/`, `.pi/`, `.windsurf/`,
  `.github/prompts/`, `.github/skills/` — 45 files, every one of them OpenSpec's.

## What to do

1. **Make `context:` stop lying — now, before it is complete.** Strip every
   claim contradicted by the map's settled decisions. It does not need to
   describe the final product yet (ticket `12` does that); it needs to stop
   describing the wrong one. Point it at
   `.scratch/mvp-spec-coherence/map.md` as the current source of decisions.
2. **Fix `rules.design` and `rules.specs`** for the same reason: they name
   `docs/ARCHITECTURE.md`, Server Actions, auth and `CONTEXT.md`.
3. **Decide the tool wiring.** Six untracked integration directories is not a
   decision anyone made — it is `openspec update`'s default. Which tools does
   this project actually support? Commit those; delete or ignore the rest.

## Answer must record

Facts that ticket `12` depends on:

- The exact heading structure OpenSpec expects in
  `openspec/specs/<capability>/spec.md` (`## Requirements`, `### Requirement:`,
  `#### Scenario:` — confirm from the CLI or its skills, do not assume).
- What `openspec validate --strict` checks, and what it rejects.
- Whether a greenfield project seeds `openspec/specs/` directly, or only through
  a change under `openspec/changes/` followed by `/opsx:sync`. The repo's own
  `AGENTS.md` rule 2 says changes; confirm.
- Whether stable IDs (`FR-CALC-01`) can live inside OpenSpec requirement
  headings — `docs/requirements.md:171-178` and gate G4 reference them.

---

## Answer

**Most of this ticket was executed by a concurrent session before it was claimed.**
Commit `8d45456` rewrote `openspec/config.yaml` — `context:` no longer describes
Supabase, payments, email, Server Actions, `Organization`, `Payment` or `void`,
and `rules.design` no longer prescribes auth and Server Action security. The
same commit rewrote `CONTEXT.md`, `docs/ARCHITECTURE.md` and both ADRs, so the
files `config.yaml` points at are no longer the abandoned design. The urgent
danger this ticket named is gone.

### Tool wiring — settled by that commit

`openspec update` had generated six integrations. `8d45456` committed
`.codex/`, `.github/prompts/`, `.github/skills/`, `.pi/` and `.windsurf/`,
joining the already-committed `.cursor/`. Only `.claude/` remains untracked —
which is the one this project actually uses. That is worth fixing, and it is the
only wiring work left.

### Facts recorded for ticket `12`

- **Spec file format**, confirmed from `.claude/skills/openspec-sync-specs/SKILL.md`:
  `openspec/specs/<capability>/spec.md` uses `### Requirement: <Name>` with SHALL
  prose, and each requirement carries `#### Scenario: <name>` whose steps are
  `- **WHEN** …` / `- **THEN** …` bullets. Note `openspec/config.yaml` still
  tells agents that scenarios use "Given/When/Then" — they do not. Minor, but it
  is an instruction to every future agent.
- **Delta specs** in `openspec/changes/<name>/specs/<capability>/spec.md` use
  `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`,
  `## RENAMED Requirements` (`- FROM:` / `- TO:`). A delta expresses *intent* and
  is merged intelligently — a MODIFIED requirement need only carry the new
  scenario, not a copy of the existing ones.
- **Greenfield seeding**: the repo's own `AGENTS.md` rule 2 and the sync skill
  both say specs arrive through a change, then `/opsx:sync`. But `8d45456` wrote
  `openspec/specs/` directly, with no change under `openspec/changes/`
  (`openspec list` → no active changes). Both paths evidently work; only the
  direct one leaves no proposal, no design and no tasks behind.
- **`openspec validate --strict` exists**, as a top-level command and as
  `openspec spec validate` / `openspec change validate`. It needs a target:
  `openspec validate --all --strict`. It currently reports **11 passed, 0 failed**.
- **Stable IDs survive**: requirement headings are free text, and `8d45456` uses
  `### Requirement: FR-CALC-03 Unit price`. Traceability to gate G4 is preserved.

### What the green tick is worth

`openspec validate --strict` checks **structure**, not coverage and not
consistency. It passed a spec whose requirement reads *"SHALL display the NACE
code … when ticket 09 resolves placement"*, and another reading *"SHALL persist
in browser storage (localStorage **or** IndexedDB)"*. It also cannot see that
`invoice-calc/spec.md` and `src/types/invoice.ts` now compute money in opposite
directions.

Six requirement IDs present in `docs/requirements.md` appear in no spec at all.
That is the subject of the new ticket
[Six requirements vanished in the migration](15-audit-the-migration.md).
