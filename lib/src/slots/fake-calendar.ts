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
  private externalEvents = new Map<string, BusyInterval>();
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

  /** Test-only helper: seed a distinct EXTERNAL calendar event (e.g. the
   *  teacher manually creating an appointment in the Google Calendar UI)
   *  with its own identity, at `range` — used to reproduce the live-found
   *  Confirm double-booking bug (`docs/qa/booking-hitl-manual-smoke.md`'s
   *  "REAL BUG FOUND" note), where an external event exactly overlaps a
   *  booking's own tentative hold. Distinct from `addManualBusy` (an
   *  identity-less pre-existing busy interval, not a discrete event):
   *  `busyEventsInRange` always reports this as its OWN entry, keyed by
   *  `eventId`, regardless of any other event's range — unlike a real
   *  `freeBusy` snapshot, whose merged busy-time reporting can make two
   *  exactly-overlapping distinct events indistinguishable. Not part of the
   *  `CalendarPort` interface. Returns the (given or generated) `eventId`. */
  addExternalEvent(range: { start: string; end: string }, eventId?: string): string {
    const id = eventId ?? `fake-external-${this.nextId++}`;
    this.externalEvents.set(id, { start: range.start, end: range.end });
    return id;
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
    const externalIntervals = Array.from(this.externalEvents.values());
    return [...this.manualBusy, ...eventIntervals, ...externalIntervals].filter((busy) =>
      overlaps(range, busy),
    );
  }

  /** Distinct events (own tentative/confirmed + seeded external), each its
   *  own entry keyed by `eventId` — see `CalendarPort.busyEventsInRange`'s
   *  own doc comment. Deliberately never merges, unlike `freeBusy` above. */
  async busyEventsInRange(
    range: { start: string; end: string },
  ): Promise<{ eventId: string; start: string; end: string }[]> {
    const ownEvents = Array.from(this.events.entries()).map(([eventId, event]) => ({
      eventId,
      start: event.slot.start,
      end: event.slot.end,
    }));
    const externalEvents = Array.from(this.externalEvents.entries()).map(([eventId, interval]) => ({
      eventId,
      start: interval.start,
      end: interval.end,
    }));
    return [...ownEvents, ...externalEvents].filter((entry) => overlaps(range, entry));
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
