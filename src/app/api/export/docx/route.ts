// POST /api/export/docx — renders an ExportDocument to a downloadable .docx
// (FR-EXPORT-03). Same shape + gating story as /api/export/pdf: Node runtime,
// body is the client-built ExportDocument, malformed body → 400, rendering is
// pure so the paywall gates client-side (FR-PAYWALL-01).
import type { ExportDocument } from "@/entities/export-document";

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
