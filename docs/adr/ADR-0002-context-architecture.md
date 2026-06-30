# ADR-0002: Treat the static/dynamic context boundary as an architectural decision

- **Status:** Accepted
- **Date:** 2026-06-29
- **Deciders:** orchestrator + user

## Context

Project Factory loads `CLAUDE.md`/`AGENTS.md` on every agent turn (static
context), which is paid for on every interaction regardless of relevance.
Per-domain detail, procedures, and large references are only needed on the
turns that touch them. Treating that boundary casually drives up token cost
(TCO) and dilutes the agent's attention with irrelevant context.

## Decision

We will treat the static/dynamic context split as a versioned architectural
decision with an enforced budget. The static layer (`AGENTS.md` via `CLAUDE.md`)
holds only durable cross-cutting rules under a **4k-token budget**; everything
else is dynamic — loaded on demand from code, specs, on-demand skills, or the
framework's bundled docs. See `docs/context-architecture.md`.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Versioned static/dynamic split with a budget (chosen) | Low per-turn TCO; focused attention; explicit governance | Requires discipline to demote content |
| One large always-loaded rules file | Simple; everything "available" | High per-turn cost; attention dilution; grows unbounded |
| No rules file; rely on ad-hoc discovery | Zero static cost | Inconsistent behavior; rules re-derived each session |

## Consequences

- Adding a rule means asking "is this needed on most turns?" — if not, it goes
  to a skill or domain doc, not `AGENTS.md`.
- When `AGENTS.md` exceeds the budget, content is demoted (not the budget raised).
- Any change to this boundary is recorded as a new ADR.
