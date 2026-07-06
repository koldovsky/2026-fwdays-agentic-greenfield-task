import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { EmailnatorError } from "./errors.server.ts";
import {
  PHASE0_CAPSULE_TTL_MS,
  PHASE0_CAPSULE_VERSION,
  phase0SessionPayloadSchema,
  type EmailnatorProviderState,
} from "./schemas.server.ts";

function toBase64Url(buffer: Uint8Array): string {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64");
}

function decodeKeyMaterial(secret: string): Buffer {
  if (!secret) {
    throw new EmailnatorError("CONFIG_INVALID", "PHASE0_SESSION_KEY is required.", { status: 500 });
  }

  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }

  try {
    const decoded = fromBase64Url(secret);
    if (decoded.length === 32) {
      return decoded;
    }
  } catch {
    // Fall through to hashing.
  }

  return createHash("sha256").update(secret, "utf8").digest();
}

export function hashSecret(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

export function safeSecretEquals(actual: string, expected: string): boolean {
  const actualHash = hashSecret(actual);
  const expectedHash = hashSecret(expected);
  return timingSafeEqual(actualHash, expectedHash);
}

export function sealSessionCapsule(
  state: EmailnatorProviderState,
  secret: string,
  options?: {
    now?: Date;
    ttlMs?: number;
  },
): string {
  const now = options?.now ?? new Date();
  const ttlMs = options?.ttlMs ?? PHASE0_CAPSULE_TTL_MS;
  const payload = phase0SessionPayloadSchema.parse({
    version: PHASE0_CAPSULE_VERSION,
    iat: now.getTime(),
    exp: now.getTime() + ttlMs,
    state,
  });

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", decodeKeyMaterial(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [PHASE0_CAPSULE_VERSION, toBase64Url(iv), toBase64Url(ciphertext), toBase64Url(tag)].join(
    ".",
  );
}

export function openSessionCapsule(
  capsule: string,
  secret: string,
  options?: {
    now?: Date;
  },
): EmailnatorProviderState {
  const [version, ivPart, ciphertextPart, tagPart] = capsule.split(".");
  if (!version || !ivPart || !ciphertextPart || !tagPart) {
    throw new EmailnatorError("CAPSULE_INVALID", "Malformed session capsule.", { status: 400 });
  }

  if (version !== PHASE0_CAPSULE_VERSION) {
    throw new EmailnatorError("CAPSULE_INVALID", "Unsupported session capsule version.", {
      status: 400,
    });
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      decodeKeyMaterial(secret),
      fromBase64Url(ivPart),
    );
    decipher.setAuthTag(fromBase64Url(tagPart));
    const plaintext = Buffer.concat([
      decipher.update(fromBase64Url(ciphertextPart)),
      decipher.final(),
    ]).toString("utf8");
    const payload = phase0SessionPayloadSchema.parse(JSON.parse(plaintext));
    const now = options?.now ?? new Date();

    if (payload.exp < now.getTime()) {
      throw new EmailnatorError("CAPSULE_EXPIRED", "The session capsule has expired.", {
        status: 400,
      });
    }

    return payload.state;
  } catch (error) {
    if (error instanceof EmailnatorError) {
      throw error;
    }

    throw new EmailnatorError("CAPSULE_INVALID", "Invalid session capsule.", {
      cause: error,
      status: 400,
    });
  }
}
