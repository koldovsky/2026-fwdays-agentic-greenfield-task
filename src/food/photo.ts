import type Anthropic from '@anthropic-ai/sdk';
import { FoodSource } from '@prisma/client';
import { z } from 'zod';
import type { RawClarify } from '../clarify/types.js';
import { parseStructured, type StructuredImage } from '../llm/structured.js';
import { PER_VALUES, clarifySchema } from './estimate.js';
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

// The optional PLATE-LEVEL `clarify` rides the SAME one vision response (design D3, invariant #5): the
// model raises ONE question only for a hidden high-leverage mover (added cooking fat, sauce/dressing,
// fried-vs-baked, an unknown dominant portion) — no Food-DB multi-match disambiguation for plates, so
// this is model-flagged only. Reuses the text estimate's `clarifySchema` (one home, rule #12).
const plateSchema = z.object({
  items: z.array(plateItemSchema).describe('one entry per distinct food visible on the plate'),
  clarify: clarifySchema
    .optional()
    .describe(
      'ONLY when a HIGH-LEVERAGE calorie-mover is hidden on the plate (added cooking fat like ' +
        'oil/butter, sauce/dressing/mayo, fried-vs-baked-vs-raw, or an unknown portion of a ' +
        'dominant item) and one question resolves it; omit for a fully-specified plate or ≈±50 kcal ' +
        'uncertainty (log the estimate instead — invariant #3)',
    ),
});

export type PlateItem = z.infer<typeof plateItemSchema>;

/** What the single vision call returns: the extracted items plus an optional plate-level clarify. */
export interface PlateEstimate {
  items: PlateItem[];
  clarify: RawClarify | null;
}

/**
 * ONE vision call (invariant #5): the photo + an optional caption go to the shared seam and return
 * the plate's items plus an optional plate-level `clarify` flag. No follow-up round-trip, no agent
 * loop; the caller resolves + writes (or asks) in code.
 */
export const estimatePlate = async (
  client: Anthropic,
  imageBase64: string,
  caption: string,
): Promise<PlateEstimate> => {
  const captionLine = caption.trim() === '' ? '' : ` The user's caption: "${caption}".`;
  const userText =
    'Identify every distinct food on this plate. For each, give typical macros per a single ' +
    'sensible basis (per100g for weighable foods; piece/portion/dish otherwise) and the observed ' +
    'quantity in that basis unit. Per the precision-first policy, also set `clarify` iff a ' +
    `high-leverage calorie-mover is hidden.${captionLine}`;

  const images: StructuredImage[] = [{ data: imageBase64, mediaType: IMAGE_MEDIA_TYPE }];
  const { data } = await parseStructured(client, plateSchema, userText, images);

  return { items: data.items, clarify: data.clarify ?? null };
};

/**
 * Apply a plate answer by ONE text-only structured call (design D4): the held item list (names +
 * per-basis macros + observed qty) plus the user's answer go to the shared seam with NO images
 * (invariant #4 — the photo is already discarded; vision is never re-run), returning the adjusted
 * item list. Only the held items + the reply reach the model (invariant #1); the caller re-resolves
 * fact/estimate and writes. `≤1` call, no agent loop (invariant #5).
 *
 * An **added ingredient** (oil/butter, sauce/dressing/mayo) is returned as its OWN extra item so its
 * calories survive the caller's `resolvePlate` (which rebuilds a Food-DB match from catalog macros and
 * would otherwise drop anything folded INTO a named `fact` item). Only portion / cooking-method
 * adjustments are folded into an existing item.
 */
export const refinePlate = async (
  client: Anthropic,
  items: ResolvedFood[],
  answer: string,
): Promise<PlateItem[]> => {
  const itemLines = items
    .map(
      (item) =>
        `- ${item.name}: ${item.base.kcal} kcal, ${item.base.proteinG}g protein, ` +
        `${item.base.fatG}g fat, ${item.base.carbsG}g carbs per ${item.per}; observed qty ` +
        `${item.qty} ${item.unit}`,
    )
    .join('\n');
  const userText =
    'These items were extracted from a plate photo. The user has answered one clarifying question ' +
    'about a hidden calorie-mover. Return the FULL item list with corrected macros per basis and ' +
    'observed quantities, applying the answer as follows:\n' +
    '- An ADDED INGREDIENT (cooking oil/butter/ghee, sauce, dressing, mayo) → append it as a ' +
    'SEPARATE additional item (its own line with its own macros/qty); do NOT fold it into an ' +
    'existing item.\n' +
    '- A PORTION or COOKING-METHOD adjustment (fried/baked/raw, a corrected amount) → adjust the ' +
    `affected existing item in place.\nItems:\n${itemLines}\nThe user's answer: "${answer}".`;

  const { data } = await parseStructured(client, plateSchema, userText); // no images (invariant #4)

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
