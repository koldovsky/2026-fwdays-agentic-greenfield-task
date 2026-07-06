// apps/dashboard — GET /api/agui/stream (dashboard tasks.md §5.4,
// design.md Decision 1). On connect, sends a `STATE_SNAPSHOT` rebuilt from
// SQLite (`dashboard-db.ts`'s `readDashboardSnapshot`, §5.5) as the FIRST
// SSE frame, then forwards every `agui-hub.ts`-published event verbatim,
// in order, for as long as the client stays connected — unsubscribing from
// the hub the moment the client disconnects (no leak, §5.1's
// `subscriberCount` is how tests observe this).
//
// Streaming shape verified via `ctx7`'s `/vercel/next.js` v16.2.9 docs
// before writing this file: a Route Handler returns a plain Web `Response`
// wrapping a `ReadableStream` with `content-type: text/event-stream` — no
// Next-specific streaming API. Abort handling follows Next's own
// `test/e2e/cancel-request/app/node-route/route.ts` pattern: check
// `request.signal.aborted` up front, then register `request.signal`'s
// `"abort"` listener to clean up (`AbortSignal` is a plain Web `EventTarget`,
// no Next-specific API). `export const dynamic = "force-dynamic"` prevents
// Next from trying to statically compile this route (same doc's own
// requirement for a streaming Node route).

import { openDatabase } from "@kamerton/db";
import type { AguiEvent } from "@kamerton/lib/src/agui/events.ts";
import { subscribe } from "../../../../lib/agui-hub.ts";
import { currentWeekStartIso, readDashboardSnapshot, resolveDbPath } from "../../../../lib/dashboard-db.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

function encodeSseFrame(event: AguiEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function GET(request: Request): Promise<Response> {
  const db = openDatabase(resolveDbPath());
  let snapshot: ReturnType<typeof readDashboardSnapshot>;
  try {
    snapshot = readDashboardSnapshot(db, currentWeekStartIso());
  } finally {
    db.close();
  }

  const snapshotEvent: AguiEvent = { type: "STATE_SNAPSHOT", threadId: "dashboard", snapshot };

  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encodeSseFrame(snapshotEvent));

      unsubscribe = subscribe((event) => {
        try {
          controller.enqueue(encodeSseFrame(event));
        } catch {
          // The controller may already be closed if the client disconnected
          // between the previous publish and this one — never let a hub
          // fan-out throw (NFR-REL-01's spirit: never fail silently, but
          // also never crash the whole hub's publish loop over one
          // already-gone subscriber).
        }
      });

      const cleanup = (): void => {
        unsubscribe?.();
        unsubscribe = undefined;
        try {
          // `controller.error()`, not `.close()`: per the Streams spec, a
          // `close()` with unread queued chunks (e.g. the STATE_SNAPSHOT
          // frame above, never drained by a client that disconnected before
          // reading anything) never actually finalizes — the reader's
          // `closed` promise would hang forever. `error()` rejects it
          // immediately regardless of queue contents (verified empirically:
          // a Node repro reproduced the `close()` hang and confirmed
          // `error()` rejects `reader.closed` at once) — exactly what a
          // client-disconnect teardown needs.
          controller.error(new Error("client disconnected"));
        } catch {
          // Already closed/errored — a no-op.
        }
      };

      if (request.signal.aborted) {
        cleanup();
      } else {
        request.signal.addEventListener("abort", cleanup);
      }
    },
    cancel() {
      unsubscribe?.();
      unsubscribe = undefined;
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
