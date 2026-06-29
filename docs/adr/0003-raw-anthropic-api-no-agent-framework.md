# ADR-0003 — Raw Anthropic API, no agent framework

*Status: Accepted · Date: 2026-06-28 · Source: requirements.md §5, prd.md §3/§8*

## Context
The bot's operations are **deterministic single calls**, not autonomous multi-step reasoning:
- "Save 200g chicken, 450 kcal" → parse → INSERT (1 call, or 0 if regex handles it).
- Photo of plate → 1 vision call → structured JSON → INSERT.
- "Make today's review" → fetch rows → 1 summarization call → save.

An autonomous agent loop (plan → act → observe → repeat) would multiply token cost 10–50× and make
monthly spend unpredictable — unacceptable for a hobby-scale, cost-capped project (~$1–3/month target).

## Decision
Call the **raw Anthropic API** directly with **tool-use / structured outputs** (forced JSON) for
parsing, vision, and review prose. **No agent framework, no autonomous loop.**
- **Primary model: Claude Sonnet 4.6** for parsing, vision, and reviews.
- **Haiku 4.5** kept as an optional later optimization for trivial text parsing.
- **Prompt caching** on the stable system prefix (food rules, schema) — ~90% saving on that prefix.
- The model writes **prose only**; all numbers come from SQL (see [ADR-0007](./0007-postgres-source-of-truth-notion-mirror.md)).

## Consequences
- **+** Predictable, low cost (~$1–3/month at ~10–20 msgs/day across a few users).
- **+** Simple, debuggable call paths; no hidden loop spend.
- **+** Still feels "agent-like" to the user (natural messages, lookups, reasoning).
- **−** No built-in tool-orchestration scaffolding — multi-step flows (e.g. open-question
  resolution) are coded explicitly rather than delegated to a planner.
- **−** Forgoes any future need for genuinely autonomous behavior without revisiting this ADR.

## Alternatives considered
Two concrete agent frameworks were evaluated — both run Claude agents over messaging apps
(including Telegram), which overlaps this project's exact niche:

- **[OpenClaw](https://openclaw.ai)** — open-source personal agent framework: full system control
  (files, shell, browser), persistent memory, autonomous multi-step workflows. Rejected: ~500k LOC
  across 53 config files and a heavyweight runtime — massive overkill and RAM cost for a
  deterministic food logger on a box where bot RSS is capped at 512 MB
  (see [ADR-0001](./0001-plain-typescript-no-nestjs.md), [ADR-0006](./0006-build-off-box-ghcr.md)).
- **[NanoClaw](https://github.com/nanocoai/nanoclaw)** — the lightweight TS alternative to OpenClaw:
  Claude agents in isolated Docker-per-agent containers, scheduled tasks, web access. Closest fit,
  and genuinely tempting. Rejected: it's still an **autonomous agent** model (loop + per-agent
  container) where this bot needs single deterministic calls — the agent loop reintroduces the
  10–50× token cost and unpredictable spend, and per-agent containers add footprint on a RAM-tight,
  multi-tenant box. We keep the "agent-like" UX without the agent runtime.
- **A generic agent loop / orchestration SDK** — rejected for the same core reason: cost and
  unpredictability for tasks that are single deterministic calls.
