import { db } from "@/lib/db";
import { generateRefreshToken, hashRefreshToken } from "@/lib/auth/tokens";

/**
 * Refresh-token session store (FR-AUTH-05). DB-backed (not pure): the server
 * state that makes refresh-token invalidation possible — a bare JWT cannot be
 * un-issued, but a `Session` row can be revoked. Only the hash of each refresh
 * token is stored; the raw token lives only in the user's cookie.
 *
 * - createSession  — issue a fresh refresh token + row (on sign-in).
 * - rotateSession  — verify the presented token, then atomically revoke it and
 *   mint a successor (transparent refresh). A revoked/expired/unknown token
 *   yields null, so a stolen prior token is dead once a newer one exists.
 * - revokeSession  — mark the current token revoked (on sign-out).
 */

/** The owning HrUser id is the session subject (and the access-token `sub`). */
export async function createSession(
  subject: string,
  refreshTtlMs: number,
): Promise<{ token: string }> {
  const { token, tokenHash } = await generateRefreshToken();
  const expiresAt = new Date(Date.now() + refreshTtlMs);
  await db.session.create({ data: { tokenHash, subject, expiresAt } });
  return { token };
}

export async function findLiveSessionByToken(token: string) {
  const tokenHash = await hashRefreshToken(token);
  const session = await db.session.findUnique({ where: { tokenHash } });
  if (session === null || session.revokedAt !== null || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }
  return session;
}

export async function rotateSession(
  oldToken: string,
  refreshTtlMs: number,
): Promise<{ token: string; subject: string } | null> {
  const current = await findLiveSessionByToken(oldToken);
  if (current === null) {
    return null;
  }

  const { token, tokenHash } = await generateRefreshToken();
  const expiresAt = new Date(Date.now() + refreshTtlMs);

  // Single-winner rotation. The revoke is a *conditional* update inside the
  // transaction (`revokedAt: null` guard), so when concurrent requests present
  // the same still-valid refresh token — which happens normally the moment the
  // access token expires and several guarded requests fire at once — exactly
  // one claims the row (count === 1) and mints the successor; the losers get
  // null and fall through to sign-in. This prevents two valid refresh tokens
  // forking from one. (A legitimate concurrent loser is indistinguishable from
  // a replay here, so we deliberately do not chain-revoke on reuse — that would
  // log out honest users on every concurrent expiry.)
  return db.$transaction(async (tx) => {
    const claim = await tx.session.updateMany({
      where: { id: current.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (claim.count !== 1) {
      return null;
    }
    const next = await tx.session.create({
      data: { tokenHash, subject: current.subject, expiresAt },
    });
    await tx.session.update({
      where: { id: current.id },
      data: { replacedById: next.id },
    });
    return { token, subject: current.subject };
  });
}

export async function revokeSession(token: string): Promise<void> {
  const tokenHash = await hashRefreshToken(token);
  await db.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
