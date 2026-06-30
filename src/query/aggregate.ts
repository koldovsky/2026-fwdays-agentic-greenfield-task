import { tenantWhere } from '../db/tenancy.js';
import type { DayTotals, QueryClient } from './types.js';

// Day-total SUM (design §1, invariants #1/#2/#8). ONE tenant-scoped `aggregate` does the SUM in the
// DB — never a row fetch + reduce in JS (that would hand-sum and pull more data than needed). The
// Decimal `_sum` fields are coerced to numbers at this single boundary; a day with no rows yields a
// null `_sum` from Prisma, which becomes zeros + `entryCount: 0` (an empty day, not a measured zero).

/** The user-local calendar day as a `@db.Date` value (UTC midnight, no TZ skew) — mirrors food/write. */
const toDbDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

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
