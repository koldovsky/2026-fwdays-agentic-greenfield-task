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
  // auth() itself can throw (tampered JWT, unset AUTH_SECRET) — degrade to
  // anonymous -> 401 rather than a raw 500 that leaks a stack (NFR-OBS-01).
  let userId: string | null = null;
  try {
    userId = await currentUserId();
  } catch (cause) {
    console.error("[api/account] session read failed", cause);
  }
  if (userId === null) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Any downstream throw (unconfigured env, DB/FK error, key failure) must
  // surface as a calm coded 500 — never an uncaught raw 500 that leaks a stack
  // or schema detail to the caller (NFR-OBS-01, defense-in-depth against
  // information disclosure). The cause is logged server-side only.
  try {
    const db = getDb();
    await deleteAccount(
      {
        users: createUserRepo(db),
        cvProfiles: createCvProfileRepo(db, getCvEncryptionKey()),
        tailorings: createTailoringRepo(db),
      },
      userId,
    );
  } catch (cause) {
    // No user id, CV text, or key material in the log line (NFR-SEC-01/02).
    console.error("[api/account] delete failed", cause);
    return NextResponse.json({ error: "deletion_failed" }, { status: 500 });
  }

  const response = NextResponse.json({ deleted: true });
  // Auth.js v5 session cookie (secure-prefixed in production, plain in dev).
  response.cookies.delete("authjs.session-token");
  response.cookies.delete("__Secure-authjs.session-token");
  return response;
}
