/**
 * NBU response → domain types (FR-RATES-02, TC-PURE-01).
 *
 * Framework-free, total, never throws: malformed entries are dropped rather
 * than crashing the page on an unexpected NBU response shape (NFR-OBS-01).
 */

export type Rate = {
  code: string;
  name: string;
  rate: number;
  exchangeDate: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function mapOne(item: unknown): Rate | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const code = typeof o.cc === "string" && o.cc.length > 0 ? o.cc : null;
  const name = typeof o.txt === "string" && o.txt.length > 0 ? o.txt : null;
  const rate = isFiniteNumber(o.rate) ? o.rate : null;
  const exchangeDate =
    typeof o.exchangedate === "string" && o.exchangedate.length > 0
      ? o.exchangedate
      : null;

  if (code == null || name == null || rate == null || exchangeDate == null) {
    return null;
  }
  return { code, name, rate, exchangeDate };
}

/** Maps a raw NBU "all currencies" response into domain Rate[], sorted by code. */
export function mapNbuRates(raw: unknown): Rate[] {
  if (!Array.isArray(raw)) return [];
  const rates: Rate[] = [];
  for (const item of raw) {
    const mapped = mapOne(item);
    if (mapped) rates.push(mapped);
  }
  rates.sort((a, b) => a.code.localeCompare(b.code));
  return rates;
}
