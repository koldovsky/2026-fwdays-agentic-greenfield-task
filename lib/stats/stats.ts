/**
 * Pure statistics aggregation. Framework-free (TC-PURE-01): no Dexie, no DOM.
 * The caller supplies the events and the range; this only buckets and counts,
 * so it is deterministic and tested against the AC-STATS acceptance cases.
 */

import type { BreakEvent, DateRange, DayStats, StatsSummary } from "../types";

/** Local calendar-day key `"YYYY-MM-DD"` for a date (uses the host timezone). */
function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Aggregate break events within `range` into done/snoozed totals plus a per-day
 * breakdown. Events outside the half-open range `[start, end)` are ignored.
 * `byDay` contains only days with at least one event, sorted ascending
 * (backs FR-STATS-02).
 */
export function aggregateStats(events: BreakEvent[], range: DateRange): StatsSummary {
  const start = range.start.getTime();
  const end = range.end.getTime();

  let done = 0;
  let snoozed = 0;
  const buckets = new Map<string, DayStats>();

  for (const event of events) {
    if (event.timestamp < start || event.timestamp >= end) continue;

    const isDone = event.type === "done";
    if (isDone) done++;
    else snoozed++;

    const key = localDayKey(new Date(event.timestamp));
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { day: key, done: 0, snoozed: 0 };
      buckets.set(key, bucket);
    }
    if (isDone) bucket.done++;
    else bucket.snoozed++;
  }

  const byDay = [...buckets.values()].sort((a, b) => a.day.localeCompare(b.day));
  return { done, snoozed, byDay };
}

/**
 * The Monday-anchored week containing `now`, as a half-open `[start, end)` range
 * (start = Monday 00:00 local, end = the following Monday 00:00).
 */
export function weekRange(now: Date): DateRange {
  const daysSinceMonday = (now.getDay() + 6) % 7; // getDay(): 0=Sun…6=Sat
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysSinceMonday,
    0,
    0,
    0,
    0,
  );
  const end = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 7,
    0,
    0,
    0,
    0,
  );
  return { start, end };
}
