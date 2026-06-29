# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

**Layout: single-context.** One `CONTEXT.md` + `docs/adr/` at the repo root.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root (not created yet — `/domain-modeling` makes it lazily).
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. This repo already has
  `docs/adr/0001`–`0008` (plain-TS/no-Nest, grammY, raw Anthropic API, self-hosted Postgres,
  Prisma, build-off-box, Postgres-as-truth/Notion-mirror, no-image-persistence).

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (this repo):

```
/
├── CONTEXT.md          ← not created yet
├── docs/adr/
│   ├── 0001-plain-typescript-no-nestjs.md
│   ├── 0005-prisma-orm.md
│   └── …0002–0008
└── src/                ← planned (see AGENTS.md → Code structure)
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0005 (Prisma ORM) — but worth reopening because…_
