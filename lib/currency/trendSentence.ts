import { uk } from "@/lib/i18n/uk";

export type Tone = "up" | "down" | "flat";

/**
 * Builds the calm one-sentence trend read (FR-TREND-02, FR-TREND-03).
 * Pure, total: `tone` is supplied by the caller (the reused `trendTone` from
 * `@/components/ds`, consumed at the component layer — see design.md
 * Decision 2 for why this stays out of `lib/`'s own imports).
 */
export function trendSentence(code: string, deltaPct: number, tone: Tone): string {
  if (tone === "flat") return uk.trend.flat(code);

  const pct = Math.abs(deltaPct).toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return tone === "up" ? uk.trend.up(code, pct) : uk.trend.down(code, pct);
}
