import type Anthropic from '@anthropic-ai/sdk';
import { FoodSource } from '@prisma/client';
import { z } from 'zod';
import type { RawClarify } from '../clarify/types.js';
import {
  TELEGRAM_PHOTO_MEDIA_TYPE,
  parseStructured,
  type StructuredImage,
} from '../llm/structured.js';
import { PER_VALUES, clarifySchema } from './estimate.js';
import { lookupFoodsByNames } from './lookup.js';
import { fromMatch } from './resolve.js';
import { reconcileQty, unitForPer } from './scale.js';
import type { FoodClient, ResolvedFood } from './types.js';

// Vision front door (US-3, §8.3). One or more food photos stream to the model in EXACTLY ONE call
// (invariant #5) and come back as a list of self-contained items — each priced per a single basis,
// mirroring the text estimate schema's fields (design D2). An image MAY be a plate to identify
// visually OR a nutrition-facts / КБЖУ label; the caption is the authoritative item list. Everything
// after the extracted items reuses the text pipeline: batched Food-DB lookup → fact-vs-estimate
// resolution → code-scaled write/confirm. The image bytes live only in the base64 arguments and are
// never persisted (invariant #4).

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
  fromLabel: z
    .boolean()
    .describe(
      "true ONLY when this item's macros were read from a printed nutrition-facts / КБЖУ table " +
        'visible in one of the images (the printed per-100g/ml numbers), NOT a visual guess from a ' +
        'plate or typical/estimated macros — those are false',
    ),
});

// The optional PLATE-LEVEL `clarify` rides the SAME one vision response (design D3, invariant #5): the
// model raises ONE question only for a hidden high-leverage mover (added cooking fat, sauce/dressing,
// fried-vs-baked, an unknown dominant portion) — no Food-DB multi-match disambiguation for plates, so
// this is model-flagged only. Reuses the text estimate's `clarifySchema` (one home, rule #12).
const plateSchema = z.object({
  items: z
    .array(plateItemSchema)
    .describe('one entry per caption item (or per distinct food visible when there is no caption)'),
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
 * ONE vision call (invariant #5): all supplied photos + an optional caption go to the shared seam
 * and return the eaten items plus an optional plate-level `clarify` flag. Images may be plates OR
 * nutrition-facts labels; the caption is the authoritative item list (design D2). No follow-up
 * round-trip, no agent loop; the caller resolves + writes (or asks) in code.
 */
export const estimatePlate = async (
  client: Anthropic,
  images: string[],
  caption: string,
): Promise<PlateEstimate> => {
  const hasCaption = caption.trim() !== '';
  const captionInstruction = hasCaption
    ? `The user's caption lists what they actually ate, with quantities: "${caption}". Treat it as ` +
      'the AUTHORITATIVE item list — emit exactly one item per caption entry (never drop a named ' +
      'item, even one that appears in none of the images, like sugar or black coffee). For each ' +
      'item: if one of the images is a nutrition-facts / КБЖУ label (or a macro screenshot) for it, ' +
      'read the printed per-100g/ml macros and set fromLabel=true; otherwise read the plate visually ' +
      'or use typical macros and set fromLabel=false. Convert each stated amount (grams, millilitres, ' +
      'teaspoons, or a count) into `qty` expressed in the chosen `per` basis unit.'
    : 'Identify every distinct food visible in the images. For each, give typical macros per a single ' +
      'sensible basis (per100g for weighable foods; piece/portion/dish otherwise) and the observed ' +
      'quantity in that basis unit; set fromLabel=true only when the macros were read from a printed ' +
      'nutrition-facts label in an image, else false.';
  const userText =
    `${captionInstruction} Per the precision-first policy, also set \`clarify\` iff a high-leverage ` +
    'calorie-mover is hidden.';

  const structuredImages: StructuredImage[] = images.map((data) => ({
    data,
    mediaType: TELEGRAM_PHOTO_MEDIA_TYPE,
  }));
  const { data } = await parseStructured(client, plateSchema, userText, {
    images: structuredImages,
    label: 'plate-vision',
  });

  return { items: data.items, clarify: data.clarify ?? null };
};

/**
 * Whether a held ResolvedFood was label-sourced (design D2): a `fact` with NO `foodDbId` is a label
 * fact (a catalog fact carries the matched row id). Lets `refinePlate` round-trip the `fromLabel`
 * flag from the held items without threading a second field through the Open Question.
 */
const fromLabelOf = (item: ResolvedFood): boolean =>
  item.source === FoodSource.fact && item.foodDbId === null;

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
        `${item.qty} ${item.unit}; fromLabel=${String(fromLabelOf(item))}`,
    )
    .join('\n');
  const userText =
    'These items were extracted from a photo. The user has answered one clarifying question ' +
    'about a hidden calorie-mover. Return the FULL item list with corrected macros per basis and ' +
    'observed quantities, applying the answer as follows:\n' +
    '- An ADDED INGREDIENT (cooking oil/butter/ghee, sauce, dressing, mayo) → append it as a ' +
    'SEPARATE additional item (its own line with its own macros/qty, fromLabel=false); do NOT fold ' +
    'it into an existing item.\n' +
    '- A PORTION or COOKING-METHOD adjustment (fried/baked/raw, a corrected amount) → adjust the ' +
    'affected existing item in place.\n' +
    "PRESERVE each existing item's fromLabel value (a label-sourced item stays fromLabel=true).\n" +
    `Items:\n${itemLines}\nThe user's answer: "${answer}".`;

  const { data } = await parseStructured(client, plateSchema, userText, {
    label: 'plate-refine', // no images (invariant #4)
  });

  return data.items;
};

/** A plate item's parsed shape for `reconcileQty` (an observed qty in the basis unit). */
const itemQty = (item: PlateItem): number => reconcileQty(item.qty, unitForPer(item.per), item.per);

/** A held item's own macros as a ResolvedFood (label `fact` or visual `estimate`) — no catalog. */
const fromItemMacros = (item: PlateItem, source: FoodSource): ResolvedFood => ({
  name: item.name,
  per: item.per,
  base: { kcal: item.kcal, proteinG: item.proteinG, fatG: item.fatG, carbsG: item.carbsG },
  qty: itemQty(item),
  unit: unitForPer(item.per),
  source,
  foodDbId: null,
});

/**
 * Resolve each vision item into a ResolvedFood with precedence **label > Food-DB > visual/typical**
 * (design D2). A `fromLabel` item keeps its OWN printed-label macros as a `fact` — never overridden
 * by a catalog match (the label the user just showed is authoritative for that product). Every other
 * item goes through the SINGLE batched lookup: a name hit → `fromMatch` (`fact`, catalog macros); a
 * miss → the item's own macros as an `estimate`, with NO extra LLM call (invariant #5). Only the
 * non-label names are looked up, so a fully-labelled plate issues no query at all. Order is preserved
 * so rows/confirmation line up.
 */
export const resolvePlate = async (
  client: FoodClient,
  userId: number,
  items: PlateItem[],
): Promise<ResolvedFood[]> => {
  const matches = await lookupFoodsByNames(
    client,
    userId,
    items.filter((item) => !item.fromLabel).map((item) => item.name),
  );

  return items.map((item) => {
    if (item.fromLabel) {
      return fromItemMacros(item, FoodSource.fact);
    }

    const match = matches.get(item.name.toLowerCase());
    if (match) {
      return fromMatch(match, { product: item.name, qty: item.qty, unit: unitForPer(item.per) });
    }

    return fromItemMacros(item, FoodSource.estimate);
  });
};
