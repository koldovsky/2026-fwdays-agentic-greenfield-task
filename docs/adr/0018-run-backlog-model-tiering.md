# ADR-0018 — Opus·high for the run-backlog loop; Haiku only for mechanical steps

*Status: Accepted · Date: 2026-07-01 · Amends [ADR-0012](./0012-implementation-loop-runner.md)
(the loop runner's per-phase model assignment) · Source: `.claude/skills/run-backlog/SKILL.md`
§Model per phase.*

> **Scope: the development loop, not the product.** This decides which Claude model runs each
> **`/run-backlog` orchestration phase** (propose, apply, verify, review, …). It does **not** touch
> the **bot's runtime** LLM — that stays Sonnet 4.6 for classification/parsing per
> [ADR-0003](./0003-raw-anthropic-api-no-agent-framework.md) and requirements §8.0. Two different
> model decisions for two different concerns.

## Context
[ADR-0012](./0012-implementation-loop-runner.md)'s runner assigned a **model + effort tier per
phase**, on the then-correct principle "don't run Opus everywhere — match the cheapest model that
does the job." That split three ways: **Opus** for deep/adversarial judgement (propose, dup/improve,
review), **Sonnet 5** for implementation, coherence, and prose (plan gate, apply-maker, verify,
sync-docs, pre-archive, archive spec-sync), **Haiku** for mechanical tool-running.

The economics that justified the middle tier no longer hold. At current pricing, **Opus at high
effort is both stronger and cheaper than Sonnet 5** for this loop's reasoning and implementation
work (external benchmarks + pricing, mid-2026). The Sonnet tier was a compromise to save cost on
"good-enough" reasoning; when the premium tier is *also* the cheaper one, the compromise inverts —
routing apply/verify/docs to Sonnet now buys *worse* output for *more* money.

Nothing about the split's other axis changed: the **maker ≠ checker** rule (apply agent must not
review its own diff) was never a *model* distinction — apply and review were separate subagents that
happened to sit on different tiers. Collapsing both onto Opus does not weaken it.

## Decision
**Run every reasoning / implementation / coherence / prose phase on Opus · high; keep Haiku · low
only for pure mechanical steps. No `/run-backlog` phase runs on Sonnet.**

- **Opus · high** — propose, plan gate, apply-maker, verify, dup-gate + improve-arch, review-checker,
  sync-docs, pre-archive gate, and the archive spec-sync subagent.
- **Haiku · low** — select, test/static run, evals run, commit, archive-move (the bookkeeping/
  tool-running steps). Escalate a Haiku step to Opus the moment it hits a non-obvious problem (e.g. a
  red test needing real diagnosis) — note the bump.

**Maker ≠ checker stays a *role* separation, not a model one.** Apply (step 5) and review (step 8)
run as **distinct** Opus subagents; the apply maker still may not self-approve. The orchestrator
itself sits on Opus · high (its natural tier for gate-running), so reasoning phases need no `/model`
switching — only the mechanical steps drop to Haiku (via `/model` or a Haiku subagent).

This **amends ADR-0012**: wherever its narration implies a Sonnet middle tier for the loop, read
"Opus · high." The loop's *shape* (sequential, isolate-and-continue, gate order, autonomous/
gate-driven) is unchanged — only the model assignment is.

## Consequences
- **+** Better output on the highest-leverage phases (implementation, coherence, doc accuracy) at
  **lower** cost than the prior Sonnet assignment — strictly dominant under current pricing.
- **+** Simpler mental model: two tiers, not three. The orchestrator stays on one model for all
  reasoning; only mechanical steps step down. Removes the "is this Sonnet or Sonnet 5?" ambiguity the
  old table carried (they were the same model, `claude-sonnet-5`, spelled two ways).
- **−** Higher per-call cost than Haiku on any phase we *could* have left mechanical but promoted —
  mitigated by keeping the genuinely mechanical steps (select/commit/test-run/evals/archive-move) on
  Haiku.
- **Pricing-reversible.** This is an economics-driven call, not an architectural one. If the Opus/
  Sonnet price or capability ordering flips again, re-tier the phases in the skill (and amend here) —
  no code depends on the assignment.
- **Watch item:** the premise is "Opus·high cheaper than Sonnet 5 for this work." If that stops being
  true, this ADR is the first thing to revisit.

## Alternatives considered
- **Keep the three-tier split (Opus/Sonnet/Haiku)** — rejected: the Sonnet tier is now dominated
  (worse *and* costlier than Opus·high for these phases). Keeping it optimizes for an economics that
  no longer exists.
- **Move *everything* to Opus, including the mechanical steps** — rejected: select/commit/npm-run/
  archive-move are pure tool-running with no judgement; Haiku does them correctly for far less. No
  quality upside to promoting them.
- **Lower the reasoning phases to Haiku to cut cost** — rejected: apply/verify/review/docs need real
  judgement; Haiku regresses quality on exactly the phases that gate correctness. Cost is already
  lower on Opus·high than the prior Sonnet tier, so there's nothing to save here.
