## Why

Every cabinet screen (directory, templates, cycles, results, report, usage) is HR-only and
must sit behind sign-in: an unauthenticated request to a cabinet route has to land on the
sign-in page, never on real data (FR-AUTH-01, NFR-SEC-01). The MVP has exactly one HR
account, configured out-of-band rather than self-registered (FR-AUTH-02). This change is the
**auth half of slice 1 (`shell`)** in `docs/mvp-capability-plan.md`: it delivers sign-in, the
session token mechanism, and the route guard. The cabinet **layout** (sidebar + sticky header,
FR-SHELL-01..03) is split off into a separate slice; this slice ships only a minimal sign-in
page so the layout slice can build inside an already-protected shell.

The session design is fixed by the PRD: a short-lived access token plus a longer-lived refresh
token, both delivered **only** in `httpOnly`, `Secure`, `SameSite` cookies — never in
`localStorage`, never readable by client JS, never in the URL (FR-AUTH-04); the access token is
refreshed transparently via the refresh token (FR-AUTH-03); and sign-out and refresh rotation
invalidate the prior refresh token so a stolen one cannot be silently reused (FR-AUTH-05). The
pure token/credential logic lives in framework-free `lib/` with unit tests (TC-PURE-01), all
inbound data is Zod-validated at the boundary (TC-VALID-01), and secrets stay in server-side
env (NFR-SEC-02).

## What Changes

- Add framework-free `lib/auth/`:
  - `tokens.ts` — sign/verify the **access token** (a signed JWT, HS256 via `jose`, short TTL)
    and mint/hash the **refresh token** (an opaque random string; only its hash is ever stored).
    Pure, runtime-agnostic and portable (TC-PURE-01).
  - `password.ts` — `verifyPassword(plain, storedHash)` using `scrypt` from `node:crypto` with a
    constant-time compare, so the stored `HrUser.passwordHash` is checked without ever storing
    or logging the plaintext.
- Add `lib/schemas/auth.ts` — Zod schemas for the sign-in input, the access-token payload, and
  the auth env vars; TypeScript types derived via `z.infer` (TC-VALID-01). Add `lib/env.ts` to
  parse `process.env` once, server-side, against the env schema (`AUTH_JWT_SECRET` + TTLs only —
  no user credential in env).
- Add `HrUser` and `Session` models to `prisma/schema.prisma` in one migration. `HrUser` (email,
  `passwordHash`, optional name) holds the single HR account in Postgres — added by an admin, not
  self-registered (FR-AUTH-02). `Session` is the server-side store of valid refresh tokens (hash,
  expiry, `revokedAt`, rotation link): revocation is a DB flag, which is what makes FR-AUTH-05
  correct — you cannot "un-issue" a bare JWT, but you can revoke a session.
- Add a `POST /api/auth/sign-out` Route Handler (revoke current session, clear cookies)
  (FR-AUTH-05).
- Add `proxy.ts` at the project root (Next 16 renamed the `middleware` file convention to
  `proxy`, which runs on the **Node.js** runtime). Cabinet routes with a valid access token pass;
  with an expired access token but a present, live refresh token, the proxy rotates the session
  via `lib/db` and sets new cookies on the response in place (transparent refresh) — no separate
  refresh endpoint; otherwise it redirects to `/sign-in?next=…` (FR-AUTH-01, FR-AUTH-03,
  FR-AUTH-05).
- Add a minimal sign-in page `app/sign-in/page.tsx` + a `signIn` server action: Zod-validate,
  look up the `HrUser` by email via `lib/db` and verify the password against its hash, create a
  session, set both cookies, redirect to `next` (or `/`). Styled with the Kolo360 tokens; explicit
  empty/loading/error states; Ukrainian-first strings.
- Add `lib/i18n/uk.ts` + `en.ts` with the auth strings (NFR-I18N-01).
- Update `.env.example` with `AUTH_JWT_SECRET` and optional TTL overrides only (no user
  credential in env). Add `scripts/hash-password` (prints a `scrypt$…` hash) and
  `scripts/create-hr-user` (hashes a password and upserts the `HrUser` row), so an admin
  provisions the single account in the DB. Add the `jose` dependency.

This change deliberately does **not**: build the cabinet layout (sidebar, header, nav —
FR-SHELL-01..03, separate slice); support more than one account, password reset, or
self-registration (out of MVP scope, FR-AUTH-02); add email/2FA; or wire the respondent shell
(FR-SHELL-02).

## Capabilities

### New Capabilities
- `auth`: single-HR-account sign-in (credentials in the `HrUser` table, added by an admin) with a
  short-lived access token + rotating refresh token, delivered only in `httpOnly`/`Secure`/
  `SameSite` cookies, transparent refresh, sign-out and rotation invalidating the prior refresh
  token, a cabinet-route guard, and a minimal sign-in page — pure token/credential logic in
  `lib/`, Zod-validated inputs, only the JWT signing key in env.

### Modified Capabilities
- `data-model`: adds an `HrUser` model (the single HR account's credentials) and a `Session`
  model (refresh-token store) to the existing schema. No change to the MVP entity models laid
  down by `add-foundation`.

## Impact

- New: `lib/auth/{tokens,password,session}.ts` (+ tests), `lib/schemas/auth.ts`, `lib/env.ts`,
  `lib/i18n/{uk,en}.ts`, `proxy.ts`, `app/sign-in/page.tsx` + sign-in server action,
  `app/api/auth/sign-out/route.ts`, `scripts/hash-password`, `scripts/create-hr-user`.
- Modified: `prisma/schema.prisma` (+ `HrUser`, `Session`), one new migration, `.env.example`,
  `package.json` (+ `jose`).
- Consumed by: every cabinet slice (directory, templates, cycles, results, report, usage) now
  sits behind the guard; the `cabinet-shell` slice renders its layout inside the protected area
  and reuses `lib/i18n` + the session helper.
