// @trace FR-CYCLE-02
import { randomBytes } from "crypto";

/**
 * Generate a cryptographically random cycle link token.
 * 32 random bytes encoded as base64url (charset [A-Za-z0-9_-], ~43 chars,
 * no +/=/padding). Non-sequential, non-enumerable, carries no PII.
 * Mirrors generateRefreshTokenValue from lib/auth/tokens but named for its
 * purpose. Framework-free.
 */
export function generateCycleToken(): string {
  return randomBytes(32).toString("base64url");
}
