// apps/dashboard — GET /api/requests/:requestId/messages. Returns the FULL
// persisted conversation transcript for one request (the `messages` table,
// conversation-history slice) so the teacher can read what the lead actually
// said on a pending request's card — the live "Розмови" SSE feed only shows
// conversations streamed while a tab is open, but the transcript is durable in
// SQLite and this route surfaces it on demand (lazy-fetched by
// `RequestTranscript`).
import { openDatabase, findMessagesForRequest } from "@kamerton/db";
import { resolveDbPath } from "../../../../../lib/dashboard-db.ts";

// Node runtime (better-sqlite3 cannot run on the edge runtime), consistent
// with the sibling data routes.
export const runtime = "nodejs";

// ACCESS MODEL (deliberate, not an oversight — flagged by automated security
// review as potential IDOR): this route has NO authn/authz, exactly like every
// sibling data route (`decisions/[requestId]`, `leads/[id]`, `questions/[id]`).
// Kamerton is single-teacher and local-first: the dashboard binds to localhost
// only, there is no public URL, no user/session/tenant model, and exactly ONE
// principal — the teacher on their own machine (NFR-LOCAL-01, NFR-PRIV-01). So
// enumerating `requestId` only ever reveals that teacher's OWN leads' data,
// which they are entitled to see; there is no second principal for an IDOR to
// cross. Privacy is enforced by the localhost-only boundary, not per-route
// authz. IF a public/lead-facing surface is ever added (FR-WEB-01, "Future")
// or the app gains multiple users, authn + per-request ownership checks become
// required — as a CROSS-CUTTING concern across ALL routes, not a patch here.

export async function GET(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
): Promise<Response> {
  const { requestId: rawId } = await context.params;
  const requestId = Number(rawId);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return Response.json({ error: "Некоректний ідентифікатор заявки." }, { status: 400 });
  }

  const db = openDatabase(resolveDbPath());
  try {
    // Only the fields the transcript UI needs — never the internal ids/
    // timestamps (the card renders role-labelled bubbles in order).
    const messages = findMessagesForRequest(db, requestId).map((row) => ({
      role: row.role,
      content: row.content,
    }));
    return Response.json({ messages }, { status: 200 });
  } finally {
    db.close();
  }
}
