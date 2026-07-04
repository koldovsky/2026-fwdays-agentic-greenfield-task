import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { ScheduledJob } from "./types.ts";

test("deleteScheduledJob removes waiting job", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "colibri-sched-"));
  const prevDataDir = process.env.COLIBRI_DATA_DIR;
  process.env.COLIBRI_DATA_DIR = tmpDir;

  try {
    const { deleteScheduledJob, addScheduledJobs, listScheduledJobs } = await import(
      `./store.ts?t=${Date.now()}`
    );

    const job: ScheduledJob = {
      id: "test-job-1",
      status: "waiting",
      residentId: "max",
      targetDate: "2026-07-20",
      windowStart: "09:00",
      windowEnd: "21:00",
      courtPreference: "East Court",
      slotLabel: null,
      opensAt: new Date().toISOString(),
      bookingDeadline: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      attempts: 0,
      bookingRequest: "test",
    };

    await addScheduledJobs([job]);
    assert.equal((await listScheduledJobs()).length, 1);

    const deleted = await deleteScheduledJob("test-job-1");
    assert.equal(deleted, true);
    assert.equal((await listScheduledJobs()).length, 0);
  } finally {
    if (prevDataDir === undefined) delete process.env.COLIBRI_DATA_DIR;
    else process.env.COLIBRI_DATA_DIR = prevDataDir;
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
