export type ConvertDirection = "foreign-to-uah" | "uah-to-foreign";

/**
 * Convert `amount` using official `rate` (UAH per 1 foreign unit). Total: never throws.
 *
 * @trace FR-CONVERT-01 FR-CONVERT-03 FR-CONVERT-05
 */
export function convert(
  amount: number,
  rate: number,
  direction: ConvertDirection,
): number {
  if (!Number.isFinite(amount) || amount === 0) return 0;
  if (!Number.isFinite(rate) || rate <= 0) return 0;

  if (direction === "foreign-to-uah") {
    return amount * rate;
  }
  return amount / rate;
}
