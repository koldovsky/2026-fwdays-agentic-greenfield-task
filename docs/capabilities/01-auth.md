# Capability: auth

- **Order:** 01 · **Phase:** 1 · **OpenSpec change:** `add-auth` · **Status:** not started
- **Depends on:** foundation · **Blocks:** app-shell, time-entries (everything user-scoped)
- **Packages:** `apps/api`, `apps/mobile`, `packages/shared`

## Summary

Email+password and Google sign-in, with short-lived access tokens and rotating refresh
tokens. Establishes the single signed-in user that every other capability is scoped to
(BC-SCOPE-01).

## Requirements

| ID | Description |
|----|-------------|
| FR-AUTH-01 | Sign up with email + password; password validated for minimum strength |
| FR-AUTH-02 | Sign in with email + password; server issues short-lived access JWT + rotating refresh token |
| FR-AUTH-03 | Sign in with Google (OAuth 2.0 + PKCE); first Google sign-in provisions an account |
| FR-AUTH-04 | Same verified email via password and Google resolves to one account, not two |
| FR-AUTH-05 | Sign out; refresh token revoked server-side |
| FR-AUTH-06 | Protected endpoints without a valid token return 401; app routes back to auth screen |
| NFR-SEC-01 | Passwords hashed with argon2/bcrypt; access tokens short-lived; refresh rotated on use |
| TC-STACK-04 | JWT access + rotating refresh; Google OAuth 2.0 + PKCE for SSO |

## Pure-logic surface

Password-strength validation (framework-free, unit-tested).

## Scope

- API: auth module (signup/login/refresh/logout), Google OAuth callback, JWT guard, refresh
  rotation + revocation, `User` Prisma model.
- Mobile: auth screen (email/password + "Continue with Google"), token storage, 401 → auth
  redirect, authenticated API client.
- Shared: auth request/response contracts.

## Non-goals

No password reset / email verification flows in MVP unless promoted; no multi-user, no roles.

## Risks / notes

Google OAuth needs client credentials + redirect setup. Refresh-token rotation must revoke the
old token atomically (NFR-SEC-01).
