import type Anthropic from '@anthropic-ai/sdk';
import { FoodSource } from '@prisma/client';
import { estimateFood } from './estimate.js';
import { lookupFood } from './lookup.js';
import { reconcileQty, unitForPer } from './scale.js';
import type { FoodClient, ParsedFood, ResolvedFood } from './types.js';

// Resolve macros into the unified ResolvedFood: a Food DB hit is a `fact` (zero LLM calls); a miss
// is an `estimate` (one LLM call). Either way the caller scales + writes the same way. The stored
// `unit` is the canonical label for the basis, so qty + unit + per stay consistent (§8.2).

export const resolveFood = async (
  client: FoodClient,
  anthropic: Anthropic,
  userId: number,
  parsed: ParsedFood,
): Promise<ResolvedFood> => {
  const match = await lookupFood(client, userId, parsed.product);
  if (match) {
    return {
      name: match.name,
      per: match.per,
      base: match.base,
      qty: reconcileQty(parsed.qty, parsed.unit, match.per),
      unit: unitForPer(match.per),
      source: FoodSource.fact,
      foodDbId: match.id,
    };
  }

  const estimate = await estimateFood(anthropic, parsed.product);

  return {
    name: parsed.product,
    per: estimate.per,
    base: estimate.base,
    qty: reconcileQty(parsed.qty, parsed.unit, estimate.per),
    unit: unitForPer(estimate.per),
    source: FoodSource.estimate,
    foodDbId: null,
  };
};
