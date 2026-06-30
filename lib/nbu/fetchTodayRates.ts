/**
 * NBU "all currencies, today" fetch wrapper (FR-RATES-01, FR-RATES-05,
 * TC-DATA-01, NFR-PERF-01).
 *
 * Framework-free (only global `fetch`, no `next`/`react` import — TC-PURE-01).
 * Server-only by convention: called from a Server Component or a Route
 * Handler, never from the browser (the NBU call is never exposed as if a key
 * were needed). Never throws — every failure path resolves `{ ok: false }`
 * so a caller can render an honest degraded state instead of crashing.
 */

import { mapNbuRates, type Rate } from "./mapRates";

const TODAY_RATES_URL =
  "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json";

export type FetchRatesResult =
  | { ok: true; rates: Rate[]; exchangeDate: string }
  | { ok: false };

export type FetchTodayRatesOptions = {
  /** Force a fresh fetch, bypassing Next's Data Cache (used by the manual-retry Route Handler). */
  noStore?: boolean;
  /** Revalidate window in seconds for the default (non-`noStore`) path. NBU publishes at most once a day. */
  revalidateSeconds?: number;
};

export async function fetchTodayRates(
  opts: FetchTodayRatesOptions = {},
): Promise<FetchRatesResult> {
  try {
    const init: RequestInit & { next?: { revalidate?: number } } = {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    };
    if (opts.noStore) {
      init.cache = "no-store";
    } else {
      init.next = { revalidate: opts.revalidateSeconds ?? 3600 };
    }

    const res = await fetch(TODAY_RATES_URL, init);
    if (!res.ok) return { ok: false };

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { ok: false };
    }

    const rates = mapNbuRates(json);
    if (rates.length === 0) return { ok: false };

    return { ok: true, rates, exchangeDate: rates[0].exchangeDate };
  } catch {
    return { ok: false };
  }
}
