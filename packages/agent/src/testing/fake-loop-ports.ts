// In-memory fakes for `loop.ts`'s `PersistencePort`/`BookingStorePort`/
// `ReleaseHoldFn` seams — TEST INFRASTRUCTURE, not the feature under test
// (tasks.md 4.4's red half). Fully working, unlike `loop.ts` itself: these
// simply record every call so `loop.test.ts` can assert on them once
// `runIntakeTurn` is implemented (same role S1's `FakeCalendarPort` plays
// for `hold.test.ts`, and this package's own `FakeModelPort` plays for the
// model seam).

import type { BookingStorePort, PendingBooking, PersistencePort, ReleaseHoldFn } from "../loop.ts";
import type { ConversationState, IntakeFields } from "@kamerton/lib/src/intake/state-machine.ts";

/** Records every `saveFields`/`saveState` call, in order, so a test can
 *  assert exactly what the loop persisted (and nothing more) — e.g. tasks.md
 *  4.4's amend-field bullet: "calls ports.persistence.saveFields({
 *  studentAge: 7 })" and nothing else. */
export class FakePersistencePort implements PersistencePort {
  readonly fieldSaves: Array<Partial<IntakeFields>> = [];
  readonly stateSaves: ConversationState[] = [];

  async saveFields(patch: Partial<IntakeFields>): Promise<void> {
    this.fieldSaves.push(patch);
  }

  async saveState(state: ConversationState): Promise<void> {
    this.stateSaves.push(state);
  }
}

/** A scripted + recording `BookingStorePort`: constructed with the pending
 *  booking the current request should resolve to (`undefined` if the lead
 *  never reached a hold), and records every `markBookingCancelled` call. */
export class FakeBookingStorePort implements BookingStorePort {
  readonly cancelledBookingIds: number[] = [];

  constructor(private readonly pendingBooking: PendingBooking | undefined = undefined) {}

  async findPendingBookingForCurrentRequest(): Promise<PendingBooking | undefined> {
    return this.pendingBooking;
  }

  async markBookingCancelled(bookingId: number): Promise<void> {
    this.cancelledBookingIds.push(bookingId);
  }
}

/** A recording `ReleaseHoldFn` double — records every calendar event id it
 *  was asked to release, in call order. */
export function createFakeReleaseHold(): ReleaseHoldFn & { releasedEventIds: string[] } {
  const releasedEventIds: string[] = [];
  const fn = async (calendarEventId: string): Promise<void> => {
    releasedEventIds.push(calendarEventId);
  };
  return Object.assign(fn, { releasedEventIds });
}
