// apps/dashboard — POST /api/agui/ingest (dashboard tasks.md §5.3,
// design.md Decision 1: "Bot -> Next ingest -> SSE"). The bot's
// `HttpAguiPublisher` (packages/bot/src/http-agui-publisher.ts) POSTs every
// AG-UI event here as JSON; this route publishes it onto `agui-hub.ts`'s
// in-memory fan-out for every connected dashboard tab's SSE stream (§5.4) to
// forward.
//
import { openDatabase } from "@kamerton/db";
import { publish } from "../../../../lib/agui-hub.ts";
import { currentWeekStartIso, readDashboardSnapshot, resolveDbPath } from "../../../../lib/dashboard-db.ts";
import type { AguiEvent } from "@kamerton/lib/src/agui/events.ts";

// Node runtime (not edge): this route touches no native module directly,
// but sits next to sibling routes that do (dashboard-db.ts's `better-sqlite3`)
// — explicit for consistency and because `better-sqlite3` cannot run on the
// edge runtime at all.
export const runtime = "nodejs";

/**
 * Parses the request body as an AG-UI event and publishes it onto the hub.
 * Malformed JSON (or a body that is not even valid JSON) responds `400`
 * WITHOUT touching the hub — never a raw 500 (NFR-REL-01's "external calls
 * never fail silently" extended to "malformed input never crashes").
 *
 * Review-gate FIX 5 [MINOR]: a body that parses fine as JSON but is not
 * shaped like an `AguiEvent` at all (not an object, or an object with no
 * string `type`) is rejected the same way — 400, hub untouched — mirroring
 * `safeParseAguiEvent`'s own client-side "never trust the wire" discipline
 * (`apps/dashboard/lib/agui-client.ts`). This is a MINIMAL shape check
 * (object + string `type`), not full per-type schema validation — the hub
 * itself makes no stronger guarantee about its downstream consumers today.
 */
function isShapeLikeAguiEvent(value: unknown): value is AguiEvent {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

export async function POST(request: Request): Promise<Response> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return Response.json({ error: "malformed JSON body" }, { status: 400 });
  }

  if (!isShapeLikeAguiEvent(parsed)) {
    return Response.json({ error: "request body is not a valid AG-UI event" }, { status: 400 });
  }

  publish(parsed);

  // booking-hitl design.md Decision 6, items 1 and 3 (F.1/F.2): a
  // `CUSTOM`/`BOOKING_PENDING` event means a NEW pending booking just landed
  // in SQLite (the bot's pipeline publishes it the moment `HoldStorePort.
  // holdSlot` succeeds). `agui-client.ts` already replaces `state.dashboard`
  // wholesale on any `STATE_SNAPSHOT` with `threadId === "dashboard"` — so a
  // fresh re-read-and-republish right here is enough to make the new
  // request/seat "known" to every connected dashboard tab the instant it
  // re-renders, with no client-side registration logic to get wrong. Only
  // triggered for THIS event name — every other event (including the
  // regression-pinned `RUN_STARTED`/`RUN_FINISHED` cases above) forwards
  // exactly once, unchanged.
  if (parsed.type === "CUSTOM" && (parsed as { name?: unknown }).name === "BOOKING_PENDING") {
    try {
      const db = openDatabase(resolveDbPath());
      try {
        const snapshot = readDashboardSnapshot(db, currentWeekStartIso());
        const snapshotEvent: AguiEvent = { type: "STATE_SNAPSHOT", threadId: "dashboard", snapshot };
        publish(snapshotEvent);
      } finally {
        db.close();
      }
    } catch {
      // Best-effort, same posture as the rest of this route's error
      // handling: a snapshot-read failure must never turn the primary
      // forward (already published above) into a 500 — the original event
      // still reached the hub; only the extra live-refresh is skipped, and
      // the next SSE (re)connect's own server-side read (dashboard tasks.md
      // §5.5) will pick up the fresh state anyway.
    }
  }

  return Response.json({ status: "ok" }, { status: 200 });
}
