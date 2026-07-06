// apps/dashboard — POST /api/agui/ingest (dashboard tasks.md §5.3,
// design.md Decision 1: "Bot -> Next ingest -> SSE"). The bot's
// `HttpAguiPublisher` (packages/bot/src/http-agui-publisher.ts) POSTs every
// AG-UI event here as JSON; this route publishes it onto `agui-hub.ts`'s
// in-memory fan-out for every connected dashboard tab's SSE stream (§5.4) to
// forward.
//
import { publish } from "../../../../lib/agui-hub.ts";
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

  return Response.json({ status: "ok" }, { status: 200 });
}
