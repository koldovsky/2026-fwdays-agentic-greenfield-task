import { tenantWhere } from '../db/tenancy.js';
import { isoFromDbDate, toDbDate } from '../util/date.js';
import type { DayTotals, DayTotalsRow, QueryClient } from './types.js';

// Day-total SUM (design §1, invariants #1/#2/#8). ONE tenant-scoped `aggregate` does the SUM in the
// DB — never a row fetch + reduce in JS (that would hand-sum and pull more data than needed). The
// Decimal `_sum` fields are coerced to numbers at this single boundary; a day with no rows yields a
// null `_sum` from Prisma, which becomes zeros + `entryCount: 0` (an empty day, not a measured zero).

export const sumForDate = async (
  client: QueryClient,
  userId: number,
  date: string,
): Promise<DayTotals> => {
  const result = await client.foodLog.aggregate({
    where: tenantWhere(userId, { date: toDbDate(date) }),
    _sum: { kcal: true, proteinG: true, fatG: true, carbsG: true },
    _count: true,
  });

  return {
    kcal: result._sum.kcal ?? 0,
    proteinG: Number(result._sum.proteinG ?? 0),
    fatG: Number(result._sum.fatG ?? 0),
    carbsG: Number(result._sum.carbsG ?? 0),
    entryCount: result._count,
  };
};

// Per-day totals across a date range (design D3, reviews rollups). ONE tenant-scoped `groupBy` does
// the SUM per `date` in the DB — never N per-day queries (backend-conventions rule #8) and never a
// row fetch + JS reduce (invariant #2). Only days with rows appear (a groupBy skips empty days), so
// the caller reads `loggedDays` straight off the array length. Decimals coerced at this boundary.

export const dailyTotalsForRange = async (
  client: QueryClient,
  userId: number,
  startIso: string,
  endIso: string,
): Promise<DayTotalsRow[]> => {
  const grouped = await client.foodLog.groupBy({
    by: ['date'],
    where: tenantWhere(userId, { date: { gte: toDbDate(startIso), lte: toDbDate(endIso) } }),
    _sum: { kcal: true, proteinG: true, fatG: true, carbsG: true },
  });

  return grouped
    .map((row) => ({
      date: isoFromDbDate(row.date),
      kcal: row._sum.kcal ?? 0,
      proteinG: Number(row._sum.proteinG ?? 0),
      fatG: Number(row._sum.fatG ?? 0),
      carbsG: Number(row._sum.carbsG ?? 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};
