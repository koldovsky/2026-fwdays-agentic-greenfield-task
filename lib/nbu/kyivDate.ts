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

/** Formats `date` as `DD.MM.YYYY` in the Europe/Kyiv calendar. */
export function kyivDateString(date: Date): string {
  // en-CA renders YYYY-MM-DD; NBU's own format is DD.MM.YYYY.
  const [year, month, day] = KYIV_FORMATTER.format(date).split("-");
  return `${day}.${month}.${year}`;
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
