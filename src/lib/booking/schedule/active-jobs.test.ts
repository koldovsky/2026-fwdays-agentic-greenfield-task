import assert from "node:assert/strict";
import test from "node:test";

import { hasActiveScheduledJobs } from "./active-jobs.ts";
import type { ScheduledJob } from "./types.ts";

function job(partial: Partial<ScheduledJob> & Pick<ScheduledJob, "status">): ScheduledJob {
  return {
    id: "x",
    residentId: "max",
    targetDate: "2026-07-11",
    windowStart: "09:00",
    windowEnd: "12:00",
    courtPreference: "East Court",
    slotLabel: null,
    opensAt: "2026-07-04T06:00:00.000Z",
    bookingDeadline: "2026-07-11T05:59:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
    attempts: 0,
    bookingRequest: "test",
    ...partial,
  };
}

test("hasActiveScheduledJobs false when queue empty or all terminal", () => {
  assert.equal(hasActiveScheduledJobs([]), false);
  assert.equal(
    hasActiveScheduledJobs([
      job({ status: "completed" }),
      job({ status: "failed" }),
    ]),
    false,
  );
});

test("hasActiveScheduledJobs false when all jobs completed after booking", () => {
  assert.equal(
    hasActiveScheduledJobs([
      job({ status: "completed", slotLabel: "09:00 AM-09:45 AM" }),
      job({ status: "completed", slotLabel: "09:45 AM-10:30 AM" }),
      job({ status: "completed", slotLabel: "10:30 AM-11:15 AM" }),
    ]),
    false,
  );
});

test("hasActiveScheduledJobs true for ready job", () => {
  assert.equal(hasActiveScheduledJobs([job({ status: "ready" })]), true);
});

test("hasActiveScheduledJobs false for future waiting job", () => {
  const ref = new Date("2026-07-03T12:00:00.000Z");
  assert.equal(
    hasActiveScheduledJobs(
      [job({ status: "waiting", opensAt: "2026-07-10T06:00:00.000Z" })],
      ref,
    ),
    false,
  );
});

test("hasActiveScheduledJobs true when waiting job is due", () => {
  const ref = new Date("2026-07-04T07:00:00.000Z");
  assert.equal(
    hasActiveScheduledJobs(
      [job({ status: "waiting", opensAt: "2026-07-04T06:00:00.000Z" })],
      ref,
    ),
    true,
  );
});
