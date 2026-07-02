import { FoodPer } from '@prisma/client';
import { tenantWhere } from '../db/tenancy.js';
import type { CatalogSaveResult } from './addToCatalog.js';
import { sumMacros } from './scale.js';
import type { FoodClient } from './types.js';

// Save a just-logged MULTI-item dish as ONE named `food_database` product (composite-dish, design D1).
// The whole dish is one `portion`; its macros are the components' kcal/protein/fat/carbs SUMMED IN
// CODE (invariant #2 — no model number), RE-READ from the dish's `food_log` rows at save time
// (invariant #1 — the DB is the memory, never chat/UI/callback state). Mirrors `saveLoggedFoodToCatalog`
// (driven by the rows, not draft state), but folds MULTIPLE rows into one row. Reads and the write are
// tenant-scoped (invariant #8): the write is OWN-only (`tenantWhere`), so a name clashing with a global
// product creates the user's own row and never mutates someone else's. Find-or-update by (userId, name)
// case-insensitive (design D4) so a re-save refreshes rather than duplicating. Zero LLM calls.

export const saveDishToCatalog = async (
  client: FoodClient,
  userId: number,
  rowIds: number[],
  name: string,
): Promise<CatalogSaveResult> => {
  // Re-read the rows tenant-scoped — `findMany` returns only rows that still exist AND belong to the
  // user, so a missing/foreign id is silently skipped (design: stale-id risk). No rows → nothing to save.
  const rows = await client.foodLog.findMany({
    where: tenantWhere(userId, { id: { in: rowIds } }),
  });
  if (rows.length === 0) {
    return { result: { saved: false, entryName: null }, foodDbId: null };
  }

  const macros = sumMacros(rows);
  const data = { per: FoodPer.portion, ...macros };

  // Find-or-update by (userId, name), OWN rows only (invariant #8) — a re-save refreshes the macros.
  const existing = await client.foodDatabase.findFirst({
    where: tenantWhere(userId, { name: { equals: name, mode: 'insensitive' as const } }),
  });
  const saved = existing
    ? await client.foodDatabase.update({ where: { id: existing.id }, data })
    : await client.foodDatabase.create({ data: { userId, name, ...data } });

  return { result: { saved: true, entryName: name }, foodDbId: saved.id };
};
