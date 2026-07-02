/**
 * Derives the Stats screen summaries from the existing `['time-entries']` cache — no new
 * query. Aggregation is the pure, unit-tested logic from `@honeydo/shared`; the reference
 * "now" is captured once per mount so totals don't churn on every render (a review screen
 * doesn't need minute-level reshuffling).
 */
import { useMemo, useRef } from 'react';
import {
  type DayTotal,
  type PeriodTotals,
  type TagTotal,
  type TimeEntry,
  entriesInLastNDays,
  periodTotals,
  tagTotals,
  weeklyTotals,
} from '@honeydo/shared';
import { useEntries } from './useTimeEntries';

const EMPTY: TimeEntry[] = [];

export interface StatsSummary {
  /** Tracked hours per day for the last 7 local days, oldest first (FR-STATS-02). */
  weekly: DayTotal[];
  /** Today / this-week / all-time totals (FR-STATS-03). */
  totals: PeriodTotals;
  /** Per-tag totals over the last 7 local days (FR-STATS-04). */
  tagTotalsWeek: TagTotal[];
  /** Per-tag totals over all entries (FR-STATS-04). */
  tagTotalsAll: TagTotal[];
  isLoading: boolean;
  isError: boolean;
}

export function useStats(): StatsSummary {
  const { data, isLoading, isError } = useEntries();
  const nowRef = useRef(new Date());
  const now = nowRef.current;
  const entries = data ?? EMPTY;

  return useMemo<StatsSummary>(
    () => ({
      weekly: weeklyTotals(entries, now),
      totals: periodTotals(entries, now),
      tagTotalsWeek: tagTotals(entriesInLastNDays(entries, now, 7)),
      tagTotalsAll: tagTotals(entries),
      isLoading,
      isError,
    }),
    [entries, now, isLoading, isError],
  );
}
