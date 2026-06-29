// @trace FR-PROGRESS-03 BC-PRIVACY-01 NFR-SEC-01 NFR-OBS-01

import { z } from "zod";
import { getCurrentHrUser } from "@/app/(cabinet)/current-user";
import { getQuestionDialog } from "@/app/(cabinet)/cycles/queries";

export const runtime = "nodejs";

const querySchema = z.object({ questionId: z.string().min(1).max(100) });

/**
 * Raw AI-dialog-per-question endpoint (FR-PROGRESS-03). HR-auth required and
 * re-checked in-handler (NFR-SEC-01); the dialog is HR-only and never exposed
 * to the respondent (BC-PRIVACY-01). Returns the transcript for the requested
 * question on demand. A form-answered question, a non-interview cycle, a
 * missing cycle, or a malformed question id all resolve to a calm 404 — never a
 * stack trace, and never another cycle's or question's dialog.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const hrUser = await getCurrentHrUser();
  if (hrUser === null) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ questionId: url.searchParams.get("questionId") });
  if (!parsed.success) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const { id } = await params;
  const messages = await getQuestionDialog(id, parsed.data.questionId);
  if (messages === null) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json({ messages }, { headers: { "cache-control": "no-store" } });
}
