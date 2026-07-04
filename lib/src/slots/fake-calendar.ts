// In-memory fake `CalendarPort` — TEST INFRASTRUCTURE, not the feature under
// test (tasks.md 4.2). Fully working, unlike the throwing stubs elsewhere in
// this directory: hold.test.ts needs a real, deterministic double to drive
// the hold-lifecycle scenarios (create-hold success, hold-collision,
// hold-race, delete-on-cancel) without a network call.
//
// Framework-free (TC-PURE-01): no Google SDK, no network, no filesystem.

import { overlaps } from "./subtract.ts";
import type { BusyInterval, CalendarPort } from "./calendar-port.ts";
import { CalendarApiError } from "./calendar-port.ts";

type EventStatus = "tentative" | "confirmed";

interface FakeEvent {
  slot: { start: string; end: string };
  status: EventStatus;
  summary: string;
  description?: string;
}

/**
 * Deterministic in-memory `CalendarPort`: a manually-injected busy list
 * (simulating events the teacher created directly in Google Calendar) plus
 * a tentative/confirmed event map (populated by `createTentative`/
 * `upgradeToConfirmed`). `freeBusy` reports both, unified — a fake lead's
 * tentative hold blocks free/busy exactly like a manual event, mirroring
 * real Google Calendar behaviour (FR-SLOT-02).
 *
 * All `start`/`end` strings passed to/from this fake are treated as opaque,
 * fixed-width, lexicographically-sortable timestamps (RFC3339 UTC in
 * production; test fixtures may use any fixed-width format as long as it
 * sorts chronologically) — the same half-open `overlaps()` predicate from
 * `subtract.ts` is reused here (design.md Decision 4: one predicate, never
 * re-derived), not a second interval-comparison implementation.
 */
export class FakeCalendarPort implements CalendarPort {
  private manualBusy: BusyInterval[];
  private events = new Map<string, FakeEvent>();
  private nextId = 1;

  constructor(initialBusy: BusyInterval[] = []) {
    this.manualBusy = [...initialBusy];
  }

  /** Test-only helper: simulate the teacher adding an event directly in the
   *  Google Calendar UI, after a `freeBusy` snapshot was already taken by
   *  the code under test (spec.md "hold collision" scenario). Not part of
   *  the `CalendarPort` interface. */
  addManualBusy(interval: BusyInterval): void {
    this.manualBusy.push(interval);
  }

  /** Test-only helper: how many tentative/confirmed events currently exist
   *  (used to assert "no event was created" on a collision path). Not part
   *  of the `CalendarPort` interface. */
  eventCount(): number {
    return this.events.size;
  }

  /** Test-only helper: inspect one event's current status, or `undefined`
   *  if it does not exist (e.g. after `deleteEvent`). Not part of the
   *  `CalendarPort` interface. */
  getEvent(eventId: string): FakeEvent | undefined {
    return this.events.get(eventId);
  }

  async freeBusy(range: { start: string; end: string }): Promise<BusyInterval[]> {
    const eventIntervals = Array.from(this.events.values()).map((e) => e.slot);
    return [...this.manualBusy, ...eventIntervals].filter((busy) =>
      overlaps(range, busy),
    );
  }

  async createTentative(
    slot: { start: string; end: string },
    summary: string,
    description?: string,
  ): Promise<{ eventId: string }> {
    const eventId = `fake-evt-${this.nextId++}`;
    this.events.set(eventId, { slot, status: "tentative", summary, description });
    return { eventId };
  }

  async upgradeToConfirmed(eventId: string, brief: string): Promise<void> {
    const event = this.events.get(eventId);
    if (!event) {
      throw new CalendarApiError(`FakeCalendarPort: unknown eventId "${eventId}"`);
    }
    event.status = "confirmed";
    event.description = brief;
  }

  async deleteEvent(eventId: string): Promise<void> {
    this.events.delete(eventId);
  }
}
