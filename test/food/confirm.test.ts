import { describe, expect, it } from 'vitest';
import { FoodPer, FoodSource } from '@prisma/client';
import type { FoodLog } from '@prisma/client';
import { buildPlateConfirmation } from '../../src/food/confirm.js';

// Multi-item plate confirmation (invariant #2): per-row numbers, never a hand-summed total; an honest
// estimate note when any row is an estimate (invariant #3); prose mirrors the caption language while
// enum/structural values stay English (invariant #6).

const row = (over: Partial<FoodLog>): FoodLog =>
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
  it('lists one line per row with its own numbers and no hand-summed total', () => {
    const rows = [
      row({ entryName: 'куриное филе', kcal: 330 }),
      row({ entryName: 'рис', kcal: 195, source: FoodSource.fact }),
    ];

    const { text } = buildPlateConfirmation('куриное филе и рис', rows);

    expect(text).toContain('330');
    expect(text).toContain('195');
    expect(text).not.toContain('525'); // no combined total (330 + 195)
    expect(text.split('•')).toHaveLength(3); // two bullet lines
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
    const { text } = buildPlateConfirmation('', [
      row({ per: FoodPer.per100g } as Partial<FoodLog>),
    ]);
    expect(text).toContain('Logged'); // detectLang('') → en (module default)
  });
});
