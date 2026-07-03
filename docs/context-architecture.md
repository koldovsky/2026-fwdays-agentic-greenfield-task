# Context Architecture — Prokhidnyi (Прохідний)

> A **versioned, cost-bearing** decision (whitepaper: *"treat the static/dynamic
> context boundary as an architectural decision with direct TCO impact"*).
> Static context is paid for on **every** agent turn; dynamic context is loaded
> only when a task needs it. Keep the static layer lean on purpose.

## Static layer — loaded every interaction (keep small)

The minimum the agent must know on every turn. Budget: **≤ 4k tokens.**

- `CLAUDE.md` → `@AGENTS.md` (durable cross-cutting rules only: the Next.js-16
  "read the bundled docs first" rule, product-docs pointers, the current-state
  handoff protocol, and the design-system rules). NOT per-domain detail.
- The active handoff pointer (`docs/current-state.md` is read at session start, not
  embedded).

When `AGENTS.md` grows past the budget, that is a signal to **move detail out** to
the dynamic layer (a skill or a domain doc), not to raise the budget silently.

## Dynamic layer — loaded on demand (progressive disclosure)

Loaded only when the task touches it, so its tokens are not paid on unrelated turns:

| Loaded when… | Source |
|---|---|
| working in a domain | `app/`, `app/lib/<domain>/` code + that domain's spec under `openspec/specs/<domain>/` |
| building/​changing UI | `DESIGN.md` + `docs/design-system/` + the `prokhidnyi-design-system` skill |
| a reusable procedure applies | a `SKILL.md` skill (listed in `skills-lock.json`) |
| using a framework API | the installed package's bundled docs (`node_modules/next/dist/docs/`) — never memory |
| doing QA / release | the QA pack under `docs/qa/`, the trajectory/traceability reports |
| resuming work | `docs/current-state.md` (read, not embedded) |

## Rules

1. **Default to dynamic.** A rule goes in the static layer only if it's needed on
   *most* turns and can't be discovered from the code/spec in front of the agent.
2. **Progressive disclosure.** Prefer a one-line pointer in static context to an
   on-demand skill/doc over inlining the detail.
3. **Budget is enforced, not aspirational.** Review the static layer's size on a
   cadence; when it exceeds the budget, demote content to a skill.
4. **Versioned.** Any change to this boundary (promote/demote a layer, change the
   budget) is recorded as an ADR in `docs/adr/`.

## Current decision

- **Static budget:** ≤ 4k tokens. **Today:** `AGENTS.md` ≈ 2.4 KB (~0.6k tokens);
  `CLAUDE.md` is a single `@AGENTS.md` include. Well under budget.
- **Recently demoted to dynamic:** design-system detail → `DESIGN.md` +
  `docs/design-system/` (surfaced via the `prokhidnyi-design-system` skill);
  capability detail → `docs/capabilities/` + `openspec/specs/`.
- **Owning ADR:** ADR-0002-context-architecture.
