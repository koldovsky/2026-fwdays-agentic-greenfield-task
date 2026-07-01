# ADR-0021 — Rename the loop runner to `ship-change`; split it into `SKILL.md` + `PROFILE.md` with named per-phase agents

*Status: Accepted · Date: 2026-07-02 · Amends [ADR-0012](./0012-implementation-loop-runner.md)
(the loop runner's packaging) · Relates to [ADR-0018](./0018-run-backlog-model-tiering.md) (the
per-phase model tiers this repackaging preserves) · Source: `.claude/skills/ship-change/` +
`.claude/agents/ship-*`.*

> **Scope: the development loop's packaging, not its behavior.** This changes *how the runner is
> organized and invoked*, not *what it does*. The loop's shape (sequential, DAG-driven,
> isolate-and-continue, autonomous/gate-driven, maker ≠ checker) from [ADR-0012](./0012-implementation-loop-runner.md)
> and the Opus·high/Haiku·low tiering from [ADR-0018](./0018-run-backlog-model-tiering.md) are
> **unchanged**. Nothing about the **bot's runtime** LLM (Sonnet 4.6, [ADR-0003](./0003-raw-anthropic-api-no-agent-framework.md)) is touched.

## Context
The backlog-driven implementation loop ([ADR-0012](./0012-implementation-loop-runner.md)) shipped as a
single monolithic skill, `run-backlog` (`/run-backlog`): one `SKILL.md` mixing the **generic loop**
(the gate order, the four laws, escalation policy) with **repo-specific config** (npm gate commands,
branch policy, model-tier table, dup-scan scope, docs protocol, traps). Every delegated phase spawned
a `general-purpose` subagent, so the model-tier table lived only as prose the orchestrator had to read
and honor by hand, and the run UI showed `general-purpose` for every gate rather than the gate's name.

An improved shape was developed in a sibling repo (`crypto-trading-bot`'s `ship-change` skill) and is
now ported back here. Two structural ideas make the runner easier to port, read, and operate:

1. **Generic/specific split.** A repo-agnostic `SKILL.md` (the loop) + a `PROFILE.md` next to it (all
   repo-specific config). Porting the loop to another repo = rewriting `PROFILE.md` only.
2. **Named per-phase agents.** Each delegated phase gets a dedicated subagent type under
   `.claude/agents/` whose model tier is baked into its frontmatter — so the tier is enforced by the
   agent definition (not orchestrator discipline), and the run UI names the gate.

The name `run-backlog` described the *entry mechanic* (drive the backlog). `ship-change` describes the
*unit of work* (drive one change through every gate), which also fits the argument-driven override
(`/ship-change <change-id>`) that the DAG default sits on top of.

## Decision
**Replace the `run-backlog` skill with `ship-change`, packaged as `SKILL.md` + `PROFILE.md`, and
delegate each phase to a named `.claude/agents/ship-*` subagent.**

- **Skill:** `.claude/skills/ship-change/SKILL.md` — the generic gated loop (15 steps, the four laws,
  autonomous plan/pre-archive gates, on-failure isolate-and-continue). `disable-model-invocation: true`;
  invoked by hand as `/ship-change [change-id | description]`.
- **Profile:** `.claude/skills/ship-change/PROFILE.md` — this repo's selection rule, branch/commit
  policy, model-tier table + named-agent mapping, gate commands, extra (eval) gates, conventions
  pointers, reviewer skill, dup-scan scope, docs protocol, and the AGENTS.md traps.
- **Agents:** six subagents under `.claude/agents/`, tier baked into frontmatter per
  [ADR-0018](./0018-run-backlog-model-tiering.md):
  `ship-maker` · `ship-verifier` · `ship-arch` · `ship-reviewer` · `ship-docs` on **Opus**;
  `ship-gates` (select + tests + evals + commit + archive bookkeeping) on **Haiku**.
- **`run-backlog` is removed.** Its behavior lives on unchanged in `ship-change`.

This **amends ADR-0012**: wherever it names the runner `run-backlog` / `/run-backlog`, read
`ship-change` / `/ship-change`, now `SKILL.md`+`PROFILE.md` with named agents. The decision that
runner's *shape* records is otherwise intact. [ADR-0018](./0018-run-backlog-model-tiering.md)'s tier
assignment is preserved verbatim — it is now *encoded* in the agent frontmatter + the PROFILE table
rather than described in one file's prose.

## Consequences
- **+** Portable: the loop moves to another repo by rewriting `PROFILE.md` only; `SKILL.md` and the
  agent roster stay put.
- **+** Tiers enforced by definition, not discipline — the maker can't silently run on the wrong model,
  and the run UI shows `ship-maker`/`ship-reviewer`/… instead of `general-purpose`.
- **+** Maker ≠ checker is now two *named* agents (`ship-maker` vs `ship-reviewer`), making the role
  separation legible at a glance.
- **−** More files to keep in sync (skill + profile + six agents) than one monolith; a tier change now
  edits both the PROFILE table and an agent's frontmatter.
- **−** Doc churn: living docs referencing `/run-backlog` (AGENTS.md, current-state.md,
  backend-conventions, backlog.md) were repointed to `/ship-change`; ADR-0012/0018 keep the old name as
  append-only history, reconciled by this ADR's amendment note.
- **Reversible packaging.** This is an organization/naming call, not an architectural one — no code
  depends on the skill name. Merging back to a monolith or renaming again is a docs+file move.

## Alternatives considered
- **Keep `run-backlog` as one monolithic skill** — rejected: mixing generic loop with repo config
  makes porting a copy-and-scrub job, and leaves model tiers as unenforced prose.
- **Split into `SKILL.md`+`PROFILE.md` but keep `general-purpose` subagents** — rejected: loses the
  frontmatter-enforced tiers and the named-gate UI; the tier table stays discipline-only.
- **Keep the `run-backlog` name** — rejected: it names the entry mechanic, not the unit of work, and
  reads oddly next to the argument-driven single-change override. `ship-change` covers both.
