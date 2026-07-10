// POST /api/export/docx — renders an ExportDocument to a downloadable .docx
// (FR-EXPORT-03). Same shape + gating story as /api/export/pdf: Node runtime,
// body is the client-built ExportDocument, malformed body → 400. The paywall
// is enforced HERE, server-side (FR-PAYWALL-01) — ExportStepper's client-side
// gate is a UX nicety, not a security boundary, since any caller can POST
// directly to this route. Mirrors /api/tailor/generate's paid lookup: resolve
// the session, then hasPaidAccess() against the synced subscription state; a
// non-paid caller (anonymous or free) gets 402, never a render.
//
// CONTENT TRUST BOUNDARY (BC-HONESTY-02, NFR-SEC-04): same as /api/export/pdf —
// the body is shape-validated but the section/bullet TEXT is client-authored.
// enforceExportGrounding requires every bullet text to be a MEMBER of the caller's
// persisted, complete tailoring so a crafted POST cannot inject fabricated text.
// The gate is MANDATORY for a bullet-bearing export (caller past the paywall is
// always authed+paid): omitting `tailoringId` is rejected `missing_tailoring` (400),
// not waved through to shape-only validation (harden-export-gate, T5 #8). Membership,
// not an `included` filter, so re-included overclaim-risk bullets (FR-BULLETS-02)
// still export. A bulletless document has nothing to ground.
import { currentUserId } from "@/app/auth";
import { hasPaidAccess } from "@/entities/subscription";
import type { ExportDocument } from "@/entities/export-document";
import { createSubscriptionRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";

import { enforceExportGrounding, groundingErrorResponse } from "../lib/enforce-grounding";
import { renderResumeDocx } from "./resume-docx";

export const runtime = "nodejs";
export const maxDuration = 30;

const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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

  // Server-side honesty gate (harden-export-gate, T5 #8, BC-HONESTY-02,
  // NFR-SEC-04). Same contract as /api/export/pdf: runs AFTER the paywall (so
  // `userId` is non-null), every bullet text in `doc` MUST be a member of the
  // caller's persisted, complete tailoring, and a bullet-bearing export with no
  // valid `tailoringId` is rejected (`missing_tailoring`) — the gate is mandatory,
  // not opt-in from the body. A bulletless document has nothing to ground.
  const rawTailoringId = (body as { tailoringId?: unknown } | null)?.tailoringId;
  const tailoringId =
    typeof rawTailoringId === "string" && rawTailoringId.length > 0 ? rawTailoringId : null;
  if (userId !== null) {
    try {
      const rejection = groundingErrorResponse(
        await enforceExportGrounding(doc, tailoringId, userId),
      );
      if (rejection !== null) return rejection;
    } catch (error) {
      console.error("[api/export/docx] grounding gate failed", error);
      return Response.json({ error: "export_failed" }, { status: 500 });
    }
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
