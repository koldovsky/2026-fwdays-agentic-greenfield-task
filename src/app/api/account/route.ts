// GDPR account deletion (NFR-GDPR-02, FR-CV-05): hard delete of the user row;
// ON DELETE CASCADE removes cv_profiles, tailorings, credentials, oauth accounts,
// subscription and usage counters immediately (well within the 24 h bound).
// The JWT session cookie is cleared in the same response.
import { NextResponse } from "next/server";
import { currentUserId } from "@/app/auth";
import { deleteAccount } from "@/shared/lib/account";
import { getCvEncryptionKey } from "@/shared/lib/crypto";
import { createCvProfileRepo, createTailoringRepo, createUserRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";

export async function DELETE(): Promise<NextResponse> {
  const userId = await currentUserId();
  if (userId === null) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await deleteAccount(
    {
      users: createUserRepo(db),
      cvProfiles: createCvProfileRepo(db, getCvEncryptionKey()),
      tailorings: createTailoringRepo(db),
    },
    userId,
  );

  const response = NextResponse.json({ deleted: true });
  // Auth.js v5 session cookie (secure-prefixed in production, plain in dev).
  response.cookies.delete("authjs.session-token");
  response.cookies.delete("__Secure-authjs.session-token");
  return response;
}
