/**
 * Payment purpose string (FR-CALC-06).
 *
 * The `№` is U+2116 NUMERO SIGN by spec; whether the embedded PDF font
 * carries the glyph is document-render's concern (wayfinder ticket 05).
 */

/**
 * `paymentPurpose("2026-001", "May 03, 2026")` →
 * `Payment by the invoice №2026-001 from May 03, 2026`.
 */
export function paymentPurpose(number: string, dateEn: string): string {
  return `Payment by the invoice №${number} from ${dateEn}`;
}
