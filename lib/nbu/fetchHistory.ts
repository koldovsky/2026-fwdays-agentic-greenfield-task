/**
 * NBU range-endpoint fetch wrapper (FR-HISTORY-02, FR-HISTORY-03,
 * TC-DATA-01). Framework-free (only global `fetch`, no `next`/`react`
 * import). Server-only by convention: called from `app/api/history/route.ts`,
 * never from the browser. Never throws — every failure path resolves
 * `{ ok: false }`.
 *
 * `{ ok: true, points: [] }` is a genuinely distinct, honest outcome from
 * `{ ok: false }` (FR-HISTORY-03 requires separate empty vs. error states):
 * NBU returns HTTP 200 with `[]` both for an unsupported currency code and
 * for a window with no published data — verified live — so a zero-length
 * result is never collapsed into a failure here.
 */

import { historyWindow } from "./historyWindow";
import { mapNbuHistory, type HistoryPoint } from "./mapHistory";

const HISTORY_URL = "https://bank.gov.ua/NBU_Exchange/exchange_site";

export type FetchHistoryResult =
  | { ok: true; points: HistoryPoint[] }
  | { ok: false };

export async function fetchHistory(
  code: string,
  now: Date = new Date(),
): Promise<FetchHistoryResult> {
  try {
    const { start, end } = historyWindow(now);
    const url = new URL(HISTORY_URL);
    url.searchParams.set("start", start);
    url.searchParams.set("end", end);
    url.searchParams.set("valcode", code);
    url.searchParams.set("sort", "exchangedate");
    url.searchParams.set("order", "asc");
    url.searchParams.set("json", "");

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false };

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { ok: false };
    }

    return { ok: true, points: mapNbuHistory(json) };
  } catch {
    return { ok: false };
  }
}
