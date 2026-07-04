import assert from "node:assert/strict";
import test from "node:test";

import { createJobsFromInput } from "./runner.ts";

test("createJobsFromInput stores guestContact for other guest", () => {
  const jobs = createJobsFromInput([
    {
      residentId: "other",
      targetDate: "2026-07-20",
      windowStart: "09:00",
      windowEnd: "21:00",
      courtPreference: null,
      slotLabel: null,
      bookingRequest: "Book any court any available slot on 2026-07-20",
      guestContact: {
        fullName: "Guest User",
        email: "guest@example.com",
        phone: "4035551234",
        address: "1 Marine DR SE",
      },
    },
  ]);

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]!.residentId, "other");
  assert.equal(jobs[0]!.guestContact?.fullName, "Guest User");
  assert.equal(jobs[0]!.status, "waiting");
});

test("createJobsFromInput sets exact slot and court", () => {
  const jobs = createJobsFromInput([
    {
      residentId: "max",
      targetDate: "2026-07-20",
      windowStart: "09:00",
      windowEnd: "21:00",
      courtPreference: "East Court",
      slotLabel: "9:00 AM-9:45 AM",
      bookingRequest: "Book East Court 9:00 AM-9:45 AM on 2026-07-20",
    },
  ]);

  assert.equal(jobs[0]!.slotLabel, "9:00 AM-9:45 AM");
  assert.equal(jobs[0]!.courtPreference, "East Court");
});
