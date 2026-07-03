# Context Architecture — Kamerton — Vocal-School Booking Agent

> A **versioned, cost-bearing** decision (whitepaper: *"treat the static/dynamic
> context boundary as an architectural decision with direct TCO impact"*).
> Static context is paid for on **every** agent turn; dynamic context is loaded
> only when a task needs it. Keep the static layer lean on purpose.

## Static layer — loaded every interaction (keep small)

The minimum the agent must know on every turn. Budget: **≤ 4k tokens.**

- `CLAUDE.md` → `@AGENTS.md` (durable cross-cutting rules only: module conventions,
  correctness rules learned from bugs, validation cadence, test-first, the handoff
  protocol). NOT per-domain detail.
- The active handoff pointer (`docs/current-state.md` is read at session start, not
  embedded).

When `AGENTS.md` grows past the budget, that is a signal to **move detail out** to
the dynamic layer (a skill or a domain doc), not to raise the budget silently.

## Dynamic layer — loaded on demand (progressive disclosure)

Loaded only when the task touches it, so its tokens are not paid on unrelated turns:

| Loaded when… | Source |
|---|---|
| working in a domain | `lib/<domain>/` code + that domain's spec under `openspec/specs/<domain>/` |
| a reusable procedure applies | a `SKILL.md` skill (vendored under `.agents/skills/`, listed in `skills-lock.json`) |
| using a framework API | the installed package's bundled docs (`node_modules/<pkg>/dist/docs/`) — never memory |
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

- **Static budget:** 4k. **Today:** ~2.0k tokens (AGENTS.md, 7 980 bytes,
  after the 2026-07-03 consolidation).
- **Consolidation (2026-07-03):** `CLAUDE.md` reduced to the single
  `@AGENTS.md` line (the factory convention); the homework/branch/PR rules it
  carried moved into AGENTS.md; stale lines ("stack being defined",
  pre-generated slots) and template rules not applicable to Kamerton
  (Better Auth, email senders, form-parsing conventions) pruned.
- **Recently demoted to dynamic:** nothing yet; first candidates when the
  budget tightens — the Evals section (→ `evals/README.md`) and the multi-tool
  Project Factory table (→ `docs/portability.md`).
- **Owning ADR:** ADR-0002.
