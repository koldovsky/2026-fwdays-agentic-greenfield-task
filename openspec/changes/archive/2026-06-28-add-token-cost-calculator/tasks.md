## 1. Schemas (lib/schemas/usage.ts)

- [x] 1.1 Define a Zod schema for a single price entry: input and output price as USD per
  1M tokens (non-negative numbers); export the `z.infer` type. (TC-VALID-01, TC-TS-01)
- [x] 1.2 Define a Zod schema for the price table (map of model id → price entry) and a
  schema for token counts (non-negative integers); export their `z.infer` types.

## 2. Price table (lib/ai/pricing.ts)

- [x] 2.1 Export a named seed price table validated against the schema, with
  `claude-opus-4-8` `$5/$25`, `claude-sonnet-4-6` `$3/$15`, `claude-haiku-4-5` `$1/$5`
  (USD per 1M tokens). (FR-USAGE-04, TC-AI-02)

## 3. Pure cost function (lib/ai/cost.ts)

- [x] 3.1 Implement `cost(modelId, inputTokens, outputTokens, priceTable = seed)`: validate
  inputs with Zod, look up the model, return
  `(inputTokens/1e6)*inputPrice + (outputTokens/1e6)*outputPrice` in USD. (FR-USAGE-02)
- [x] 3.2 On a model id absent from the table, fail explicitly — never a silent `0` or
  guessed cost. (spec: unknown-model handling)
- [x] 3.3 Keep the module framework-free: no `next/*`, `react`, DOM, env, network, or
  clock. (TC-PURE-01)

## 4. Unit tests (Vitest)

- [x] 4.1 Known model: `claude-opus-4-8` with 1M/1M tokens → `30` USD; sonnet 2M/0.5M →
  `13.5` USD. (spec scenarios)
- [x] 4.2 Zero tokens → `0` for each seeded model.
- [x] 4.3 Custom price table overrides the seed.
- [x] 4.4 Unknown model id fails explicitly; negative / non-integer token counts are
  rejected by validation.

## 5. Verify

- [x] 5.1 Run `npm run lint && tsc --noEmit && npm test && npm run build`; all green.
- [x] 5.2 Update `docs/current-state.md` (slice done, files added, next step).
