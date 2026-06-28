// @trace FR-USAGE-01 TC-VALID-01
import "server-only";

import { db } from "@/lib/db";
import { recordUsageInputSchema } from "@/lib/schemas/usage";
import { cost } from "@/lib/ai/cost";

/**
 * Persist one usage row for a completed Claude API call (FR-USAGE-01).
 *
 * Validates the inbound payload with Zod; types are inferred via z.infer —
 * no `any`, no casts. Computes costUsd via the shared cost() function from
 * token-cost-calculation so figures stay consistent with the per-row formula.
 * Throws on validation failure (malformed input) or DB failure (not swallowed)
 * so the caller can observe the missing row.
 */
export async function recordUsage(input: unknown): Promise<void> {
  const parsed = recordUsageInputSchema.parse(input);
  const costUsd = cost(parsed.model, parsed.inputTokens, parsed.outputTokens);

  await db.usageRow.create({
    data: {
      cycleId: parsed.cycleId,
      purpose: parsed.purpose,
      model: parsed.model,
      inputTokens: parsed.inputTokens,
      outputTokens: parsed.outputTokens,
      cachedInputTokens: parsed.cachedInputTokens ?? null,
      costUsd,
    },
  });
}
