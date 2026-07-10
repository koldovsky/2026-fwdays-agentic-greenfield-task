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
//
// CONTENT TRUST BOUNDARY (BC-HONESTY-02, NFR-SEC-04): the body is shape-validated
// (isExportDocument), but the section/bullet TEXT is authored client-side. To stop
// a crafted POST placing arbitrary/fabricated text into the export, the client now
// sends the persisted `tailoringId`; WHEN present, enforceExportGrounding requires
// every bullet text to be a MEMBER of that tailoring's persisted bullets (owned by
// the caller, run complete) — the honesty gate is now SERVER-enforced for that path
// (server-side-export-gate, T5 #8). It is a membership check, NOT an `included`
// filter, so a legitimately re-included overclaim-risk bullet (FR-BULLETS-02) still
// exports. WHEN `tailoringId` is absent the route falls back to shape-only
// validation (additive, non-breaking) — the pre-existing self-authored-resume
// boundary. Contact/summary/skills/education/headline stay client-supplied.
import { currentUserId } from "@/app/auth";
import { hasPaidAccess } from "@/entities/subscription";
import type { ExportDocument } from "@/entities/export-document";
import { createSubscriptionRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";

import { enforceExportGrounding, groundingErrorResponse } from "../lib/enforce-grounding";
import { renderResumePdf } from "./resume-pdf";

export const runtime = "nodejs";
/** A résumé is a handful of bullets; rendering is fast, but give headroom for cold font load. */
export const maxDuration = 30;

function isExportDocument(value: unknown): value is ExportDocument {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;

  // `bullets` is required: must be a string[].
  if (!Array.isArray(candidate.bullets)) return false;
  if (!(candidate.bullets as unknown[]).every((b) => typeof b === "string")) return false;

  // `sections` is optional. When present, validate its shape so a malformed
  // payload carrying contact PII is rejected at the trust boundary before any
  // render, per NFR-SEC-02 / defense-in-depth (OWASP A03: injection via
  // unexpected shape reaching the renderer).
  if (candidate.sections !== undefined) {
    if (typeof candidate.sections !== "object" || candidate.sections === null) return false;
    const s = candidate.sections as Record<string, unknown>;

    // contact: optional object; each field, when present, must be a string (or
    // links a string[]) — these are PII fields; wrong types are rejected, not coerced.
    if (s.contact !== undefined) {
      if (typeof s.contact !== "object" || s.contact === null) return false;
      const c = s.contact as Record<string, unknown>;
      if (c.name !== undefined && typeof c.name !== "string") return false;
      if (c.email !== undefined && typeof c.email !== "string") return false;
      if (c.phone !== undefined && typeof c.phone !== "string") return false;
      if (c.links !== undefined) {
        if (!Array.isArray(c.links)) return false;
        if (!(c.links as unknown[]).every((l) => typeof l === "string")) return false;
      }
    }

    // summary: optional string[].
    if (s.summary !== undefined) {
      if (!Array.isArray(s.summary)) return false;
      if (!(s.summary as unknown[]).every((l) => typeof l === "string")) return false;
    }

    // experience: optional array of { title: string; dateRange?: string; bullets: string[] }.
    if (s.experience !== undefined) {
      if (!Array.isArray(s.experience)) return false;
      for (const role of s.experience as unknown[]) {
        if (typeof role !== "object" || role === null) return false;
        const r = role as Record<string, unknown>;
        if (typeof r.title !== "string") return false;
        if (r.dateRange !== undefined && typeof r.dateRange !== "string") return false;
        if (!Array.isArray(r.bullets)) return false;
        if (!(r.bullets as unknown[]).every((b) => typeof b === "string")) return false;
      }
    }

    // skills: optional string[].
    if (s.skills !== undefined) {
      if (!Array.isArray(s.skills)) return false;
      if (!(s.skills as unknown[]).every((sk) => typeof sk === "string")) return false;
    }

    // education: optional string[].
    if (s.education !== undefined) {
      if (!Array.isArray(s.education)) return false;
      if (!(s.education as unknown[]).every((e) => typeof e === "string")) return false;
    }
  }

  return true;
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

  // Server-side honesty gate (server-side-export-gate, T5 #8, BC-HONESTY-02,
  // NFR-SEC-04). WHEN the client supplied the persisted `tailoringId`, every
  // bullet text in `doc` MUST be a member of that tailoring's persisted bullets
  // — this closes the trust boundary where a crafted POST could inject arbitrary
  // (fabricated) text after shape validation. WHEN absent, fall back to today's
  // shape-only validation (additive, non-breaking). Runs AFTER the paywall.
  const tailoringId = (body as { tailoringId?: unknown } | null)?.tailoringId;
  if (typeof tailoringId === "string" && tailoringId.length > 0 && userId !== null) {
    try {
      const rejection = groundingErrorResponse(
        await enforceExportGrounding(doc, tailoringId, userId),
      );
      if (rejection !== null) return rejection;
    } catch (error) {
      console.error("[api/export/pdf] grounding gate failed", error);
      return Response.json({ error: "export_failed" }, { status: 500 });
    }
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
