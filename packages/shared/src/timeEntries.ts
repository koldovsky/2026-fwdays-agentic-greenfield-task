/**
 * Pure time-entry helpers, framework-free (TC-PURE-01). Grouping runs on the client
 * because "local calendar day" depends on the device's time zone (see design.md); the
 * server stays TZ-agnostic and returns a flat list.
 */
import type { TimeEntry } from './contracts';

/** A day bucket for the History list: local date, its total, and its entries. */
export interface DayGroup {
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  /** Sum of the day's entry durations in whole seconds (running entries count 0). */
  totalSec: number;
  /** The day's entries, newest start first. */
  entries: TimeEntry[];
}

/** Local `YYYY-MM-DD` for an ISO timestamp, using the ambient (device) time zone. */
function localDateKey(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Group entries by **local calendar day**, newest day first, each with a per-day total
 * (FR-ENTRY-07). An entry is attributed entirely to its **start day**, so a
 * midnight-crossing entry counts on the day it began (FR-ENTRY-10). A running entry
 * (`durationSec === null`) still appears in its day but contributes 0 to the total.
 */
export function groupEntriesByDay(entries: TimeEntry[]): DayGroup[] {
  const byDay = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const key = localDateKey(entry.startedAt);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(entry);
    else byDay.set(key, [entry]);
  }

  return [...byDay.keys()]
    .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)) // newest day first
    .map((date) => {
      const dayEntries = byDay
        .get(date)!
        .slice()
        .sort((a, b) => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0));
      const totalSec = dayEntries.reduce((sum, e) => sum + (e.durationSec ?? 0), 0);
      return { date, totalSec, entries: dayEntries };
    });
}
