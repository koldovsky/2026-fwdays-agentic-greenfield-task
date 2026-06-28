import { z } from "zod";

/**
 * Shared usage-accounting schemas. Defined once here so the later
 * `add-usage-accounting` slice (FR-USAGE-01/-03) imports the same definitions
 * instead of redeclaring them (TC-ARCH-01). Types are inferred via `z.infer`;
 * never hand-write a parallel type (TC-TS-01).
 */

/** A single model's price: USD per 1,000,000 tokens, in and out. (TC-VALID-01) */
export const priceEntrySchema = z.object({
  inputPerMillion: z.number().nonnegative(),
  outputPerMillion: z.number().nonnegative(),
});

export type PriceEntry = z.infer<typeof priceEntrySchema>;

/** Map of Claude model id → price entry. Configurable, not hard-coded. (FR-USAGE-04) */
export const priceTableSchema = z.record(z.string(), priceEntrySchema);

export type PriceTable = z.infer<typeof priceTableSchema>;

/** Token counts are non-negative integers. (spec: validated inputs) */
export const tokenCountsSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
});

export type TokenCounts = z.infer<typeof tokenCountsSchema>;

/** Inbound payload for recordUsage (FR-USAGE-01). */
export const recordUsageInputSchema = z.object({
  cycleId: z.string().min(1),
  purpose: z.enum(["interview", "summary"]),
  model: z.string().min(1),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cachedInputTokens: z.number().int().nonnegative().optional(),
});

export type RecordUsageInput = z.infer<typeof recordUsageInputSchema>;
