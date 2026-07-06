import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import {
  CAPABILITY_TOKEN_BYTES,
  capabilityTokenHashSchema,
  capabilityTokenSchema,
} from "./contracts.server.ts";
import { DomainError } from "./errors.server.ts";

type RandomBytesFn = (size: number) => Uint8Array;

function toBase64Url(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString("base64url");
}

export function generateCapabilityToken(randomBytesImpl: RandomBytesFn = randomBytes): string {
  return capabilityTokenSchema.parse(toBase64Url(randomBytesImpl(CAPABILITY_TOKEN_BYTES)));
}

export function hashCapabilityToken(token: string): string {
  return capabilityTokenHashSchema.parse(
    createHash("sha256").update(token, "utf8").digest("base64url"),
  );
}

export function validateCapabilityToken(token: string): string {
  const parsed = capabilityTokenSchema.safeParse(token);
  if (!parsed.success) {
    throw new DomainError("INVALID_CAPABILITY", "Capability token validation failed.", {
      safeMessage: "The capability token is invalid.",
    });
  }

  return parsed.data;
}

export function validateAndHashCapabilityToken(token: string): string {
  return hashCapabilityToken(validateCapabilityToken(token));
}

export function capabilityTokenHashMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashCapabilityToken(validateCapabilityToken(token)));
  const expected = Buffer.from(capabilityTokenHashSchema.parse(expectedHash));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
