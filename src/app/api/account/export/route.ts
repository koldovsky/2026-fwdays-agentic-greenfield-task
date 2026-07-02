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
  const userId = await currentUserId();
  if (userId === null) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
}
