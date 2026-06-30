"use client";

import { trendTone } from "@/components/ds";
import { trendSentence } from "@/lib/currency/trendSentence";
import { weeklyMovePct } from "@/lib/currency/weeklyMove";
import type { HistoryPoint } from "@/lib/nbu/mapHistory";

/**
 * One calm Ukrainian sentence reading the active currency's 7-day move,
 * computed from the history points `CurrencyHistory` already fetched (no
 * new NBU call). Renders nothing when there isn't enough history yet —
 * a quiet omission, not an error (design.md Decision 3).
 *
 * @trace FR-TREND-01 FR-TREND-02 FR-TREND-03
 */
export function TrendHint({ code, points }: { code: string; points: HistoryPoint[] }) {
  const deltaPct = weeklyMovePct(points);
  if (deltaPct == null) return null;

  const tone = trendTone(deltaPct);
  const sentence = trendSentence(code, deltaPct, tone);

  return <p className="trend-hint" data-tone={tone}>{sentence}</p>;
}
