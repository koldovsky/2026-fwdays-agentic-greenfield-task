// Env-bound encryption key resolver. Kept separate from aes.ts so the cipher core
// stays pure/testable; this thin layer reads process.env lazily (never at import,
// so an unset key can't break the build) and caches the parsed key.
import { CryptoError, normalizeKey } from "./aes";

const ENV_VAR = "CV_ENCRYPTION_KEY";

let cached: Buffer | undefined;

/**
 * Resolve the CV encryption key from `CV_ENCRYPTION_KEY` (hex or base64).
 * Throws {@link CryptoError} if unset or malformed. Call at request time, not
 * module load, so build/prerender doesn't require the secret.
 */
export function getCvEncryptionKey(): Buffer {
  if (cached !== undefined) return cached;
  const raw = process.env[ENV_VAR];
  if (raw === undefined || raw === "") {
    throw new CryptoError(`${ENV_VAR} is not set`);
  }
  cached = normalizeKey(raw);
  return cached;
}

/** Test-only: clear the cached key so a changed env var is re-read. */
export function resetCvEncryptionKeyCache(): void {
  cached = undefined;
}
