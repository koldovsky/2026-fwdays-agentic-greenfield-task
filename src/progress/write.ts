import { tenantWhere } from '../db/tenancy.js';
import { toDbDate } from '../util/date.js';
import type { ProgressClient, ProgressNote } from './types.js';

// Persist one progress_notes row (US-8, §8.5). Only the TEXT observations are stored — the signature
// never accepts image bytes (invariant #4 at the type level; the table has no image column). user_id
// is injected via tenantWhere so the tenant filter is never forgotten (invariant #8). Body/progress
// data is sensitive (invariant #9): this module never logs the raw observation values.

export const writeProgressNote = async (
  client: ProgressClient,
  userId: number,
  date: string,
  observations: string,
): Promise<ProgressNote> =>
  client.progressNote.create({
    data: tenantWhere(userId, { date: toDbDate(date), observations }),
  });
