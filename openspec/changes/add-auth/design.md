## Context

`foundation` is in place (NestJS + Prisma API, `@honeydo/shared`, Expo mobile, quality
gate). No identity model exists yet. This change adds the `auth` capability: the single
signed-in user that every later capability is scoped to (BC-SCOPE-01). Constraints:
JWT access + rotating refresh tokens and Google OAuth 2.0 + PKCE (TC-STACK-04), argon2
hashing and short-lived/rotated tokens (NFR-SEC-01), pure logic framework-free and tested
(TC-PURE-01/TC-TEST-01), and no secrets on the client (FR-AUTH-02, FR-INSIGHT-02 pattern).

## Goals / Non-Goals

**Goals:**
- Email/password + Google sign-in, both landing on one account per verified email.
- Stateless short-lived access JWT; refresh tokens rotated and revocable (DB-backed).
- A shared, unit-tested password-strength validator reused by client and server.
- A reusable `JwtAuthGuard` + `@CurrentUser()` decorator for later protected capabilities.
- Secure token storage and transparent refresh on the mobile client.

**Non-Goals:**
- Password reset / email verification flows (defer; not in FR-AUTH-*).
- Adding `userId` ownership to `TimeEntry`/other models (belongs to `time-entries`).
- Final auth-screen visual design (blocked on the brand decision; build against tokens).
- Roles/permissions — there is exactly one role (BC-SCOPE-01).

## Decisions

- **Access = stateless JWT, refresh = opaque DB-backed token.** Access JWTs are signed with
  a short TTL (~15 min) and verified statelessly by the guard. Refresh tokens are random
  opaque strings, **stored only as a hash** in a `RefreshToken` row with `expiresAt` and
  `revokedAt`, so they can be rotated and revoked. Alternative (stateless refresh JWT)
  rejected: can't revoke on sign-out (FR-AUTH-05) or detect reuse.
- **Rotation with reuse detection.** Each `/auth/refresh` verifies the presented token
  against a non-revoked, non-expired row, marks it rotated (`revokedAt` + `replacedById`),
  and issues a new pair. Presenting an already-rotated token is rejected; on reuse we revoke
  the whole chain for that user (defense in depth). Satisfies NFR-SEC-01.
- **argon2 for password hashing.** `argon2` (argon2id) over bcrypt — stronger default,
  first-class TS support. Hash on write; never store/return plaintext.
- **Google via `@nestjs/passport` + `google-auth-library` on the server; PKCE on the
  client.** The mobile app runs the OAuth 2.0 + PKCE flow with `expo-auth-session`, then
  sends the resulting Google **id_token** to `POST /auth/google`; the server verifies it
  with `google-auth-library` and provisions/links. Keeps the client secret server-side
  (TC-STACK-04). Alternative (server-side redirect flow) rejected: worse native UX.
- **Account model: `User` + `AuthIdentity`.** `User` holds email (unique) + optional
  `passwordHash`. `AuthIdentity` holds `(provider, providerUserId)` → `userId` so both
  `password` and `google` map to one `User` by verified email (FR-AUTH-04). Linking: on
  Google sign-in, look up by email; if a `User` exists, attach a `google` `AuthIdentity`;
  else create both.
- **Password-strength validator lives in `@honeydo/shared`.** A pure `validatePassword`
  (length + character-class/entropy rules) returning a typed result, used by the mobile
  form and the API DTO, 100% unit-tested (TC-PURE-01). Contracts (`SignUpRequest`,
  `AuthTokens`, `AuthUser`, etc.) also go in shared.
- **Reusable authz primitives.** `JwtAuthGuard` (global-optional or per-controller) +
  `@CurrentUser()` param decorator, so `time-entries` and later capabilities just annotate.
- **Mobile: `expo-secure-store` + a fetch wrapper.** Tokens stored in secure storage; an
  API client attaches the access token, and on 401 attempts one refresh then retries, else
  clears the session and routes to auth (FR-AUTH-06).

## Risks / Trade-offs

- **Refresh-token DB lookups on every refresh** → acceptable at single-user scale; index
  `RefreshToken(userId)` and store only hashes.
- **Google id_token verification depends on Google's certs/availability** → verify audience
  + issuer strictly; surface a clean auth error on failure (NFR-OBS-01), never a blank.
- **Clock skew on short access TTL** → allow a small leeway in JWT verification; client
  refreshes proactively before expiry.
- **Auth screen styling blocked on brand decision** → build the screen from design tokens
  now; a restyle is a token swap, not a rebuild (FR-THEME-03).
- **Secret sprawl in `.env`** → document all keys in `.env.example`; never commit real
  secrets (already gitignored).

## Migration Plan

- Add Prisma models `User`, `AuthIdentity`, `RefreshToken`; generate a migration
  (`prisma migrate dev --name add-auth`). Additive only — no existing rows to backfill.
- Add env keys (`JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`,
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) to `.env` + `.env.example`.
- No rollback complexity: dropping the tables and the `auth` module reverts the change.

## Open Questions

- **Google client id(s):** iOS vs web client ids for Expo — confirm which the dev build
  uses; may need both audiences accepted during verification.
- **Access token TTL / refresh TTL exact values** — default 15 min / 30 days; confirm at
  implementation.
- **Brand decision** (honey vs blackwork) — resolve before finalizing auth-screen visuals.
