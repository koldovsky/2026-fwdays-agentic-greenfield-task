# ADR-0002: Treat the static/dynamic context boundary as an architectural decision

- **Status:** Accepted
- **Date:** 2026-07-03
- **Deciders:** orchestrator + user

## Context

Static context (loaded via `CLAUDE.md` → `@AGENTS.md` on every agent turn) is paid
for on every interaction, while dynamic context is loaded only when a task needs it.
This project already leans on progressive disclosure — product detail lives in
`docs/`, design detail in `DESIGN.md` + `docs/design-system/`, framework detail in
`node_modules/next/dist/docs/`, and capability behavior in `openspec/specs/`. The
Project Factory loop (Gate G0) requires this boundary to be explicit and versioned
so the static layer stays lean as the codebase grows (TC-STACK-01, NFR-PERF-01
concern the product; this ADR concerns agent-context TCO).

## Decision

We will treat the static/dynamic context boundary as a versioned decision with an
enforced **≤ 4k token** static budget, documented in
`docs/context-architecture.md`. Durable cross-cutting rules stay in `AGENTS.md`;
everything else is demoted to the dynamic layer (skills, domain docs, specs, bundled
package docs) and loaded on demand.

## Alternatives considered

| Option | Pros | Cons |
|---|---|---|
| Versioned boundary + budget (chosen) | Predictable per-turn cost; forces detail into discoverable dynamic sources | Requires periodic review + ADRs on change |
| Inline everything in `AGENTS.md` | Simple; nothing to look up | Every turn pays for detail it doesn't use; grows unbounded |
| No policy (ad hoc) | Zero upfront work | Static layer bloats silently; cost creep goes unnoticed |

## Consequences

- **Easier:** reasoning about per-turn context cost; onboarding (one place names
  where each kind of knowledge lives).
- **Harder / accepted:** the static layer must be reviewed on a cadence, and
  boundary changes must be recorded as ADRs rather than made silently.
- **Follow-ups:** revisit the budget when `AGENTS.md` approaches 4k tokens; demote
  to a skill rather than raising the budget.
