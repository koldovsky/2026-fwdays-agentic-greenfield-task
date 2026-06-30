import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { parseStructured } from '../llm/structured.js';
import type { FoodPer, MacroBase } from './types.js';

// Estimate path (§8.2 step 2, invariant #3): exactly ONE structured call through the shared seam
// (cached system prefix, no agent loop — invariant #5) when the product isn't in the Food DB. The
// model returns base macros per a single sensible basis; the final per-entry numbers are still
// computed in code by scaling (invariant #2). The result is tagged `estimate` (±20–30%) upstream.

const PER_VALUES = ['per100g', 'per100ml', 'portion', 'piece', 'dish'] as const;

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
});

export interface FoodEstimate {
  per: FoodPer;
  base: MacroBase;
}

export const estimateFood = async (client: Anthropic, product: string): Promise<FoodEstimate> => {
  const userText =
    `Provide a nutrition estimate for this food: "${product}". Give typical macros per a single ` +
    `sensible basis (per100g for weighable foods; piece, portion, or dish otherwise).`;

  const { data } = await parseStructured(client, estimateSchema, userText);

  return {
    per: data.per,
    base: { kcal: data.kcal, proteinG: data.proteinG, fatG: data.fatG, carbsG: data.carbsG },
  };
};
