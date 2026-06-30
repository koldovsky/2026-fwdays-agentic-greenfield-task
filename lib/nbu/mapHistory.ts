/**
 * NBU range-endpoint response → domain types (FR-HISTORY-01, TC-PURE-01).
 *
 * Distinct shape from `mapRates.ts`'s "today" endpoint — the range endpoint
 * adds `units`/`rate_per_unit`/`calcdate`, none of which this chart needs.
 * Framework-free, total, never throws. Consecutive carry-over duplicate
 * rates (weekend/holiday) are kept as-is, not de-duplicated — see
 * design.md Decision 1: a chart plotting the real daily values, including
 * repeats, is the honest representation.
 */

export type HistoryPoint = {
  label: string;
  rate: number;
  exchangeDate: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** "DD.MM.YYYY" -> "YYYYMMDD" for a stable ascending sort key. */
function toSortKey(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split(".");
  return `${y}${m}${d}`;
}

function mapOne(item: unknown): HistoryPoint | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const exchangeDate =
    typeof o.exchangedate === "string" && o.exchangedate.length > 0
      ? o.exchangedate
      : null;
  const rate = isFiniteNumber(o.rate) ? o.rate : null;

  if (exchangeDate == null || rate == null) return null;
  return { label: exchangeDate.slice(0, 5), rate, exchangeDate };
}

/** Maps a raw NBU range response into HistoryPoint[], sorted ascending by date. */
export function mapNbuHistory(raw: unknown): HistoryPoint[] {
  if (!Array.isArray(raw)) return [];
  const points: HistoryPoint[] = [];
  for (const item of raw) {
    const mapped = mapOne(item);
    if (mapped) points.push(mapped);
  }
  points.sort((a, b) =>
    toSortKey(a.exchangeDate).localeCompare(toSortKey(b.exchangeDate)),
  );
  return points;
}
