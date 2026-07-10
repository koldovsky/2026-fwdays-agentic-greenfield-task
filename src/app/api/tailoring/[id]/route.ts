// GET /api/tailoring/:id — one full stored tailoring (checklist + bullets) to
// re-open in the result view (FR-HISTORY-02). Thin route: gate + owner-scoped
// read in shared/lib/tailoring-history.
//
// IDOR (NFR-SEC-02): getHistoryItem returns null both for a missing id and for a
// tailoring owned by another user, so both map to 404 — a caller can never tell
// whether another user's id exists.
import { NextResponse } from "next/server";

import { createTailoringRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";
import { getHistoryItem } from "@/shared/lib/tailoring-history";

import { authGateError, resolveAuthedUser } from "../paid-user";

export const runtime = "nodejs";

/** tailorings.id is a uuid; a non-uuid can never exist, so treat it as 404. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const gate = await resolveAuthedUser();
  if (!gate.ok) return NextResponse.json(authGateError(), { status: gate.status });

  const { id } = await params;
  // Reject a malformed id up front: querying with a non-uuid throws in Postgres
  // ("invalid input syntax for type uuid"), which would surface as a 500. It can
  // never be a real record, so it is a 404 — identical to a missing/not-owned id
  // (no existence disclosure, NFR-SEC-02).
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const tailoring = await getHistoryItem(
      { tailorings: createTailoringRepo(getDb()) },
      gate.userId,
      id,
    );
    if (tailoring === null) {
      // Missing OR not-owned — same 404, no existence disclosure (NFR-SEC-02).
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ tailoring });
  } catch (cause) {
    console.error("[api/tailoring/:id] read failed", cause);
    return NextResponse.json({ error: "history_failed" }, { status: 500 });
  }
}
