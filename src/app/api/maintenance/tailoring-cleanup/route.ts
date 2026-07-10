// POST /api/maintenance/tailoring-cleanup — sweeps abandoned `pending`
// tailoring rows that have exceeded the TTL (30 min), marking them `failed`
// so free-tier slot locks are released (NFR-COST-02, FR-ONBOARD-01).
//
// Auth: Bearer <MAINTENANCE_SECRET> in the Authorization header. The secret
// is resolved lazily; when unset the route responds 503 rather than accepting
// any caller (NFR-SEC-01). Never returns or logs the provided token.
//
// Observability: logs only a stable, non-sensitive summary line (NFR-OBS-01).
//
// Invocation: a cron job or one-off `curl -X POST` by ops — wiring the
// periodic invoker is an ops step (see docs/current-state.md Remaining §4).
import { timingSafeEqual } from "node:crypto";

import { getMaintenanceSecret } from "@/shared/config";
import { getDb } from "@/shared/lib/db/pg";
import { markAbandonedPending } from "@/shared/lib/db/tailoring-cleanup";

export const runtime = "nodejs";

/** Pending tailorings older than this are marked `failed`. */
const ABANDONED_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Constant-time string equality for the auth token. Lengths are compared first
 * (unavoidable: `timingSafeEqual` throws on unequal-length buffers, and header
 * length is not the secret); the value comparison itself is timing-safe so a
 * matching-length attacker gains no byte-by-byte oracle (NFR-SEC-01).
 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function POST(request: Request): Promise<Response> {
  // Resolve the secret first: without it no caller can be authenticated at all.
  let secret: string;
  try {
    secret = getMaintenanceSecret();
  } catch {
    console.error("[api/maintenance/tailoring-cleanup] MAINTENANCE_SECRET is not configured");
    return Response.json({ error: "maintenance_unconfigured" }, { status: 503 });
  }

  // Validate the Authorization header — must be exactly "Bearer <secret>",
  // compared in constant time. The provided value is never logged or echoed.
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!safeEqual(authHeader, expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // Run the sweep; any DB error surfaces as a calm coded 500 — no stack,
  // schema, or message leak (NFR-OBS-01, NFR-SEC-01).
  try {
    const db = getDb();
    const swept = await markAbandonedPending(db, ABANDONED_TTL_MS);
    console.info(`[api/maintenance/tailoring-cleanup] swept ${swept}`);
    return Response.json({ swept });
  } catch {
    console.error("[api/maintenance/tailoring-cleanup] cleanup_failed");
    return Response.json({ error: "cleanup_failed" }, { status: 500 });
  }
}
