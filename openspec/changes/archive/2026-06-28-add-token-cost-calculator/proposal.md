## Why

Every Claude API call in Kolo360 (interview, summary) must be costed so HR can see
cost-of-operation per cycle and model (FR-USAGE-02/-03). Cost must derive from a
configurable price table, not hard-coded numbers, so historical usage rows keep the
price that applied when they were recorded and prices can be updated without a code
change (FR-USAGE-04). This slice delivers the pure calculation at the centre of that
accounting, ahead of the DB recording and HR spend view that consume it.

## What Changes

- Add a configurable price table in `lib/` mapping each supported Claude model id to its
  input and output price (USD per 1M tokens), seeded with current Anthropic pricing:
  Opus 4.8 `$5 / $25`, Sonnet 4.6 `$3 / $15`, Haiku 4.5 `$1 / $5` (FR-USAGE-04).
- Add a pure function that converts a model id + input/output token counts into a USD
  cost using a price table (defaulting to the seed table, overridable for testing and
  for historical-price replay) (FR-USAGE-02).
- Define the price-table and cost-result shapes as Zod schemas in `lib/schemas/`, with
  TypeScript types inferred via `z.infer` (TC-VALID-01, TC-TS-01).
- Add Vitest unit tests covering each seeded model, zero tokens, custom price tables,
  and an unknown model id (TC-PURE-01, TC-TEST-01).
- No database, no UI, no Claude API call — pure, framework-free logic only.

## Capabilities

### New Capabilities
- `token-cost-calculation`: convert a Claude model id and token counts into a USD cost
  via a configurable, per-model input/output price table seeded with current pricing.

### Modified Capabilities
<!-- None: no existing spec changes its requirements. The broader usage-accounting
     capability (FR-USAGE-01 recording, FR-USAGE-03 aggregate view) is a later change. -->

## Impact

- New code: `lib/ai/pricing.ts` (price table + seed), `lib/ai/cost.ts` (pure calc),
  `lib/schemas/usage.ts` (Zod schemas), plus their Vitest specs.
- No schema/DB, API, or dependency changes. Consumed later by `add-usage-accounting`
  (FR-USAGE-01/-03) when recording usage rows and rendering HR spend.
