import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing for the single HR account (FR-AUTH-02), pure and
 * framework-free (TC-PURE-01): only `node:crypto`, no `next/*`, `react`, or
 * DOM. Used only on the server sign-in path and by the admin provisioning
 * scripts — never in the proxy. The plaintext is never stored or logged; only
 * the `scrypt$N$r$p$salt$hash` string (base64 salt + hash) is persisted in
 * `HrUser.passwordHash`.
 */

// scrypt cost parameters. memory ≈ 128 * N * r ≈ 16 MB, under the default 32 MB.
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export function hashPassword(plain: string): string {
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(plain, salt, KEY_LENGTH, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

/**
 * Constant-time verification. Returns false on any malformed hash rather than
 * throwing, so callers get a uniform "wrong credentials" path with no
 * enumeration.
 */
export function verifyPassword(plain: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }

  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  if (salt.length === 0 || expected.length === 0) {
    return false;
  }

  let actual: Buffer;
  try {
    actual = scryptSync(plain, salt, expected.length, { N: n, r, p });
  } catch {
    return false;
  }

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
