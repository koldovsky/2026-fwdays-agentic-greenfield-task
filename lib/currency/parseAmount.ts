/**
 * Parse a locale-aware amount string. Total: never throws; empty/invalid → 0.
 *
 * @trace FR-CONVERT-02 NFR-LOCALE-01
 */
export function parseAmount(raw: unknown): number {
  if (raw == null) return 0;
  const cleaned = String(raw)
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}
