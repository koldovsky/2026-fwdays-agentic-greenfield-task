import { priceTableSchema, type PriceTable } from "@/lib/schemas/usage";

/**
 * Seed price table reflecting current Anthropic pricing, USD per 1,000,000
 * tokens (FR-USAGE-04, TC-AI-02). Prices live in this one named constant so
 * they can be updated without touching call sites; `cost` also accepts an
 * override table so a recorded usage row can be recomputed at the price that
 * applied when it was written (FR-USAGE-02).
 */
export const SEED_PRICE_TABLE: PriceTable = priceTableSchema.parse({
  "claude-opus-4-8": { inputPerMillion: 5, outputPerMillion: 25 },
  "claude-sonnet-4-6": { inputPerMillion: 3, outputPerMillion: 15 },
  "claude-haiku-4-5": { inputPerMillion: 1, outputPerMillion: 5 },
});
