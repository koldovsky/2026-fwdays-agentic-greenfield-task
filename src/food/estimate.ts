import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { parseStructured } from '../llm/structured.js';
import { toClarification } from '../clarify/types.js';
import type { Clarification } from '../clarify/types.js';
import type { FoodPer, MacroBase } from './types.js';

// Estimate path (§8.2 step 2, invariant #3): exactly ONE structured call through the shared seam
// (cached system prefix, no agent loop — invariant #5) when the product isn't in the Food DB. The
// model returns base macros per a single sensible basis; the final per-entry numbers are still
// computed in code by scaling (invariant #2). The result is tagged `estimate` (±20–30%) upstream.
// The optional `clarify` field rides THIS SAME call (design D1, zero new call class): the model
// fills it — guided by the prefix's hidden-leverage checklist — only when a high-leverage
// calorie-mover is hidden; the macros always come back and serve as the expiry-fallback estimate.

/** The `per`-basis literal tuple for zod schemas (the FoodPer enum's members). One home (rule #12). */
export const PER_VALUES = ['per100g', 'per100ml', 'portion', 'piece', 'dish'] as const;

const clarifySchema = z.object({
  unknown: z
    .string()
    .describe('the single hidden high-leverage variable, e.g. "fat%", "cooking fat"'),
  question: z
    .string()
    .describe("one short question in the USER'S language resolving that variable"),
  kind: z
    .enum(['quantity', 'descriptor'])
    .optional()
    .describe(
      'how the answer is applied: "quantity" when the unknown is the amount/portion (the answer ' +
        'rescales the entry), else "descriptor" for a qualitative mover (fat%, prep, sauce)',
    ),
  options: z
    .array(z.string())
    .optional()
    .describe('fixed answer choices as short ENGLISH values when the set is small, else omit'),
});

const estimateSchema = z.object({
  per: z
    .enum(PER_VALUES)
    .describe(
      'the basis the macros are given per: per100g/per100ml for weighable foods, else piece/portion/dish',
    ),
  kcal: z.number().describe('kcal per the chosen `per` basis'),
  proteinG: z.number().describe('protein grams per the basis'),
  fatG: z.number().describe('fat grams per the basis'),
  carbsG: z.number().describe('carbohydrate grams per the basis'),
  clarify: clarifySchema
    .optional()
    .describe(
      'ONLY when a HIGH-LEVERAGE calorie-mover is hidden (cooking fat, sauce/dressing, ' +
        'fried/baked/raw, unknown portion, sugary drink, protein variant fat%) and one question ' +
        'resolves it; omit for complete input or ≈±50 kcal uncertainty (log the estimate instead)',
    ),
});

export interface FoodEstimate {
  per: FoodPer;
  base: MacroBase;
  clarify?: Clarification;
}

export const estimateFood = async (client: Anthropic, product: string): Promise<FoodEstimate> => {
  const userText =
    `Provide a nutrition estimate for this food: "${product}". Give typical macros per a single ` +
    `sensible basis (per100g for weighable foods; piece, portion, or dish otherwise). Per the ` +
    `precision-first policy, also set \`clarify\` iff a high-leverage calorie-mover is hidden.`;

  const { data } = await parseStructured(client, estimateSchema, userText);

  const base: MacroBase = {
    kcal: data.kcal,
    proteinG: data.proteinG,
    fatG: data.fatG,
    carbsG: data.carbsG,
  };

  const clarify = data.clarify ? toClarification(data.clarify) : null;

  return clarify ? { per: data.per, base, clarify } : { per: data.per, base };
};
