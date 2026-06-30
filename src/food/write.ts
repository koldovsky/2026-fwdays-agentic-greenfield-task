import type { FoodLog } from '@prisma/client';
import { tenantWhere } from '../db/tenancy.js';
import { scaleFactor, scaleMacros } from './scale.js';
import type { FoodClient, Meal, ResolvedFood } from './types.js';

// Write one food_log row (§8.2 step 3). Macros are scaled in code here — the row carries its OWN
// numbers, never a SUM and never a model-emitted figure (invariants #1/#2). user_id is injected via
// tenantWhere so the tenant filter is never forgotten on a write (invariant #8).

/** The user-local calendar day as a `@db.Date` value (UTC midnight, no TZ skew). */
const toDbDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

export const writeFoodLog = async (
  client: FoodClient,
  userId: number,
  resolved: ResolvedFood,
  date: string,
  meal: Meal,
): Promise<FoodLog> => {
  const macros = scaleMacros(resolved.base, scaleFactor(resolved.qty, resolved.per));

  return client.foodLog.create({
    data: tenantWhere(userId, {
      date: toDbDate(date),
      meal,
      entryName: resolved.name,
      qty: resolved.qty,
      unit: resolved.unit,
      kcal: macros.kcal,
      proteinG: macros.proteinG,
      fatG: macros.fatG,
      carbsG: macros.carbsG,
      source: resolved.source,
      foodDbId: resolved.foodDbId,
    }),
  });
};
