import { SignJWT, jwtVerify } from "jose";
import { accessPayloadSchema, type AccessPayload } from "@/lib/schemas/auth";

/**
 * Token logic for auth (FR-AUTH-03), pure and runtime-agnostic (TC-PURE-01):
 * the access token is a signed JWT (HS256 via `jose`), the refresh token is an
 * opaque random string of which only a SHA-256 hash is ever stored. No
 * `next/*`, `react`, DOM, or `node:*` — JWT via `jose` and hashing/randomness
 * via WebCrypto (`globalThis.crypto`), so the module is portable. The signing
 * key is passed in by the caller (from validated env), never read from
 * `process.env` here.
 */

const ALG = "HS256";

export const DEFAULT_ACCESS_TTL = "15m";
export const DEFAULT_REFRESH_TTL = "7d";

const REFRESH_BYTES = 32;
const UNIT_MS: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

function keyFrom(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Convert a duration (`<n>[smhd]` or a bare number of seconds) to milliseconds.
 * Pure; throws on a malformed input so a bad env value fails loudly.
 */
export function durationToMs(input: string | number): number {
  if (typeof input === "number") {
    return input * 1000;
  }
  const match = /^(\d+)([smhd])$/.exec(input.trim());
  if (match) {
    return Number(match[1]) * UNIT_MS[match[2]];
  }
  const seconds = Number(input);
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }
  throw new Error(`Invalid duration: ${input}`);
}

export async function signAccessToken(
  payload: { sub: string },
  secret: string,
  ttl: string | number | Date = DEFAULT_ACCESS_TTL,
): Promise<string> {
  return new SignJWT()
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(keyFrom(secret));
}

/** Verify signature + expiry and re-validate the payload; null on any failure. */
export async function verifyAccessToken(token: string, secret: string): Promise<AccessPayload | null> {
  try {
    const { payload } = await jwtVerify(token, keyFrom(secret), { algorithms: [ALG] });
    const parsed = accessPayloadSchema.safeParse({ sub: payload.sub });
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** A url-safe, unguessable refresh-token value (never persisted as-is). */
export function generateRefreshTokenValue(): string {
  const bytes = new Uint8Array(REFRESH_BYTES);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

/** One-way hash of a refresh token; this is what `Session.tokenHash` stores. */
export async function hashRefreshToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return toBase64Url(new Uint8Array(digest));
}

export async function generateRefreshToken(): Promise<{ token: string; tokenHash: string }> {
  const token = generateRefreshTokenValue();
  const tokenHash = await hashRefreshToken(token);
  return { token, tokenHash };
}
