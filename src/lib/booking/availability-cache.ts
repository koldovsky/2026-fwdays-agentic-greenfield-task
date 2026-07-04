import type { AvailabilityResult } from "@/lib/booking/availability";
import { getBookableDates } from "@/lib/booking/tennis-window";

const cache = new Map<string, AvailabilityResult>();
const inflight = new Map<string, Promise<AvailabilityResult>>();

async function fetchAvailability(date: string): Promise<AvailabilityResult> {
  const pending = inflight.get(date);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const res = await fetch("/api/booking/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const data = (await res.json()) as AvailabilityResult;
      if (data.status === "ok") {
        cache.set(date, data);
      }
      return data;
    } catch {
      const error: AvailabilityResult = {
        status: "error",
        date,
        reason: "Could not reach the availability service. Check your connection and try again.",
        fetchedAt: new Date().toISOString(),
      };
      return error;
    } finally {
      inflight.delete(date);
    }
  })();

  inflight.set(date, promise);
  return promise;
}

const PREFETCH_CONCURRENCY = 1;

async function prefetchDatesBatched(dates: string[]): Promise<void> {
  for (let i = 0; i < dates.length; i += PREFETCH_CONCURRENCY) {
    const batch = dates.slice(i, i + PREFETCH_CONCURRENCY);
    await Promise.all(batch.map((date) => fetchAvailability(date)));
  }
}

/** Prefetch tomorrow only by default — avoids starving the Playwright lock on STG. */
export function prefetchTennisAvailability(
  referenceDate: Date = new Date(),
  dayCount = 1,
): void {
  const dates = getBookableDates(referenceDate, dayCount).filter(
    (date) => !cache.has(date) && !inflight.has(date),
  );
  if (dates.length > 0) {
    void prefetchDatesBatched(dates);
  }
}

export function peekTennisAvailability(date: string): AvailabilityResult | undefined {
  const cached = cache.get(date);
  return cached?.status === "ok" ? cached : undefined;
}

export async function getTennisAvailability(date: string): Promise<AvailabilityResult> {
  return peekTennisAvailability(date) ?? fetchAvailability(date);
}

/** Clear cached failure and refetch (FR-AVAIL-04). */
export async function retryTennisAvailability(date: string): Promise<AvailabilityResult> {
  cache.delete(date);
  inflight.delete(date);
  return fetchAvailability(date);
}

export function clearTennisAvailabilityCache(): void {
  cache.clear();
  inflight.clear();
}
