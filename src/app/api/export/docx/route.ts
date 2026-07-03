// POST /api/export/docx — renders an ExportDocument to a downloadable .docx
// (FR-EXPORT-03). Same shape + gating story as /api/export/pdf: Node runtime,
// body is the client-built ExportDocument, malformed body → 400. The paywall
// is enforced HERE, server-side (FR-PAYWALL-01) — ExportStepper's client-side
// gate is a UX nicety, not a security boundary, since any caller can POST
// directly to this route. Mirrors /api/tailor/generate's paid lookup: resolve
// the session, then hasPaidAccess() against the synced subscription state; a
// non-paid caller (anonymous or free) gets 402, never a render.
import { currentUserId } from "@/app/auth";
import { hasPaidAccess } from "@/entities/subscription";
import type { ExportDocument } from "@/entities/export-document";
import { createSubscriptionRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";

import { renderResumeDocx } from "./resume-docx";

export const runtime = "nodejs";
export const maxDuration = 30;

const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function isExportDocument(value: unknown): value is ExportDocument {
  if (typeof value !== "object" || value === null) return false;
  const { bullets } = value as { bullets?: unknown };
  return Array.isArray(bullets) && bullets.every((b) => typeof b === "string");
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const doc = (body as { document?: unknown } | null)?.document;
  if (!isExportDocument(doc)) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  // Server-side paywall enforcement (FR-PAYWALL-01). A broken session read or
  // unreadable subscription degrades to "not paid" — the stricter gate —
  // never a raw 500 or a bypassed check (NFR-OBS-01).
  let userId: string | null = null;
  try {
    userId = await currentUserId();
  } catch {
    userId = null;
  }
  let paid = false;
  if (userId !== null) {
    try {
      const subscription = await createSubscriptionRepo(getDb()).get(userId);
      paid = hasPaidAccess(subscription, new Date().toISOString());
    } catch {
      paid = false;
    }
  }
  if (!paid) {
    return Response.json({ error: "payment_required" }, { status: 402 });
  }

  try {
    const docx = await renderResumeDocx(doc);
    return new Response(new Uint8Array(docx), {
      status: 200,
      headers: {
        "Content-Type": DOCX_CONTENT_TYPE,
        "Content-Disposition": 'attachment; filename="vouch-resume.docx"',
        "Content-Length": String(docx.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[api/export/docx] render failed", error);
    return Response.json({ error: "export_failed" }, { status: 500 });
  }
}
