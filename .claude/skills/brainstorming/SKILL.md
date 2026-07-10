---
name: brainstorming
description: Use BEFORE writing any code for a new feature or change. Turns a rough idea into an approved design/spec through one-question-at-a-time dialogue, then hands off to implementation. Enforces "design approved before code".
---

# Brainstorming — idea → approved spec (before any code)

Turn an idea into a small, approved design before implementation. Pairs with this repo's
spec-first flow ([`docs/specs/`](../../../docs/specs/)) and the Maker/Checker/Judge roles in
[`AGENTS.md`](../../../AGENTS.md).

<HARD-GATE>
Do NOT write code, scaffold, run migrations, or take any implementation action until you have
presented a design and the user has approved it — even for "simple" changes. Simple changes are
where unexamined assumptions waste the most work.
</HARD-GATE>

## Steps (in order)

1. **Explore context** — read `AGENTS.md`, `docs/current-state.md`, relevant code and recent
   commits. Look facts up in the codebase instead of asking about them.
2. **Ask clarifying questions — one at a time.** Wait for each answer before the next; prefer
   multiple-choice. Focus on purpose, constraints, success criteria, and non-goals. Decisions are
   the user's; facts you can find are yours. (For a deeper interrogation, use `grill-me`.)
3. **Propose 2–3 approaches** with trade-offs; lead with your recommendation and why.
4. **Present the design in sections** scaled to complexity; confirm each section before moving on.
   Cover: scope, data model/migration, API, UI touchpoints, error handling, testing, NFRs.
5. **Write the spec** — `docs/specs/TEMPLATE.md` → `docs/specs/NNN-<slug>.md` (FR, NFR, acceptance
   checks). Keep it small.
6. **Self-review the spec** for placeholders, contradictions, ambiguity, and scope creep; fix inline.
7. **Get user sign-off** on the written spec.
8. **Hand off to implementation** — the Maker builds to the approved spec (see `AGENTS.md`), writing
   tests + any migration; the Checker then verifies and the Judge signs off. Do not implement here.

## Notes

- If the idea spans multiple independent subsystems, stop and help decompose into sub-projects
  first, then brainstorm the first one. Each sub-project gets its own spec → build → verify cycle.
- When the spec is approved, update `docs/current-state.md`.

*Discipline inspired by [obra/superpowers](https://github.com/obra/superpowers)' `brainstorming`
skill, adapted to this repo's `docs/specs/` + Maker/Checker/Judge workflow.*
