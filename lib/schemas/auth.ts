import { z } from "zod";

/**
 * Auth boundary schemas (TC-VALID-01). All inbound auth data — the sign-in
 * form, the access-token payload, and the auth env vars — is parsed here, and
 * the TypeScript types are inferred via `z.infer` so schema and type never
 * drift. No user credential lives in env; only the JWT signing key does
 * (FR-AUTH-02, NFR-SEC-02).
 */

/** Sign-in form input. The single HR account is looked up by email in `HrUser`. */
export const signInInputSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type SignInInput = z.infer<typeof signInInputSchema>;

/**
 * Access-token claims we rely on. `sub` is the owning `HrUser` id (FR-AUTH-03).
 * `iat`/`exp` are managed and verified by `jose`; we only re-validate `sub`.
 */
export const accessPayloadSchema = z.object({
  sub: z.string().min(1),
});

export type AccessPayload = z.infer<typeof accessPayloadSchema>;

/**
 * Auth environment. Only the JWT signing secret (server-side, never bundled to
 * the client — NFR-SEC-02) plus optional token-lifetime overrides. A duration
 * is a bare number of seconds or a `<n>[smhd]` string (e.g. "15m", "7d").
 */
const durationString = z.string().regex(/^(\d+[smhd]|\d+)$/, "expected e.g. 15m, 7d, or seconds");

export const authEnvSchema = z.object({
  AUTH_JWT_SECRET: z.string().min(32),
  AUTH_ACCESS_TTL: durationString.optional(),
  AUTH_REFRESH_TTL: durationString.optional(),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;
