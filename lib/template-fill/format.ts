import type { ServiceLine } from "../document-session/types";

/** Σ(amount × price) over service lines (TC-24). */
export function computePriceTotal(services: ServiceLine[]): number {
  let total = 0;
  for (const line of services) {
    total += line.amount * line.price;
  }
  return total;
}

/** Ukrainian-friendly money/qty display matching template `0,00` style. */
export function formatMoney(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export function formatQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return formatMoney(n);
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const NUMERIC_DATE_RE = /^(\d{2})\.(\d{2})\.(\d{4})$/;

/**
 * Convert session date (ISO YYYY-MM-DD or DD.MM.YYYY) to a value
 * accepted by locale-helpers.
 */
export function sessionDateForHelpers(date: string): Date | string {
  if (NUMERIC_DATE_RE.test(date)) return date;
  const iso = ISO_DATE_RE.exec(date);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  throw new Error(`Invalid session date: ${date}`);
}
