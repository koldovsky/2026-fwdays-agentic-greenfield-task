/**
 * Kyiv-calendar date helpers (FR-RATES-03, BC-HONESTY-01).
 *
 * Pure and total: `now`/`date` is always passed in explicitly — never read
 * from an implicit clock — so callers stay deterministic and testable. Uses
 * the active locale's calendar (Europe/Kyiv) rather than the server's local
 * time or `toISOString().slice(0,10)`, per project rule.
 */

const KYIV_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Kyiv",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Extracts the Europe/Kyiv calendar year/month/day for `date`. */
function kyivParts(date: Date): { year: string; month: string; day: string } {
  // en-CA renders YYYY-MM-DD.
  const [year, month, day] = KYIV_FORMATTER.format(date).split("-");
  return { year, month, day };
}

/** Formats `date` as `DD.MM.YYYY` in the Europe/Kyiv calendar. */
export function kyivDateString(date: Date): string {
  const { year, month, day } = kyivParts(date);
  return `${day}.${month}.${year}`;
}

/** Formats `date` as `YYYYMMDD` in the Europe/Kyiv calendar (NBU query param shape). */
export function kyivYmd(date: Date): string {
  const { year, month, day } = kyivParts(date);
  return `${year}${month}${day}`;
}

/**
 * Adds `delta` whole calendar days to `date`'s Europe/Kyiv calendar date.
 * Anchored at UTC midnight of the extracted Y/M/D — operates on the calendar
 * date alone (no time-of-day), so it is immune to DST shifts and never
 * depends on the host's local timezone.
 */
export function addKyivDays(date: Date, delta: number): Date {
  const { year, month, day } = kyivParts(date);
  const base = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  base.setUTCDate(base.getUTCDate() + delta);
  return base;
}

/**
 * True when `exchangeDate` (NBU's `DD.MM.YYYY` string) does not match today's
 * Kyiv calendar date — i.e. the rate is a previous business day's (weekend or
 * holiday). A malformed `exchangeDate` is treated as stale (never throws: a
 * plain string comparison, no date parsing of the NBU value).
 */
export function isStaleRate(exchangeDate: string, now: Date): boolean {
  return exchangeDate !== kyivDateString(now);
}
