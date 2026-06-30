/**
 * Format a number for uk-UA display (comma decimal, thin-space thousands).
 *
 * @trace FR-CONVERT-04 NFR-LOCALE-01
 */
export function formatAmount(
  n: number,
  opts?: { decimals?: number },
): string {
  if (!Number.isFinite(n)) return "0,00";
  const decimals = opts?.decimals ?? 2;
  return n.toLocaleString("uk-UA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
