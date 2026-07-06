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
 */
export async function POST(request: Request): Promise<Response> {
  let event: AguiEvent;
  try {
    event = (await request.json()) as AguiEvent;
  } catch {
    return Response.json({ error: "malformed JSON body" }, { status: 400 });
  }

  publish(event);

  return Response.json({ status: "ok" }, { status: 200 });
}
