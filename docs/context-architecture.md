# Context Architecture — Invoice Maker 2026

> A **versioned, cost-bearing** decision (whitepaper: *"treat the static/dynamic
> context boundary as an architectural decision with direct TCO impact"*).
> Static context is paid for on **every** agent turn; dynamic context is loaded
> only when a task needs it. Keep the static layer lean on purpose.

## Static layer — loaded every interaction (keep small)

The minimum the agent must know on every turn. Budget: **≤ 6k tokens.**

- `CLAUDE.md` → `@AGENTS.md` (durable cross-cutting rules only: the WEG3D Fin
  design-system rules, the OpenSpec workflow, the `docs/` authority order, the
  handoff protocol, and the factory lessons managed region). NOT per-domain detail.
- The active handoff pointer (`docs/current-state.md` is read at session start, not
  embedded).

When `AGENTS.md` grows past the budget, that is a signal to **move detail out** to
the dynamic layer (a skill or a domain doc), not to raise the budget silently.

## Dynamic layer — loaded on demand (progressive disclosure)

Loaded only when the task touches it, so its tokens are not paid on unrelated turns:

| Loaded when… | Source |
|---|---|
| working in a domain | `src/lib/<domain>/` code + that domain's spec under `openspec/specs/<capability>/` |
| a reusable procedure applies | a `SKILL.md` skill (vendored under `.agents/skills/`, listed in `skills-lock.json`) |
| doing UI work | `Design.md`, `src/styles/design-tokens.css`, `.agents/skills/weg3d-fin-design/` |
| using a framework API | the installed package's bundled docs (`node_modules/next/dist/docs/`) — never memory |
| doing QA / release | the QA pack under `docs/qa/`, the trajectory/traceability reports |
| resuming work | `docs/current-state.md` (read, not embedded) |
| planning a capability | `docs/capabilities/<id>.md`, `openspec/capability-map.yaml` |

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

- **Static budget:** 6k tokens. **Today:** `AGENTS.md` is 16,410 bytes ≈ **4.4k
  tokens** (9,724 bytes ≈ 2.6k before the factory-lessons region added ≈1.8k at G0).
  Headroom is ~1.6k tokens; the next durable rule that does not clear the "needed on
  most turns" bar must go to the dynamic layer.
- **Already dynamic:** the design system detail (`Design.md` + the
  `weg3d-fin-design` skill, not inlined); per-capability behavior
  (`openspec/specs/<capability>/spec.md`); Next.js API detail (bundled package docs).
- **Owning ADR:** `docs/adr/0002-browser-first-mvp.md` records the stack; this
  boundary has no dedicated ADR yet — open one before the next promotion/demotion.
