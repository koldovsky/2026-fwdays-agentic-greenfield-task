import { SEED_PRICE_TABLE } from "@/lib/ai/pricing";
import {
  priceTableSchema,
  tokenCountsSchema,
  type PriceTable,
} from "@/lib/schemas/usage";

/**
 * Thrown when a model id is not present in the supplied price table. The cost
 * calculation fails explicitly here rather than ever returning a silent `0` or
 * a guessed cost (spec: unknown-model handling).
 */
export class UnknownModelError extends Error {
  constructor(public readonly modelId: string) {
    super(`No price entry for model id "${modelId}" in the supplied price table`);
    this.name = "UnknownModelError";
  }
}

/**
 * Pure, framework-free USD cost for a Claude API call (FR-USAGE-02, TC-PURE-01).
 *
 * Reads no environment, network, database, clock, or DOM, so it is 100%
 * unit-testable. Inputs are validated at the boundary with Zod; an unknown
 * model id fails explicitly.
 *
 * cost = (inputTokens / 1e6) * inputPrice + (outputTokens / 1e6) * outputPrice
 */
export function cost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  priceTable: PriceTable = SEED_PRICE_TABLE,
): number {
  const { inputTokens: input, outputTokens: output } = tokenCountsSchema.parse({
    inputTokens,
    outputTokens,
  });
  const table = priceTableSchema.parse(priceTable);

  const entry = table[modelId];
  if (entry === undefined) {
    throw new UnknownModelError(modelId);
  }

  return (
    (input / 1_000_000) * entry.inputPerMillion +
    (output / 1_000_000) * entry.outputPerMillion
  );
}
