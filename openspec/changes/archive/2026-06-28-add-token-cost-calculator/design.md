## Context

Kolo360 must account for Claude API spend per cycle and model (FR-USAGE-02/-03). The
broader `usage-accounting` slice (8b) records a usage row per call and renders an HR spend
view; this change delivers only the pure arithmetic those parts depend on: model id +
token counts + a configurable price table → USD. Per `AGENTS.md` / TC-PURE-01, `lib/` is
framework-free and 100% unit-testable, so this lands as pure functions with Vitest tests
and no DB, UI, or network. It is also the teaching warm-up slice in `docs/current-state.md`.

## Goals / Non-Goals

**Goals:**

- A pure `cost(modelId, inputTokens, outputTokens, priceTable?)` returning USD.
- A configurable price table seeded with current Anthropic pricing (FR-USAGE-04), passable
  as an argument so a historical table can recompute a past row (FR-USAGE-02).
- Zod-validated inputs with types inferred via `z.infer`; no `any`, no casts (TC-VALID-01,
  TC-TS-01).
- Explicit failure on an unknown model id; non-negative integer token counts.

**Non-Goals:**

- No `UsageRow` persistence (FR-USAGE-01) and no aggregate spend view (FR-USAGE-03) — those
  live in `add-usage-accounting`.
- No Claude API call, env reading, or admin UI for editing prices. "Editable without code
  changes" is satisfied here by the table being data passed in; a persisted/editable table
  is the later slice's concern.
- No cached-vs-uncached token pricing tiers in this slice (single input/output rate per
  model); revisit when FR-USAGE-01 captures cached tokens.

## Decisions

- **Price unit = USD per 1,000,000 tokens.** Matches how the PRD and Anthropic state prices
  (FR-USAGE-04), keeping the seed table readable and audit-friendly. Cost divides token
  counts by 1e6. Alternative (per-token fractions) was rejected as unreadable and
  error-prone.
- **Price table is a function argument, defaulting to the seed.** This is what makes prices
  configurable and history-accurate without a code change (FR-USAGE-02): callers normally
  use the seed, but a recorded row can be recomputed against the table that applied then.
  Alternative (module-global constant read inside `cost`) was rejected — it hard-codes
  prices at the call site and blocks historical replay and test injection.
- **Model id keyed by exact string from TC-AI-02** (`claude-opus-4-8`, `claude-sonnet-4-6`,
  `claude-haiku-4-5`). A Zod schema validates the table and token counts at the boundary;
  TS types come from `z.infer`. Unknown model → explicit failure (the spec forbids a silent
  zero/guess), surfaced as a typed error result or thrown error, decided at implementation
  but never a silent `0`.
- **Two small modules under `lib/ai/`**: `pricing.ts` (schema + seed table) and `cost.ts`
  (the pure function); shared schemas re-exported from `lib/schemas/usage.ts` so the later
  recording slice imports one definition (TC-ARCH-01). No duplication.
- **Money as a `number` in USD.** Token-derived costs are exact enough at display precision
  for MVP cost analysis; rounding/formatting is the presentation layer's job in the later
  slice. Decimal-library precision was judged unnecessary overhead here.

## Risks / Trade-offs

- **Floating-point rounding on summed costs** → keep `cost` returning the raw `number`;
  defer any rounding to the aggregation/display layer so it rounds once, not per row.
- **Seed prices drift from Anthropic's real prices** → prices live in one named seed
  constant with the FR-USAGE-04 values, easy to update; the function already accepts an
  override table, so no logic changes when prices move.
- **Unknown model id semantics (throw vs typed error)** → either is acceptable so long as
  it is never a silent `0`; the choice is fixed in implementation and covered by a test.
- **Cached-token pricing not modelled yet** → acceptable for this slice; the table shape
  can gain optional cached rates later without breaking the single-rate callers.
