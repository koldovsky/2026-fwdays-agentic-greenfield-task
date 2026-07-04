// POST /api/export/cover-letter — renders a cover-letter ExportDocument to a
// downloadable PDF (add-tailoring-intelligence §4, FR-COVERLETTER-02). Mirrors
// /api/export/pdf exactly: Node runtime (renderer + font read are Node-only),
// 400 on a malformed body, then the server-side paywall (FR-PAYWALL-01) —
// resolve the session, check hasPaidAccess() against synced subscription state,
// and return 402 for a non-paid caller BEFORE any render. The client gate in the
// stepper is a UX nicety, not a boundary; any caller can POST here directly. A
// broken session/subscription read degrades to "not paid" (the stricter gate),
// never a raw 500 (NFR-OBS-01).
import { currentUserId } from "@/app/auth";
import { hasPaidAccess } from "@/entities/subscription";
import type { ExportDocument } from "@/entities/export-document";
import { createSubscriptionRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";

import { renderCoverLetterPdf } from "./cover-letter-pdf";

export const runtime = "nodejs";
/** A cover letter is a few paragraphs; rendering is fast, headroom for cold font load. */
export const maxDuration = 30;

function isCoverLetterDocument(value: unknown): value is ExportDocument {
  if (typeof value !== "object" || value === null) return false;
  const { coverLetter } = value as { coverLetter?: unknown };
  if (typeof coverLetter !== "object" || coverLetter === null) return false;
  const { paragraphs } = coverLetter as { paragraphs?: unknown };
  return Array.isArray(paragraphs) && paragraphs.every((p) => typeof p === "string");
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const doc = (body as { document?: unknown } | null)?.document;
  if (!isCoverLetterDocument(doc)) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  // Server-side paywall enforcement (FR-PAYWALL-01) — identical to the pdf route.
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
    const pdf = await renderCoverLetterPdf(doc);
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="vouch-cover-letter.pdf"',
        "Content-Length": String(pdf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    // Server-side only — the client surfaces a calm failure (NFR-OBS-01).
    console.error("[api/export/cover-letter] render failed", error);
    return Response.json({ error: "export_failed" }, { status: 500 });
  }
}
