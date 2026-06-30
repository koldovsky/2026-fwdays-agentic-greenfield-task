/**
 * 7-day percentage move from a daily rate-history series (FR-TREND-01).
 * Pure, total, never throws: needs at least 8 points (today + 7 days back);
 * returns `null` when there isn't enough history or the comparison point is
 * zero/non-finite, rather than dividing by zero or producing `NaN`.
 */
export function weeklyMovePct(points: { rate: number }[]): number | null {
  if (points.length < 8) return null;

  const last = points[points.length - 1];
  const weekAgo = points[points.length - 8];

  if (!Number.isFinite(last.rate) || !Number.isFinite(weekAgo.rate)) return null;
  if (weekAgo.rate === 0) return null;

  return ((last.rate - weekAgo.rate) / weekAgo.rate) * 100;
}
