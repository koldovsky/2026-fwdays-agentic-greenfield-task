// Server-side export honesty gate (server-side-export-gate, T5 #8,
// BC-HONESTY-02, NFR-SEC-04). Shared by /api/export/pdf and /api/export/docx so
// the two routes don't duplicate the DB load + IDOR + status + membership logic.
//
// The pure membership check lives in shared/lib/export (isExportGrounded,
// framework-free, TC-PURE-01); this thin async wrapper adds the impure edges the
// pure helper can't: the persisted-bullets read, ownership (IDOR), and lifecycle
// status. It returns a coded verdict — the caller maps it to a Response so this
// stays testable and doesn't own HTTP shape.
//
// Logs only stable coded lines, never bullet text / PII (NFR-OBS-01, NFR-SEC-01).
import type { ExportDocument } from "@/entities/export-document";
import { createTailoringRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";
import { collectExportBulletTexts, isExportGrounded } from "@/shared/lib/export";

/**
 * Verdict for an authenticated export request.
 * - `ok`: no bullet text to ground, or every bullet text is a member of the
 *   persisted bullets — render.
 * - `missing_tailoring` (→ 400): the export carries bullet text but no
 *   `tailoringId`. The honesty gate is NOT optional: an authed caller cannot
 *   drop the id to fall back to shape-only validation and inject fabricated
 *   bullets (BC-HONESTY-02, NFR-SEC-04). This is the crafted-POST vector T5 #8
 *   closes; the in-session client always sends the id from the `persisted`
 *   stream event, so only a direct/replayed POST hits this.
 * - `not_found` (→ 404): the tailoring does not exist OR is not owned by the
 *   caller. Collapsed to one outcome so existence is never leaked (IDOR).
 * - `incomplete` (→ 400): the tailoring exists but has not reached `complete`,
 *   so its bullets are not yet authoritative.
 * - `ungrounded` (→ 400): a bullet text was NOT produced by the pipeline —
 *   a fabrication attempt; reject.
 */
export type ExportGroundingVerdict =
  | "ok"
  | "missing_tailoring"
  | "not_found"
  | "incomplete"
  | "ungrounded";

/**
 * Enforce that `doc`'s bullet texts all come from the persisted tailoring
 * `tailoringId` owned by `userId`. Pure membership, NOT an `included` filter: a
 * user may legitimately re-include an overclaim-risk bullet (FR-BULLETS-02), so
 * any persisted bullet text is allowed regardless of its `included` flag — the
 * only thing rejected is text the pipeline never produced.
 *
 * `tailoringId` is REQUIRED whenever the document carries bullet text: passing
 * `null` for a bullet-bearing export yields `missing_tailoring` so the gate can
 * never be skipped from the untrusted request body. A document with no bullet
 * text (nothing pipeline-authored to fabricate) is vacuously `ok` — the paywall
 * + shape gates upstream still apply. Callers pass the raw request `tailoringId`
 * normalized to `string | null` (empty / non-string → `null`).
 */
export async function enforceExportGrounding(
  doc: ExportDocument,
  tailoringId: string | null,
  userId: string,
): Promise<ExportGroundingVerdict> {
  // Nothing pipeline-authored can carry fabricated bullet text → nothing to
  // ground. Profile fields (summary/skills/education/headline/contact) are
  // deliberately out of scope here (see membership-gate.ts).
  if (collectExportBulletTexts(doc).length === 0) {
    return "ok";
  }
  // Bullet-bearing export MUST name its tailoring: the honesty gate is mandatory,
  // not opt-in from the request body (BC-HONESTY-02, NFR-SEC-04).
  if (tailoringId === null) {
    console.warn("[api/export] grounding gate: missing_tailoring");
    return "missing_tailoring";
  }
  const grant = await createTailoringRepo(getDb()).findExportGrant(tailoringId);
  // Not found OR not owned → the same 404 outcome (do not leak existence, IDOR).
  if (grant === null || grant.userId !== userId) {
    console.warn("[api/export] grounding gate: not_found");
    return "not_found";
  }
  if (grant.status !== "complete") {
    console.warn("[api/export] grounding gate: incomplete");
    return "incomplete";
  }
  const allowedTexts = new Set(grant.bullets.map((b) => b.text));
  if (!isExportGrounded(doc, allowedTexts)) {
    console.warn("[api/export] grounding gate: ungrounded");
    return "ungrounded";
  }
  return "ok";
}

/**
 * Map a non-ok verdict to its coded HTTP Response (calm, no internals leaked,
 * NFR-OBS-01). `ok` returns null so the caller proceeds to render.
 */
export function groundingErrorResponse(verdict: ExportGroundingVerdict): Response | null {
  switch (verdict) {
    case "ok":
      return null;
    case "missing_tailoring":
      return Response.json({ error: "missing_tailoring" }, { status: 400 });
    case "not_found":
      return Response.json({ error: "not_found" }, { status: 404 });
    case "incomplete":
      return Response.json({ error: "tailoring_incomplete" }, { status: 400 });
    case "ungrounded":
      return Response.json({ error: "ungrounded_export" }, { status: 400 });
  }
}
