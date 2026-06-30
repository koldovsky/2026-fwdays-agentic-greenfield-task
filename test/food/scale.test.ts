import { describe, expect, it } from 'vitest';
import { FoodPer } from '@prisma/client';
import {
  perForUnit,
  reconcileQty,
  scaleFactor,
  scaleMacros,
  unitForPer,
  unscaleMacros,
} from '../../src/food/scale.js';

// Numbers come from CODE, never the model (invariants #2/#5). These assert the scaling is exact and
// keyed off the `per` basis, so a row's macros are reproducible from base × factor.

describe('scaleFactor', () => {
  it('divides by 100 for a weight basis (qty is grams)', () => {
    expect(scaleFactor(200, FoodPer.per100g)).toBe(2);
    expect(scaleFactor(250, FoodPer.per100ml)).toBe(2.5);
  });

  it('multiplies by the count for a piece/portion/dish basis', () => {
    expect(scaleFactor(2, FoodPer.piece)).toBe(2);
    expect(scaleFactor(1, FoodPer.portion)).toBe(1);
    expect(scaleFactor(3, FoodPer.dish)).toBe(3);
  });
});

describe('scaleMacros', () => {
  const chickenPer100g = { kcal: 165, proteinG: 31, fatG: 3.6, carbsG: 0 };

  it('scales 200 g of chicken to exactly 2× the per-100g base, kcal as Int', () => {
    const macros = scaleMacros(chickenPer100g, scaleFactor(200, FoodPer.per100g));

    expect(macros).toEqual({ kcal: 330, proteinG: 62, fatG: 7.2, carbsG: 0 });
    expect(Number.isInteger(macros.kcal)).toBe(true);
  });

  it('scales 2 eggs (per-piece base) by the count', () => {
    const egg = { kcal: 78, proteinG: 6.3, fatG: 5.3, carbsG: 0.6 };

    expect(scaleMacros(egg, scaleFactor(2, FoodPer.piece))).toEqual({
      kcal: 156,
      proteinG: 12.6,
      fatG: 10.6,
      carbsG: 1.2,
    });
  });

  it('rounds grams to one decimal and kcal to an integer', () => {
    const odd = { kcal: 123, proteinG: 9.99, fatG: 0.07, carbsG: 33.33 };

    expect(scaleMacros(odd, scaleFactor(150, FoodPer.per100g))).toEqual({
      kcal: 185, // 184.5 → 185
      proteinG: 15, // 14.985 → 15.0
      fatG: 0.1, // 0.105 → 0.1
      carbsG: 50, // 49.995 → 50.0
    });
  });
});

describe('reconcileQty (router qty+unit vs resolved basis — design decision #2)', () => {
  it('missing qty defaults to one serving of the basis, never 1 g', () => {
    expect(reconcileQty(undefined, '', FoodPer.per100g)).toBe(100); // 100 g, factor 1.0 — not 1 g
    expect(reconcileQty(undefined, '', FoodPer.per100ml)).toBe(100);
    expect(reconcileQty(undefined, '', FoodPer.piece)).toBe(1);
    expect(reconcileQty(undefined, '', FoodPer.dish)).toBe(1);
  });

  it('non-positive qty also falls back to one serving', () => {
    expect(reconcileQty(0, 'г', FoodPer.per100g)).toBe(100);
    expect(reconcileQty(-5, '', FoodPer.piece)).toBe(1);
  });

  it('clamps a weight quantity against a count basis to one serving (no "200 dishes")', () => {
    expect(reconcileQty(200, 'г', FoodPer.dish)).toBe(1); // 200 g borscht ≠ 200 dishes
    expect(reconcileQty(250, 'мл', FoodPer.portion)).toBe(1);
  });

  it('falls back to one serving for a count unit against a weight basis', () => {
    expect(reconcileQty(2, 'шт', FoodPer.per100g)).toBe(100);
  });

  it('keeps the quantity when the unit kind matches the basis (or the unit is empty)', () => {
    expect(reconcileQty(200, 'г', FoodPer.per100g)).toBe(200);
    expect(reconcileQty(2, '', FoodPer.piece)).toBe(2); // bare count → count basis
    expect(reconcileQty(200, '', FoodPer.per100g)).toBe(200); // empty unit defers to weight basis (grams)
    expect(reconcileQty(2, 'шт', FoodPer.piece)).toBe(2);
  });
});

describe('unitForPer / perForUnit round-trip', () => {
  it('maps each basis to a canonical English unit and back', () => {
    for (const per of [
      FoodPer.per100g,
      FoodPer.per100ml,
      FoodPer.portion,
      FoodPer.piece,
      FoodPer.dish,
    ]) {
      expect(perForUnit(unitForPer(per))).toBe(per);
    }
  });
});

describe('unscaleMacros', () => {
  it('recovers the per-basis macros from a scaled row (for add-to-catalog)', () => {
    const base = { kcal: 165, proteinG: 31, fatG: 3.6, carbsG: 0 };
    const scaled = scaleMacros(base, scaleFactor(200, FoodPer.per100g));

    expect(unscaleMacros(scaled, scaleFactor(200, FoodPer.per100g))).toEqual(base);
  });
});
