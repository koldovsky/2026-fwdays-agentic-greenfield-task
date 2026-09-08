import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { z } from "zod";

import { DomainError } from "./errors.server.ts";

const ENCRYPTION_ENVELOPE_VERSION = "es1";
const encryptedEnvelopeSchema = z
  .string()
  .min(24)
  .max(262_144)
  .regex(
    /^es1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u,
    "encrypted state must use the expected envelope format.",
  );

type RandomBytesFn = (size: number) => Uint8Array;

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function toBase64Url(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString("base64url");
}

function decodeKeyMaterial(secret: string, envName: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/u.test(secret)) {
    return Buffer.from(secret, "hex");
  }

  try {
    const decoded = fromBase64Url(secret);
    if (decoded.length === 32) {
      return decoded;
    }
  } catch {
    // Fall through to the configuration error below.
  }

  throw new DomainError("CONFIGURATION_INVALID", `${envName} must decode to exactly 32 bytes.`, {
    safeMessage: "Required secure server configuration is invalid.",
  });
}

export interface EncryptionService {
  encrypt<TValue>(value: TValue): string;
  decrypt<TValue>(ciphertext: string, schema: z.ZodType<TValue>): TValue;
}

export function createEncryptionService(options: {
  key: string;
  keyEnvName?: string;
  randomBytesImpl?: RandomBytesFn;
}): EncryptionService {
  const keyMaterial = decodeKeyMaterial(
    options.key,
    options.keyEnvName ?? "SESSION_ENCRYPTION_KEY",
  );
  const randomBytesImpl = options.randomBytesImpl ?? randomBytes;

  return {
    encrypt<TValue>(value: TValue): string {
      try {
        const iv = Buffer.from(randomBytesImpl(12));
        const cipher = createCipheriv("aes-256-gcm", keyMaterial, iv);
        const ciphertext = Buffer.concat([
          cipher.update(JSON.stringify(value), "utf8"),
          cipher.final(),
        ]);
        const tag = cipher.getAuthTag();
        return encryptedEnvelopeSchema.parse(
          [
            ENCRYPTION_ENVELOPE_VERSION,
            toBase64Url(iv),
            toBase64Url(ciphertext),
            toBase64Url(tag),
          ].join("."),
        );
      } catch (error) {
        if (error instanceof DomainError) {
          throw error;
        }

        throw new DomainError("ENCRYPTION_FAILURE", "Session state encryption failed.", {
          cause: error,
          safeMessage: "Session state could not be encrypted.",
        });
      }
    },
    decrypt<TValue>(ciphertext: string, schema: z.ZodType<TValue>): TValue {
      try {
        const [version, ivPart, cipherPart, tagPart] = encryptedEnvelopeSchema
          .parse(ciphertext)
          .split(".");

        if (version !== ENCRYPTION_ENVELOPE_VERSION) {
          throw new DomainError(
            "ENCRYPTION_FAILURE",
            "Session state envelope version is not supported.",
            {
              safeMessage: "Stored session state could not be decrypted.",
            },
          );
        }

        const decipher = createDecipheriv("aes-256-gcm", keyMaterial, fromBase64Url(ivPart));
        decipher.setAuthTag(fromBase64Url(tagPart));
        const plaintext = Buffer.concat([
          decipher.update(fromBase64Url(cipherPart)),
          decipher.final(),
        ]).toString("utf8");

        const parsed = schema.safeParse(JSON.parse(plaintext));
        if (!parsed.success) {
          throw new DomainError(
            "ENCRYPTION_FAILURE",
            "Decrypted session state failed validation.",
            {
              safeMessage: "Stored session state could not be decrypted.",
            },
          );
        }

        return parsed.data;
      } catch (error) {
        if (error instanceof DomainError) {
          throw error;
        }

        throw new DomainError("ENCRYPTION_FAILURE", "Session state decryption failed.", {
          cause: error,
          safeMessage: "Stored session state could not be decrypted.",
        });
      }
    },
  };
}
