import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  groupConsecutiveConfirmedBookings,
  participantLabelsForGroup,
} from "./group-display";
import type { ConfirmedBooking } from "./types";

function booking(
  overrides: Partial<ConfirmedBooking> & Pick<ConfirmedBooking, "id" | "slot" | "fullName">,
): ConfirmedBooking {
  return {
    residentId: null,
    email: "a@example.com",
    facility: "Tennis Courts",
    date: "2026-07-11",
    court: "East Court",
    confirmedAt: "2026-07-04T02:00:00.000Z",
    expiresAt: "2026-07-11T17:15:00.000Z",
    runId: overrides.id,
    source: "scheduled",
    mhoaApproved: true,
    ...overrides,
  };
}

describe("groupConsecutiveConfirmedBookings", () => {
  it("merges three consecutive Jul 11 East Court slots into one range", () => {
    const groups = groupConsecutiveConfirmedBookings([
      booking({
        id: "1",
        residentId: "max",
        fullName: "Max Bugaiov",
        slot: "09:00 AM-09:45 AM",
      }),
      booking({
        id: "2",
        residentId: "yurii",
        fullName: "Yurii Smolin",
        slot: "09:45 AM-10:30 AM",
      }),
      booking({
        id: "3",
        residentId: "nataliia",
        fullName: "Nataliia Pokotylo",
        slot: "10:30 AM-11:15 AM",
      }),
    ]);

    assert.equal(groups.length, 1);
    assert.equal(groups[0]!.slotLabel, "09:00 AM - 11:15 AM");
    assert.equal(groups[0]!.bookings.length, 3);
    assert.deepEqual(participantLabelsForGroup(groups[0]!), ["Max", "Yurii", "Nataliia"]);
  });

  it("keeps non-consecutive slots as separate rows", () => {
    const groups = groupConsecutiveConfirmedBookings([
      booking({ id: "a", fullName: "Max Bugaiov", slot: "09:00 AM-09:45 AM" }),
      booking({ id: "b", fullName: "Max Bugaiov", slot: "11:00 AM-11:45 AM" }),
    ]);
    assert.equal(groups.length, 2);
  });
});
