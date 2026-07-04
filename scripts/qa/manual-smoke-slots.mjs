#!/usr/bin/env node
// tasks.md 6.9 — the slice S1 manual real-DB smoke, scripted so it is
// rerunnable and its transcript is committable QA evidence
// (docs/qa/slots-manual-smoke.md).
//
// Documented deviations from the literal 6.9 text:
//  - step 4's busy event is created via the API (service account), not the
//    Google Calendar UI — "tomorrow" is also replaced by the next Monday,
//    because the smoke date may fall on a weekend and the grid is Mon-Fri;
//  - the visual UI confirmations/screenshots (steps 4/5b) are deferred to
//    the QA-proof stage (chrome-devtools MCP + logged-in browser).
//
// Run with: node scripts/qa/manual-smoke-slots.mjs
// Never logs credential values.

import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GoogleCalendarPort } from "../../packages/calendar/src/google-calendar.ts";
import { generateGrid } from "@kamerton/lib/src/slots/grid.ts";
import { subtractBusy } from "@kamerton/lib/src/slots/subtract.ts";
import { kyivWallClockToUtc } from "@kamerton/lib/src/slots/timezone.ts";
import {
  proposeSlots,
  holdWithRecovery,
  CALENDAR_UNAVAILABLE_APOLOGY,
} from "@kamerton/lib/src/slots/propose.ts";
import { releaseHold } from "@kamerton/lib/src/slots/hold.ts";
import {
  openDatabase,
  insertBooking,
  updateBookingStatus,
} from "@kamerton/db/src/index.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const envPath = path.join(repoRoot, ".env");
if (existsSync(envPath)) process.loadEnvFile(envPath);

const failures = [];
function check(label, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  console.log(`  [${mark}] ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(label);
}

function nextMondayDate() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  do d.setUTCDate(d.getUTCDate() + 1); while (d.getUTCDay() !== 1);
  return d.toISOString().slice(0, 10);
}

const monday = nextMondayDate();
console.log(`=== 6.9 manual real-DB smoke (scripted) — target Monday ${monday} ===`);

// safety net: sweep any [smoke-6.9] events leaked by a previously crashed
// run, so reruns are hermetic (same discipline as the integration suite).
// Uses the raw googleapis client (the port deliberately has no list op).
import { google } from "googleapis";
const rawAuth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ["https://www.googleapis.com/auth/calendar"],
});
const rawCal = google.calendar({ version: "v3", auth: rawAuth });
const CAL_ID = process.env.GOOGLE_CALENDAR_ID;
async function sweepLeakedEvents() {
  const res = await rawCal.events.list({ calendarId: CAL_ID, q: "[smoke-6.9]", maxResults: 50 });
  const items = res.data.items ?? [];
  for (const ev of items) await rawCal.events.delete({ calendarId: CAL_ID, eventId: ev.id });
  if (items.length > 0) console.log(`  (pre-run sweep removed ${items.length} leaked [smoke-6.9] event(s))`);
}
await sweepLeakedEvents();

// step 1 — env presence (values never printed)
console.log("\n--- step 1: env ---");
check("GOOGLE_CALENDAR_ID set", Boolean(process.env.GOOGLE_CALENDAR_ID));
check("GOOGLE_APPLICATION_CREDENTIALS set + file exists",
  Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS) &&
  existsSync(path.resolve(repoRoot, process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "")));

// step 2 — clean SQLite file + schema
console.log("\n--- step 2: clean SQLite + schema ---");
const dbDir = mkdtempSync(path.join(tmpdir(), "kamerton-smoke-"));
const dbPath = path.join(dbDir, "smoke.db");
const db = openDatabase(dbPath);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
check("bookings table created from clean file", tables.includes("bookings"), tables.join(","));

// step 3 — grid first day
console.log("\n--- step 3: grid, first day ---");
const grid = generateGrid(monday, 1);
const starts = grid.map((s) => s.start.slice(11));
console.log(`  first-day starts: ${starts.join(" ")}`);
check("10 slots, 10:00..19:00 hourly", starts.length === 10 && starts[0] === "10:00" && starts.at(-1) === "19:00");

// step 4 — external busy event 13:00-14:00 (API-created; UI deviation noted)
console.log("\n--- step 4: external busy 13:00-14:00 + subtraction ---");
const port = new GoogleCalendarPort();
const busyRange = {
  start: kyivWallClockToUtc(`${monday}T13:00`),
  end: kyivWallClockToUtc(`${monday}T14:00`),
};
const { eventId: busyEventId } = await port.createTentative(busyRange, "[smoke-6.9] teacher busy", "manual-smoke step 4");
// FR-SLOT-01 evidence — the FULL free pool via pure fns (grid minus busy):
const fullPool = subtractBusy(generateGrid(monday, 1), [
  { start: `${monday}T13:00`, end: `${monday}T14:00` },
]).map((s) => s.start.slice(11));
console.log(`  full free pool (grid - busy): ${fullPool.join(" ")}`);
check("full pool: 9 slots, 13:00 excluded, 12:00+14:00 kept",
  fullPool.length === 9 && !fullPool.includes("13:00") &&
  fullPool.includes("12:00") && fullPool.includes("14:00"));
// FR-SLOT-04 evidence — proposals are the ranked TOP-3 of that pool:
const proposal = await proposeSlots(port, {
  from: monday,
  days: 1,
  preferences: { weekdays: ["Mon"], timeWindow: { start: "10:00", end: "20:00" } },
});
if (proposal.status !== "ok") throw new Error("proposal failed: " + proposal.status);
const free = proposal.slots.map((s) => s.start.slice(11));
console.log(`  ranked top-3 proposals: ${free.join(" ")} (12:00/14:00 hug the busy block, 10:00 hugs the grid edge — teacher compactness)`);
check("proposals ≤3, none overlaps busy 13:00", free.length <= 3 && !free.includes("13:00"));
check("12:00 and 14:00 proposed (adjacency ranks them top)", free.includes("12:00") && free.includes("14:00"));

// step 5 — hold 12:00-13:00 → pending row + calendar event
console.log("\n--- step 5: hold + pending row ---");
const holdReq = {
  slot: { start: `${monday}T12:00`, end: `${monday}T13:00` },
  summary: "[smoke-6.9] hold — перше заняття (demo)",
  description: "manual-smoke step 5",
};
const hold = await holdWithRecovery(port, holdReq);
check("hold created", hold.status === "held", `status=${hold.status}`);
if (hold.status !== "held") throw new Error("cannot continue without a hold");
const row = insertBooking(db, {
  slotStart: holdReq.slot.start,
  slotEnd: holdReq.slot.end,
  status: "pending",
  calendarEventId: hold.eventId,
});
const bookingId = row.id;
check("pending row with calendar_event_id", row.status === "pending" && row.calendar_event_id === hold.eventId);
console.log("  (visual UI confirmation + screenshot deferred to QA-proof stage)");

// step 6 — second lead, same slot → collision, no second row
console.log("\n--- step 6: collision path ---");
const second = await holdWithRecovery(port, { ...holdReq, summary: "[smoke-6.9] second lead" });
check("second hold collides", second.status === "collision", `status=${second.status}`);
const pendingCount = db.prepare("SELECT COUNT(*) AS c FROM bookings WHERE status='pending'").get().c;
check("still exactly one pending row", pendingCount === 1, `count=${pendingCount}`);

// step 7 — cancel: release hold + row leaves pending
console.log("\n--- step 7: cancel path ---");
await releaseHold(port, hold.eventId);
updateBookingStatus(db, bookingId, "cancelled");
const pendingAfter = db.prepare("SELECT COUNT(*) AS c FROM bookings WHERE status='pending'").get().c;
check("no pending rows after cancel", pendingAfter === 0);
const afterCancel = await proposeSlots(port, {
  from: monday, days: 1,
  preferences: { weekdays: ["Mon"], timeWindow: { start: "10:00", end: "20:00" } },
});
check("12:00 free again after release",
  afterCancel.status === "ok" && afterCancel.slots.some((s) => s.start.endsWith("12:00")));

// step 8 — broken credentials → deterministic apology, no crash
console.log("\n--- step 8: outage path (broken key path, .env untouched) ---");
let unhandled = false;
const onUnhandled = () => { unhandled = true; };
process.on("unhandledRejection", onUnhandled);
const brokenPort = new GoogleCalendarPort({ keyFile: path.join(dbDir, "no-such-key.json") });
const outage = await proposeSlots(brokenPort, {
  from: monday, days: 1,
  preferences: { weekdays: ["Mon"], timeWindow: { start: "10:00", end: "20:00" } },
});
check("calendar_unavailable result", outage.status === "calendar_unavailable");
check("exact Ukrainian apology", outage.status === "calendar_unavailable" && outage.apology === CALENDAR_UNAVAILABLE_APOLOGY);
await new Promise((r) => setTimeout(r, 100));
process.off("unhandledRejection", onUnhandled);
check("no unhandled rejection", !unhandled);

// cleanup
console.log("\n--- cleanup ---");
await port.deleteEvent(busyEventId);
db.close();
rmSync(dbDir, { recursive: true, force: true });
console.log("  step-4 busy event deleted, temp db removed");

console.log(failures.length === 0
  ? "\n=== 6.9 SMOKE PASSED (all checks) ==="
  : `\n=== 6.9 SMOKE FAILED: ${failures.length} check(s): ${failures.join("; ")} ===`);
process.exit(failures.length === 0 ? 0 : 1);
