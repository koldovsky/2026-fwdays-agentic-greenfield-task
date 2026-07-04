import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  formatNextRetryCalgary,
  getNextRetryAt,
  getNextScheduleCronRun,
  SCHEDULE_CRON_TIMEZONE,
  zonedDateTimeToUtc,
} from "./next-cron-run.ts";
import type { ScheduledJob } from "./types.ts";

function baseJob(partial: Partial<ScheduledJob> & Pick<ScheduledJob, "status">): ScheduledJob {
  return {
    id: "test",
    residentId: "max",
    targetDate: "2026-07-11",
    windowStart: "09:00",
    windowEnd: "21:00",
    courtPreference: "East Court",
    slotLabel: "10:30 AM-11:15 AM",
    opensAt: "2026-07-04T06:00:00.000Z",
    bookingDeadline: "2026-07-10T23:59:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
    attempts: 1,
    bookingRequest: "Book East Court 10:30 AM-11:15 AM on 2026-07-11",
    ...partial,
  };
}

describe("getNextScheduleCronRun", () => {
  test("returns next :41 when now is :32 Edmonton", () => {
    const after = zonedDateTimeToUtc(2026, 7, 3, 20, 32, SCHEDULE_CRON_TIMEZONE);
    const next = getNextScheduleCronRun(after);
    const p = new Intl.DateTimeFormat("en-US", {
      timeZone: SCHEDULE_CRON_TIMEZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(next);
    const hour = Number(p.find((x) => x.type === "hour")!.value);
    const minute = Number(p.find((x) => x.type === "minute")!.value);
    assert.equal(hour, 20);
    assert.equal(minute, 41);
    assert.ok(next > after);
  });

  test("returns :01 next hour when now is :51", () => {
    const after = zonedDateTimeToUtc(2026, 7, 3, 20, 51, SCHEDULE_CRON_TIMEZONE);
    const next = getNextScheduleCronRun(after);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: SCHEDULE_CRON_TIMEZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(next);
    assert.equal(Number(parts.find((x) => x.type === "hour")!.value), 21);
    assert.equal(Number(parts.find((x) => x.type === "minute")!.value), 1);
  });
});

describe("getNextRetryAt", () => {
  test("ready job retries on next cron after now", () => {
    const now = zonedDateTimeToUtc(2026, 7, 3, 20, 32, SCHEDULE_CRON_TIMEZONE);
    const retry = getNextRetryAt(baseJob({ status: "ready" }), now);
    assert.ok(retry);
    assert.equal(
      retry!.toISOString(),
      getNextScheduleCronRun(now).toISOString(),
    );
  });

  test("waiting job uses opensAt when in the future", () => {
    const now = zonedDateTimeToUtc(2026, 7, 3, 12, 0, SCHEDULE_CRON_TIMEZONE);
    const opensAt = zonedDateTimeToUtc(2026, 7, 4, 0, 0, SCHEDULE_CRON_TIMEZONE).toISOString();
    const retry = getNextRetryAt(baseJob({ status: "waiting", opensAt }), now);
    assert.ok(retry);
    assert.ok(retry! >= new Date(opensAt));
  });

  test("completed job has no retry", () => {
    assert.equal(getNextRetryAt(baseJob({ status: "completed" })), null);
  });
});

describe("formatNextRetryCalgary", () => {
  test("includes Calgary suffix", () => {
    const at = zonedDateTimeToUtc(2026, 7, 3, 20, 41, SCHEDULE_CRON_TIMEZONE);
    const label = formatNextRetryCalgary(at);
    assert.match(label, /Calgary$/);
    assert.match(label, /Jul/);
  });
});
