// @trace FR-PROGRESS-01 TC-AI-04 NFR-SEC-01 NFR-OBS-01

import { getCurrentHrUser } from "@/app/(cabinet)/current-user";
import { getCycleProgress } from "@/app/(cabinet)/cycles/queries";

export const runtime = "nodejs";

/**
 * Progress-polling endpoint (FR-PROGRESS-01): the cycle detail polls this over
 * plain HTTP (no WebSocket, TC-AI-04). HR-auth required — the proxy guards
 * cabinet routes, and this re-checks in-handler so an unauthenticated API call
 * is refused with 401 rather than silently served (NFR-SEC-01). A missing or
 * corrupt-snapshot cycle resolves to a calm 404, never a stack trace or 500.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const hrUser = await getCurrentHrUser();
  if (hrUser === null) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const progress = await getCycleProgress(id);
  if (progress === null) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json(progress, { headers: { "cache-control": "no-store" } });
}
