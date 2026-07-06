// Test-first (red): apps/dashboard/app/api/agui/stream/route.ts's `GET` is
// a typed throwing stub (dashboard tasks.md §5.4's red half) — every test
// below is expected to FAIL against the stub, for the right reason (the
// stub's synchronous throw surfacing from `await GET(request)`, before any
// of the stream-reading logic below it ever runs — that logic is written
// now, exercised once §5.4's green half lands, same convention as
// `packages/bot/src/pipeline.test.ts`'s red round).
//
// TEMP-FILE vs ":memory:" DECISION (tasks.md §5.4 asks this to be pinned):
// a REAL ON-DISK TEMP FILE, not ":memory:". The green implementation opens
// its OWN `better-sqlite3` connection inside the route handler (a Route
// Handler module has no way to receive an injected `Database` instance —
// Next's fixed `(request, context)` signature has no room for one), resolved
// from `process.env.KAMERTON_DB_PATH` (the SAME env var
// `packages/bot/src/index.ts` already reads for the production SQLite file —
// deliberately reused, not a second name, since both processes read/write
// the ONE physical database). This test's OWN seeding connection is a
// SEPARATE `openDatabase()` call. Two separate `:memory:` connections are
// two entirely isolated empty databases in better-sqlite3 (no shared-cache
// URI is used anywhere in this codebase) — seeding one would never be
// visible to the other. A shared on-disk file is the only way both
// connections see the same committed rows, so the route's real db read can
// actually observe what this test seeds.
//
// Streaming-response reading verified via `ctx7`'s `/vercel/next.js`
// v16.2.9 docs before writing this file: `response.body` is a standard Web
// `ReadableStream`; `response.body!.getReader()` + repeated `.read()` calls
// pull SSE frames exactly like a browser `EventSource` would internally.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDatabase, insertLead, insertRequest, updateRequestState } from "@kamerton/db";
import { publish, subscriberCount } from "../../../../lib/agui-hub.ts";
import type { AguiEvent } from "@kamerton/lib/src/agui/events.ts";
import { GET } from "./route.ts";

const STREAM_URL = "http://127.0.0.1:3000/api/agui/stream";

/** Pulls one SSE "data: ...\n\n" frame's JSON payload from `reader`, or
 *  `undefined` if the stream ended. Buffers across chunk boundaries since a
 *  `ReadableStream` chunk is not guaranteed to align with one SSE frame. */
async function readNextSseEvent(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  buffer: { text: string },
): Promise<AguiEvent | undefined> {
  const decoder = new TextDecoder();
  while (!buffer.text.includes("\n\n")) {
    const { value, done } = await reader.read();
    if (done) return undefined;
    buffer.text += decoder.decode(value, { stream: true });
  }
  const frameEnd = buffer.text.indexOf("\n\n");
  const frame = buffer.text.slice(0, frameEnd);
  buffer.text = buffer.text.slice(frameEnd + 2);
  const dataLine = frame.split("\n").find((line) => line.startsWith("data: "));
  if (!dataLine) return undefined;
  return JSON.parse(dataLine.slice("data: ".length)) as AguiEvent;
}

describe("GET /api/agui/stream (dashboard tasks.md §5.4)", () => {
  let dbDir: string;
  let dbPath: string;
  let previousDbPathEnv: string | undefined;

  beforeEach(() => {
    dbDir = mkdtempSync(path.join(tmpdir(), "kamerton-dashboard-stream-"));
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
  it("the first SSE frame is a STATE_SNAPSHOT built from the real seeded SQLite file", async () => {
    const seedDb = openDatabase(dbPath);
    const lead = insertLead(seedDb, {
      telegramUserId: "tg-user-1",
      telegramChatId: "tg-chat-1",
      telegramDisplayName: "Тестова Лідка",
    });
    const pendingRequest = insertRequest(seedDb, { leadId: lead.id, telegramChatId: "tg-chat-1" });
    updateRequestState(seedDb, pendingRequest.id, "awaiting_admin");
    seedDb.close();

    const response = await GET(new Request(STREAM_URL));

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const reader = response.body!.getReader();
    const buffer = { text: "" };
    const firstEvent = await readNextSseEvent(reader, buffer);
    expect(firstEvent?.type).toBe("STATE_SNAPSHOT");
  });

  // @trace TC-PROTO-01
  it("subsequent hub-published events are forwarded verbatim, in order", async () => {
    const response = await GET(new Request(STREAM_URL));
    const reader = response.body!.getReader();
    const buffer = { text: "" };
    await readNextSseEvent(reader, buffer); // discard the initial STATE_SNAPSHOT

    const runStarted: AguiEvent = { type: "RUN_STARTED", threadId: "tg-chat-1", runId: "run-1" };
    const runFinished: AguiEvent = { type: "RUN_FINISHED", threadId: "tg-chat-1", runId: "run-1" };
    publish(runStarted);
    publish(runFinished);

    const second = await readNextSseEvent(reader, buffer);
    const third = await readNextSseEvent(reader, buffer);
    expect(second).toEqual(runStarted);
    expect(third).toEqual(runFinished);
  });

  // @trace NFR-LOCAL-01
  it("closing the client connection (request.signal abort) unsubscribes from the hub — no leak", async () => {
    const before = subscriberCount();
    const controller = new AbortController();

    const response = await GET(new Request(STREAM_URL, { signal: controller.signal }));
    expect(subscriberCount()).toBe(before + 1);

    controller.abort();
    // Draining the stream (or a microtask tick) is what actually runs the
    // route's own abort-listener cleanup in the real implementation.
    await response.body!.getReader().closed.catch(() => {});

    expect(subscriberCount()).toBe(before);
  });
});
