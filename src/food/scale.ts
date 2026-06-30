import { FoodPer } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { MacroBase, ScaledMacros } from './types.js';

// Macros land as Prisma Decimal on a fetched row but flow as plain numbers everywhere else — this is
// the single Decimal→number boundary (kcal is already Int). A FoodDatabase or FoodLog row satisfies it.
interface MacroRow {
  kcal: number;
  proteinG: Prisma.Decimal | number;
  fatG: Prisma.Decimal | number;
  carbsG: Prisma.Decimal | number;
}

export const macroBaseFromRow = (row: MacroRow): MacroBase => ({
  kcal: row.kcal,
  proteinG: Number(row.proteinG),
  fatG: Number(row.fatG),
  carbsG: Number(row.carbsG),
});

// Scaling is PURE CODE — the model never emits the final per-entry numbers (invariants #2/#5). The
// scale factor is keyed off the `per` BASIS, not the raw unit: a weight/volume basis (per100g/
// per100ml) divides by 100 (qty is grams/ml); a count basis (portion/piece/dish) multiplies by qty.
// This is also why a unit/basis mismatch degrades gracefully — the basis alone decides the math.

const WEIGHT_OR_VOLUME = new Set<FoodPer>([FoodPer.per100g, FoodPer.per100ml]);

const GRAM_UNITS = new Set(['g', 'gram', 'grams', 'г', 'гр', 'грам', 'грамм', 'граммов', 'грамів']);
const ML_UNITS = new Set(['ml', 'мл', 'milliliter', 'milliliters', 'мілілітр', 'мілілітрів']);

/** Round grams to 1 decimal (Decimal(7,2) column tolerates it; readable in the confirmation). */
export const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Canonical English unit label stored on the row, derived from the basis (invariant #6). */
export const unitForPer = (per: FoodPer): string => {
  switch (per) {
    case FoodPer.per100g:
      return 'g';
    case FoodPer.per100ml:
      return 'ml';
    case FoodPer.portion:
      return 'portion';
    case FoodPer.piece:
      return 'piece';
    case FoodPer.dish:
      return 'dish';
  }
};

/** Inverse of {@link unitForPer}: recover the basis from a stored unit (for add-to-catalog). */
export const perForUnit = (unit: string): FoodPer => {
  if (GRAM_UNITS.has(unit.toLowerCase()) || unit === 'g') {
    return FoodPer.per100g;
  }
  if (ML_UNITS.has(unit.toLowerCase()) || unit === 'ml') {
    return FoodPer.per100ml;
  }
  if (unit === 'piece') {
    return FoodPer.piece;
  }
  if (unit === 'dish') {
    return FoodPer.dish;
  }
  return FoodPer.portion;
};

/** Canonical unit kind from a raw router unit — used to default a missing quantity sensibly. */
export const isWeightOrVolumeUnit = (unit: string): boolean => {
  const u = unit.toLowerCase();
  return GRAM_UNITS.has(u) || ML_UNITS.has(u);
};

export const scaleFactor = (qty: number, per: FoodPer): number =>
  WEIGHT_OR_VOLUME.has(per) ? qty / 100 : qty;

/**
 * Reconcile the router's RAW quantity+unit against the resolved basis, returning the quantity to
 * STORE (consistent with the canonical unit for `per`, which {@link scaleFactor} then turns into the
 * macro factor). The basis decides interpretation (design decision #2):
 * - missing/non-positive qty → ONE SERVING of the basis (100 g/ml, or a single count) — never 1 g;
 * - unit/basis KIND mismatch (e.g. grams against a per-dish basis) can't be converted in one call,
 *   so log one serving rather than scale by the wrong magnitude (prevents "200г" → 200 dishes);
 * - an empty/unrecognized unit defers to the basis (grams for a weight base, else a count).
 */
export const reconcileQty = (qty: number | undefined, unit: string, per: FoodPer): number => {
  const oneServing = WEIGHT_OR_VOLUME.has(per) ? 100 : 1;
  if (qty === undefined || qty <= 0) {
    return oneServing;
  }
  const kindMismatch = unit !== '' && WEIGHT_OR_VOLUME.has(per) !== isWeightOrVolumeUnit(unit);
  return kindMismatch ? oneServing : qty;
};

export const scaleMacros = (base: MacroBase, factor: number): ScaledMacros => ({
  kcal: Math.round(base.kcal * factor),
  proteinG: round1(base.proteinG * factor),
  fatG: round1(base.fatG * factor),
  carbsG: round1(base.carbsG * factor),
});

/** Recover the per-basis macros from an already-scaled row (factor must be > 0). */
export const unscaleMacros = (scaled: ScaledMacros, factor: number): MacroBase => ({
  kcal: Math.round(scaled.kcal / factor),
  proteinG: round1(scaled.proteinG / factor),
  fatG: round1(scaled.fatG / factor),
  carbsG: round1(scaled.carbsG / factor),
});
