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

import { describe, expect, it } from "vitest";
import { subscribe } from "../../../../lib/agui-hub.ts";
import type { AguiEvent } from "@kamerton/bot/src/agui-publisher.ts";
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
});
