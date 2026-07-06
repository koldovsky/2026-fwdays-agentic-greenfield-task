// In-memory fakes for `loop.ts`'s `PersistencePort`/`BookingStorePort`/
// `ReleaseHoldFn` seams — TEST INFRASTRUCTURE, not the feature under test
// (tasks.md 4.4's red half). Fully working, unlike `loop.ts` itself: these
// simply record every call so `loop.test.ts` can assert on them once
// `runIntakeTurn` is implemented (same role S1's `FakeCalendarPort` plays
// for `hold.test.ts`, and this package's own `FakeModelPort` plays for the
// model seam).

import type {
  BookingStorePort,
  HoldStorePort,
  PendingBooking,
  PersistencePort,
  ReleaseHoldFn,
  SlotsPort,
} from "../loop.ts";
import type { ConversationState, IntakeFields, OfferedSlot } from "@kamerton/lib/src/intake/state-machine.ts";

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

/** `SlotsPort.proposeSlots`'s exact resolved-value shape (booking-hitl
 *  design.md Decision 2, tasks.md C.2/C.3) — re-derived here rather than
 *  imported so this test-infra file never has to reach past `loop.ts`'s own
 *  exported interface. */
type SlotsProposeResult = Awaited<ReturnType<SlotsPort["proposeSlots"]>>;
type HoldSlotResult = Awaited<ReturnType<HoldStorePort["holdSlot"]>>;

/** A scripted + recording `SlotsPort` double (booking-hitl tasks.md C.2/C.3)
 *  — constructed with the single result every `proposeSlots` call resolves
 *  to (mirrors `FakeBookingStorePort`'s own "constructed with the scripted
 *  outcome" shape); records every call's input, in order, so a test can
 *  assert `ports.slots.proposeSlots` was (or, for the invalid-input case,
 *  was NOT) ever called. Defaults to `"unavailable"` — a loud, honest
 *  default: a test that forgets to script a result gets a Calendar-apology
 *  reply, not a silently-wrong "ok" result. */
export class FakeSlotsPort implements SlotsPort {
  readonly calls: Array<{ weekdays: string[]; timeWindow: { start: string; end: string } }> = [];

  constructor(
    private readonly result: SlotsProposeResult = {
      status: "unavailable",
      apology: "FakeSlotsPort: no result scripted for this test",
    },
  ) {}

  async proposeSlots(input: {
    weekdays: string[];
    timeWindow: { start: string; end: string };
  }): Promise<SlotsProposeResult> {
    this.calls.push(input);
    return this.result;
  }
}

/** A scripted + recording `HoldStorePort` double (booking-hitl tasks.md
 *  C.2/C.3) — same construction/recording shape as `FakeSlotsPort` above. */
export class FakeHoldStorePort implements HoldStorePort {
  readonly calls: Array<{ slotIndex: number; offeredSlots: OfferedSlot[] }> = [];

  constructor(
    private readonly result: HoldSlotResult = {
      status: "unavailable",
      apology: "FakeHoldStorePort: no result scripted for this test",
    },
  ) {}

  async holdSlot(slotIndex: number, offeredSlots: OfferedSlot[]): Promise<HoldSlotResult> {
    this.calls.push({ slotIndex, offeredSlots });
    return this.result;
  }
}
