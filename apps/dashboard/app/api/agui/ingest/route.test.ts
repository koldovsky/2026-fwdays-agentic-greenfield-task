// Test-first (red): apps/dashboard/app/api/agui/ingest/route.ts's `POST` is
// a typed throwing stub (dashboard tasks.md §5.3's red half) — every test
// below is expected to FAIL against the stub, for the right reason. Both
// scenarios also call `agui-hub.ts`'s `subscribe` (itself a throwing stub,
// §5.1) to observe whether the hub was touched — so a test may fail at the
// `subscribe(...)` line rather than at the `POST(...)` line. That is
// EXPECTED and still "red for the right reason": the whole services layer
// this slice adds is unimplemented, and both failure points prove exactly
// that, not a bug in the test itself.
//
// In-process route-handler invocation (no live HTTP server) — verified via
// `ctx7`'s `/vercel/next.js` v16.2.9 docs before writing this file: a route
// module's exported `POST`/`GET`/`DELETE` are plain async functions taking a
// standard Web `Request` and returning a Web `Response`, callable directly
// with `new Request(url, init)`, no Next test harness needed.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDatabase, insertLead, insertRequest, insertBooking, updateRequestState } from "@kamerton/db";
import { subscribe } from "../../../../lib/agui-hub.ts";
import type { AguiEvent } from "@kamerton/lib/src/agui/events.ts";
import { POST } from "./route.ts";

const INGEST_URL = "http://127.0.0.1:3000/api/agui/ingest";

describe("POST /api/agui/ingest (dashboard tasks.md §5.3)", () => {
  // @trace TC-PROTO-01
  // @trace FR-DASH-01
  it("a well-formed AG-UI event body publishes to the hub and responds 200", async () => {
    const received: AguiEvent[] = [];
    const unsubscribe = subscribe((event) => received.push(event));

    const event: AguiEvent = { type: "RUN_STARTED", threadId: "tg-chat-1", runId: "run-1" };
    const response = await POST(
      new Request(INGEST_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event),
      }),
    );

    expect(response.status).toBe(200);
    expect(received).toEqual([event]);

    unsubscribe();
  });

  // @trace NFR-REL-01 (never a raw 500)
  it("a malformed JSON body responds 400 and never touches the hub", async () => {
    const received: AguiEvent[] = [];
    const unsubscribe = subscribe((event) => received.push(event));

    const response = await POST(
      new Request(INGEST_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{ this is not valid JSON",
      }),
    );

    expect(response.status).toBe(400);
    expect(response.status).not.toBe(500);
    expect(received).toHaveLength(0);

    unsubscribe();
  });

  // --- review-gate FIX 5 [MINOR] --------------------------------------------
  // @trace TC-PROTO-01, NFR-REL-01
  // A body that parses fine as JSON but is not shaped like an `AguiEvent`
  // (no `type` at all, or a non-string `type`) must be rejected the same way
  // a non-JSON body is — 400, hub untouched — never published as a
  // malformed/garbage event for the SSE stream to forward downstream.
  it.each([["{}"], ['{"type":123}']])(
    "a parseable-but-shape-invalid body (%s) responds 400 and never touches the hub",
    async (body) => {
      const received: AguiEvent[] = [];
      const unsubscribe = subscribe((event) => received.push(event));

      const response = await POST(
        new Request(INGEST_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        }),
      );

      expect(response.status).toBe(400);
      expect(response.status).not.toBe(500);
      expect(received).toHaveLength(0);

      unsubscribe();
    },
  );

  // The happy path keeps working: a well-formed body still responds 200 and
  // still reaches the hub after the FIX 5 shape-validation guard is added.
  it("REGRESSION: a well-formed body still responds 200 after the shape-validation guard", async () => {
    const received: AguiEvent[] = [];
    const unsubscribe = subscribe((event) => received.push(event));

    const event: AguiEvent = { type: "RUN_FINISHED", threadId: "tg-chat-1", runId: "run-2" };
    const response = await POST(
      new Request(INGEST_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event),
      }),
    );

    expect(response.status).toBe(200);
    expect(received).toEqual([event]);

    unsubscribe();
  });
});

// ---------------------------------------------------------------------
// F.1 (booking-hitl tasks.md §F.1, design.md Decision 6 items 1 and 3)
// ---------------------------------------------------------------------
// Discharges two of the four S3 `dashboard` review-gate carryovers, quoted
// verbatim from `openspec/changes/archive/2026-07-06-dashboard/
// review-findings.json`'s `deferredWithOwner` (both `owner: "S4
// booking-hitl"`):
//   1. "BOOKING_PENDING for a request created AFTER the dashboard connected
//      is dropped by the knownRequestIds gate..."
//   3. "HallMap does not update a seat's color/clickability in real time
//      from a live BOOKING_PENDING — dashboard.hallMap is replaced only by
//      a full dashboard-scoped STATE_SNAPSHOT..."
// Discharged WITHOUT any client reducer change (design.md Decision 6):
// `apps/dashboard/lib/agui-client.ts` already replaces `state.dashboard`
// wholesale whenever a `STATE_SNAPSHOT` arrives with `threadId ===
// "dashboard"`. This route must do the SAME re-read-and-republish whenever
// it forwards a `CUSTOM`/`BOOKING_PENDING` event — a fresh
// `readDashboardSnapshot` + `publish({type:"STATE_SNAPSHOT",
// threadId:"dashboard", snapshot})` right after forwarding the original
// event — so the new numeric request id (and its live pending seat) is
// "known" to every connected dashboard tab the instant it re-renders.
//
// FAILS TODAY (red, for the right reason): `route.ts`'s `POST` calls
// `publish(parsed)` exactly once, unconditionally, and never touches the
// DB — so `received` below has length 1, not 2, until F.2 implements the
// re-read-and-republish branch.
//
// Real on-disk SQLite temp file (same reasoning as the sibling
// `agui/stream/route.test.ts`/`leads/[id]/route.test.ts`: the green route
// resolves its OWN `better-sqlite3` connection from `KAMERTON_DB_PATH`,
// separate from this test's seeding connection — two `:memory:` handles
// would be two isolated empty databases, invisible to each other).
describe("POST /api/agui/ingest — F.1 BOOKING_PENDING republish (booking-hitl design.md Decision 6, items 1 and 3)", () => {
  let dbDir: string;
  let dbPath: string;
  let previousDbPathEnv: string | undefined;

  beforeEach(() => {
    dbDir = mkdtempSync(path.join(tmpdir(), "kamerton-dashboard-ingest-"));
    dbPath = path.join(dbDir, "kamerton.db");
    previousDbPathEnv = process.env.KAMERTON_DB_PATH;
    process.env.KAMERTON_DB_PATH = dbPath;
  });

  afterEach(() => {
    if (previousDbPathEnv === undefined) delete process.env.KAMERTON_DB_PATH;
    else process.env.KAMERTON_DB_PATH = previousDbPathEnv;
    rmSync(dbDir, { recursive: true, force: true });
  });

  // @trace FR-DASH-01
  // @trace FR-DASH-03
  it("a CUSTOM/BOOKING_PENDING event is forwarded verbatim AND triggers exactly one additional fresh STATE_SNAPSHOT publish read from the real DB", async () => {
    const seedDb = openDatabase(dbPath);
    const lead = insertLead(seedDb, {
      telegramUserId: "tg-user-f1",
      telegramChatId: "tg-chat-f1",
      telegramDisplayName: "Тестова Лідка Ф1",
    });
    const pendingRequest = insertRequest(seedDb, { leadId: lead.id, telegramChatId: "tg-chat-f1" });
    updateRequestState(seedDb, pendingRequest.id, "awaiting_admin");
    insertBooking(seedDb, {
      slotStart: "2026-07-14T17:00",
      slotEnd: "2026-07-14T18:00",
      status: "pending",
      calendarEventId: "fake-evt-f1",
      requestId: pendingRequest.id,
    });
    seedDb.close();

    const received: AguiEvent[] = [];
    const unsubscribe = subscribe((event) => received.push(event));

    const bookingPendingEvent: AguiEvent = {
      type: "CUSTOM",
      name: "BOOKING_PENDING",
      value: { requestId: pendingRequest.id },
    };

    const response = await POST(
      new Request(INGEST_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(bookingPendingEvent),
      }),
    );

    expect(response.status).toBe(200);
    // Forwarded verbatim, AND exactly one fresh republish — never zero (the
    // S3 gap this pins closed), never more than one extra (no
    // duplicate/looping republish).
    expect(received).toHaveLength(2);
    expect(received[0]).toEqual(bookingPendingEvent);

    const republished = received[1]!;
    expect(republished.type).toBe("STATE_SNAPSHOT");
    if (republished.type !== "STATE_SNAPSHOT") throw new Error("unreachable — asserted above");
    expect(republished.threadId).toBe("dashboard");

    // A REAL snapshot, not a stale/empty one — proves the route actually
    // re-read SQLite after this event, so the new request/pending seat is
    // "known" to every connected dashboard tab the instant it re-renders.
    const snapshot = republished.snapshot as { pendingQueue: Array<{ requestId: number }> };
    expect(Array.isArray(snapshot.pendingQueue)).toBe(true);
    expect(snapshot.pendingQueue.some((entry) => entry.requestId === pendingRequest.id)).toBe(true);

    unsubscribe();
  });

  // @trace TC-PROTO-01
  it("a non-BOOKING_PENDING event (e.g. RUN_STARTED) is forwarded WITHOUT an extra republish (unchanged S3 behavior)", async () => {
    const received: AguiEvent[] = [];
    const unsubscribe = subscribe((event) => received.push(event));

    const event: AguiEvent = { type: "RUN_STARTED", threadId: "tg-chat-f1b", runId: "run-f1b" };
    const response = await POST(
      new Request(INGEST_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event),
      }),
    );

    expect(response.status).toBe(200);
    expect(received).toEqual([event]); // no second STATE_SNAPSHOT publish

    unsubscribe();
  });
});
