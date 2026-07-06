// GET /api/tailoring — the signed-in user's tailoring history summaries, newest
// first (FR-HISTORY-01, FR-TAILOR-04). Open to ALL logged-in users
// (persist-tailoring-lifecycle); only `complete` tailorings appear (the repo
// filters pending/failed rows). Thin route: gate here, list in
// shared/lib/tailoring-history. Scoped to the caller's own records by userId.
import { NextResponse } from "next/server";

import { createTailoringRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";
import { listHistory } from "@/shared/lib/tailoring-history";

import { authGateError, resolveAuthedUser } from "./paid-user";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const gate = await resolveAuthedUser();
  if (!gate.ok) return NextResponse.json(authGateError(), { status: gate.status });

  try {
    const tailorings = await listHistory({ tailorings: createTailoringRepo(getDb()) }, gate.userId);
    return NextResponse.json({ tailorings });
  } catch (cause) {
    // A DB/read error degrades to a calm coded 500 — no stack or schema leak
    // (NFR-OBS-01, no info disclosure); the cause is logged server-side only.
    console.error("[api/tailoring] list failed", cause);
    return NextResponse.json({ error: "history_failed" }, { status: 500 });
  }
}
