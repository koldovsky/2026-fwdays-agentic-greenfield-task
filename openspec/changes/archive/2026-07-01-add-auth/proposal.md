## Why

Honeydo is single-user and fully gated: every entry, tag, and stat is scoped to the
signed-in user (BC-SCOPE-01), and the app shows nothing but the auth screen until login
(FR-SHELL-02). No other capability can be built until authentication exists, so `auth` is
the first capability after `foundation`. It must be secure by construction — hashed
passwords and short-lived, rotating tokens (NFR-SEC-01).

## What Changes

- **New `auth` capability**: email + password sign-up with password-strength validation,
  email + password sign-in issuing a short-lived access JWT and a rotating refresh token,
  Google sign-in (OAuth 2.0 + PKCE) that provisions an account on first use, account
  linking (a verified email via password and Google resolves to one account), sign-out
  that revokes the refresh token server-side, and a 401 + auth-redirect contract for
  protected endpoints. (FR-AUTH-01→06, NFR-SEC-01, TC-STACK-04)
- **API (`@honeydo/api`)**: an `auth` module (signup / login / refresh / logout + Google
  callback), a JWT access guard applied to protected routes, refresh-token rotation with
  revocation, argon2 password hashing, and new `User` + `RefreshToken` Prisma models with a
  migration.
- **Shared (`@honeydo/shared`)**: auth request/response contracts and a **pure,
  framework-free password-strength validator** (100% unit-tested per TC-PURE-01/TC-TEST-01),
  reused by client and server.
- **Mobile (`@honeydo/mobile`)**: an auth screen (email/password + "Continue with Google"),
  secure token storage, an authenticated API client with refresh handling, and a 401 →
  auth-screen redirect. (UI styling defers to the pending brand decision — see Impact.)

## Capabilities

### New Capabilities
- `auth`: user identity and session management — email/password + Google sign-in, JWT access
  + rotating refresh tokens, account linking, sign-out/revocation, and protected-route
  authorization for the single-user model.

### Modified Capabilities
<!-- None. `foundation` is infrastructure; `app-shell`/`theming` are not yet built. -->

## Impact

- **New API deps**: `@nestjs/jwt`, `@nestjs/passport` + `passport`/`passport-jwt`, `argon2`,
  and a Google OAuth verification path (`google-auth-library`).
- **New mobile deps**: `expo-secure-store` (token storage) and `expo-auth-session` (Google
  OAuth + PKCE).
- **Data**: new `User` and `RefreshToken` tables + Prisma migration; `TimeEntry` (and future
  models) will later gain a `userId` owner — out of scope here, flagged for `time-entries`.
- **Config/secrets**: JWT signing secret + access/refresh TTLs, Google OAuth client id(s)/
  secret — all server-side only, added to `.env(.example)`.
- **Blocked-on**: the honey-vs-blackwork **brand decision** gates final auth-screen styling
  (FR-THEME-03/BC-BRAND-01); the screen can be built against design tokens and restyled once
  resolved. Backend and shared work are unblocked.
