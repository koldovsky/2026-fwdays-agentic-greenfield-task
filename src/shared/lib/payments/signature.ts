// Webhook signature seam (add-payments-emulator design "Risks"). HMAC-SHA256
// over the raw request body — the same scheme Paddle / Lemon Squeezy use, so a
// real MoR swap only changes who signs, never how we verify. Framework-free
// (TC-PURE-01): Node's built-in crypto only, secret passed in by the caller —
// no env reads here (mirrors shared/lib/crypto/aes.ts).
import { createHmac, timingSafeEqual } from "node:crypto";

/** Sign a payload; returns a lowercase hex HMAC-SHA256 digest. */
export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/**
 * Constant-time verification of a payload signature. Rejects — never throws —
 * on empty, malformed, or wrong-length input (NFR-OBS-01: bad webhooks fail
 * calm, not loud).
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (secret === "" || signature === "") return false;
  if (!/^[0-9a-f]+$/i.test(signature)) return false;
  const expected = Buffer.from(signPayload(payload, secret), "hex");
  const provided = Buffer.from(signature, "hex");
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}
