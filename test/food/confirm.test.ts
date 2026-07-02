import { describe, expect, it } from 'vitest';
import { FoodPer, FoodSource } from '@prisma/client';
import type { FoodLog } from '@prisma/client';
import { buildPlateConfirmation } from '../../src/food/confirm.js';

// Multi-item plate confirmation (invariant #2): per-row numbers, never a hand-summed total; an honest
// estimate note when any row is an estimate (invariant #3); prose mirrors the caption language while
// enum/structural values stay English (invariant #6).

const row = (over: Record<string, unknown>): FoodLog =>
  ({
    id: 1,
    userId: 7,
    date: new Date('2026-06-30T00:00:00.000Z'),
    meal: 'lunch',
    entryName: 'куриное филе',
    qty: 200,
    unit: 'g',
    kcal: 330,
    proteinG: 62,
    fatG: 7.2,
    carbsG: 0,
    source: FoodSource.fact,
    foodDbId: 42,
    createdAt: new Date(),
    ...over,
  }) as unknown as FoodLog;

describe('buildPlateConfirmation', () => {
  it('lists one line per row plus a code-summed plate total (invariant #2 — summed in code)', () => {
    // English caption keeps the assertion deterministic regardless of RU/UA prose.
    const rows = [
      row({ entryName: 'chicken', kcal: 330, proteinG: 62, fatG: 7.2, carbsG: 0 }),
      row({
        entryName: 'rice',
        kcal: 195,
        proteinG: 4,
        fatG: 0.5,
        carbsG: 44,
        source: FoodSource.fact,
      }),
    ];

    const { text } = buildPlateConfirmation('chicken and rice', rows);

    expect(text).toContain('330');
    expect(text).toContain('195');
    expect(text).toContain('Total'); // en total label
    expect(text).toContain('525'); // code-summed kcal total (330 + 195)
    expect(text).toContain('66'); // summed protein (62 + 4)
    expect(text.split('•')).toHaveLength(3); // two bullet lines; the total is a non-bullet line
  });

  it('omits the total line for a single-item plate (its own line already is the total)', () => {
    const { text } = buildPlateConfirmation('chicken', [row({ source: FoodSource.fact })]);
    expect(text).not.toContain('Total');
    expect(text).not.toContain('Итого');
  });

  it('adds one honest estimate note when any row is an estimate', () => {
    const rows = [
      row({ entryName: 'куриное филе', source: FoodSource.fact }),
      row({ entryName: 'борщ', kcal: 250, source: FoodSource.estimate }),
    ];

    const { text } = buildPlateConfirmation('борщ', rows);
    expect(text).toContain('±20');
    expect(text.match(/±20/g)).toHaveLength(1); // ONE note, not one per estimate row
  });

  it('omits the estimate note when every row is a fact', () => {
    const { text } = buildPlateConfirmation('chicken', [row({ source: FoodSource.fact })]);
    expect(text).not.toContain('±20');
  });

  it('mirrors the caption language (RU/UA/EN) while enum values stay English', () => {
    const rows = [row({ meal: 'lunch', unit: 'g', source: FoodSource.fact })];

    const ru = buildPlateConfirmation('куриное филе', rows).text;
    expect(ru).toContain('Записал');
    expect(ru).toContain('ккал');

    const uk = buildPlateConfirmation('куряче філе', rows).text;
    expect(uk).toContain('Записав');
    expect(uk).toContain('В '); // Ukrainian carbs label

    const en = buildPlateConfirmation('chicken breast', rows).text;
    expect(en).toContain('Logged');
    expect(en).toContain('kcal');
  });

  it('falls back to the default language when the caption is empty', () => {
    const { text } = buildPlateConfirmation('', [row({ per: FoodPer.per100g })]);
    expect(text).toContain('Logged'); // detectLang('') → en (module default)
  });

  // composite-dish (spec: a multi-item plate offers save-as-dish; a single-item plate does not).
  it('attaches a dish payload (row ids + localized label) for a MULTI-item plate', () => {
    const rows = [
      row({ id: 11, entryName: 'chicken', source: FoodSource.fact }),
      row({ id: 12, entryName: 'rice', source: FoodSource.fact }),
    ];

    const { dish } = buildPlateConfirmation('protein cocktail', rows);

    expect(dish?.rowIds).toEqual([11, 12]); // the just-written row ids, for re-read at save (invariant #1)
    expect(dish?.label).toContain('Save as dish'); // localized off the (English) caption (invariant #6)
  });

  it('localizes the save-as-dish label to the caption language (EN/UA)', () => {
    const rows = [
      row({ id: 1, entryName: 'молоко', source: FoodSource.fact }),
      row({ id: 2, entryName: 'протеин', source: FoodSource.fact }),
    ];
    // English caption → English label; a Ukrainian caption → Ukrainian label. (A generic-Cyrillic
    // caption resolves to Ukrainian too under the current temporary RU→UA demo hack in detectLang.)
    expect(buildPlateConfirmation('protein cocktail', rows).dish?.label).toContain('Save as dish');
    expect(buildPlateConfirmation('протеїновий коктейль', rows).dish?.label).toContain('страву');
  });

  it('offers NO dish payload for a single-item plate (its own entry already is the product)', () => {
    const { dish } = buildPlateConfirmation('chicken', [row({ id: 5, source: FoodSource.fact })]);
    expect(dish).toBeUndefined();
  });
});
