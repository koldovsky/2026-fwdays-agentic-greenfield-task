import type { SessionPayload, SessionUser } from "@/lib/auth/types";

const SESSION_COOKIE = "colibri_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  return process.env.COLIBRI_SESSION_SECRET ?? "colibri-dev-session-secret-change-me";
}

function encodeBase64Url(data: Uint8Array): string {
  return Buffer.from(data)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return new Uint8Array(Buffer.from(padded + pad, "base64"));
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return encodeBase64Url(new Uint8Array(sig));
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const payload: SessionPayload = {
    ...user,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const body = encodeBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await signPayload(body, getSecret());
  return `${body}.${sig}`;
}

export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = await signPayload(body, getSecret());
  if (sig.length !== expected.length) return null;
  let valid = true;
  for (let i = 0; i < sig.length; i++) {
    if (sig[i] !== expected[i]) valid = false;
  }
  if (!valid) return null;

  try {
    const json = new TextDecoder().decode(decodeBase64Url(body));
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    if (!payload.id || !payload.username || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE, SESSION_TTL_MS };
