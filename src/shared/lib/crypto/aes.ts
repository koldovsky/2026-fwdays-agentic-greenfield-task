// AES-256-GCM encryption for PII at rest (NFR-SEC-01, BC-PRIVACY-02).
// Pure + framework-free (TC-PURE-01): Node's built-in crypto only, key passed in
// by the caller — no env, no DB, no next/*. The env-bound key lives in ./key.
//
// Envelope format (versioned so the scheme can evolve without ambiguity):
//   "v1:" + base64( iv(12) | authTag(16) | ciphertext )
// A random 96-bit IV per call means identical plaintext yields distinct
// ciphertext; the GCM auth tag makes tampering detectable on decrypt.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32; // 256-bit
const IV_BYTES = 12; // 96-bit, recommended for GCM
const TAG_BYTES = 16;

/** Thrown when a key is the wrong size or an envelope is malformed/tampered. */
export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoError";
  }
}

function assertKey(key: Buffer): void {
  if (key.length !== KEY_BYTES) {
    throw new CryptoError(`encryption key must be ${KEY_BYTES} bytes, got ${key.length}`);
  }
}

/** Encrypt a UTF-8 string into a versioned base64 envelope. */
export function encryptString(plaintext: string, key: Buffer): string {
  assertKey(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${Buffer.concat([iv, tag, ciphertext]).toString("base64")}`;
}

/** Decrypt a versioned envelope produced by {@link encryptString}. */
export function decryptString(envelope: string, key: Buffer): string {
  assertKey(key);

  const sep = envelope.indexOf(":");
  if (sep === -1) throw new CryptoError("malformed envelope: missing version prefix");
  const version = envelope.slice(0, sep);
  if (version !== VERSION) throw new CryptoError(`unsupported envelope version: ${version}`);

  const raw = Buffer.from(envelope.slice(sep + 1), "base64");
  if (raw.length < IV_BYTES + TAG_BYTES) {
    throw new CryptoError("malformed envelope: too short");
  }

  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    // Wrong key or tampered ciphertext — GCM auth check failed.
    throw new CryptoError("decryption failed: wrong key or corrupted data");
  }
}

/**
 * Parse a raw key string (hex or base64) into a 32-byte Buffer.
 * Accepts 64 hex chars or a base64 string that decodes to exactly 32 bytes.
 */
export function normalizeKey(raw: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === KEY_BYTES) {
    return decoded;
  }
  throw new CryptoError(
    "encryption key must be 64 hex chars or base64 decoding to 32 bytes",
  );
}
