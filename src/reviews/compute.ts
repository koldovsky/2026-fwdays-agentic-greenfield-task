import { addDays } from '../router/date.js';
import { round1 } from '../food/scale.js';
import type { DayTotalsRow } from '../query/types.js';
import type { MacroAverages, WeekTrend } from './types.js';

// Pure period math (design D2/D3): no I/O, explicit return types. Boundary helpers operate on the
// already-resolved user-local calendar date (a YYYY-MM-DD string) — a date's weekday and month are
// tz-independent facts, so the TZ handling lives upstream in the scheduler (which decides WHICH local
// day just finished). Averages divide by LOGGED days only; a groupBy row exists iff the day had food.

/** A protein day "hits" at ≥90% of target; a fat day is "ok" at ≤110% of target (the daily bands). */
export const PROTEIN_HIT_BAND = 0.9;
export const FAT_OK_BAND = 1.1;

export interface DateRange {
  start: string;
  end: string;
}

const parseIsoParts = (isoDate: string): { year: number; month: number; day: number } => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return { year: year ?? 0, month: month ?? 1, day: day ?? 1 };
};

/** UTC weekday of a fixed calendar date (0 = Sunday). TZ-independent — the date is already local. */
const weekday = (isoDate: string): number => new Date(`${isoDate}T00:00:00.000Z`).getUTCDay();

export const isSunday = (isoDate: string): boolean => weekday(isoDate) === 0;

export const isLastDayOfMonth = (isoDate: string): boolean => {
  const next = parseIsoParts(addDays(isoDate, 1));
  return next.month !== parseIsoParts(isoDate).month;
};

/** The Monday of the Mon–Sun week that contains `isoDate` (the ISO-week start). */
export const mondayOf = (isoDate: string): string => {
  const daysFromMonday = (weekday(isoDate) + 6) % 7;
  return addDays(isoDate, -daysFromMonday);
};

/** The Mon–Sun week ending on `isoDate` (used when `isoDate` is a Sunday rollup boundary). */
export const weekRange = (isoDate: string): DateRange => {
  const start = mondayOf(isoDate);
  return { start, end: addDays(start, 6) };
};

/** The calendar month containing `isoDate`: first day → last day. */
export const monthRange = (isoDate: string): DateRange => {
  const { year, month } = parseIsoParts(isoDate);
  const start = `${isoDate.slice(0, 7)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${isoDate.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
};

/** Days in the month containing `isoDate` (the coverage denominator). */
export const daysInMonth = (isoDate: string): number => {
  const { year, month } = parseIsoParts(isoDate);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
};

/** The calendar year and 0-based month index of an ISO date (the monthly header inputs). */
export const monthParts = (isoDate: string): { year: number; monthIndex: number } => {
  const { year, month } = parseIsoParts(isoDate);
  return { year, monthIndex: month - 1 };
};

/** Per-day averages over the given LOGGED days (kcal to int, macros to one decimal). */
export const average = (rows: DayTotalsRow[]): MacroAverages => {
  if (rows.length === 0) {
    return { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 };
  }
  const n = rows.length;
  const sum = rows.reduce(
    (acc, row) => ({
      kcal: acc.kcal + row.kcal,
      proteinG: acc.proteinG + row.proteinG,
      fatG: acc.fatG + row.fatG,
      carbsG: acc.carbsG + row.carbsG,
    }),
    { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  );

  return {
    kcal: Math.round(sum.kcal / n),
    proteinG: round1(sum.proteinG / n),
    fatG: round1(sum.fatG / n),
    carbsG: round1(sum.carbsG / n),
  };
};

/** Count of logged days whose protein reached the target band; null when no protein target is set. */
export const countProteinHits = (rows: DayTotalsRow[], target: number | null): number | null => {
  if (target === null) {
    return null;
  }
  return rows.filter((row) => row.proteinG >= target * PROTEIN_HIT_BAND).length;
};

/** Count of logged days whose fat stayed within the target band; null when no fat target is set. */
export const countFatOk = (rows: DayTotalsRow[], target: number | null): number | null => {
  if (target === null) {
    return null;
  }
  return rows.filter((row) => row.fatG <= target * FAT_OK_BAND).length;
};

/** Group the month's logged days into ISO weeks (Mon-started), each week's per-day averages, in order. */
export const groupIntoWeeks = (rows: DayTotalsRow[]): WeekTrend[] => {
  const byWeek = new Map<string, DayTotalsRow[]>();
  for (const row of rows) {
    const key = mondayOf(row.date);
    const bucket = byWeek.get(key) ?? [];
    bucket.push(row);
    byWeek.set(key, bucket);
  }

  return [...byWeek.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((key) => average(byWeek.get(key) ?? []));
};

/** Weeks whose average protein reached the target band; null when no protein target is set. */
export const countWeekProteinHits = (weeks: WeekTrend[], target: number | null): number | null => {
  if (target === null) {
    return null;
  }
  return weeks.filter((week) => week.proteinG >= target * PROTEIN_HIT_BAND).length;
};

/** The user's LOCAL hour (0–23) at `instant` in `tz` — the scheduler's midnight test (ADR-0020). */
export const localHour = (instant: Date, tz: string): number =>
  Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(instant),
  );
