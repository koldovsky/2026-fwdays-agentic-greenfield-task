# ADR-0002: Static vs dynamic context boundary

- **Status:** Accepted
- **Date:** 2026-07-03
- **Deciders:** orchestrator + user

## Context

Project Factory treats the static/dynamic context split as a cost-bearing
architectural decision: static context (`CLAUDE.md → @AGENTS.md`) is paid on
every agent turn, so it must stay lean. Kamerton has rich per-domain detail
(intake flow, slot rules, guardrails, AG-UI events) that must NOT all live in
static context.

## Decision

We will keep the static layer to durable cross-cutting rules only, under a **4k
token budget**, and load everything else dynamically (domain code + its
`openspec/specs/<domain>/`, on-demand skills, the installed package's bundled
docs, the QA pack, and `docs/current-state.md`). See
`docs/context-architecture.md` for the full boundary and rules.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Lean static + dynamic on demand (chosen) | Low per-turn cost; scales to 20 parallel agents | Requires discipline to demote detail |
| Everything in AGENTS.md | Simple; one file | Pays full detail cost every turn; drifts |

## Consequences

- **Easier:** cheap agent turns; AGENTS.md stays reviewable.
- **Accepted:** when AGENTS.md exceeds 4k, detail is demoted to a skill/domain
  doc (recorded as a follow-up ADR), never the budget silently raised.
