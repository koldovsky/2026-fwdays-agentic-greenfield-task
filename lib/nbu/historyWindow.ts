import { addKyivDays, kyivYmd } from "./kyivDate";

/**
 * Computes the `{start, end}` `YYYYMMDD` window for the NBU range endpoint
 * (FR-HISTORY-02). Pure, total, `now` always injected. Default ~30 days,
 * inclusive of both endpoints (so `days=30` spans exactly 30 calendar days).
 */
export function historyWindow(
  now: Date,
  days = 30,
): { start: string; end: string } {
  const end = kyivYmd(now);
  const start = kyivYmd(addKyivDays(now, -(days - 1)));
  return { start, end };
}
