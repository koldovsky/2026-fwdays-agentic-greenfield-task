import { tenantWhere } from '../db/tenancy.js';
import { macroBaseFromRow, perForUnit, scaleFactor, unscaleMacros } from './scale.js';
import type { CatalogResult, FoodClient } from './types.js';

// Persist a logged estimate as a user-owned Food DB row (§8.2 step 2 "offer to add"). Driven by the
// food_log row itself (the button payload is just its id) rather than ephemeral draft state — the DB
// is the memory (invariant #1). We recover the per-basis macros from the scaled row, so a future log
// of the same product matches as `fact`. Only un-catalogued estimate rows qualify (foodDbId IS NULL).
// Returns the row's entryName so the caller can localize the reply (invariant #6).

/** The user-facing result plus the new `food_database` id (for the mirror enqueue); id null = no add. */
export interface CatalogSaveResult {
  result: CatalogResult;
  foodDbId: number | null;
}

export const saveLoggedFoodToCatalog = async (
  client: FoodClient,
  userId: number,
  foodLogId: number,
): Promise<CatalogSaveResult> => {
  const row = await client.foodLog.findFirst({ where: tenantWhere(userId, { id: foodLogId }) });
  if (!row) {
    return { result: { saved: false, entryName: null }, foodDbId: null };
  }
  if (row.foodDbId !== null) {
    // already catalogued (a fact) — nothing to add
    return { result: { saved: false, entryName: row.entryName }, foodDbId: null };
  }

  const per = perForUnit(row.unit);
  const factor = scaleFactor(Number(row.qty), per);
  if (factor <= 0) {
    return { result: { saved: false, entryName: row.entryName }, foodDbId: null };
  }

  const base = unscaleMacros(macroBaseFromRow(row), factor);

  const created = await client.foodDatabase.create({
    data: {
      userId,
      name: row.entryName,
      per,
      kcal: base.kcal,
      proteinG: base.proteinG,
      fatG: base.fatG,
      carbsG: base.carbsG,
    },
  });

  return { result: { saved: true, entryName: row.entryName }, foodDbId: created.id };
};
