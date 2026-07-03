# Capability: daily-insight

- **Order:** 07 · **Phase:** 5 · **OpenSpec change:** `add-daily-insight` · **Status:** not started
- **Depends on:** profile-stats (aggregation) · **Blocks:** —
- **Packages:** `packages/shared`, `apps/api`, `apps/mobile`

## Summary

The one AI feature: a single-sentence read on today's pace, generated server-side from a
pre-computed numeric summary of the last 14 days, cached per day, with a deterministic fallback.

## Requirements

| ID | Description |
|----|-------------|
| FR-INSIGHT-01 | Short NL insight for today from recent history (last 14 days): pace, patterns, likely progress |
| FR-INSIGHT-02 | Generated **server-side** (NestJS) via the LLM; API key never reaches the client |
| FR-INSIGHT-03 | Cached per user per local day; one generation/day unless explicitly refreshed |
| FR-INSIGHT-04 | Model receives a **pre-computed numeric summary** (totals, per-day series, tags), never raw rows |
| FR-INSIGHT-05 | Output constrained: ≤ 200 chars, English, no emojis, no invented figures |
| FR-INSIGHT-06 | On LLM timeout/failure, fall back to a deterministic templated insight; never error/blank |
| TC-STACK-07 | LLM via the **Anthropic API**, invoked **only** from the NestJS backend |
| NFR-COST-01 | LLM usage bounded (one cached generation per user per day) |

## Pure-logic surface

Insight-input shaping (history → numeric summary) and the deterministic fallback template —
`packages/shared`, with an **evals** suite (fixtures → assertions on shape/constraints, TC-TEST-01).

## Scope

- Shared: summary-shaping fn + fallback template + insight contract.
- API: insight endpoint calling the Anthropic API (latest Claude model, server-side only),
  per-user-per-day cache, length/tone guardrails, fallback on failure.
- Mobile: insight card on Stats with refresh.

## Non-goals

No raw rows to the model, no per-request generation (cost), no client-side LLM calls.

## Risks / notes

Needs an Anthropic API key wired server-side (TC-STACK-07). Guardrails must enforce ≤ 200 chars
and reject fabricated numbers (FR-INSIGHT-04/05). Use the latest Claude model per project guidance.
