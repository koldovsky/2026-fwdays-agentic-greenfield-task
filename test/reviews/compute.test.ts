import { describe, expect, it } from 'vitest';
import {
  average,
  countFatOk,
  countProteinHits,
  countWeekProteinHits,
  daysInMonth,
  groupIntoWeeks,
  isLastDayOfMonth,
  isSunday,
  localHour,
  mondayOf,
  monthRange,
  weekRange,
} from '../../src/reviews/compute.js';
import type { DayTotalsRow } from '../../src/query/types.js';

// Pure period math (design D2/D3). Boundaries operate on the already-resolved local date; averages
// divide by LOGGED days only; day/week-hit counts honor the ±band. Nothing here does I/O.

const row = (date: string, kcal: number, p: number, f: number, c: number): DayTotalsRow => ({
  date,
  kcal,
  proteinG: p,
  fatG: f,
  carbsG: c,
});

describe('isSunday', () => {
  it('detects a Sunday and rejects other weekdays', () => {
    expect(isSunday('2026-06-28')).toBe(true); // Sunday
    expect(isSunday('2026-06-29')).toBe(false); // Monday
    expect(isSunday('2026-07-05')).toBe(true); // Sunday
  });
});

describe('isLastDayOfMonth', () => {
  it('detects month-end across month lengths and a leap February', () => {
    expect(isLastDayOfMonth('2026-06-30')).toBe(true);
    expect(isLastDayOfMonth('2026-06-29')).toBe(false);
    expect(isLastDayOfMonth('2026-07-31')).toBe(true);
    expect(isLastDayOfMonth('2026-02-28')).toBe(true); // 2026 is not a leap year
    expect(isLastDayOfMonth('2024-02-29')).toBe(true); // leap year
    expect(isLastDayOfMonth('2024-02-28')).toBe(false);
  });
});

describe('weekRange / mondayOf', () => {
  it('returns the Mon–Sun week ending on a Sunday', () => {
    expect(weekRange('2026-06-28')).toEqual({ start: '2026-06-22', end: '2026-06-28' });
  });

  it('mondayOf snaps any weekday to its ISO-week Monday', () => {
    expect(mondayOf('2026-06-24')).toBe('2026-06-22'); // Wednesday → Monday
    expect(mondayOf('2026-06-22')).toBe('2026-06-22'); // Monday → itself
  });
});

describe('monthRange / daysInMonth', () => {
  it('spans the first to the last day of the month', () => {
    expect(monthRange('2026-06-15')).toEqual({ start: '2026-06-01', end: '2026-06-30' });
    expect(monthRange('2026-07-31')).toEqual({ start: '2026-07-01', end: '2026-07-31' });
    expect(daysInMonth('2026-02-10')).toBe(28);
    expect(daysInMonth('2024-02-10')).toBe(29);
  });
});

describe('average', () => {
  it('averages over the logged days only (kcal to int, macros to one decimal)', () => {
    const rows = [row('2026-06-01', 1500, 120, 40, 130), row('2026-06-02', 1600, 100, 50, 150)];

    expect(average(rows)).toEqual({ kcal: 1550, proteinG: 110, fatG: 45, carbsG: 140 });
  });

  it('divides by the count of provided rows, not by the calendar period', () => {
    const rows = [row('2026-06-01', 1000, 90, 30, 100)];

    expect(average(rows).kcal).toBe(1000); // one logged day → its own value, not /7
  });
});

describe('countProteinHits / countFatOk', () => {
  const rows = [
    row('2026-06-01', 1500, 120, 40, 130), // protein >= 108 (hit), fat <= 55 (ok)
    row('2026-06-02', 1600, 90, 70, 150), // protein < 108 (miss), fat > 55 (over)
  ];

  it('counts protein hits at ≥90% of target', () => {
    expect(countProteinHits(rows, 120)).toBe(1);
  });

  it('counts fat-ok days at ≤110% of target', () => {
    expect(countFatOk(rows, 50)).toBe(1);
  });

  it('returns null when the target is unset (renders as a dash upstream)', () => {
    expect(countProteinHits(rows, null)).toBeNull();
    expect(countFatOk(rows, null)).toBeNull();
  });
});

describe('groupIntoWeeks / countWeekProteinHits', () => {
  it('buckets the month by ISO week in order and averages each', () => {
    const rows = [
      row('2026-06-01', 1500, 120, 40, 130), // week of Jun 1
      row('2026-06-02', 1700, 100, 40, 130),
      row('2026-06-08', 1600, 130, 40, 130), // week of Jun 8
    ];

    const weeks = groupIntoWeeks(rows);

    expect(weeks).toHaveLength(2);
    expect(weeks[0]?.kcal).toBe(1600); // (1500+1700)/2
    expect(weeks[1]?.proteinG).toBe(130);
    expect(countWeekProteinHits(weeks, 120)).toBe(2); // 110 and 130 both ≥ 108
  });
});

describe('localHour', () => {
  it('reads the user-local hour for the scheduler midnight test across timezones', () => {
    // 2026-06-30T21:00Z is 00:00 in Kyiv (UTC+3, summer) and 22:00 in London (UTC+1, BST).
    const instant = new Date('2026-06-30T21:00:00.000Z');
    expect(localHour(instant, 'Europe/Kyiv')).toBe(0);
    expect(localHour(instant, 'Europe/London')).toBe(22);
  });
});
