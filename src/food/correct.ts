import type Anthropic from '@anthropic-ai/sdk';
import { buildCorrectionConfirmation, noEntryReply } from './confirm.js';
import { resolveFood } from './resolve.js';
import { macroBaseFromRow, perForUnit, reconcileQty, scaleFactor, unscaleMacros } from './scale.js';
import { findLastFoodLog, updateFoodLog } from './write.js';
import type {
  Confirmation,
  FoodClient,
  ParsedFood,
  ResolvedFood,
  RoutedCorrection,
} from './types.js';
import type { FoodLog } from '@prisma/client';

// Correction logic (design D1): update the user's most recent food_log row IN PLACE — never insert.
// Quantity-only rescales the existing row's own basis in code (zero LLM calls, invariant #5); a named
// product re-resolves through the same resolveFood pipeline logging uses (at most one structured
// call). Either way the write goes through updateFoodLog, tenant-scoped (invariant #8).

/** Quantity-only path (design D4): recover the row's basis, then rescale to the new quantity in code. */
const rescaleQuantity = (row: FoodLog, routed: RoutedCorrection): ResolvedFood => {
  const per = perForUnit(row.unit);
  const oldFactor = scaleFactor(Number(row.qty), per);
  const base = unscaleMacros(macroBaseFromRow(row), oldFactor);
  const newQty = reconcileQty(routed.quantity, routed.unit ?? row.unit, per);

  return {
    name: row.entryName,
    per,
    base,
    qty: newQty,
    unit: row.unit,
    source: row.source,
    foodDbId: row.foodDbId,
  };
};

/** Product path (design D5): re-resolve via the shared pipeline; missing qty defaults to the row's. */
const resolveProductCorrection = async (
  client: FoodClient,
  anthropic: Anthropic,
  userId: number,
  row: FoodLog,
  product: string,
  routed: RoutedCorrection,
): Promise<ResolvedFood> => {
  const parsed: ParsedFood = {
    product,
    qty: routed.quantity ?? Number(row.qty),
    unit: routed.unit ?? row.unit,
  };

  return resolveFood(client, anthropic, userId, parsed);
};

/** The corrected row (for the mirror enqueue) alongside its confirmation; `row` null = nothing to fix. */
export interface CorrectionResult {
  confirmation: Confirmation;
  row: FoodLog | null;
}

export const correctLast = async (
  client: FoodClient,
  anthropic: Anthropic,
  userId: number,
  text: string,
  routed: RoutedCorrection,
): Promise<CorrectionResult> => {
  const row = await findLastFoodLog(client, userId);
  if (!row) {
    return { confirmation: noEntryReply(text), row: null };
  }

  const resolved = routed.product
    ? await resolveProductCorrection(client, anthropic, userId, row, routed.product, routed)
    : rescaleQuantity(row, routed);

  const updated = await updateFoodLog(client, userId, row.id, resolved);
  if (!updated) {
    return { confirmation: noEntryReply(text), row: null };
  }

  return { confirmation: buildCorrectionConfirmation(text, updated), row: updated };
};
