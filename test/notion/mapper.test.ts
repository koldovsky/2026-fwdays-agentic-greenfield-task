import { Prisma } from '@prisma/client';
import type { BodyMetric, FoodDatabase, FoodLog, Review } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { mapSourceRow } from '../../src/notion/mapper.js';
import type { NotionProperties } from '../../src/notion/types.js';

// Per-table row → Notion `properties` shape (US-10, §9). Load-bearing: structural values (property
// keys, `select` option names) stay ENGLISH (invariant #6) even though prose elsewhere mirrors the
// user; Decimals convert to plain numbers; a missing metric maps to `number: null` (clears the cell).
// Real property names are validated against the live workspace at deploy — these assert shape only.

// Typed accessors over the untyped Notion `properties` payload (no `any` — repo lint bans it).
const title = (p: NotionProperties, key: string): string | undefined =>
  (p[key] as { title: { text: { content: string } }[] }).title[0]?.text.content;
const richText = (p: NotionProperties, key: string): string | undefined =>
  (p[key] as { rich_text: { text: { content: string } }[] }).rich_text[0]?.text.content;
const num = (p: NotionProperties, key: string): number | null =>
  (p[key] as { number: number | null }).number;
const selectName = (p: NotionProperties, key: string): string =>
  (p[key] as { select: { name: string } }).select.name;
const dateStart = (p: NotionProperties, key: string): string =>
  (p[key] as { date: { start: string } }).date.start;
const checkbox = (p: NotionProperties, key: string): boolean =>
  (p[key] as { checkbox: boolean }).checkbox;

const dbDate = new Date('2026-06-30T00:00:00.000Z');

const foodLog = (): FoodLog =>
  ({
    id: 1,
    userId: 7,
    date: dbDate,
    meal: 'lunch',
    entryName: 'куриное филе',
    qty: new Prisma.Decimal(200),
    unit: 'g',
    kcal: 330,
    proteinG: new Prisma.Decimal(62),
    fatG: new Prisma.Decimal(7.2),
    carbsG: new Prisma.Decimal(0),
    source: 'estimate',
    foodDbId: null,
    createdAt: dbDate,
  }) as unknown as FoodLog;

describe('mapSourceRow — food_log', () => {
  it('maps to Notion properties with English structural values (invariant #6)', () => {
    const props = mapSourceRow({ sourceTable: 'food_log', row: foodLog() });

    expect(title(props, 'Name')).toBe('куриное филе'); // prose stays as the user typed
    expect(selectName(props, 'Meal')).toBe('lunch'); // English enum, not translated
    expect(selectName(props, 'Source')).toBe('estimate');
    expect(dateStart(props, 'Date')).toBe('2026-06-30');
    expect(num(props, 'Calories')).toBe(330);
    expect(num(props, 'Protein')).toBe(62); // Decimal → plain number
  });
});

describe('mapSourceRow — food_database', () => {
  it('maps the catalog entry with an English `Per` basis', () => {
    const row = {
      id: 5,
      name: 'борщ',
      per: 'per100g',
      kcal: 60,
      proteinG: new Prisma.Decimal(3),
      fatG: new Prisma.Decimal(0.4),
      carbsG: new Prisma.Decimal(28),
      userId: 7,
      createdBy: 7,
      createdAt: dbDate,
    } as unknown as FoodDatabase;

    const props = mapSourceRow({ sourceTable: 'food_database', row });

    expect(title(props, 'Name')).toBe('борщ');
    expect(selectName(props, 'Per')).toBe('per100g');
    expect(num(props, 'Calories')).toBe(60);
  });
});

describe('mapSourceRow — body_metrics', () => {
  it('maps present numbers and clears an absent metric with number: null', () => {
    const row = {
      id: 9,
      userId: 7,
      date: dbDate,
      weightKg: new Prisma.Decimal(89.2),
      waistCm: null,
      chestCm: null,
      hipsCm: null,
      bicepCm: null,
      thighCm: null,
      conditions: null,
      createdAt: dbDate,
    } as unknown as BodyMetric;

    const props = mapSourceRow({ sourceTable: 'body_metrics', row });

    expect(title(props, 'Date')).toBe('2026-06-30');
    expect(num(props, 'Weight')).toBe(89.2);
    expect(num(props, 'Waist')).toBeNull(); // absent → cleared, not omitted
    expect(richText(props, 'Conditions')).toBe('');
  });
});

describe('mapSourceRow — review', () => {
  it('maps the period (English enum), dates, body prose, and reviewed flag', () => {
    const row = {
      id: 3,
      userId: 7,
      period: 'daily',
      periodStart: dbDate,
      periodEnd: dbDate,
      body: 'Огляд дня…',
      reviewedFlag: false,
      createdAt: dbDate,
    } as unknown as Review;

    const props = mapSourceRow({ sourceTable: 'review', row });

    expect(selectName(props, 'Period')).toBe('daily'); // English structural value
    expect(dateStart(props, 'Period Start')).toBe('2026-06-30');
    expect(richText(props, 'Body')).toBe('Огляд дня…'); // prose preserved
    expect(checkbox(props, 'Reviewed')).toBe(false);
    expect(title(props, 'Name')).toBe('daily 2026-06-30');
  });
});
