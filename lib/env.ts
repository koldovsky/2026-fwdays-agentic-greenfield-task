import { authEnvSchema, type AuthEnv } from "@/lib/schemas/auth";

/**
 * Server-side auth env, parsed once against `authEnvSchema` (TC-VALID-01) and
 * memoised. Lazy on purpose: reading happens on first use (a request that
 * signs in, refreshes, or signs out), not at import time, so `next build`
 * stays green without the secret present and the value is never pulled into a
 * client bundle (NFR-SEC-02).
 *
 * Importing this module from a client component would surface a server-only
 * secret, so it is only imported by the sign-in action, the sign-out handler,
 * and `proxy.ts`.
 */
let cached: AuthEnv | undefined;

export function getAuthEnv(): AuthEnv {
  if (cached === undefined) {
    cached = authEnvSchema.parse({
      AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET,
      AUTH_ACCESS_TTL: process.env.AUTH_ACCESS_TTL,
      AUTH_REFRESH_TTL: process.env.AUTH_REFRESH_TTL,
    });
  }
  return cached;
}
