// GDPR data export (NFR-GDPR-01): everything stored for the signed-in user as
// a human-readable PDF download, including decrypted CV text (the subject's own
// data — 2026-07-09 user decision: PDF replaces JSON for readability; this trades
// machine-readability / portability for human-readability).
// Thin route — session boundary here, assembly in shared/lib/account; PDF
// rendering in the co-located account-export-pdf.tsx (same pattern as
// /api/export/pdf and /api/export/cover-letter). Per-profile decrypt guard and
// calm coded 500 preserved (NFR-SEC-01, NFR-OBS-01). Export is FREE and
// auth-gated (owner only), unchanged from the JSON path.
import { currentUserId } from "@/app/auth";
import { exportAccountData } from "@/shared/lib/account";
import { getCvEncryptionKey } from "@/shared/lib/crypto";
import { createCvProfileRepo, createTailoringRepo, createUserRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";
import { renderAccountExportPdf } from "./account-export-pdf";

export async function GET(): Promise<Response> {
  // auth() itself can throw (tampered JWT, unset AUTH_SECRET) — degrade to
  // anonymous -> 401 rather than a raw 500 that leaks a stack (NFR-OBS-01).
  let userId: string | null = null;
  try {
    userId = await currentUserId();
  } catch (cause) {
    console.error("[api/account/export] session read failed", cause);
  }
  if (userId === null) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // getCvEncryptionKey()/getDb() throw when their env is unset, and assembly can
  // throw on a DB error — all must degrade to a calm coded 500, never an uncaught
  // raw 500 leaking a stack or the missing-key detail (NFR-OBS-01, no info
  // disclosure). The cause is logged server-side only (never the key or CV text).
  // renderAccountExportPdf() can throw if react-pdf encounters a layout error;
  // the same guard catches it so a render failure degrades to a coded 500.
  try {
    const db = getDb();
    const data = await exportAccountData(
      {
        users: createUserRepo(db),
        cvProfiles: createCvProfileRepo(db, getCvEncryptionKey()),
        tailorings: createTailoringRepo(db),
      },
      userId,
    );
    if (data === null) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    const pdfBuffer = await renderAccountExportPdf(data);
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="vouch-export.pdf"',
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (cause) {
    console.error("[api/account/export] export failed", cause);
    return Response.json({ error: "export_failed" }, { status: 500 });
  }
}
