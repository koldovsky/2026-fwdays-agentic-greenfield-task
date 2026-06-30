import type { Rate } from "@/lib/nbu/mapRates";

/**
 * Filters `rates` by a case-insensitive substring match against the ISO code
 * or Ukrainian name (FR-PICK-01). Total: never throws, plain string ops only.
 * An empty/whitespace-only query returns the full list unchanged — it is
 * never itself an "empty result" (design.md Decision 2).
 */
export function filterRates(rates: Rate[], query: string): Rate[] {
  const q = query.trim().toLowerCase();
  if (!q) return rates;
  return rates.filter(
    (r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q),
  );
}
