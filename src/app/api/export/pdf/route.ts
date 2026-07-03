// POST /api/export/pdf — renders an ExportDocument to a downloadable PDF
// (FR-EXPORT-02). Node runtime (the renderer + font read are Node-only). The
// body is the ExportDocument the client built from its included bullets; a
// malformed body is rejected with 400 before any render. Rendering itself is
// pure (no LLM, no user data lookup), but the paywall MUST also be enforced
// here (FR-PAYWALL-01) — ExportStepper's client-side gate is a UX nicety, not
// a security boundary, since any caller can POST directly to this route. The
// entitlement check mirrors /api/tailor/generate's paid lookup: resolve the
// session server-side, then hasPaidAccess() against the synced subscription
// state; a non-paid caller (anonymous or free) gets 402, never a render.
import { currentUserId } from "@/app/auth";
import { hasPaidAccess } from "@/entities/subscription";
import type { ExportDocument } from "@/entities/export-document";
import { createSubscriptionRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";

import { renderResumePdf } from "./resume-pdf";

export const runtime = "nodejs";
/** A résumé is a handful of bullets; rendering is fast, but give headroom for cold font load. */
export const maxDuration = 30;

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
    const pdf = await renderResumePdf(doc);
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="vouch-resume.pdf"',
        "Content-Length": String(pdf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    // Server-side only — the client surfaces a calm failure (NFR-OBS-01).
    console.error("[api/export/pdf] render failed", error);
    return Response.json({ error: "export_failed" }, { status: 500 });
  }
}
