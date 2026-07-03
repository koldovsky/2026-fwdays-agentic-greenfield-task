/**
 * uk-UA locale formatting helpers (BC-LANG-01).
 *
 * Single source of truth for number/percent/date formatting so every UI
 * capability renders values to the Ukrainian standard identically:
 * space thousands separator, comma decimal, "54 %"-style percent, and
 * Ukrainian date order.
 */

export const UK_LOCALE = "uk-UA" as const;

/** Format a number with uk-UA grouping/decimal conventions. */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(UK_LOCALE, options).format(value);
}

/**
 * Format a percentage. `value` is a percentage point in the range 0–100
 * (e.g. `54` → `"54 %"`), matching how chances are expressed downstream.
 */
export function formatPercent(
  value: number,
  { fractionDigits = 0 }: { fractionDigits?: number } = {},
): string {
  const number = new Intl.NumberFormat(UK_LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
  // Ukrainian standard: no-break space before the percent sign ("54 %").
  return `${number} %`;
}

/** Format a date (Date or parseable input) with the uk-UA locale. */
export function formatDate(
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  },
): string {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(UK_LOCALE, options).format(date);
}
