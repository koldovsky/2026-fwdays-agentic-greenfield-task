import type { BodyMetric } from '@prisma/client';
import { tenantWhere } from '../db/tenancy.js';
import type { MetricsClient, ParsedMetrics } from './types.js';

// Upsert one body_metrics row per (user, date) — design §2. A same-date second message merges the
// parsed fields onto the existing row; it never nulls out a column the message didn't mention. No
// native composite-key upsert (no unique constraint on userId+date), so this is a tenant-scoped
// findFirst → update else create — both legs go through tenantWhere (invariant #8).

/** The user-local calendar day as a `@db.Date` value (UTC midnight, no TZ skew) — mirrors food/write. */
const toDbDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

export const upsertMetrics = async (
  client: MetricsClient,
  userId: number,
  date: string,
  parsed: ParsedMetrics,
): Promise<BodyMetric> => {
  const dbDate = toDbDate(date);
  const existing = await client.bodyMetric.findFirst({
    where: tenantWhere(userId, { date: dbDate }),
  });

  if (existing) {
    return client.bodyMetric.update({
      where: { id: existing.id },
      data: parsed,
    });
  }

  return client.bodyMetric.create({
    data: tenantWhere(userId, { date: dbDate, ...parsed }),
  });
};
