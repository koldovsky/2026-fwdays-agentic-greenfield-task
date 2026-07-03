// POST /api/export/pdf — renders an ExportDocument to a downloadable PDF
// (FR-EXPORT-02). Node runtime (the renderer + font read are Node-only). The
// body is the ExportDocument the client built from its included bullets; a
// malformed body is rejected with 400 before any render. Rendering is pure
// (no LLM, no DB, no user data lookup), so this route is not budget-gated —
// the paywall gates export CLIENT-side via the paid entitlement (FR-PAYWALL-01);
// a server-side entitlement check is deferred with the rest of the export
// entitlement wiring (tasks.md 4.2).
import type { ExportDocument } from "@/entities/export-document";

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
