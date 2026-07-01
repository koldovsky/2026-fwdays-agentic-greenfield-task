import type { BodyMetric, FoodDatabase, FoodLog, Prisma, Review } from '@prisma/client';
import { isoFromDbDate } from '../util/date.js';
import { nullableNumber } from '../util/num.js';
import type { NotionProperties, SourceRow } from './types.js';

// Row → Notion `properties` mappers (US-10, §9): one pure function per mirrored source table. Notion
// is a write-only downstream (invariant #1); these only ever WRITE. Structural values (property
// keys, `select` option names) stay English (invariant #6); the user's prose lives in `body`/
// `conditions` rich_text. Property NAMES follow the owner's ported Notion DBs — the real-workspace
// shape is the deploy-time gate (no sandbox token), so these are unit-tested for shape only.

const decimal = (value: Prisma.Decimal): number => Number(value);

const title = (content: string): { title: { text: { content: string } }[] } => ({
  title: [{ text: { content } }],
});
const richText = (content: string): { rich_text: { text: { content: string } }[] } => ({
  rich_text: [{ text: { content } }],
});
const number = (value: number | null): { number: number | null } => ({ number: value });
const select = (name: string): { select: { name: string } } => ({ select: { name } });
const date = (isoDate: string): { date: { start: string } } => ({ date: { start: isoDate } });
const checkbox = (checked: boolean): { checkbox: boolean } => ({ checkbox: checked });

const mapFoodLog = (row: FoodLog): NotionProperties => ({
  Name: title(row.entryName),
  Date: date(isoFromDbDate(row.date)),
  Meal: select(row.meal),
  Quantity: number(decimal(row.qty)),
  Unit: richText(row.unit),
  Calories: number(row.kcal),
  Protein: number(decimal(row.proteinG)),
  Fat: number(decimal(row.fatG)),
  Carbs: number(decimal(row.carbsG)),
  Source: select(row.source),
});

const mapFoodDatabase = (row: FoodDatabase): NotionProperties => ({
  Name: title(row.name),
  Per: select(row.per),
  Calories: number(row.kcal),
  Protein: number(decimal(row.proteinG)),
  Fat: number(decimal(row.fatG)),
  Carbs: number(decimal(row.carbsG)),
});

const mapBodyMetric = (row: BodyMetric): NotionProperties => ({
  Date: title(isoFromDbDate(row.date)),
  Weight: number(nullableNumber(row.weightKg)),
  Waist: number(nullableNumber(row.waistCm)),
  Chest: number(nullableNumber(row.chestCm)),
  Hips: number(nullableNumber(row.hipsCm)),
  Bicep: number(nullableNumber(row.bicepCm)),
  Thigh: number(nullableNumber(row.thighCm)),
  Conditions: richText(row.conditions ?? ''),
});

const mapReview = (row: Review): NotionProperties => ({
  Name: title(`${row.period} ${isoFromDbDate(row.periodStart)}`),
  Period: select(row.period),
  'Period Start': date(isoFromDbDate(row.periodStart)),
  'Period End': date(isoFromDbDate(row.periodEnd)),
  Body: richText(row.body),
  Reviewed: checkbox(row.reviewedFlag),
});

/** Map a tagged source row to its table's Notion page properties (English structural values). */
export const mapSourceRow = (source: SourceRow): NotionProperties => {
  switch (source.sourceTable) {
    case 'food_log':
      return mapFoodLog(source.row);
    case 'food_database':
      return mapFoodDatabase(source.row);
    case 'body_metrics':
      return mapBodyMetric(source.row);
    case 'review':
      return mapReview(source.row);
  }
};
