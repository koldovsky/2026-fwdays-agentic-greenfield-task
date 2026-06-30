# ADR-0012 — Implementation loop runner (backlog-driven orchestrator skill)

*Status: Accepted (decision + design; runner is bootstrap tooling, hand-built next) · Date: 2026-06-29 · Source: [openspec/backlog.md](../../openspec/backlog.md), [openspec/config.yaml](../../openspec/config.yaml) rules, AGENTS.md "How we work" loop*

> **Amendment (2026-06-30):** the two human checkpoints below (post-`propose`, pre-`archive`) are
> **dropped in favor of an autonomous, gate-driven run.** The loop proceeds change-by-change without
> sign-off; it escalates to the human **only on a critical fork** (an ambiguity or irreversible
> decision the gates can't resolve). Rationale: the mechanical gates — `validate --strict`,
> `opsx:verify`, the separate **maker ≠ checker** reviewer subagent, tests/static/evals — already
> catch a bad plan or diff, so a blocking human gate at every change is friction the single developer
> doesn't want. Maker ≠ checker is **unchanged** (still a hard structural gate). The checkpoint
> language in the sections below is superseded by this amendment.

## Context
[openspec/backlog.md](../../openspec/backlog.md) slices the PRD into 14 dependency-ordered OpenSpec
changes with a machine-readable DAG (`id · status · wave · blocked-by`). We need an **orchestrator**
that walks that backlog and drives each change through the full gate sequence to completion —
otherwise the backlog is a static list and a human hand-runs every `opsx:*` step.

The gate sequence (from AGENTS.md + `config.yaml`) per change:

```
opsx:explore (optional) → opsx:propose → openspec validate <id> --strict → opsx:apply → opsx:verify
  → improve-codebase-architecture (refactor scan, scoped to the diff; small wins applied inline,
    larger ones filed as new changes) → review (SEPARATE reviewer subagent: Standards + Spec)
  → npm test → fallow + lint + format:check + typecheck → evals (capability suites, see ADR-0013)
  → sync docs → commit → opsx:archive
```

`openspec validate --strict` is a **structural** gate (artifacts well-formed per schema), distinct
from `opsx:verify` (plan⇄impl coherence) — both run. The **evals** gate runs the capability suites
the change touches per [ADR-0013](./0013-eval-framework.md) (deterministic datasets + LLM-judge
cases; skip if the change touches none). CI additionally runs `openspec validate --all --strict
--json` and `npm run check:evals` (the key-less ratchet) as exit-code gates.

Constraints that shape the runner: maker ≠ checker is a **hard gate** enforced by convention
(separate reviewer subagent, never self-approval); the host is RAM-tight and builds happen off-box
(no agent fan-out cost we can't afford); the project is skill/OpenSpec-centric; and there is **one
developer** who wants to work locally and open a PR only at the end.

This ADR records the runner's **shape and policy**. The runner itself is **bootstrap tooling**
(it runs the backlog, so it can't be a backlog item run *by* itself — chicken-and-egg); it is
hand-built as a project skill in a follow-up, not via the loop.

## Decision

**Form — a Claude Code orchestrator skill, run in-session.** A new project skill (working name
`run-backlog`, distinct from the built-in interval `/loop` and the cron `/schedule` — those are
time-driven; this is gate-driven). The main thread reads the backlog, and spawns a **subagent per
gate**. Rejected headless `claude -p` and CI-cron for v1: same engine, but they trade away
in-session observability and the human checkpoints below. They remain the documented path to full
AFK once the loop is trusted.

**Selection — ready, lowest-wave, one at a time.**
- *Ready* = `status: todo` **and** every `blocked-by` id is `status: done`.
- Pick the lowest-wave ready change of `kind: agent`; ties broken arbitrarily.
- **`kind: manual` items are human-executed** (one-time infra the loop can't/shouldn't do — Coolify,
  secrets; e.g. `provision`). The runner never runs them: it surfaces the item's runbook and pauses
  until the human completes it and flips it `done`. Deploy is **not** a final task — it is bootstrapped
  in M0 (`provision` → `pipe`), so the tracer-bullet pipe is proven deployed before any feature lands.
- **Sequential** — exactly one change in flight. Waves order *eligibility* only; we do **not** run
  wave-mates concurrently. Rationale: wave-mates touch shared files (e.g. `food-text` and `metrics`
  both edit the Prisma schema + router consumers) → parallel worktrees would generate merge
  conflicts that cost more than the wall-clock they save. Sequential keeps a **single writer** to
  `backlog.md` status, so status updates never race. Worktree-parallelism can supersede this later.

**Gate pipeline — mechanical gates auto-run; two human checkpoints.**
- **Checkpoint 1 — after `opsx:propose`:** human approves the proposal/specs/design before any code
  is written (bad specs → expensive wrong code). The runner pauses in-session.
- Auto-run between: `apply → verify → review → test → fallow/lint/typecheck → evals → sync docs`.
- **Checkpoint 2 — before `opsx:archive`:** human eyeballs the review outcome + diff (spec-sync on
  archive is sticky). Then archive.
- **Maker ≠ checker is structural:** the agent that runs `opsx:apply` does **not** review. The
  runner spawns a **fresh** reviewer subagent (the `review` skill: Standards + Spec axes) and
  resolves its findings before commit. This is the same gate `config.yaml` bakes into every
  `tasks.md` final task — the runner enforces it by spawning distinct agents, not by trust.
- **Evals are conditional:** run the evals gate iff `openspec/changes/<id>/evals/` exists (e.g.
  `router` intent-classification, `food-text` parse + fact/estimate tagging); otherwise skip with a
  logged note. "Numbers == SUM" and "image never on disk" are **tests**, not evals — they live in
  the test gate.

**Failure — isolate and continue.**
- A failed gate → that change's `status: blocked` + a one-line reason in the backlog; the runner
  continues with other ready, non-dependent changes. (Dependents simply never become *ready* while
  the blocker isn't `done` — no cascade flip needed.)
- **1× retry only for flaky gates** (test/network/rate-limit transients). **Review findings are
  never auto-retried** — they route back to a fix step (maker fixes, checker re-reviews) or to the
  human. Fail-fast (halt everything on one flake) is rejected as too brittle.

**Integration — local-first, single developer.**
- Work on one local branch for the loop run. After the review pass for a change, the runner
  **commits locally** (one commit per change, Conventional Commits, with the
  `Co-Authored-By: Claude …` trailer), then archives.
- **Local gates are authoritative** — `npm test`, lint, `format:check`, `typecheck`, and fallow are
  the *same* checks CI runs ([ADR-0009](./0009-eslint-prettier-lint-format.md),
  [0010](./0010-vitest-test-runner.md), [0011](./0011-fallow-static-analysis.md)). Passing locally
  == passing CI for everything except the off-box build.
- **Push cadence: per wave/milestone, not per change.** The single signal local cannot reproduce is
  the off-box Docker build → GHCR ([ADR-0006](./0006-build-off-box-ghcr.md)); a periodic push lets
  CI confirm it. No PR-per-change.
- **One PR at the end** (per milestone / at MVP), opened when the developer asks.

**Status authority.** The orchestrator is the **sole writer** of `backlog.md` status. Enum stays
`todo · doing · blocked · done`; `done` is set **only after `opsx:archive`**. In-flight = `doing`;
the active gate + any blocked-reason are surfaced in-session (ephemeral), not persisted per-gate.

## Consequences
- **+** Native maker ≠ checker — distinct subagents make self-approval structurally impossible.
- **+** Sequential = zero merge conflicts and a single status writer; no agent fan-out, so no
  surprise LLM-cost or RAM spike (consistent with the project's cost/footprint discipline).
- **+** Local-first matches a solo developer: fast inner loop, CI consulted on push for the one
  off-box thing, a single reviewable PR at the end.
- **+** Two checkpoints keep a human on the two expensive/sticky moments (spec correctness, archive)
  while automating the mechanical middle.
- **−** Sequential is slower in wall-clock than parallel waves. Accepted; revisit with
  worktree-isolated parallelism (a superseding ADR) once the loop is trusted.
- **−** Not fully AFK — two human gates remain by design. The headless/CI path is the documented
  graduation, deferred deliberately.
- **−** Local gates can't catch off-box build breakage until a push; mitigated by the per-wave push.
- **−** The runner is hand-built bootstrap tooling outside the loop it drives; it doesn't get the
  loop's own gate treatment (review it manually when built).

## Alternatives considered
- **Headless `claude -p` script / CI-cron, fully AFK** — same engine, scriptable now, but loses
  in-session observability and the propose/archive checkpoints. The intended end state, not v1;
  deferred until the loop earns trust.
- **Parallel via git worktrees** — real concurrency, but wave-mates share files (schema/router) →
  merge conflicts that outweigh the time saved at this scale. Revisit later.
- **PR-per-change / direct-to-main** — PR-per-change is overhead for a solo dev who reviews via the
  in-loop reviewer subagent; direct-to-main loses the end-of-milestone review surface. Local commits
  + one final PR fits the actual workflow.
- **Fail-fast on any gate failure** — one flaky test would stall all progress; isolate-and-continue
  keeps the backlog moving.
- **Built-in `/loop` (interval) / `/schedule` (cron)** — time-driven, not gate-aware; can't model
  ready/blocked/wave or the maker≠checker handoff. Wrong tool; we need a gate-driven orchestrator.
