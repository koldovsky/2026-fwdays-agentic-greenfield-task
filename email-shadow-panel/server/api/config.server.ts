import { z } from "zod";

import { DomainError } from "../session/errors.server.ts";

const booleanStringSchema = z.enum(["true", "false"]);

const publicApiEnvSchema = z.object({
  EMAILNATOR_PROVIDER_ENABLED: booleanStringSchema.default("true"),
  PUBLIC_API_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(12_000),
  PUBLIC_API_MAX_ACTIVE_INBOXES_PER_VISITOR: z.coerce.number().int().min(1).max(20).default(3),
  PUBLIC_API_CREATE_LIMIT_PER_VISITOR: z.coerce.number().int().min(1).max(100).default(5),
  PUBLIC_API_CREATE_LIMIT_PER_IP: z.coerce.number().int().min(1).max(500).default(20),
  PUBLIC_API_CREATE_WINDOW_SECONDS: z.coerce.number().int().min(60).max(86_400).default(3_600),
  PUBLIC_API_READ_LIMIT_PER_CAPABILITY: z.coerce.number().int().min(1).max(600).default(60),
  PUBLIC_API_READ_WINDOW_SECONDS: z.coerce.number().int().min(10).max(3_600).default(60),
  PUBLIC_API_OPERATION_LOCK_TTL_MS: z.coerce.number().int().min(1_000).max(60_000).default(15_000),
  PUBLIC_VISITOR_COOKIE_NAME: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/u, "PUBLIC_VISITOR_COOKIE_NAME must use a cookie-safe character set.")
    .default("esp_anon_v1"),
  PUBLIC_VISITOR_COOKIE_MAX_AGE_SECONDS: z.coerce
    .number()
    .int()
    .min(300)
    .max(31_536_000)
    .default(2_592_000),
  NODE_ENV: z.string().optional(),
  VERCEL_ENV: z.string().optional(),
});

export interface PublicApiConfig {
  providerEnabled: boolean;
  requestTimeoutMs: number;
  maxActiveInboxesPerVisitor: number;
  createLimitPerVisitor: number;
  createLimitPerIp: number;
  createWindowMs: number;
  readLimitPerCapability: number;
  readWindowMs: number;
  operationLockTtlMs: number;
  activeInboxReservationTtlMs: number;
  visitorCookieName: string;
  visitorCookieMaxAgeSeconds: number;
  secureVisitorCookie: boolean;
}

function failConfigValidation(message: string): never {
  throw new DomainError("CONFIGURATION_INVALID", message, {
    safeMessage: "Required public API configuration is invalid.",
  });
}

export function loadPublicApiConfig(
  env: Record<string, string | undefined> = process.env,
): PublicApiConfig {
  const parsed = publicApiEnvSchema.safeParse(env);
  if (!parsed.success) {
    failConfigValidation("Public API configuration validation failed.");
  }

  return {
    providerEnabled: parsed.data.EMAILNATOR_PROVIDER_ENABLED === "true",
    requestTimeoutMs: parsed.data.PUBLIC_API_REQUEST_TIMEOUT_MS,
    maxActiveInboxesPerVisitor: parsed.data.PUBLIC_API_MAX_ACTIVE_INBOXES_PER_VISITOR,
    createLimitPerVisitor: parsed.data.PUBLIC_API_CREATE_LIMIT_PER_VISITOR,
    createLimitPerIp: parsed.data.PUBLIC_API_CREATE_LIMIT_PER_IP,
    createWindowMs: parsed.data.PUBLIC_API_CREATE_WINDOW_SECONDS * 1000,
    readLimitPerCapability: parsed.data.PUBLIC_API_READ_LIMIT_PER_CAPABILITY,
    readWindowMs: parsed.data.PUBLIC_API_READ_WINDOW_SECONDS * 1000,
    operationLockTtlMs: parsed.data.PUBLIC_API_OPERATION_LOCK_TTL_MS,
    activeInboxReservationTtlMs: Math.max(
      parsed.data.PUBLIC_API_OPERATION_LOCK_TTL_MS,
      parsed.data.PUBLIC_API_REQUEST_TIMEOUT_MS + 3_000,
    ),
    visitorCookieName: parsed.data.PUBLIC_VISITOR_COOKIE_NAME,
    visitorCookieMaxAgeSeconds: parsed.data.PUBLIC_VISITOR_COOKIE_MAX_AGE_SECONDS,
    secureVisitorCookie:
      parsed.data.NODE_ENV === "production" || parsed.data.VERCEL_ENV === "production",
  };
}
