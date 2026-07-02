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
