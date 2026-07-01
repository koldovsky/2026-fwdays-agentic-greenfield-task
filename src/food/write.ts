import type { FoodLog, FoodSource } from '@prisma/client';
import { tenantWhere } from '../db/tenancy.js';
import { toDbDate } from '../util/date.js';
import { scaleFactor, scaleMacros } from './scale.js';
import type { FoodClient, Meal, ResolvedFood } from './types.js';

// Write one food_log row (§8.2 step 3). Macros are scaled in code here — the row carries its OWN
// numbers, never a SUM and never a model-emitted figure (invariants #1/#2). user_id is injected via
// tenantWhere so the tenant filter is never forgotten on a write (invariant #8).

/** The `resolved → food_log` value columns (macros scaled in code) shared by insert and update. */
interface FoodLogValues {
  entryName: string;
  qty: number;
  unit: string;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  source: FoodSource;
  foodDbId: number | null;
}

/** One home for the `resolved → row` mapping + code-scaling, so insert and update never drift. */
const foodLogValues = (resolved: ResolvedFood): FoodLogValues => {
  const macros = scaleMacros(resolved.base, scaleFactor(resolved.qty, resolved.per));

  return {
    entryName: resolved.name,
    qty: resolved.qty,
    unit: resolved.unit,
    kcal: macros.kcal,
    proteinG: macros.proteinG,
    fatG: macros.fatG,
    carbsG: macros.carbsG,
    source: resolved.source,
    foodDbId: resolved.foodDbId,
  };
};

export const writeFoodLog = async (
  client: FoodClient,
  userId: number,
  resolved: ResolvedFood,
  date: string,
  meal: Meal,
): Promise<FoodLog> =>
  client.foodLog.create({
    data: tenantWhere(userId, { date: toDbDate(date), meal, ...foodLogValues(resolved) }),
  });

/** Most recent `food_log` row for the user (highest `id`), tenant-scoped (design D2). */
export const findLastFoodLog = async (
  client: FoodClient,
  userId: number,
): Promise<FoodLog | null> =>
  client.foodLog.findFirst({
    where: tenantWhere(userId, {}),
    orderBy: { id: 'desc' },
  });

/**
 * Update an existing `food_log` row in place (a correction) — never an insert. Macros are scaled in
 * code from `resolved`, identically to {@link writeFoodLog} (invariant #2). The `updateMany` +
 * `tenantWhere` combo guarantees the row belongs to `userId` even if `id` were guessed (invariant #8).
 * Returns the row re-read through the same tenant-scoped path, so the caller never has to fabricate
 * a row shape (e.g. a fake `Decimal`) to build the confirmation.
 */
export const updateFoodLog = async (
  client: FoodClient,
  userId: number,
  id: number,
  resolved: ResolvedFood,
): Promise<FoodLog | null> => {
  await client.foodLog.updateMany({
    where: tenantWhere(userId, { id }),
    data: foodLogValues(resolved),
  });

  return client.foodLog.findFirst({ where: tenantWhere(userId, { id }) });
};
