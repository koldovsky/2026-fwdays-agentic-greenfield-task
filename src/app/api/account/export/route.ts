// GDPR data export (NFR-GDPR-01): everything stored for the signed-in user as
// one JSON download, including decrypted CV text (it is the subject's own data).
// Thin route — session boundary here, assembly in shared/lib/account.
import { NextResponse } from "next/server";
import { currentUserId } from "@/app/auth";
import { exportAccountData } from "@/shared/lib/account";
import { getCvEncryptionKey } from "@/shared/lib/crypto";
import { createCvProfileRepo, createTailoringRepo, createUserRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";

export async function GET(): Promise<NextResponse> {
  // auth() itself can throw (tampered JWT, unset AUTH_SECRET) — degrade to
  // anonymous -> 401 rather than a raw 500 that leaks a stack (NFR-OBS-01).
  let userId: string | null = null;
  try {
    userId = await currentUserId();
  } catch (cause) {
    console.error("[api/account/export] session read failed", cause);
  }
  if (userId === null) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // getCvEncryptionKey()/getDb() throw when their env is unset, and assembly can
  // throw on a DB error — all must degrade to a calm coded 500, never an uncaught
  // raw 500 leaking a stack or the missing-key detail (NFR-OBS-01, no info
  // disclosure). The cause is logged server-side only (never the key or CV text).
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
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json(data, {
      headers: { "Content-Disposition": 'attachment; filename="vouch-export.json"' },
    });
  } catch (cause) {
    console.error("[api/account/export] export failed", cause);
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }
}
