#!/usr/bin/env node
// @kamerton/calendar — LIVE smoke script for GoogleCalendarPort (tasks.md
// 4.3). Deliberately named `smoke.mjs` (NOT `*.test.ts`) so vitest's
// `include: ["lib/**/*.test.ts", "packages/**/*.test.ts"]` glob ignores it —
// this is a runnable diagnostic against the real DEMO Google Calendar, not a
// unit test.
//
// Run with: node packages/calendar/src/smoke.mjs
// Requires: .env at repo root with GOOGLE_APPLICATION_CREDENTIALS and
// GOOGLE_CALENDAR_ID pointing at a DEMO calendar shared with the
// service account ("Make changes"). Never logs credential values.

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleCalendarPort } from "./google-calendar.ts";
import { kyivWallClockToUtc } from "@kamerton/lib/src/slots/timezone.ts";
import {
  CalendarAuthError,
  CalendarTimeoutError,
  CalendarApiError,
} from "@kamerton/lib/src/slots/calendar-port.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const envPath = path.join(repoRoot, ".env");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
} else {
  console.warn(`[smoke] no .env found at ${envPath} — relying on already-exported env vars`);
}

function errorClass(error) {
  if (error instanceof CalendarAuthError) return "CalendarAuthError";
  if (error instanceof CalendarTimeoutError) return "CalendarTimeoutError";
  if (error instanceof CalendarApiError) return "CalendarApiError";
  return error?.constructor?.name ?? typeof error;
}

/** Next Monday, 12:00-13:00 Europe/Kyiv, expressed as an RFC3339 UTC pair —
 *  never a real lead's slot, just a disposable smoke fixture. */
function nextMondayNoonToOnePmKyiv() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun..6=Sat
  const daysUntilMonday = ((1 - day + 7) % 7) || 7; // always a FUTURE Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  const y = monday.getUTCFullYear();
  const m = String(monday.getUTCMonth() + 1).padStart(2, "0");
  const d = String(monday.getUTCDate()).padStart(2, "0");
  return {
    start: kyivWallClockToUtc(`${y}-${m}-${d}T12:00`),
    end: kyivWallClockToUtc(`${y}-${m}-${d}T13:00`),
  };
}

async function timed(label, fn) {
  const t0 = performance.now();
  try {
    const result = await fn();
    const ms = Math.round(performance.now() - t0);
    console.log(`[smoke] ${label}: OK (${ms}ms)`);
    return { result, ms };
  } catch (error) {
    const ms = Math.round(performance.now() - t0);
    console.error(`[smoke] ${label}: FAILED after ${ms}ms — ${errorClass(error)}: ${error.message}`);
    throw error;
  }
}

async function main() {
  console.log("=== @kamerton/calendar live smoke (task 4.3) ===");
  console.log(`GOOGLE_CALENDAR_ID set: ${Boolean(process.env.GOOGLE_CALENDAR_ID)}`);
  console.log(`GOOGLE_APPLICATION_CREDENTIALS set: ${Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS)}`);

  const port = new GoogleCalendarPort();

  const rangeStart = new Date().toISOString();
  const rangeEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const range = { start: rangeStart, end: rangeEnd };

  // (a) freeBusy baseline, 3 timed runs for latency spread (design.md
  // spike criteria: freeBusy latency).
  console.log("\n--- (a) freeBusy baseline (next 7 days), 3 runs ---");
  let baseline;
  for (let i = 1; i <= 3; i++) {
    const { result, ms } = await timed(`freeBusy run ${i}`, () => port.freeBusy(range));
    baseline = result;
    console.log(`  run ${i}: ${result.length} busy interval(s), ${ms}ms`);
  }
  console.log(`[smoke] baseline busy-interval count: ${baseline.length}`);

  // (b) createTentative for a fake slot next Monday 12:00-13:00 Kyiv.
  console.log("\n--- (b) createTentative (fake slot, next Monday 12:00-13:00 Kyiv) ---");
  const slot = nextMondayNoonToOnePmKyiv();
  console.log(`[smoke] slot (UTC): ${slot.start} .. ${slot.end}`);
  const { result: created, ms: createMs } = await timed("createTentative", () =>
    port.createTentative(slot, "[Kamerton smoke] tentative hold", "Created by packages/calendar smoke.mjs — safe to ignore/delete."),
  );
  console.log(`[smoke] created eventId=${created.eventId} (${createMs}ms)`);

  // (c) freeBusy again — the new event should now appear as busy.
  console.log("\n--- (c) freeBusy after create — verify the new event is busy ---");
  const { result: afterCreate, ms: afterCreateMs } = await timed("freeBusy after create", () => port.freeBusy(range));
  console.log(`[smoke] before=${baseline.length} after=${afterCreate.length} (${afterCreateMs}ms)`);
  if (afterCreate.length <= baseline.length) {
    console.error(
      "[smoke] WARNING: busy-interval count did not increase after createTentative — tentative event may not be blocking freeBusy as expected",
    );
  }

  // (d) deleteEvent.
  console.log("\n--- (d) deleteEvent (cleanup) ---");
  const { ms: deleteMs } = await timed("deleteEvent", () => port.deleteEvent(created.eventId));
  console.log(`[smoke] deleted eventId=${created.eventId} (${deleteMs}ms)`);

  // (e) freeBusy once more — count should return to baseline.
  console.log("\n--- (e) freeBusy after delete — verify count returns to baseline ---");
  const { result: afterDelete, ms: afterDeleteMs } = await timed("freeBusy after delete", () => port.freeBusy(range));
  console.log(`[smoke] baseline=${baseline.length} afterDelete=${afterDelete.length} (${afterDeleteMs}ms)`);
  if (afterDelete.length !== baseline.length) {
    console.error(
      `[smoke] WARNING: post-delete busy count (${afterDelete.length}) does not match baseline (${baseline.length})`,
    );
    process.exitCode = 1;
    return;
  }

  console.log("\n=== SMOKE PASSED: freeBusy round-trip + tentative create/delete verified live ===");
}

main().catch((error) => {
  console.error(`\n=== SMOKE FAILED: ${errorClass(error)}: ${error.message} ===`);
  if (error.cause) {
    // Log the cause's message/shape only — never dump full SDK error
    // objects, which can carry request headers/credentials.
    console.error(`  cause: ${error.cause?.message ?? String(error.cause)}`);
  }
  process.exitCode = 1;
});
