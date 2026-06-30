import { catalogWhere } from '../db/tenancy.js';
import { macroBaseFromRow } from './scale.js';
import type { FoodClient, FoodPer, MacroBase } from './types.js';

// Food DB lookup (§8.2 step 2). Scoped to the tenant's own rows PLUS the global catalog
// (user_id IS NULL) via catalogWhere — never another user's rows (invariant #8). A match is a
// `fact`; a miss falls through to the estimate path. Case-insensitive exact name match keeps this
// slice simple — fuzzy/synonym matching and multi-match disambiguation are the `clarify` change.

export interface CatalogMatch {
  id: number;
  name: string;
  per: FoodPer;
  base: MacroBase;
}

export const lookupFood = async (
  client: FoodClient,
  userId: number,
  product: string,
): Promise<CatalogMatch | null> => {
  const row = await client.foodDatabase.findFirst({
    where: catalogWhere(userId, { name: { equals: product, mode: 'insensitive' } }),
    // Prefer the user's own entry over a global one with the same name (own userId sorts before NULL).
    orderBy: { userId: { sort: 'desc', nulls: 'last' } },
  });
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    per: row.per,
    base: macroBaseFromRow(row),
  };
};
