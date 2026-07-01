import { catalogWhere } from '../db/tenancy.js';
import { macroBaseFromRow } from './scale.js';
import type { FoodClient, FoodPer, MacroBase } from './types.js';

// Food DB lookup (§8.2 step 2). Scoped to the tenant's own rows PLUS the global catalog
// (user_id IS NULL) via catalogWhere — never another user's rows (invariant #8). A match is a
// `fact`; a miss falls through to the estimate path. Case-insensitive exact name match keeps this
// slice simple — fuzzy/synonym matching is out of scope; multi-match disambiguation is the
// `clarify` change (lookupCandidates below), which raises a question in code (zero LLM calls).

export interface CatalogMatch {
  id: number;
  name: string;
  per: FoodPer;
  base: MacroBase;
}

/** The `food_database` columns a match needs — `macroBaseFromRow` handles the Decimal→number edge. */
type CatalogRow = { id: number; name: string; per: FoodPer } & Parameters<
  typeof macroBaseFromRow
>[0];

const toMatch = (row: CatalogRow): CatalogMatch => ({
  id: row.id,
  name: row.name,
  per: row.per,
  base: macroBaseFromRow(row),
});

/**
 * All catalog rows matching the product name (own + global, tenant-scoped). Own entries sort first
 * so a >1 result — the multi-match disambiguation the `clarify` change asks about — keeps the
 * user's own candidate at the head. A single row is the clean fact-path match.
 */
export const lookupCandidates = async (
  client: FoodClient,
  userId: number,
  product: string,
): Promise<CatalogMatch[]> => {
  const rows = await client.foodDatabase.findMany({
    where: catalogWhere(userId, { name: { equals: product, mode: 'insensitive' } }),
    orderBy: { userId: { sort: 'desc', nulls: 'last' } },
  });

  return rows.map(toMatch);
};

/**
 * A single catalog row by id, tenant-scoped (own or global — never another user's, invariant #8).
 * The `clarify` disambiguation resolves a chosen match by id straight to a `fact`, with no re-estimate
 * (invariant #5). `null` when the id is stale/forged or belongs to another tenant.
 */
export const lookupById = async (
  client: FoodClient,
  userId: number,
  id: number,
): Promise<CatalogMatch | null> => {
  const row = await client.foodDatabase.findFirst({ where: catalogWhere(userId, { id }) });
  if (!row) {
    return null;
  }

  return toMatch(row);
};

/**
 * Batched name lookup for a plate photo (design D3): ONE `findMany` over all item names (own +
 * global via `catalogWhere`, own preferred via the same orderBy), reduced in code to a
 * best-match-per-lowercased-name Map — never one query per item (no N+1, invariant #8). Rows sort
 * own-first, so the first row seen for a name is the preferred match; later duplicates are ignored.
 */
export const lookupFoodsByNames = async (
  client: FoodClient,
  userId: number,
  names: string[],
): Promise<Map<string, CatalogMatch>> => {
  const best = new Map<string, CatalogMatch>();
  if (names.length === 0) {
    return best;
  }

  const rows = await client.foodDatabase.findMany({
    where: catalogWhere(userId, { name: { in: names, mode: 'insensitive' } }),
    orderBy: { userId: { sort: 'desc', nulls: 'last' } },
  });

  for (const row of rows) {
    const key = row.name.toLowerCase();
    if (!best.has(key)) {
      best.set(key, toMatch(row));
    }
  }

  return best;
};

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

  return toMatch(row);
};
