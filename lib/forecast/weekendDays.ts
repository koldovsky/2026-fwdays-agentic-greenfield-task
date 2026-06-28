// Framework-free utility (TC-PURE-01) — extracts Saturday and Sunday entries
// from a ForecastDay array using UTC date arithmetic to avoid timezone-offset
// bugs when the local clock is behind UTC.

import type { ForecastDay } from "./types";

function dayOfWeekUTC(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function getWeekendDays(days: ForecastDay[]): {
  saturday: ForecastDay | null;
  sunday: ForecastDay | null;
} {
  const saturday = days.find((d) => dayOfWeekUTC(d.date) === 6) ?? null;
  const sunday = days.find((d) => dayOfWeekUTC(d.date) === 0) ?? null;
  return { saturday, sunday };
}
