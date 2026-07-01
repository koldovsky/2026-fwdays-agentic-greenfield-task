import { describe, expect, it } from 'vitest';
import { toDbDate } from '../../src/util/date.js';

// One home for the ISO-date → UTC-midnight `@db.Date` value (backend-conventions rule #12). The
// mapping must not shift the calendar day (the router already resolved the user-local date).

describe('toDbDate', () => {
  it('maps an ISO date to UTC midnight of that same calendar day', () => {
    expect(toDbDate('2026-07-01')).toEqual(new Date('2026-07-01T00:00:00.000Z'));
  });

  it('does not shift the day across the year boundary', () => {
    expect(toDbDate('2026-01-01').toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(toDbDate('2025-12-31').toISOString()).toBe('2025-12-31T00:00:00.000Z');
  });
});
