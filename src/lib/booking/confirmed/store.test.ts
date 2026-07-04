import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { ConfirmedBooking } from "./types.ts";

test("listActiveConfirmedBookings purges expired entries", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "colibri-confirmed-"));
  const prevDataDir = process.env.COLIBRI_DATA_DIR;
  process.env.COLIBRI_DATA_DIR = tmpDir;

  try {
    const { listActiveConfirmedBookings } = await import(`./store.ts?t=${Date.now()}`);

    const expired: ConfirmedBooking = {
      id: "expired-1",
      residentId: "max",
      fullName: "Max Bugaiov",
      email: "maxbugaiov@gmail.com",
      facility: "Tennis Courts",
      date: "2020-01-01",
      court: "East Court",
      slot: "9:00 AM-9:45 AM",
      confirmedAt: "2020-01-01T10:00:00.000Z",
      expiresAt: "2020-01-01T09:45:00.000Z",
      runId: "run-expired",
      source: "wizard",
      mhoaApproved: true,
    };

    const active: ConfirmedBooking = {
      ...expired,
      id: "active-1",
      date: "2099-07-11",
      expiresAt: "2099-07-11T09:45:00.000Z",
      runId: "run-active",
    };

    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, "confirmed-bookings.json"),
      JSON.stringify([expired, active]),
    );

    const result = await listActiveConfirmedBookings(new Date("2026-07-04T12:00:00"));
    assert.equal(result.length, 1);
    assert.equal(result[0]?.runId, "run-active");

    const onDisk = JSON.parse(
      await fs.readFile(path.join(tmpDir, "confirmed-bookings.json"), "utf8"),
    ) as ConfirmedBooking[];
    assert.equal(onDisk.length, 1);
    assert.equal(onDisk[0]?.runId, "run-active");
  } finally {
    if (prevDataDir === undefined) delete process.env.COLIBRI_DATA_DIR;
    else process.env.COLIBRI_DATA_DIR = prevDataDir;
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
