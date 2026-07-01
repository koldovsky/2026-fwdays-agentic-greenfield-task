import type Anthropic from '@anthropic-ai/sdk';
import { FoodSource } from '@prisma/client';
import type { Clarification } from '../clarify/types.js';
import { estimateFood } from './estimate.js';
import { lookupCandidates, lookupFood, type CatalogMatch } from './lookup.js';
import { reconcileQty, unitForPer } from './scale.js';
import type { FoodClient, ParsedFood, ResolvedFood } from './types.js';

// Resolve macros into the unified ResolvedFood: a Food DB hit is a `fact` (zero LLM calls); a miss
// is an `estimate` (one LLM call). Either way the caller scales + writes the same way. The stored
// `unit` is the canonical label for the basis, so qty + unit + per stay consistent (§8.2).
//
// The log path also needs the ask-vs-log signals the resolution already produced (design D1): the
// estimate call's optional `clarify`, and whether >1 catalog row matched. `resolveForLog` surfaces
// them WITHOUT a second query or call; `resolveFood` keeps its ResolvedFood-only contract for the
// correction path (which never asks).

/** The log path's richer resolution: the food to (maybe) write, plus the ask-vs-log signals. */
export interface LogResolution {
  resolved: ResolvedFood;
  clarify: Clarification | null;
  candidates: CatalogMatch[];
}

/** Map a Food-DB match + the original parsed input into a `fact` ResolvedFood (shared with clarify). */
export const fromMatch = (match: CatalogMatch, parsed: ParsedFood): ResolvedFood => ({
  name: match.name,
  per: match.per,
  base: match.base,
  qty: reconcileQty(parsed.qty, parsed.unit, match.per),
  unit: unitForPer(match.per),
  source: FoodSource.fact,
  foodDbId: match.id,
});

export const resolveForLog = async (
  client: FoodClient,
  anthropic: Anthropic,
  userId: number,
  parsed: ParsedFood,
): Promise<LogResolution> => {
  const candidates = await lookupCandidates(client, userId, parsed.product);
  const head = candidates[0];
  if (head) {
    // The head is the user's own entry (or the sole global) — the fact-path resolution; a >1 result
    // is handed to decide() as candidates for a code-raised disambiguation question.
    return { resolved: fromMatch(head, parsed), clarify: null, candidates };
  }

  const estimate = await estimateFood(anthropic, parsed.product);

  return {
    resolved: {
      name: parsed.product,
      per: estimate.per,
      base: estimate.base,
      qty: reconcileQty(parsed.qty, parsed.unit, estimate.per),
      unit: unitForPer(estimate.per),
      source: FoodSource.estimate,
      foodDbId: null,
    },
    clarify: estimate.clarify ?? null,
    candidates,
  };
};

/** Resolution for paths that never ask (correction): a single clean match or the estimate. */
export const resolveFood = async (
  client: FoodClient,
  anthropic: Anthropic,
  userId: number,
  parsed: ParsedFood,
): Promise<ResolvedFood> => {
  const match = await lookupFood(client, userId, parsed.product);
  if (match) {
    return fromMatch(match, parsed);
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
