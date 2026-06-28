/**
 * Thin Dexie (IndexedDB) persistence for break events (TC-STACK-03). The `events`
 * table is keyed by an auto-increment id with `timestamp` indexed for range
 * queries. Writing never throws — if IndexedDB is unavailable (e.g. private mode)
 * the event is dropped silently rather than surfacing an error (FR-STATS-05 ethos).
 */

import Dexie, { type Table } from "dexie";

import type { BreakEvent } from "@/lib/types";

class BreakReminderDb extends Dexie {
  events!: Table<BreakEvent, number>;

  constructor() {
    super("break-reminder");
    this.version(1).stores({ events: "++id, timestamp, type" });
  }
}

export const db = new BreakReminderDb();

/** Append a break event with the given type and timestamp (defaults to now). */
export async function recordBreakEvent(
  type: BreakEvent["type"],
  timestamp: number = Date.now(),
): Promise<void> {
  try {
    await db.events.add({ type, timestamp });
  } catch {
    // IndexedDB unavailable — degrade silently; stats simply won't include this.
  }
}
