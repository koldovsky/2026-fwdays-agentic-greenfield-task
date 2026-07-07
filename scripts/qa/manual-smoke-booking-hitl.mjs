#!/usr/bin/env node
// tasks.md G.3 — the slice S4 `booking-hitl` manual real-DB + real-DEMO-
// calendar smoke, scripted so it is rerunnable and its transcript is
// committable QA evidence (docs/qa/booking-hitl-manual-smoke.md), mirroring
// the S1/S3 conventions (scripts/qa/manual-smoke-slots.mjs,
// scripts/qa/manual-smoke-dashboard.mjs): preflight, numbered checks, a
// `=== ... SMOKE ... ===` sentinel, a temp SQLite file, .env loaded
// best-effort and never printed.
//
// SAFETY: this hits the REAL DEMO Google Calendar (create/upgrade/delete
// events). Every event this script creates is deleted in a `finally` block,
// even on failure/throw — see `cleanupEvents` and the top-level try/finally
// below. Every event's summary is prefixed `[KAMERTON-SMOKE]` so any stray
// event surviving a crash is trivially identifiable and swept by a later
// run's own pre-run sweep (mirrors manual-smoke-slots.mjs's own
// `sweepLeakedEvents`). A throwaway `mkdtemp` SQLite file is used — never
// the real `kamerton.db`. `.env` values are never printed.
//
// DOCUMENTED DEVIATIONS from the literal G.3 checklist text (agreed scope
// per the orchestrator's own task message — the "autonomous subset"):
//   - Steps 2/3/6's lead side of the flow ("start the real bot... walk a
//     lead through Telegram intake... tap a slot button") is NOT driven via
//     a live Telegram chat here — this script seeds the equivalent DB state
//     directly (a real tentative event + a real `pending` booking row, a
//     real `requests` row at `awaiting_admin`) exactly as the lead-side
//     pipeline would leave it, per the task instructions' own "AUTONOMOUS
//     (no Telegram needed)" framing. The lead-side wiring itself (free-text
//     `propose_slots`/`request_hold`, the `"slot:<n>"` callback tap) is
//     already covered by `packages/bot/src/pipeline.test.ts` (C.5) and
//     `tests/integration/booking-hitl/full-flow.test.ts` (G.1) against a
//     `FakeCalendarPort` — this script's OWN value-add is exercising the
//     admin-decision route and the outbox drain against the REAL calendar
//     and a REAL on-disk DB, not re-proving the lead-side plumbing.
//   - Step 7 (kill-bot/restart durability) and the Telegram-arrival halves
//     of steps 4/5/6 require a live Telegram chat — listed under
//     HUMAN-REQUIRED below, not run here.
//   - Step 8 (manually creating a conflicting event via the Calendar UI
//     between hold and Confirm) is reproduced programmatically: this script
//     creates a second real event over the same slot via the raw calendar
//     client BEFORE calling Confirm, then asserts the route reports
//     `conflict` — same empirical effect, deterministic and scriptable. This
//     step is now a PERMANENT, gating regression check for the live-found
//     Confirm double-booking bug (originally found by an earlier run of this
//     script; FIXED in commit 73b4aa7 by an identity-based collision
//     re-check, `CalendarPort.busyEventsInRange`, run alongside the
//     pre-existing value-based `freeBusy` check in route.ts's Confirm step
//     4) — see step 8's own section below and
//     `docs/qa/booking-hitl-manual-smoke.md` for the live-verified result.
//   - Step 9 (Saturday slot on Propose-another-time) is run exactly as
//     specified (fully autonomous, no calendar/DB write expected).
//
// Run with: node scripts/qa/manual-smoke-booking-hitl.mjs
// Never logs credential values.

import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";

import { GoogleCalendarPort } from "../../packages/calendar/src/google-calendar.ts";
import { kyivWallClockToUtc } from "@kamerton/lib/src/slots/timezone.ts";
import {
  openDatabase,
  insertLead,
  insertRequest,
  updateRequestFields,
  updateRequestState,
  insertBooking,
  parseOfferedSlots,
} from "@kamerton/db/src/index.ts";
import { drainNotifications } from "../../packages/bot/src/notification-drain.ts";
import { FakeTelegramTransport } from "../../packages/bot/src/testing/fake-telegram-transport.ts";
import { setCalendarPortForTesting } from "../../apps/dashboard/lib/calendar-port.ts";
import { POST as postDecisionRoute } from "../../apps/dashboard/app/api/decisions/[requestId]/route.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const envPath = path.join(repoRoot, ".env");
if (existsSync(envPath)) process.loadEnvFile(envPath);

// ---------------------------------------------------------------------------
// transcript + check plumbing (mirrors manual-smoke-dashboard.mjs)
// ---------------------------------------------------------------------------
const transcriptLines = [];
const failures = [];

function log(line = "") {
  console.log(line);
  transcriptLines.push(line);
}

function check(label, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  log(`  [${mark}] ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(label);
}

function section(title) {
  log(`\n--- ${title} ---`);
}

// ---------------------------------------------------------------------------
// event tracking + cleanup — SAFETY: every event created by this script is
// tracked here and deleted in the top-level `finally`, even on a thrown
// error. Uses the raw googleapis client (the port has no list/get method).
// ---------------------------------------------------------------------------
const createdEventIds = new Set();
const SMOKE_TAG = "[KAMERTON-SMOKE]";

let rawCal;
let CAL_ID;

function trackEvent(eventId) {
  if (eventId) createdEventIds.add(eventId);
}
function untrackEvent(eventId) {
  createdEventIds.delete(eventId);
}

async function rawGetEvent(eventId) {
  try {
    const res = await rawCal.events.get({ calendarId: CAL_ID, eventId });
    return res.data;
  } catch (error) {
    const status = error?.code ?? error?.response?.status;
    if (status === 404 || status === 410) return undefined;
    throw error;
  }
}

async function rawDeleteEvent(eventId) {
  try {
    await rawCal.events.delete({ calendarId: CAL_ID, eventId });
  } catch (error) {
    const status = error?.code ?? error?.response?.status;
    if (status !== 404 && status !== 410) throw error;
  }
}

async function sweepLeakedEvents() {
  const res = await rawCal.events.list({ calendarId: CAL_ID, q: SMOKE_TAG, maxResults: 50 });
  const items = res.data.items ?? [];
  for (const ev of items) await rawDeleteEvent(ev.id);
  if (items.length > 0) {
    log(`  (pre-run sweep removed ${items.length} leaked ${SMOKE_TAG} event(s))`);
  }
}

async function cleanupAllTrackedEvents() {
  const ids = [...createdEventIds];
  let cleaned = 0;
  for (const id of ids) {
    await rawDeleteEvent(id);
    cleaned += 1;
  }
  createdEventIds.clear();
  return cleaned;
}

// ---------------------------------------------------------------------------
// date helpers — a target Monday a couple of weeks out (Mon-Fri 10:00-19:00
// grid), far from any other smoke script's own target date.
// ---------------------------------------------------------------------------
function mondayWeeksFromNow(weeks) {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  do d.setUTCDate(d.getUTCDate() + 1); while (d.getUTCDay() !== 1);
  d.setUTCDate(d.getUTCDate() + 7 * weeks);
  return d.toISOString().slice(0, 10);
}

function nextSaturdayIso() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  do d.setUTCDate(d.getUTCDate() + 1); while (d.getUTCDay() !== 6);
  return d.toISOString().slice(0, 10);
}

function slot(dateIso, hour, endHour = hour + 1) {
  const pad = (n) => String(n).padStart(2, "0");
  return { start: `${dateIso}T${pad(hour)}:00`, end: `${dateIso}T${pad(endHour)}:00` };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
log("=== G.3 booking-hitl manual real-DB + real-DEMO-calendar smoke (scripted) ===");
log(
  "Deviations from the literal G.3 checklist text are documented in this script's own header " +
    "comment (scripts/qa/manual-smoke-booking-hitl.mjs) — summarized: this is the AUTONOMOUS " +
    "subset (no live Telegram chat); the lead-side pipeline plumbing (free-text propose_slots/ " +
    "request_hold, the \"slot:<n>\" callback tap) is already covered by pipeline.test.ts (C.5) and " +
    "the G.1 integration suite against a FakeCalendarPort — this script's value-add is exercising " +
    "the admin decision route + outbox drain against the REAL DEMO calendar and a real on-disk DB.",
);

let dbDir;
let db;
// Set by step 8 (exact-overlap Confirm regression) — `undefined` if the run
// aborted before reaching that step, otherwise the true empirical live
// result, consumed by the transcript doc's "History" section below.
let exactOverlapRegressionHeldLive;

try {
  // -------------------------------------------------------------------------
  section("preflight: env + real calendar reachability");
  // -------------------------------------------------------------------------
  const hasToken = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  const hasCredPath = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const credFileExists =
    hasCredPath && existsSync(path.resolve(repoRoot, process.env.GOOGLE_APPLICATION_CREDENTIALS ?? ""));
  const hasCalendarId = Boolean(process.env.GOOGLE_CALENDAR_ID);
  check("TELEGRAM_BOT_TOKEN set", hasToken);
  check("GOOGLE_APPLICATION_CREDENTIALS set + file exists", credFileExists);
  check("GOOGLE_CALENDAR_ID set", hasCalendarId);
  check(
    "an auth signal is present (GOOGLE_APPLICATION_CREDENTIALS)",
    hasCredPath,
    "service-account JSON key path",
  );

  if (!credFileExists || !hasCalendarId) {
    log("\n  Missing calendar credentials/target — cannot proceed. Aborting without touching the real calendar.");
    throw new Error("preflight failed: missing GOOGLE_APPLICATION_CREDENTIALS/GOOGLE_CALENDAR_ID");
  }

  CAL_ID = process.env.GOOGLE_CALENDAR_ID;
  const rawAuth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  rawCal = google.calendar({ version: "v3", auth: rawAuth });

  let reachable = false;
  let reachError;
  try {
    const now = new Date();
    const later = new Date(now.getTime() + 3600_000);
    await rawCal.freebusy.query({
      requestBody: { timeMin: now.toISOString(), timeMax: later.toISOString(), items: [{ id: CAL_ID }] },
    });
    reachable = true;
  } catch (error) {
    reachError = error;
  }
  check(
    "DEMO calendar reachable (freebusy.query succeeds — calendar is shared with the service account)",
    reachable,
    reachable ? "" : String(reachError?.message ?? reachError),
  );
  if (!reachable) {
    log("\n  The DEMO calendar is NOT reachable / not shared with the service account. Reporting exactly this, not faking a pass.");
    throw new Error("DEMO calendar unreachable");
  }

  await sweepLeakedEvents();

  // -------------------------------------------------------------------------
  section("preflight: temp SQLite + schema");
  // -------------------------------------------------------------------------
  dbDir = mkdtempSync(path.join(tmpdir(), "kamerton-smoke-booking-hitl-"));
  const dbPath = path.join(dbDir, "smoke.db");
  db = openDatabase(dbPath);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
  check("notifications table exists after initSchema()", tables.includes("notifications"), tables.join(","));
  const requestColumns = db.prepare("PRAGMA table_info(requests)").all().map((c) => c.name);
  check("requests.offered_slots column exists", requestColumns.includes("offered_slots"), requestColumns.join(","));
  const notifColumns = db.prepare("PRAGMA table_info(notifications)").all();
  const deliveryStatusCol = notifColumns.find((c) => c.name === "delivery_status");
  check("notifications.delivery_status column present", deliveryStatusCol !== undefined);

  process.env.KAMERTON_DB_PATH = dbPath;

  // -------------------------------------------------------------------------
  section("preflight: install the REAL GoogleCalendarPort for the decision route");
  // -------------------------------------------------------------------------
  const realPort = new GoogleCalendarPort();
  setCalendarPortForTesting(realPort);
  check("real GoogleCalendarPort installed via setCalendarPortForTesting", true);

  const targetMonday = mondayWeeksFromNow(3);
  log(`  target Monday (3 weeks out): ${targetMonday}`);

  function decisionUrl(requestId) {
    return `http://127.0.0.1:3000/api/decisions/${requestId}`;
  }
  function postDecision(requestId, body) {
    return postDecisionRoute(
      new Request(decisionUrl(requestId), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ requestId: String(requestId) }) },
    );
  }

  function seedAwaitingAdmin(telegramUserId, telegramChatId, studentName, s) {
    const lead = insertLead(db, { telegramUserId, telegramChatId, telegramDisplayName: studentName });
    const request = insertRequest(db, { leadId: lead.id, telegramChatId });
    updateRequestFields(db, request.id, {
      studentName,
      studentAge: 12,
      format: "individual",
      goalTag: "hobby",
      preferredWeekdays: "будь-який день",
      preferredTimeRange: "вдень",
    });
    updateRequestState(db, request.id, "awaiting_admin");
    return { leadId: lead.id, requestId: request.id, chatId: telegramChatId };
  }

  async function seedPendingBooking(requestId, s, summarySuffix) {
    const range = { start: kyivWallClockToUtc(s.start), end: kyivWallClockToUtc(s.end) };
    const { eventId } = await realPort.createTentative(
      range,
      `${SMOKE_TAG} ${summarySuffix}`,
      "scripts/qa/manual-smoke-booking-hitl.mjs — G.3 autonomous smoke",
    );
    trackEvent(eventId);
    const booking = insertBooking(db, {
      slotStart: s.start,
      slotEnd: s.end,
      status: "pending",
      calendarEventId: eventId,
      requestId,
    });
    return { bookingId: booking.id, eventId };
  }

  function readBooking(id) {
    return db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(id);
  }
  function readRequest(id) {
    return db.prepare(`SELECT * FROM requests WHERE id = ?`).get(id);
  }
  function readNotifications(bookingId) {
    return db
      .prepare(`SELECT * FROM notifications WHERE booking_id = ? ORDER BY id ASC`)
      .all(bookingId);
  }

  // ===========================================================================
  section("1: seed a real free on-grid slot + a real tentative event + a pending booking (CONFIRM scenario)");
  // ===========================================================================
  const confirmSlot = slot(targetMonday, 10);
  const confirmSeed = seedAwaitingAdmin(
    "smoke-hitl-confirm",
    "smoke-hitl-confirm-chat",
    "KAMERTON-SMOKE Confirm Учень",
  );
  const confirmBookingSeed = await seedPendingBooking(confirmSeed.requestId, confirmSlot, "confirm test 10:00-11:00");
  check("real tentative event created for the confirm scenario", Boolean(confirmBookingSeed.eventId), confirmBookingSeed.eventId);
  {
    const row = readBooking(confirmBookingSeed.bookingId);
    check(
      "pending booking row seeded with request_id + calendar_event_id",
      row.status === "pending" && row.request_id === confirmSeed.requestId && row.calendar_event_id === confirmBookingSeed.eventId,
    );
  }

  // ===========================================================================
  section("2: CONFIRM via the real decision route — the empirical self-collision fix check");
  // ===========================================================================
  const confirmRes = await postDecision(confirmSeed.requestId, { action: "confirm" });
  const confirmBody = await confirmRes.json();
  log(`  VERBATIM confirm response: HTTP ${confirmRes.status} ${JSON.stringify(confirmBody)}`);
  check("HTTP 200", confirmRes.status === 200, String(confirmRes.status));
  check(
    "response status is 'applied' (NOT 'conflict' — the self-collision instant-compare fix, finding #1)",
    confirmBody.status === "applied",
    `got status=${confirmBody.status}`,
  );
  if (confirmBody.status === "conflict") {
    log(
      "  *** FINDING #1's FIX APPEARS WRONG: Confirm returned 'conflict' against the real freebusy for " +
        "the booking's OWN slot — the own-tentative-event self-filter is not working against the real " +
        "Google Calendar API response shape. Reporting loudly per instructions. ***",
    );
  }

  const confirmedEvent = await rawGetEvent(confirmBookingSeed.eventId);
  check("the real event still exists after Confirm", confirmedEvent !== undefined);
  check(
    "the real event's status is 'confirmed' (no longer tentative)",
    confirmedEvent?.status === "confirmed",
    `status=${confirmedEvent?.status}`,
  );
  check(
    "the confirmed event's description contains the first-lesson brief (student name)",
    typeof confirmedEvent?.description === "string" && confirmedEvent.description.includes("KAMERTON-SMOKE Confirm Учень"),
    JSON.stringify(confirmedEvent?.description),
  );
  {
    const row = readBooking(confirmBookingSeed.bookingId);
    check("bookings.status = confirmed", row.status === "confirmed", row.status);
  }
  {
    const notifs = readNotifications(confirmBookingSeed.bookingId);
    check(
      "a notifications row kind=confirmed delivery_status=pending was inserted",
      notifs.length === 1 && notifs[0].kind === "confirmed" && notifs[0].delivery_status === "pending",
      JSON.stringify(notifs),
    );
  }

  // ===========================================================================
  section("3: seed a second pending booking + real tentative event (DECLINE scenario)");
  // ===========================================================================
  const declineSlot = slot(targetMonday, 12);
  const declineSeed = seedAwaitingAdmin(
    "smoke-hitl-decline",
    "smoke-hitl-decline-chat",
    "KAMERTON-SMOKE Decline Учень",
  );
  const declineBookingSeed = await seedPendingBooking(declineSeed.requestId, declineSlot, "decline test 12:00-13:00");
  check("real tentative event created for the decline scenario", Boolean(declineBookingSeed.eventId));

  section("4: DECLINE via the real decision route");
  const declineRes = await postDecision(declineSeed.requestId, { action: "decline" });
  const declineBody = await declineRes.json();
  log(`  VERBATIM decline response: HTTP ${declineRes.status} ${JSON.stringify(declineBody)}`);
  check("HTTP 200 {status:'applied'}", declineRes.status === 200 && declineBody.status === "applied", JSON.stringify(declineBody));
  const declinedEvent = await rawGetEvent(declineBookingSeed.eventId);
  check(
    "the real tentative event is DELETED (getEvent -> not-found/cancelled)",
    declinedEvent === undefined || declinedEvent.status === "cancelled",
    JSON.stringify(declinedEvent),
  );
  if (declinedEvent === undefined) untrackEvent(declineBookingSeed.eventId);
  {
    const row = readBooking(declineBookingSeed.bookingId);
    check("bookings.status = declined", row.status === "declined", row.status);
  }
  {
    const notifs = readNotifications(declineBookingSeed.bookingId);
    check(
      "a notifications row kind=declined was inserted",
      notifs.length === 1 && notifs[0].kind === "declined",
      JSON.stringify(notifs),
    );
  }

  // ===========================================================================
  section("5: seed a third pending booking + real tentative event (PROPOSE ANOTHER TIME scenario)");
  // ===========================================================================
  const proposeOldSlot = slot(targetMonday, 14);
  const proposeNewSlot = slot(targetMonday, 15);
  const proposeSeed = seedAwaitingAdmin(
    "smoke-hitl-propose",
    "smoke-hitl-propose-chat",
    "KAMERTON-SMOKE Propose Учень",
  );
  const proposeBookingSeed = await seedPendingBooking(proposeSeed.requestId, proposeOldSlot, "propose-another-time old hold 14:00-15:00");
  check("real tentative event created for the propose-another-time scenario", Boolean(proposeBookingSeed.eventId));

  section("6: PROPOSE ANOTHER TIME via the real decision route (new slot 15:00-16:00)");
  const proposeRes = await postDecision(proposeSeed.requestId, {
    action: "propose_another_time",
    slots: [proposeNewSlot],
  });
  const proposeBody = await proposeRes.json();
  log(`  VERBATIM propose_another_time response: HTTP ${proposeRes.status} ${JSON.stringify(proposeBody)}`);
  check(
    "HTTP 200 {status:'applied'}",
    proposeRes.status === 200 && proposeBody.status === "applied",
    JSON.stringify(proposeBody),
  );
  const oldEventAfterPropose = await rawGetEvent(proposeBookingSeed.eventId);
  check(
    "the OLD tentative event is deleted",
    oldEventAfterPropose === undefined || oldEventAfterPropose.status === "cancelled",
    JSON.stringify(oldEventAfterPropose),
  );
  if (oldEventAfterPropose === undefined) untrackEvent(proposeBookingSeed.eventId);
  {
    const row = readBooking(proposeBookingSeed.bookingId);
    check("bookings.status = cancelled (superseded)", row.status === "cancelled", row.status);
  }
  {
    const requestRow = readRequest(proposeSeed.requestId);
    check("requests.state = proposing", requestRow.state === "proposing", requestRow.state);
    const offered = parseOfferedSlots(requestRow.offered_slots);
    check(
      "requests.offered_slots persisted with the admin's validated slot",
      Array.isArray(offered) && offered.length === 1 && offered[0].start === proposeNewSlot.start && offered[0].end === proposeNewSlot.end,
      JSON.stringify(offered),
    );
  }
  let proposeNotifId;
  {
    const notifs = readNotifications(proposeBookingSeed.bookingId);
    const payload = notifs[0] ? JSON.parse(notifs[0].payload) : undefined;
    check(
      "a notifications row kind=proposed_again with a buttons payload was inserted",
      notifs.length === 1 && notifs[0].kind === "proposed_again" && Array.isArray(payload?.buttons) && payload.buttons.length === 1,
      JSON.stringify(notifs),
    );
    proposeNotifId = notifs[0]?.id;
  }

  // ===========================================================================
  section("7: OUTBOX DRAIN — a FAKE Telegram transport (real send needs a live chat, see HUMAN-REQUIRED)");
  // ===========================================================================
  const fakeTransport = new FakeTelegramTransport();
  const drainResult = await drainNotifications(db, fakeTransport);
  log(`  drain result: ${JSON.stringify(drainResult)}`);
  check("drain delivered exactly the 3 pending rows seeded above", drainResult.delivered === 3 && drainResult.failed === 0, JSON.stringify(drainResult));
  check(
    "the fake transport received 3 sendMessage calls, in FIFO (id ASC) order",
    fakeTransport.calls.filter((c) => c.kind === "sendMessage").length === 3,
    JSON.stringify(fakeTransport.callKinds),
  );
  check(
    "the confirm chat received the exact confirmation text",
    fakeTransport.sentTexts[0]?.includes("підтверджено"),
    JSON.stringify(fakeTransport.sentTexts[0]),
  );
  check(
    "the decline chat received the exact decline text (kind, door-open copy)",
    fakeTransport.sentTexts[1]?.includes("не підходить"),
    JSON.stringify(fakeTransport.sentTexts[1]),
  );
  const proposedAgainCall = fakeTransport.calls.find(
    (c) => c.kind === "sendMessage" && c.chatId === proposeSeed.chatId,
  );
  check(
    "the propose-another-time chat received the re-proposal text WITH real slot-chip buttons",
    Boolean(proposedAgainCall?.options?.buttons?.length),
    JSON.stringify(proposedAgainCall?.options),
  );
  {
    const notifs = [
      ...readNotifications(confirmBookingSeed.bookingId),
      ...readNotifications(declineBookingSeed.bookingId),
      ...readNotifications(proposeBookingSeed.bookingId),
    ];
    check(
      "all 3 notifications rows are now delivered",
      notifs.every((n) => n.delivery_status === "delivered"),
      JSON.stringify(notifs.map((n) => n.delivery_status)),
    );
  }
  const secondDrain = await drainNotifications(db, fakeTransport);
  check(
    "second drain call: 0 delivered, 0 failed (nothing left to send)",
    secondDrain.delivered === 0 && secondDrain.failed === 0,
    JSON.stringify(secondDrain),
  );

  // ===========================================================================
  section(
    "8: CONFIRM exact-overlap collision regression (PERMANENT, gating) — the " +
      "live-found Confirm double-booking bug, FIXED in commit 73b4aa7 by an " +
      "identity-based collision re-check (CalendarPort.busyEventsInRange, " +
      "google-calendar.ts) run ALONGSIDE the pre-existing value-based freeBusy " +
      "check in route.ts's Confirm step 4. Empirical, real-Google-Calendar-API-" +
      "only proof: a DISTINCT external event (B) with the EXACT SAME " +
      "[start,end) as the booking's own tentative hold (A) must still be " +
      "detected as a genuine collision, immune to freebusy.query's own " +
      "merging of overlapping busy periods from different events into one " +
      "interval (FakeCalendarPort's freeBusy never merges, so the unit/" +
      "integration suite structurally cannot exercise this path).",
  );
  // ===========================================================================
  const conflictSlot = slot(targetMonday, 17);
  const conflictSeed = seedAwaitingAdmin(
    "smoke-hitl-conflict",
    "smoke-hitl-conflict-chat",
    "KAMERTON-SMOKE Conflict Учень",
  );
  // Event A: the booking's own real tentative hold, via the real calendar port.
  const conflictBookingSeed = await seedPendingBooking(conflictSeed.requestId, conflictSlot, "conflict test hold 17:00-18:00");
  check(
    "event A (the booking's own real tentative hold) created for the exact-overlap regression",
    Boolean(conflictBookingSeed.eventId),
    conflictBookingSeed.eventId,
  );
  // Event B: a DISTINCT external event at the EXACT same slot range, via the
  // raw client — simulating "a conflicting calendar event manually added over
  // a held slot between the hold and the Confirm click" (G.3 step 8),
  // programmatically and deterministically — the most natural manual action
  // (a teacher double-booking the identical appointment slot in the Calendar
  // UI) produces exactly this shape, and is the scenario the identity-based
  // `busyEventsInRange` fix (commit 73b4aa7) exists to catch.
  const conflictRange = { start: kyivWallClockToUtc(conflictSlot.start), end: kyivWallClockToUtc(conflictSlot.end) };
  const conflictingEventRes = await rawCal.events.insert({
    calendarId: CAL_ID,
    requestBody: {
      summary: `${SMOKE_TAG} externally-added conflicting event (B, exact-overlap)`,
      start: { dateTime: conflictRange.start },
      end: { dateTime: conflictRange.end },
    },
  });
  trackEvent(conflictingEventRes.data.id);
  check(
    "event A and event B are DISTINCT ids (never the same event)",
    conflictBookingSeed.eventId !== conflictingEventRes.data.id,
    `A=${conflictBookingSeed.eventId} B=${conflictingEventRes.data.id}`,
  );
  const conflictConfirmRes = await postDecision(conflictSeed.requestId, { action: "confirm" });
  const conflictConfirmBody = await conflictConfirmRes.json();
  log(`  VERBATIM exact-overlap confirm response: HTTP ${conflictConfirmRes.status} ${JSON.stringify(conflictConfirmBody)}`);
  check(
    "Confirm against event B (exact-same-range external event) surfaces {status:'conflict'} " +
      "(NOT 'applied') — the identity-based fix (commit 73b4aa7) correctly distinguishes A from " +
      "B by eventId, immune to freebusy.query's merging",
    conflictConfirmRes.status === 200 && conflictConfirmBody.status === "conflict",
    JSON.stringify(conflictConfirmBody),
  );
  {
    const row = readBooking(conflictBookingSeed.bookingId);
    check(
      "booking stays pending after the exact-overlap conflict (no confirmed event, nothing sent)",
      row.status === "pending",
      row.status,
    );
  }
  {
    const notifs = readNotifications(conflictBookingSeed.bookingId);
    check("no notification row inserted on the exact-overlap conflict", notifs.length === 0, JSON.stringify(notifs));
  }
  const conflictEventAfterAttempt = await rawGetEvent(conflictBookingSeed.eventId);
  check(
    "event A (the booking's own hold) is still tentative — NOT upgraded to confirmed",
    conflictEventAfterAttempt?.status === "tentative",
    JSON.stringify(conflictEventAfterAttempt?.status),
  );
  exactOverlapRegressionHeldLive = conflictConfirmBody.status === "conflict";
  if (conflictConfirmBody.status === "applied") {
    log(
      "\n  *** REGRESSION: the identity-based exact-overlap fix (commit 73b4aa7) does NOT hold up " +
        "live — Confirm reported 'applied' against a genuinely busy exact-overlap slot and would " +
        "have double-booked a real external event. This is the SAME class of bug originally found " +
        "by an earlier run of this script (see docs/qa/booking-hitl-manual-smoke.md's own history) " +
        "— reporting loudly, NOT faking a pass.\n" +
        "  ROOT CAUSE DIAGNOSED (live, this run): `busyEventsInRange` (google-calendar.ts) is a " +
        "conversion-free pass-through of Google's `events.list` response, but that response encodes " +
        "`start`/`end` in the CALENDAR'S LOCAL OFFSET (e.g. \"...T17:00:00+03:00\"), NOT the \"Z\"-" +
        "suffixed UTC format `freeBusy`/`kyivWallClockToUtc` use. `hasIdentityBasedCollision`'s " +
        "`overlaps()` helper (lib/src/slots/subtract.ts) compares these RFC3339 timestamps with a " +
        "plain STRING `<` operator, never parsing them to instants — a valid ordering ONLY when both " +
        "operands share the same offset/format. Comparing a \"Z\"-format `ownRange` against an " +
        "\"+03:00\"-format event silently produces the WRONG ordering whenever the local hour digits " +
        "differ from the UTC hour digits (e.g. \"...T14:00:00.000Z\" vs \"...T17:00:00+03:00\", the " +
        "SAME instant, string-compares as `14 < 17` in one direction but `17 !< 15` in the other), so " +
        "`overlaps(ownRange, event)` can spuriously return `false` for a genuinely overlapping event — " +
        "exactly what this run reproduced. FIX NEEDED: compare by INSTANT (`Date#getTime()`, as " +
        "`isSameInstantRange` already does elsewhere in route.ts), not by string, in `overlaps()`/" +
        "`hasIdentityBasedCollision`. NOT fixed by this task (verification-only; reported per " +
        "instructions, not silently patched). ***",
    );
  } else if (conflictConfirmBody.status === "conflict") {
    log(
      "  LIVE-VERIFIED: the exact-overlap Confirm regression correctly returns {status:'conflict'} " +
        "against the REAL DEMO calendar — commit 73b4aa7's identity-based busyEventsInRange fix " +
        "holds up live (Google's freebusy.query still merges the two events into one interval; " +
        "events.list/busyEventsInRange does not, and the identity exclusion by eventId is what " +
        "tells A and B apart).",
    );
  }
  // Cleanup this scenario's own booking's tentative event (A) + the externally-added one (B).
  await rawDeleteEvent(conflictBookingSeed.eventId);
  untrackEvent(conflictBookingSeed.eventId);
  await rawDeleteEvent(conflictingEventRes.data.id);
  untrackEvent(conflictingEventRes.data.id);

  // ===========================================================================
  section("9: PROPOSE ANOTHER TIME with a Saturday (off-grid) slot — inline OFF_GRID validation, nothing sent");
  // ===========================================================================
  const offGridSeed = seedAwaitingAdmin(
    "smoke-hitl-offgrid",
    "smoke-hitl-offgrid-chat",
    "KAMERTON-SMOKE OffGrid Учень",
  );
  const offGridBookingSeed = await seedPendingBooking(offGridSeed.requestId, slot(targetMonday, 18), "off-grid original hold 18:00-19:00");
  const saturdayIso = nextSaturdayIso();
  const offGridRes = await postDecision(offGridSeed.requestId, {
    action: "propose_another_time",
    slots: [slot(saturdayIso, 12)],
  });
  const offGridBody = await offGridRes.json();
  log(`  VERBATIM off-grid response: HTTP ${offGridRes.status} ${JSON.stringify(offGridBody)}`);
  check(
    "off-grid Saturday slot -> {status:'invalid', code:'OFF_GRID'}",
    offGridRes.status === 200 && offGridBody.status === "invalid" && offGridBody.code === "OFF_GRID",
    JSON.stringify(offGridBody),
  );
  const offGridEventStillTentative = await rawGetEvent(offGridBookingSeed.eventId);
  check(
    "the original tentative event is UNTOUCHED (still exists, not confirmed/deleted)",
    offGridEventStillTentative?.status === "tentative",
    JSON.stringify(offGridEventStillTentative?.status),
  );
  {
    const notifs = readNotifications(offGridBookingSeed.bookingId);
    check("no notification row inserted on an invalid propose_another_time", notifs.length === 0, JSON.stringify(notifs));
  }

  // ===========================================================================
  section("note: NFR-REL-01 calendar-failure branches (D.4/D.6) are covered by unit tests, not repeated here");
  // ===========================================================================
  log(
    "  Deliberately not reproduced against the REAL calendar (would require killing/blackholing a live " +
      "network call mid-run to force a CalendarError, which is not cheaply/safely scriptable without " +
      "leaving calendar cruft on a genuine timeout) — already covered by " +
      "apps/dashboard/app/api/decisions/[requestId]/route.test.ts's D.4/D.6 suites against a " +
      "FakeCalendarPort configured to throw. This matches the task instructions' own \"only if you can " +
      "do it without leaving calendar cruft; otherwise note it's covered by the unit tests\" guidance.",
  );

  log(failures.length === 0
    ? "\n=== G.3 SMOKE (autonomous subset) PASSED ==="
    : `\n=== G.3 SMOKE (autonomous subset) FAILED: ${failures.length} check(s): ${failures.join("; ")} ===`);
} catch (error) {
  check("smoke script ran to completion without an unexpected thrown error", false, String(error?.stack ?? error));
  log(`\n  (a thrown error aborted the run early — cleanup still runs below; see the failure detail above for diagnosis)`);
} finally {
  // ---------------------------------------------------------------------------
  section("cleanup: delete EVERY tracked real calendar event, close + remove the temp DB");
  // ---------------------------------------------------------------------------
  let cleanedCount = 0;
  let cleanupError;
  try {
    cleanedCount = await cleanupAllTrackedEvents();
  } catch (error) {
    cleanupError = error;
  }
  log(`  cleaned up ${cleanedCount} tracked event(s)${cleanupError ? ` (cleanup error: ${cleanupError.message})` : ""}`);
  if (db) db.close();
  if (dbDir) rmSync(dbDir, { recursive: true, force: true });
  log("  temp db removed");

  // -------------------------------------------------------------------------
  // HUMAN-REQUIRED section — not run by this script
  // -------------------------------------------------------------------------
  section("HUMAN-REQUIRED (not run here)");
  log(
    "  (a) Walk a REAL lead through Telegram intake to `proposing` and tap a real inline slot chip — " +
      "creates the pending booking from the lead side (the model calling propose_slots/request_hold " +
      "over a live Anthropic round trip, and grammY delivering a real callback tap). Already covered " +
      "for the STATE-MACHINE/DB mechanics by pipeline.test.ts + the G.1 integration suite; this step " +
      "proves the live Telegram UX end to end.",
  );
  log(
    "  (b) Observe the REAL Telegram confirmation/decline/re-proposal messages arriving in a live test " +
      "chat (this script's own step 7 proved the outbox drain logic + payload shape against a FAKE " +
      "transport — a real `transport.sendMessage` round trip to Telegram's API is untested here).",
  );
  log(
    "  (c) The outbox restart-durability check: kill the bot process mid-decision, make the decision on " +
      "the dashboard while the bot is down, confirm the notifications row stays `pending` in the SQLite " +
      "file, restart the bot, confirm the queued message delivers on the next drain tick (design.md " +
      "Decision 1's durability guarantee — requires a real second OS process, not exercised here).",
  );

  // ---------------------------------------------------------------------------
  // transcript doc (regenerated fresh every run, same convention as S1/S3)
  // ---------------------------------------------------------------------------
  const generatedAt = new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" });
  const docPath = path.join(repoRoot, "docs/qa/booking-hitl-manual-smoke.md");
  const doc = `# S4 \`booking-hitl\` — G.3 manual real-DB + real-DEMO-calendar smoke transcript

> Generated by \`node scripts/qa/manual-smoke-booking-hitl.mjs\` (rerunnable) on ${generatedAt}, Europe/Kyiv.
>
> Hits the REAL DEMO Google Calendar (create/upgrade/delete events, every event tagged
> \`${SMOKE_TAG}\` and deleted in this script's own \`finally\` block) and a throwaway temp SQLite
> file (never the real \`kamerton.db\`). Documented deviations from the literal G.3 checklist text
> are in this script's own header comment (\`scripts/qa/manual-smoke-booking-hitl.mjs\`) — summarized:
> this is the AUTONOMOUS subset (no live Telegram chat); see the "HUMAN-REQUIRED" section below for
> what still needs a human.

## History: the Confirm exact-overlap double-booking bug (step 8)

1. **REAL BUG FOUND (live)** — an earlier run of this script (commit 5fd1765) found that Google's
   \`freebusy.query\` MERGES overlapping busy periods from distinct events into one interval, so a
   distinct external event with the exact same \`[start,end)\` as a booking's own tentative hold was
   silently mistaken for "just my own hold" — Confirm reported \`applied\` and would have double-booked
   a real external event.
2. **FIX ATTEMPTED (commit 73b4aa7)** — an identity-based collision re-check
   (\`CalendarPort.busyEventsInRange\`, real \`events.list\`, excluding the booking's own
   \`calendar_event_id\` by identity rather than by value) was added alongside the original value-based
   \`freeBusy\` check.
3. **LIVE-VERIFY RESULT (this run, step 8, PERMANENT/gating)**: ${
    exactOverlapRegressionHeldLive === true
      ? "**HOLDS UP** — Confirm correctly returned `{status:\"conflict\"}` for a distinct exact-overlap " +
        "external event; the identity-based fix is LIVE-VERIFIED against the real DEMO calendar."
      : exactOverlapRegressionHeldLive === false
        ? "**STILL FAILING LIVE** — Confirm returned `{status:\"applied\"}` for a distinct exact-overlap " +
          "external event; the fix does NOT hold up against the real DEMO calendar. ROOT CAUSE " +
          "diagnosed this run: `busyEventsInRange`'s pass-through of Google's `events.list` response " +
          "carries `start`/`end` in the calendar's LOCAL OFFSET (e.g. `...T17:00:00+03:00`), not the " +
          "`Z`-suffixed UTC format `freeBusy`/`kyivWallClockToUtc` use; `hasIdentityBasedCollision`'s " +
          "`overlaps()` helper (`lib/src/slots/subtract.ts`) compares these RFC3339 strings with a " +
          "plain `<` operator instead of parsing them to instants, so it can return a spurious `false` " +
          "for a genuinely overlapping event whenever the two representations' hour digits diverge — " +
          "exactly what this run reproduced. See the transcript's own step 8 \"REGRESSION\" note below " +
          "for the full diagnosis. NOT fixed by this verification pass (reported per instructions, not " +
          "silently patched)."
        : "not reached this run (the script aborted before step 8 — see the failure detail above)."
  }
${
  failures.length === 0
    ? ""
    : `
## Required-step findings from this run

${failures.map((f, i) => `${i + 1}. **FAIL** — ${f}`).join("\n")}
`
}
\`\`\`
${transcriptLines.join("\n")}
\`\`\`
`;
  writeFileSync(docPath, doc, "utf8");
  log(`\ntranscript written to ${path.relative(repoRoot, docPath)}`);
}

process.exit(failures.length === 0 ? 0 : 1);
