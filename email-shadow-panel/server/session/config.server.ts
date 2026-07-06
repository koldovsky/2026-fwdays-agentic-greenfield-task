import { z } from "zod";

import { DomainError } from "./errors.server.ts";

const sessionCoreEnvSchema = z.object({
  SESSION_ENCRYPTION_KEY: z.string().min(1),
  VISITOR_HASH_KEY: z.string().min(1),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().max(86_400),
});

const upstashEnvSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  REDIS_KEY_NAMESPACE: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9:_-]+$/u, "REDIS_KEY_NAMESPACE must use a safe Redis-key character set."),
});

export interface SessionCoreConfig {
  sessionEncryptionKey: string;
  visitorHashKey: string;
  sessionTtlMs: number;
}

export interface UpstashSessionRepositoryConfig {
  url: string;
  token: string;
  namespace: string;
}

function failConfigValidation(message: string): never {
  throw new DomainError("CONFIGURATION_INVALID", message, {
    safeMessage: "Required server configuration is invalid.",
  });
}

export function loadSessionCoreConfig(
  env: Record<string, string | undefined> = process.env,
): SessionCoreConfig {
  const parsed = sessionCoreEnvSchema.safeParse(env);
  if (!parsed.success) {
    failConfigValidation("Session core configuration validation failed.");
  }

  return {
    sessionEncryptionKey: parsed.data.SESSION_ENCRYPTION_KEY,
    visitorHashKey: parsed.data.VISITOR_HASH_KEY,
    sessionTtlMs: parsed.data.SESSION_TTL_SECONDS * 1000,
  };
}

export function loadUpstashSessionRepositoryConfig(
  env: Record<string, string | undefined> = process.env,
): UpstashSessionRepositoryConfig {
  const parsed = upstashEnvSchema.safeParse(env);
  if (!parsed.success) {
    failConfigValidation("Upstash repository configuration validation failed.");
  }

  return {
    url: parsed.data.UPSTASH_REDIS_REST_URL,
    token: parsed.data.UPSTASH_REDIS_REST_TOKEN,
    namespace: parsed.data.REDIS_KEY_NAMESPACE,
  };
}
