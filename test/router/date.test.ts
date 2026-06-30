import { describe, expect, it } from 'vitest';
import { resolveDate } from '../../src/router/date.js';

describe('resolveDate', () => {
  const tz = 'Europe/Kyiv';
  // 09:00 UTC on 2026-06-30 is 12:00 in Kyiv (UTC+3 in summer) — local date 2026-06-30.
  const now = new Date('2026-06-30T09:00:00Z');

  it('resolves "today" to the user-local date', () => {
    expect(resolveDate('today', tz, now)).toBe('2026-06-30');
  });

  it('back-dates "yesterday" to the prior local day', () => {
    expect(resolveDate('yesterday', tz, now)).toBe('2026-06-29');
  });

  it('passes an explicit YYYY-MM-DD through unchanged', () => {
    expect(resolveDate('2026-01-15', tz, now)).toBe('2026-01-15');
  });

  it('falls back to today on an unknown token', () => {
    expect(resolveDate('whenever', tz, now)).toBe('2026-06-30');
  });

  it('uses the timezone, not UTC, near midnight', () => {
    // 22:30 UTC is already 01:30 next day in Kyiv → local date rolls over.
    const lateUtc = new Date('2026-06-30T22:30:00Z');
    expect(resolveDate('today', tz, lateUtc)).toBe('2026-07-01');
  });
});
