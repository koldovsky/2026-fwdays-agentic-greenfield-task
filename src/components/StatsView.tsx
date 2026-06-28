"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { aggregateStats, weekRange } from "@/lib/stats/stats";
import { db } from "../storage/events";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Stats view: a calm done-vs-snoozed bar chart for the current week, updating
 * reactively as events are recorded (FR-STATS-03/04). Done uses `accent`,
 * snoozed a muted tone — never `signal` (DESIGN.md). Empty state is a friendly
 * invitation, never a blank or error (FR-STATS-05).
 */
export function StatsView() {
  // Capture "now" once so the week range is stable across re-renders.
  const [now] = useState(() => new Date());
  const range = useMemo(() => weekRange(now), [now]);

  const events = useLiveQuery(
    () =>
      db.events
        .where("timestamp")
        .between(range.start.getTime(), range.end.getTime(), true, false)
        .toArray(),
    [range.start.getTime(), range.end.getTime()],
  );

  const summary = useMemo(() => aggregateStats(events ?? [], range), [events, range]);

  if (summary.done === 0 && summary.snoozed === 0) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <h2 className="font-display text-2xl text-ink">Your pauses</h2>
        <p className="max-w-xs text-sm leading-relaxed text-muted">
          Once you take your first break, you’ll see your week gather here.
        </p>
      </section>
    );
  }

  // Build a bucket per weekday (Mon–Sun) from the sparse per-day summary.
  const byKey = new Map(summary.byDay.map((d) => [d.day, d]));
  // fallow-ignore-next-line complexity -- Seven fixed chart columns with default empty buckets.
  const columns = WEEKDAY_LABELS.map((label, i) => {
    const date = new Date(
      range.start.getFullYear(),
      range.start.getMonth(),
      range.start.getDate() + i,
    );
    const bucket = byKey.get(dayKey(date));
    return { label, done: bucket?.done ?? 0, snoozed: bucket?.snoozed ?? 0 };
  });
  const max = Math.max(1, ...columns.map((c) => c.done + c.snoozed));

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <h2 className="font-display text-2xl text-ink">Your pauses</h2>

      <div className="flex items-end justify-between gap-2" style={{ height: 180 }}>
        {columns.map((c) => (
          <div key={c.label} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="flex w-full flex-col justify-end"
              style={{ height: 140 }}
              aria-hidden="true"
            >
              <div
                className="w-full rounded-t-sm bg-muted/40"
                style={{ height: `${(c.snoozed / max) * 100}%` }}
              />
              <div
                className="w-full bg-accent"
                style={{ height: `${(c.done / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted">{c.label}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-6 text-sm text-muted">
        <span className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-sm bg-accent" /> Done {summary.done}
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-sm bg-muted/40" /> Snoozed{" "}
          {summary.snoozed}
        </span>
      </div>
    </section>
  );
}
