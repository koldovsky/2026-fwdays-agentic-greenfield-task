#!/usr/bin/env node
// tasks.md 8.11 — the slice S3 `dashboard` manual real-DB smoke, scripted so
// it is rerunnable and its transcript is committable QA evidence
// (docs/qa/dashboard-manual-smoke.md). Mirrors S2's
// scripts/qa/manual-smoke-intake.mjs house style: numbered steps, PASS/FAIL
// checks, a summary line, a temp DB under os.tmpdir cleaned up on exit.
//
// What this proves: the cross-process AG-UI bridge, end-to-end, deterministically
// — the REAL dashboard (`next start`) as a separate OS process, talking to the
// SAME on-disk SQLite file a "bot" driver (this script, in-process) writes to,
// bridged over a REAL HTTP POST (`HttpAguiPublisher` -> `/api/agui/ingest`)
// and a REAL SSE GET (`/api/agui/stream`) — not a mocked hub, not an
// in-process function call standing in for the network.
//
// Documented deviations from the literal 8.11 text (agreed with the
// orchestrator before this run — the same kind of documented, agreed
// deviation S1/S2's own smokes used, not hidden):
//  - 8.11 step 1's "start the real bot (`packages/bot`)" is replaced by this
//    script driving `handleUpdate()` (pipeline.ts) directly, in-process,
//    against a `FakeTelegramTransport` and a DETERMINISTIC scripted
//    `FakeModelPort` (`packages/agent/src/testing/fake-model-port.ts`) — NO
//    live Telegram chat, NO real Claude Agent SDK round trip. This keeps the
//    run free and deterministic; the real-model round trip is already
//    covered by S2's 6.9 smoke (`scripts/qa/manual-smoke-intake.mjs`), and
//    the real cross-process HTTP+SSE bridge this pass exists to prove is
//    orthogonal to which `ModelPort` fills in the reply text. The
//    `HttpAguiPublisher` itself IS real — that is the whole point: it POSTs
//    over a real loopback HTTP connection to the real dashboard process.
//  - 8.11 step 4's "seed a pending booking... per design.md Decision 5 — no
//    live hold path yet" already anticipates a directly-seeded booking; this
//    script also sets that booking's `calendar_event_id` to `NULL` (rather
//    than a fake calendar-event id string) so the "delete lead" scenario
//    (step 7 below) never calls out to a calendar adapter at all — the
//    calendar-delete-before-DB-delete path is already covered by
//    `apps/dashboard/app/api/leads/[id]/route.test.ts`'s in-process
//    integration test with a `FakeCalendarPort` seeded with a real tentative
//    event. This pass only needs to prove the HTTP DELETE reaches the real
//    route, the real route touches the real temp DB, and a real SSE client
//    is told about it — not re-prove the calendar-ordering contract.
//  - 8.11 step 4's "click Confirm... 'не підключено' stub response" and
//    step 5's HallMap-click-opens-card and step 6's dev-server-restart/
//    reconnect assertions are UI/browser-interaction assertions
//    (`capture-dashboard.mjs`'s Playwright harness already screenshots +
//    asserts the DecisionBar/HallMap/empty-vs-populated states in a real
//    browser, and `vision-verify`/`check-a11y` gate those pixels) — this
//    script has no browser, by design (task instructions: "chromium
//    installed; @playwright not needed here"). What THIS script proves that
//    the browser-driven capture does not: the actual network bytes flowing
//    bot-process -> HTTP POST -> hub -> SSE -> a connected client, in the
//    exact AG-UI event order, and the DB rows on both sides of a real HTTP
//    DELETE. Step 8 (process independence) IS driven exactly as specified,
//    minus an actual second OS process for "the bot" (see first bullet).
//  - 8.11 step 6's mid-session dev-server RESTART is not reproduced here
//    (that is the Playwright/browser reconnect-UI concern above); this
//    script's own step 6 instead asserts the SSE contract a reconnect
//    relies on — a FRESH connection's first frame is always a complete,
//    accurate `STATE_SNAPSHOT` rebuilt from SQLite (proven twice: once on an
//    empty DB, once after a real booking has been seeded) — which is the
//    server-side half of "reconnects and re-renders the same state via
//    STATE_SNAPSHOT, with no duplicate queue entry".
//
// SECRETS: never logs credential values (none are needed here — no
// Anthropic auth is required for this deterministic run). Run with:
//   node scripts/qa/manual-smoke-dashboard.mjs
// (requires `apps/dashboard` already built — `npm run build` /
// `next build` — since this script runs `next start`, not `next dev`).
//
// (History: an earlier version of this smoke required
// `node --experimental-transform-types` because it imports
// `packages/bot/src/http-agui-publisher.ts`, whose `HttpAguiPublisher` used a
// TS constructor-parameter-property that Node's default strip-only type
// stripping rejects with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` — which would
// also have crashed the real bot entrypoint `node packages/bot/src/index.ts`.
// This smoke SURFACED that runtime-only bug; it was fixed (explicit field +
// assignment, matching this repo's "no TS syntax strip-only can't erase"
// convention), so plain `node` now works here and for the bot.)

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { writeFileSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { openDatabase, insertBooking, findLeadByTelegramUserId, findLatestRequestForLead } from "@kamerton/db";
import { FakeModelPort, toolUseResponse } from "@kamerton/agent/src/testing/fake-model-port.ts";
import { FakeCalendarPort } from "@kamerton/lib/src/slots/fake-calendar.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const dashboardDir = path.join(repoRoot, "apps/dashboard");

// `.env` is loaded here best-effort (same as `manual-smoke-intake.mjs`) but
// is NO LONGER REQUIRED for this smoke: an earlier version needed it because
// `apps/dashboard/lib/calendar-port.ts`'s `resolveCalendarPort()` constructed
// a REAL `GoogleCalendarPort` (whose constructor throws without
// `GOOGLE_APPLICATION_CREDENTIALS`/`GOOGLE_CALENDAR_ID`) on EVERY
// DELETE /api/leads/:id — even for a lead with zero calendar-backed pending
// bookings (scenario 4's case). This smoke surfaced that; the route was fixed
// to resolve the calendar port lazily (only when there is a tentative event
// to delete), so with `calendar_event_id` NULL (scenario 3) the DELETE now
// needs no calendar creds at all. `.env` load kept as a harmless best-effort
// for any future real-calendar scenario.
const envPath = path.join(repoRoot, ".env");
if (existsSync(envPath)) process.loadEnvFile(envPath);

// Synchronous last-resort cleanup: registered BEFORE `dbDir`/`port`/`server`
// exist so it is armed for the whole run, including a crash/uncaught
// exception between "temp dir created" and the script's own orderly
// cleanup section. `process.on("exit")` handlers may only do synchronous
// work — `rmSync`/`kill`/`spawnSync` only, no awaited fetch/close. The
// script's own orderly cleanup (bottom of the file) still runs first on the
// happy path and sets `cleanupState.done = true` so this backstop is a
// no-op then.
const cleanupState = { dbDir: undefined, port: undefined, server: undefined, done: false };
process.on("exit", () => {
  if (cleanupState.done) return;
  cleanupState.done = true;
  try {
    cleanupState.server?.kill("SIGKILL");
  } catch {
    // already gone
  }
  if (cleanupState.port !== undefined) {
    try {
      spawnSync("pkill", ["-f", `next start -H 127.0.0.1 -p ${cleanupState.port}`]);
    } catch {
      // pkill not available or nothing matched — best-effort only
    }
  }
  if (cleanupState.dbDir !== undefined) {
    try {
      rmSync(cleanupState.dbDir, { recursive: true, force: true });
    } catch {
      // best-effort only
    }
  }
});

const { FakeTelegramTransport } = await import(
  path.join(repoRoot, "packages/bot/src/testing/fake-telegram-transport.ts")
);
const { handleUpdate } = await import(path.join(repoRoot, "packages/bot/src/pipeline.ts"));
const { HttpAguiPublisher } = await import(path.join(repoRoot, "packages/bot/src/http-agui-publisher.ts"));

// ---------------------------------------------------------------------------
// transcript + check plumbing (mirrors manual-smoke-intake.mjs)
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
// small infra helpers
// ---------------------------------------------------------------------------

/** Finds a free TCP port on 127.0.0.1 by briefly binding to port 0 and
 *  reading back what the OS assigned — avoids colliding with a developer's
 *  already-running `next dev` on 3000. */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function withDb(dbPath, fn) {
  const db = openDatabase(dbPath);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

async function waitFor(predicate, { timeoutMs = 10000, intervalMs = 100, label = "condition" } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await predicate();
    if (result) return result;
    if (Date.now() > deadline) {
      throw new Error(`timed out after ${timeoutMs}ms waiting for: ${label}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/** A minimal SSE client: connects via `fetch`, decodes `data: ...\n\n`
 *  frames off the raw byte stream (Node has no global `EventSource`), and
 *  appends every parsed AG-UI event to `.events`, in arrival order, until
 *  `.close()` is called. */
async function connectSse(url) {
  const controller = new AbortController();
  const events = [];
  let connectError;

  const res = await fetch(url, { signal: controller.signal });
  if (!res.ok || res.body === null) {
    throw new Error(`SSE connect to ${url} failed: HTTP ${res.status}`);
  }

  const pump = (async () => {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const rawFrame = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const dataLines = rawFrame.split("\n").filter((l) => l.startsWith("data: "));
          if (dataLines.length > 0) {
            const jsonStr = dataLines.map((l) => l.slice("data: ".length)).join("\n");
            try {
              events.push(JSON.parse(jsonStr));
            } catch {
              // Malformed frame — recorded as a connect error for diagnosis,
              // never silently dropped.
              connectError = `unparseable SSE frame: ${jsonStr}`;
            }
          }
        }
      }
    } catch (error) {
      // A reader error after `.close()` aborts the fetch — expected, not a
      // failure; only surfaced if `.close()` was never called.
      if (!controller.signal.aborted) connectError = error;
    }
  })();

  // Give the FIRST frame a moment to arrive before returning, so callers
  // that immediately assert `events[0]` don't race the network.
  await waitFor(() => events.length >= 1, { timeoutMs: 10000, label: "first SSE frame" });

  return {
    events,
    get connectError() {
      return connectError;
    },
    close() {
      controller.abort();
      return pump.catch(() => {});
    },
  };
}

// "this week's Kyiv-offset slot" helpers — same calendar-date arithmetic as
// `scripts/qa/seed-dashboard-fixture.mjs` (copied rather than imported: that
// script has no exported functions, it is a standalone CLI).
function currentWeekMondayIso() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const map = {};
  for (const part of parts) if (part.type !== "literal") map[part.type] = part.value;
  const todayIso = `${map.year}-${map.month}-${map.day}`;
  const [y, m, d] = todayIso.split("-").map(Number);
  const baseMillis = Date.UTC(y, m - 1, d);
  const dow = new Date(baseMillis).getUTCDay();
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const mondayDate = new Date(baseMillis + offsetToMonday * 24 * 60 * 60 * 1000);
  const yy = mondayDate.getUTCFullYear();
  const mm = String(mondayDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(mondayDate.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
function dateOffset(mondayIso, daysAfterMonday) {
  const [y, m, d] = mondayIso.split("-").map(Number);
  const millis = Date.UTC(y, m - 1, d) + daysAfterMonday * 24 * 60 * 60 * 1000;
  const date = new Date(millis);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
function slotIso(dateIso, hour) {
  return `${dateIso}T${String(hour).padStart(2, "0")}:00:00+03:00`;
}

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------
log("=== 8.11 manual real-DB smoke (scripted) — S3 dashboard ===");
log(
  "Deviations from the literal 8.11 text are documented in this script's own header comment " +
    "(scripts/qa/manual-smoke-dashboard.mjs) — summarized: a FakeTelegramTransport + deterministic " +
    "FakeModelPort stand in for the real Telegram/Claude round trip (already covered by S2's 6.9 " +
    "smoke); the pending booking seeded below has calendar_event_id=NULL (the calendar-delete-" +
    "before-DB-delete ordering is already covered by route.test.ts's FakeCalendarPort integration " +
    "test); the browser/pixel assertions (Confirm stub copy, HallMap click, dev-server-restart " +
    "reconnect UI) are capture-dashboard.mjs's job, not this script's — this script instead proves " +
    "the real cross-process HTTP+SSE bytes and the real DB rows on both sides of them.",
);
log(
  "ENVIRONMENT NOTE: runs under plain `node scripts/qa/manual-smoke-dashboard.mjs` (like the other " +
    "manual-smoke scripts). An earlier version needed `--experimental-transform-types` because " +
    "packages/bot/src/http-agui-publisher.ts used a TS constructor-parameter-property strip-only " +
    "Node rejects — a runtime-only bug this smoke surfaced (it would also have crashed the real bot " +
    "entrypoint); now fixed (explicit field), so no flag is needed here or for the bot.",
);

section("step 0: build present");
const buildDir = path.join(dashboardDir, ".next");
const hasBuild = existsSync(buildDir);
check("apps/dashboard/.next exists (next build already run)", hasBuild, buildDir);
if (!hasBuild) {
  log("  cannot run `next start` without a build — aborting.");
  process.exit(1);
}

section("step 1: temp SQLite file + free port");
const dbDir = mkdtempSync(path.join(tmpdir(), "kamerton-dashboard-smoke-"));
cleanupState.dbDir = dbDir;
const dbPath = path.join(dbDir, "smoke.db");
withDb(dbPath, (db) => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
  check(
    "leads/requests/bookings tables created from a clean file",
    ["leads", "requests", "bookings"].every((t) => tables.includes(t)),
    tables.join(","),
  );
});
const port = await findFreePort();
cleanupState.port = port;
const baseUrl = `http://127.0.0.1:${port}`;
log(`  temp db: ${dbPath}`);
log(`  dashboard port: ${port}`);

section("step 1b: boot the real dashboard (`next start`)");
let serverLog = "";
const server = spawn("npx", ["next", "start", "-H", "127.0.0.1", "-p", String(port)], {
  cwd: dashboardDir,
  env: { ...process.env, KAMERTON_DB_PATH: dbPath },
  stdio: ["ignore", "pipe", "pipe"],
});
cleanupState.server = server;
server.stdout.on("data", (d) => (serverLog += d.toString()));
server.stderr.on("data", (d) => (serverLog += d.toString()));

let serverUp = false;
let serverError;
try {
  await waitFor(
    async () => {
      try {
        const res = await fetch(baseUrl);
        return res.status < 500;
      } catch {
        return false;
      }
    },
    { timeoutMs: 60000, intervalMs: 500, label: "dashboard server up" },
  );
  serverUp = true;
} catch (error) {
  serverError = error;
}
check("real `next start` process reachable at " + baseUrl, serverUp, serverError?.message ?? "");
if (!serverUp) {
  log("--- server log (for diagnosis) ---");
  log(serverLog);
  await stopServerAndExit(1);
}

// ---------------------------------------------------------------------------
// scenario 1 — fresh temp DB: first SSE frame is an empty STATE_SNAPSHOT
// ---------------------------------------------------------------------------
section("scenario 1: schema/empty — first SSE frame on a fresh DB");
const sseClient1 = await connectSse(`${baseUrl}/api/agui/stream`);
{
  const first = sseClient1.events[0];
  check("first SSE frame is STATE_SNAPSHOT", first?.type === "STATE_SNAPSHOT", JSON.stringify(first?.type));
  check(
    "empty DB -> empty activeRequests",
    Array.isArray(first?.snapshot?.activeRequests) && first.snapshot.activeRequests.length === 0,
    JSON.stringify(first?.snapshot?.activeRequests),
  );
  check(
    "empty DB -> empty pendingQueue",
    Array.isArray(first?.snapshot?.pendingQueue) && first.snapshot.pendingQueue.length === 0,
    JSON.stringify(first?.snapshot?.pendingQueue),
  );
  check(
    "empty DB -> hallMap still renders the full 50-seat grid (5 weekdays x 10 hours)",
    Array.isArray(first?.snapshot?.hallMap) && first.snapshot.hallMap.length === 50,
    String(first?.snapshot?.hallMap?.length),
  );
}

// ---------------------------------------------------------------------------
// scenario 2 — a live turn over the REAL HTTP+SSE bridge
// ---------------------------------------------------------------------------
section("scenario 2: live turn — bot(in-process) -> HTTP POST -> hub -> SSE");
const identity = {
  telegramUserId: "smoke-dash-1",
  telegramChatId: "smoke-dash-chat-1",
  telegramDisplayName: "Софійка (dashboard smoke)",
};
let requestId;
let leadId;
{
  const db = openDatabase(dbPath);
  const transport = new FakeTelegramTransport();
  const model = new FakeModelPort([
    toolUseResponse("save_name", { name: "Софійка" }, { text: "Дякую!" }),
  ]);
  const calendar = new FakeCalendarPort();
  const publisher = new HttpAguiPublisher(`${baseUrl}/api/agui/ingest`);

  const before = sseClient1.events.length;
  await handleUpdate(
    { type: "text", ...identity, text: "Доброго дня, хочу записати доньку Софійку на вокал." },
    { transport, db, model, calendar, publisher },
  );
  db.close();

  const turnEvents = await waitFor(
    () => {
      const slice = sseClient1.events.slice(before);
      return slice.length >= 6 ? slice : undefined;
    },
    { timeoutMs: 10000, label: "6 AG-UI events for this turn to arrive over SSE" },
  );

  const observedTypes = turnEvents.map((e) => e.type);
  log(`  observed SSE event order for this turn: ${observedTypes.join(" -> ")}`);
  check(
    "exact AG-UI event order: RUN_STARTED -> TEXT_MESSAGE_START -> TEXT_MESSAGE_CONTENT -> TEXT_MESSAGE_END -> STATE_SNAPSHOT -> RUN_FINISHED",
    JSON.stringify(observedTypes) ===
      JSON.stringify([
        "RUN_STARTED",
        "TEXT_MESSAGE_START",
        "TEXT_MESSAGE_CONTENT",
        "TEXT_MESSAGE_END",
        "STATE_SNAPSHOT",
        "RUN_FINISHED",
      ]),
    observedTypes.join(" -> "),
  );
  const runStarted = turnEvents.find((e) => e.type === "RUN_STARTED");
  const runFinished = turnEvents.find((e) => e.type === "RUN_FINISHED");
  check(
    "RUN_STARTED/RUN_FINISHED both carry this turn's threadId (the lead's telegramChatId)",
    runStarted?.threadId === identity.telegramChatId && runFinished?.threadId === identity.telegramChatId,
    `RUN_STARTED.threadId=${runStarted?.threadId} RUN_FINISHED.threadId=${runFinished?.threadId}`,
  );
  const contentEvent = turnEvents.find((e) => e.type === "TEXT_MESSAGE_CONTENT");
  check(
    "TEXT_MESSAGE_CONTENT carries non-empty streamed reply text",
    typeof contentEvent?.delta === "string" && contentEvent.delta.length > 0,
    JSON.stringify(contentEvent?.delta),
  );
  const snapshotEvent = turnEvents.find((e) => e.type === "STATE_SNAPSHOT");
  check(
    "the turn's STATE_SNAPSHOT carries the saved studentName field (first-turn brand-new-lead snapshot)",
    snapshotEvent?.snapshot?.studentName === "Софійка",
    JSON.stringify(snapshotEvent?.snapshot),
  );
}

// Re-open fresh for the DB assertions (the block above closed its own handle).
{
  const db = openDatabase(dbPath);
  const lead = findLeadByTelegramUserId(db, identity.telegramUserId);
  check("lead row now exists in the temp DB", lead !== undefined, JSON.stringify(lead));
  leadId = lead?.id;
  const request = lead !== undefined ? findLatestRequestForLead(db, lead.id) : undefined;
  check(
    "a requests row exists with student_name = 'Софійка'",
    request?.student_name === "Софійка",
    JSON.stringify(request),
  );
  requestId = request?.id;
  db.close();
}

// ---------------------------------------------------------------------------
// scenario 3 — pending queue via a FRESH SSE snapshot
// ---------------------------------------------------------------------------
section("scenario 3: pending queue appears in a fresh connection's STATE_SNAPSHOT");
let bookingId;
{
  const db = openDatabase(dbPath);
  // Move the request to `awaiting_admin` directly (S4's real hold/propose
  // path is not wired yet — same documented deferral as S2's own smoke,
  // "propose_slots/request_hold ... a later task"). This is the ONE place
  // this script writes to the DB out of band from the real pipeline, and it
  // is called out here rather than left implicit.
  db.prepare(`UPDATE requests SET state = 'awaiting_admin' WHERE id = ?`).run(requestId);

  const mondayIso = currentWeekMondayIso();
  const slotDate = dateOffset(mondayIso, 1); // Tuesday
  const booking = insertBooking(db, {
    slotStart: slotIso(slotDate, 16),
    slotEnd: slotIso(slotDate, 17),
    status: "pending",
    calendarEventId: null,
  });
  db.prepare(`UPDATE bookings SET request_id = ? WHERE id = ?`).run(requestId, booking.id);
  bookingId = booking.id;
  db.close();
}

const sseClient2 = await connectSse(`${baseUrl}/api/agui/stream`);
{
  const first = sseClient2.events[0];
  check("fresh connection's first frame is STATE_SNAPSHOT", first?.type === "STATE_SNAPSHOT");
  const entry = first?.snapshot?.pendingQueue?.find((e) => e.requestId === requestId);
  check(
    "pendingQueue now contains this request",
    entry !== undefined,
    JSON.stringify(first?.snapshot?.pendingQueue),
  );
  check("pending entry's studentName is 'Софійка'", entry?.studentName === "Софійка", JSON.stringify(entry));
  check(
    "pending entry carries a non-empty first-lesson brief",
    typeof entry?.brief === "string" && entry.brief.length > 0,
    JSON.stringify(entry?.brief),
  );
  check("pending entry references the seeded bookingId", entry?.bookingId === bookingId, `${entry?.bookingId} vs ${bookingId}`);
}

// ---------------------------------------------------------------------------
// scenario 4 — delete-lead over the real HTTP DELETE route
// ---------------------------------------------------------------------------
section("scenario 4: DELETE /api/leads/:id over real HTTP");
{
  const before = sseClient2.events.length;
  const res = await fetch(`${baseUrl}/api/leads/${leadId}`, { method: "DELETE" });
  check("DELETE responds 200", res.status === 200, String(res.status));
  const body = await res.json().catch(() => undefined);
  check("DELETE response body is { status: 'ok' }", body?.status === "ok", JSON.stringify(body));

  const db = openDatabase(dbPath);
  const leadRow = db.prepare(`SELECT id FROM leads WHERE id = ?`).get(leadId);
  const requestRow = db.prepare(`SELECT id FROM requests WHERE id = ?`).get(requestId);
  const bookingRow = db.prepare(`SELECT id FROM bookings WHERE id = ?`).get(bookingId);
  check("leads row is gone from the temp DB", leadRow === undefined);
  check("requests row is gone from the temp DB", requestRow === undefined);
  check("bookings row is gone from the temp DB", bookingRow === undefined);
  db.close();

  const removalEvents = await waitFor(
    () => {
      const slice = sseClient2.events.slice(before);
      return slice.length >= 1 ? slice : undefined;
    },
    { timeoutMs: 10000, label: "a state-removal event pushed to the connected SSE client" },
  );
  const removal = removalEvents.find((e) => e.type === "STATE_SNAPSHOT");
  check(
    "connected SSE client receives a fresh STATE_SNAPSHOT after the delete",
    removal !== undefined,
    JSON.stringify(removalEvents.map((e) => e.type)),
  );
  check(
    "that snapshot's pendingQueue no longer contains the deleted request",
    removal !== undefined && !removal.snapshot.pendingQueue.some((e) => e.requestId === requestId),
    JSON.stringify(removal?.snapshot?.pendingQueue),
  );
  log(
    "  NOTE: calendar_event_id was NULL for this booking (documented deviation, this script's " +
      "header) — no calendar.deleteEvent() call happens on this path; the calendar-delete-before-" +
      "DB-delete ordering is covered by route.test.ts's FakeCalendarPort integration test instead.",
  );
}

// ---------------------------------------------------------------------------
// scenario 5 — bad input (guardrail hardening from the review-gate)
// ---------------------------------------------------------------------------
section("scenario 5: bad input");
{
  const res = await fetch(`${baseUrl}/api/leads/abc`, { method: "DELETE" });
  check("DELETE /api/leads/abc -> 400", res.status === 400, String(res.status));
}
{
  const res = await fetch(`${baseUrl}/api/agui/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  check("POST /api/agui/ingest {} -> 400", res.status === 400, String(res.status));
}

// ---------------------------------------------------------------------------
// scenario 6 — process independence (NFR-LOCAL-01)
// ---------------------------------------------------------------------------
section("scenario 6: process independence (NFR-LOCAL-01)");
log(
  "  the 'bot' in this run was always in-process handleUpdate() calls, not a second OS process " +
    "(documented deviation, this script's header) — there is no bot process to kill. What IS " +
    "asserted: the dashboard is its own process, independent of anything else, and keeps serving.",
);
{
  const res = await fetch(`${baseUrl}/`);
  check("dashboard root route still responds 200 with no bot process involved", res.status === 200, String(res.status));
}

// ---------------------------------------------------------------------------
// cleanup + summary
// ---------------------------------------------------------------------------
section("cleanup");
await sseClient1.close();
await sseClient2.close();
await stopServer();
rmSync(dbDir, { recursive: true, force: true });
cleanupState.done = true; // orderly cleanup just ran — the exit-handler backstop is now a no-op
log("  SSE clients closed, dashboard server stopped, temp db removed");

log(
  failures.length === 0
    ? "\n=== 8.11 SMOKE PASSED (all checks) ==="
    : `\n=== 8.11 SMOKE FAILED: ${failures.length} check(s): ${failures.join("; ")} ===`,
);

// ---------------------------------------------------------------------------
// write the transcript doc (rerunnable — regenerated fresh every run, same
// convention as docs/qa/intake-manual-smoke.md)
// ---------------------------------------------------------------------------
const generatedAt = new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" });
const docPath = path.join(repoRoot, "docs/qa/dashboard-manual-smoke.md");
const doc = `# S3 \`dashboard\` — 8.11 manual real-DB smoke transcript

> Generated by \`node scripts/qa/manual-smoke-dashboard.mjs\` (rerunnable) on ${generatedAt}, Europe/Kyiv.
>
> Proves the cross-process AG-UI bridge end-to-end: a REAL \`next start\` dashboard process (built via
> \`next build\`), a REAL on-disk SQLite file shared with an in-process "bot" driver
> (\`packages/bot/src/pipeline.ts\`'s \`handleUpdate\`), a REAL HTTP POST bridge
> (\`packages/bot/src/http-agui-publisher.ts\`'s \`HttpAguiPublisher\` -> \`/api/agui/ingest\`), and a REAL
> Server-Sent Events GET (\`/api/agui/stream\`) read with a plain \`fetch\` + \`ReadableStream\` reader (no
> \`EventSource\` global in Node). The model is a DETERMINISTIC scripted \`FakeModelPort\`, and Telegram is
> a \`FakeTelegramTransport\` — no live Telegram chat or Anthropic call is made (deviations documented in
> this script's own header comment, \`scripts/qa/manual-smoke-dashboard.mjs\`, along with which parts of
> the literal 8.11 checklist this pass covers vs. defers to \`capture-dashboard.mjs\`'s browser-driven
> pixel assertions).
${
  failures.length === 0
    ? ""
    : `
## Findings from this run

${failures.map((f, i) => `${i + 1}. **FAIL** — ${f}`).join("\n")}
`
}
\`\`\`
${transcriptLines.join("\n")}
\`\`\`
`;
writeFileSync(docPath, doc, "utf8");
log(`\ntranscript written to ${path.relative(repoRoot, docPath)}`);

process.exit(failures.length === 0 ? 0 : 1);

// ---------------------------------------------------------------------------
async function stopServer() {
  if (server.exitCode !== null || server.killed) return;
  server.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 500));
  try {
    server.kill("SIGKILL");
  } catch {
    // already gone
  }
  // Backstop: `next start` sometimes forks a `next-server` child that
  // outlives the parent SIGTERM on some platforms — best-effort cleanup,
  // never fatal if these find nothing (mirrors capture-dashboard.mjs's own
  // "stopServer" discipline, extended per this task's explicit instruction).
  await new Promise((resolve) => {
    const p = spawn("pkill", ["-f", `next start -H 127.0.0.1 -p ${port}`]);
    p.on("exit", resolve);
    p.on("error", resolve);
  });
}

async function stopServerAndExit(code) {
  await stopServer();
  rmSync(dbDir, { recursive: true, force: true });
  cleanupState.done = true; // orderly cleanup just ran — the exit-handler backstop is now a no-op
  process.exit(code);
}
