// Password hashing for email/password auth (FR-AUTH-01). Salted scrypt via Node's
// built-in crypto — pure, no external dependency, framework-free. The plaintext
// password is never stored or logged; only the salted hash envelope persists.
//
// Envelope: "scrypt$<N>$<r>$<p>$<saltB64>$<hashB64>" — parameters are embedded so
// the cost can be raised later without breaking existing hashes.
import { randomBytes, scrypt, type ScryptOptions, timingSafeEqual } from "node:crypto";

/** Promise wrapper preserving scrypt's options overload (promisify drops it). */
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) =>
      err ? reject(err) : resolve(derivedKey),
    );
  });
}

// Cost parameters (OWASP-reasonable defaults for scrypt).
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;

/** Hash a plaintext password into a self-describing salted-scrypt envelope. */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scryptAsync(plain, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

/**
 * Verify a plaintext password against a stored envelope in constant time.
 * Returns false (never throws) for a wrong password or a malformed envelope, so
 * callers can't distinguish the two.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  let expected: Buffer;
  try {
    expected = Buffer.from(hashB64, "base64");
    const salt = Buffer.from(saltB64, "base64");
    const actual = await scryptAsync(plain, salt, expected.length, { N: n, r, p });
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
