import type Anthropic from '@anthropic-ai/sdk';
import { FoodSource } from '@prisma/client';
import { z } from 'zod';
import { parseStructured, type StructuredImage } from '../llm/structured.js';
import { PER_VALUES } from './estimate.js';
import { lookupFoodsByNames } from './lookup.js';
import { fromMatch } from './resolve.js';
import { reconcileQty, unitForPer } from './scale.js';
import type { FoodClient, ResolvedFood } from './types.js';

// Vision front door (US-3, §8.3). A plate photo streams to the model in EXACTLY ONE call (invariant
// #5) and comes back as a list of self-contained items — each priced per a single basis, mirroring
// the text estimate schema's fields (design D2). Everything after the extracted items reuses the
// text pipeline: batched Food-DB lookup → fact-vs-estimate resolution → code-scaled write/confirm.
// The image bytes live only in the base64 argument and are never persisted (invariant #4).

const IMAGE_MEDIA_TYPE = 'image/jpeg'; // Telegram delivers photos as JPEG (design D5).

const plateItemSchema = z.object({
  name: z
    .string()
    .describe('the food item, in the language a Food-Database lookup would use (e.g. the caption)'),
  per: z
    .enum(PER_VALUES)
    .describe(
      'the basis the macros are given per: per100g/per100ml for weighable foods, else piece/portion/dish',
    ),
  kcal: z.number().describe('kcal per the chosen `per` basis'),
  proteinG: z.number().describe('protein grams per the basis'),
  fatG: z.number().describe('fat grams per the basis'),
  carbsG: z.number().describe('carbohydrate grams per the basis'),
  qty: z
    .number()
    .describe('the observed quantity on the plate in the basis unit (grams/ml, or a count)'),
});

const plateSchema = z.object({
  items: z.array(plateItemSchema).describe('one entry per distinct food visible on the plate'),
});

export type PlateItem = z.infer<typeof plateItemSchema>;

/**
 * ONE vision call (invariant #5): the photo + an optional caption go to the shared seam and return
 * the plate's items. No follow-up round-trip, no agent loop; the caller resolves + writes in code.
 */
export const estimatePlate = async (
  client: Anthropic,
  imageBase64: string,
  caption: string,
): Promise<PlateItem[]> => {
  const captionLine = caption.trim() === '' ? '' : ` The user's caption: "${caption}".`;
  const userText =
    'Identify every distinct food on this plate. For each, give typical macros per a single ' +
    'sensible basis (per100g for weighable foods; piece/portion/dish otherwise) and the observed ' +
    `quantity in that basis unit.${captionLine}`;

  const images: StructuredImage[] = [{ data: imageBase64, mediaType: IMAGE_MEDIA_TYPE }];
  const { data } = await parseStructured(client, plateSchema, userText, images);

  return data.items;
};

/** A plate item's parsed shape for `reconcileQty` (an observed qty in the basis unit). */
const itemQty = (item: PlateItem): number => reconcileQty(item.qty, unitForPer(item.per), item.per);

/**
 * Resolve each vision item into a ResolvedFood (design D3), reusing the SINGLE batched lookup:
 * a Food-DB name hit → `fromMatch` (`fact`, catalog macros preferred over the visual estimate); a
 * miss → the item's OWN macros as an `estimate` — with NO extra LLM call (invariant #5; the visual
 * macros already returned ARE the estimate). Order is preserved so rows/confirmation line up.
 */
export const resolvePlate = async (
  client: FoodClient,
  userId: number,
  items: PlateItem[],
): Promise<ResolvedFood[]> => {
  const matches = await lookupFoodsByNames(
    client,
    userId,
    items.map((item) => item.name),
  );

  return items.map((item) => {
    const match = matches.get(item.name.toLowerCase());
    if (match) {
      return fromMatch(match, { product: item.name, qty: item.qty, unit: unitForPer(item.per) });
    }

    return {
      name: item.name,
      per: item.per,
      base: { kcal: item.kcal, proteinG: item.proteinG, fatG: item.fatG, carbsG: item.carbsG },
      qty: itemQty(item),
      unit: unitForPer(item.per),
      source: FoodSource.estimate,
      foodDbId: null,
    };
  });
};
