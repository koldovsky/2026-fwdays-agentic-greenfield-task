/**
 * Pure date helpers, framework-free (TC-PURE-01). "Local calendar day" depends on the
 * device's time zone, so day bucketing runs client-side (see design.md); History grouping
 * and Stats aggregation share this single definition of "local day" so they never drift.
 */

/**
 * Local `YYYY-MM-DD` for an instant, using the ambient (device) time zone. Accepts an
 * ISO string (as entries carry) or a `Date` (as the Stats "now"/window days use).
 */
export function localDateKey(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Local `YYYY-MM-DD` for an instant in an **explicit IANA time zone** (e.g. `Europe/Kyiv`),
 * used server-side where the runtime zone is not the user's (see `daily-insight`). Falls back
 * to {@link localDateKey} (the ambient zone) when `timeZone` is omitted. Throws `RangeError`
 * on an unknown zone — callers that accept untrusted input SHOULD validate/normalize first.
 */
export function localDateKeyInTz(value: string | Date, timeZone?: string): string {
  if (!timeZone) return localDateKey(value);
  const d = value instanceof Date ? value : new Date(value);
  // `en-CA` formats as `YYYY-MM-DD`, so the parts already come back in key order.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
