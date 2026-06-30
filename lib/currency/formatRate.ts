/**
 * Format an official NBU rate for uk-UA display (comma decimal, up to 4
 * fraction digits). Total: never throws.
 *
 * The single source of truth for displaying a *rate* (as opposed to
 * `formatAmount`, which is fixed at 2 decimals for converted money
 * amounts). Small-rate currencies (e.g. JPY, 0.27749) need more than 2
 * decimals to be shown honestly — rounding to 2 would silently change the
 * displayed number.
 *
 * @trace NFR-LOCALE-01
 */
export function formatRate(n: number): string {
  if (!Number.isFinite(n)) return "0,00";
  return n.toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}
