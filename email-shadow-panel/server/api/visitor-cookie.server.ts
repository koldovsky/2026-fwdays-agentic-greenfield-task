import { randomBytes } from "node:crypto";

import { z } from "zod";

const anonymousVisitorCookieSchema = z
  .string()
  .min(43)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u, "anonymous visitor cookie must be opaque base64url.");

type RandomBytesFn = (size: number) => Uint8Array;

export interface AnonymousVisitorCookieConfig {
  name: string;
  maxAgeSeconds: number;
  secure: boolean;
}

export interface AnonymousVisitorCookieResolution {
  value: string;
  setCookieHeader?: string;
  rotated: boolean;
}

function parseCookieHeader(headerValue: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!headerValue) {
    return cookies;
  }

  for (const part of headerValue.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const name = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    cookies.set(name, value);
  }

  return cookies;
}

function generateOpaqueCookieValue(randomBytesImpl: RandomBytesFn): string {
  return anonymousVisitorCookieSchema.parse(Buffer.from(randomBytesImpl(32)).toString("base64url"));
}

function buildSetCookieHeader(config: AnonymousVisitorCookieConfig, value: string): string {
  const parts = [
    `${config.name}=${value}`,
    `Max-Age=${config.maxAgeSeconds}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (config.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function resolveAnonymousVisitorCookie(
  request: Request,
  config: AnonymousVisitorCookieConfig,
  randomBytesImpl: RandomBytesFn = randomBytes,
): AnonymousVisitorCookieResolution {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const currentValue = cookies.get(config.name);
  const parsed = anonymousVisitorCookieSchema.safeParse(currentValue);

  if (parsed.success) {
    return {
      value: parsed.data,
      rotated: false,
    };
  }

  const nextValue = generateOpaqueCookieValue(randomBytesImpl);
  return {
    value: nextValue,
    setCookieHeader: buildSetCookieHeader(config, nextValue),
    rotated: Boolean(currentValue),
  };
}
