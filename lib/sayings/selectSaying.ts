import { kyivDayOfYear } from "@/lib/nbu/kyivDate";

/**
 * Deterministically selects one saying for `date`'s Kyiv calendar day
 * (FR-SAYINGS-01). Pure, total: an empty corpus returns `""` rather than
 * throwing. The same calendar day always selects the same saying.
 */
export function selectSaying(sayings: readonly string[], date: Date): string {
  if (sayings.length === 0) return "";
  const index = kyivDayOfYear(date) % sayings.length;
  return sayings[index];
}
