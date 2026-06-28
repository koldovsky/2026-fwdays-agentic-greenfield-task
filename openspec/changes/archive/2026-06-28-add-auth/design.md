## Context

Auth half of slice 1 (`shell`) in `docs/mvp-capability-plan.md`. The PRD fixes the mechanism:
single configured HR account (FR-AUTH-02), short-lived access + longer-lived refresh token
(FR-AUTH-03), both **only** in `httpOnly`/`Secure`/`SameSite` cookies (FR-AUTH-04), transparent
refresh (FR-AUTH-03), sign-out/rotation invalidating the prior refresh token (FR-AUTH-05),
unauthenticated cabinet requests redirected to sign-in (FR-AUTH-01, NFR-SEC-01). Architecture
rules apply: pure token/credential logic in framework-free `lib/` with unit tests (TC-PURE-01),
Zod at every boundary with `z.infer` types (TC-VALID-01), no `any`/casts/`@ts-ignore`, secrets
server-side only (NFR-SEC-02). The cabinet **layout** (FR-SHELL-01..03) is a separate slice;
this slice only needs a minimal sign-in page and a working route guard.

The foundation slice deferred auth tables ("revisit if multi-user lands"). Revisiting now: this
slice adds two small tables. `HrUser` holds the single HR account's credentials (email +
password hash) in Postgres rather than env — added by an administrator, never self-registered,
so FR-AUTH-02 still holds while the credential lives where the rest of the app's data lives and
can grow to multi-user later without a config migration. `Session` is needed because FR-AUTH-05
(invalidate the prior refresh token) is impossible for a bare stateless JWT — you cannot un-issue
one — so its `revokedAt` flag is the invalidation mechanism. Only `AUTH_JWT_SECRET` (the JWT
signing key, not user data) stays in env.

## Goals / Non-Goals

**Goals**

- Sign-in for the single HR account stored in the `HrUser` table (added by an admin, not
  self-registered); wrong email/password is rejected with a generic message (no user-enumeration),
  the plaintext never stored or logged.
- Access token (signed JWT, short TTL) + refresh token (opaque, hashed at rest), both set as
  `httpOnly; Secure; SameSite=Lax` cookies; nothing token-related ever reaches client JS, the
  URL, or `localStorage` (FR-AUTH-04).
- Transparent refresh: an expired access token with a still-valid refresh cookie yields a fresh
  access token and a rotated refresh token without the user re-authenticating (FR-AUTH-03).
- Rotation and sign-out revoke the prior refresh token in the `Session` store; a revoked or
  reused refresh token is rejected and clears the session (FR-AUTH-05).
- Unauthenticated cabinet requests redirect to `/sign-in?next=…` (FR-AUTH-01).
- Pure logic in `lib/auth/` is 100% unit-tested (TC-PURE-01); all inputs Zod-parsed (TC-VALID-01).

**Non-Goals**

- No cabinet layout / sidebar / header (FR-SHELL-01..03) — separate slice.
- No multi-user, registration, password reset, email verification, or 2FA (out of MVP).
- No respondent-route auth here (respondent access is the cycle token, FR-LINK-02, later slice).
- No CSRF token framework beyond `SameSite=Lax` + same-origin server actions/handlers in MVP.

## Decisions

- **Access token = signed JWT (HS256 via `jose`); refresh token = opaque random string.** The
  access token is stateless and cheap to verify with just the secret — no DB hit to authorize a
  request, only to refresh. The refresh token carries no claims; it is 32 bytes of CSPRNG
  randomness, and only its **SHA-256 hash** is stored (`Session.tokenHash`), so a DB leak does
  not yield usable tokens. `jose` (not `jsonwebtoken`) keeps `lib/auth/tokens.ts` dependency-light
  and runtime-agnostic via WebCrypto, framework-free (TC-PURE-01). TTLs: access 15 min, refresh
  7 days (env-overridable).

- **`lib/auth/` is pure and runtime-agnostic (TC-PURE-01).**
  - `tokens.ts`: `signAccessToken(payload, secret)`, `verifyAccessToken(jwt, secret) → payload | null`,
    `generateRefreshToken() → { token, tokenHash }`, `hashRefreshToken(token)`. JWT via `jose`;
    hashing via WebCrypto `subtle.digest` so the module imports no `node:*` and stays portable.
    No `next/*`, no `react`, no DOM. The signing key is passed in by the caller (read from
    validated env), never imported from `process.env` inside `lib/`.
  - `password.ts`: `verifyPassword(plain, storedHash)` using `scrypt` from `node:crypto` with a
    constant-time `timingSafeEqual`; the stored format is `scrypt$N$r$p$salt$hash` (base64).
    Imported only from the sign-in path, never from the proxy. (Password hashing is kept separate
    from `tokens.ts` so the token module stays dependency-light and free of `node:crypto`.)
  - Both take all inputs as arguments and return plain values — no I/O, no globals — so they are
    100% unit-testable.

- **`HrUser` model holds the single HR account (FR-AUTH-02).** The credential lives in Postgres,
  not env: an administrator inserts one row (email + scrypt hash) out-of-band, and there is no
  self-registration path. Email is `@unique`; the MVP relies on exactly one row, but the table
  shape already supports multi-user, so growing later needs a feature, not a schema/config rewrite.
  Only the password **hash** is stored — the plaintext never touches the DB, logs, or env.

  ```prisma
  model HrUser {
    id           String   @id @default(cuid())
    email        String   @unique
    passwordHash String                  // scrypt$N$r$p$salt$hash — never the plaintext
    name         String?
    createdAt    DateTime @default(now())
  }
  ```

- **`Session` model is the refresh-token store (the FR-AUTH-05 mechanism).** A bare JWT cannot be
  invalidated; a row can. On sign-in we create a `Session` (hash, `expiresAt`); on refresh we
  verify the presented refresh token's hash matches a live, non-revoked, non-expired row, then
  **rotate**: mark the old row `revokedAt = now`, set `replacedById` to the new row, and issue a
  new pair. On sign-out we set `revokedAt` on the current row and clear cookies. A presented
  refresh token whose row is missing, revoked, or expired is rejected and the cookies cleared —
  so a stolen prior token is dead the moment a newer one was minted (FR-AUTH-05). The `subject`
  field carries the owning `HrUser` id (the access token's subject claim) so the store is already
  user-scoped for forward-compat; the MVP simply has one such user.

  ```prisma
  model Session {
    id           String    @id @default(cuid())
    tokenHash    String    @unique          // SHA-256 of the opaque refresh token
    subject      String                     // owning HrUser id (token subject claim)
    expiresAt    DateTime
    revokedAt    DateTime?
    replacedById String?   @unique          // rotation chain → the successor session
    replacedBy   Session?  @relation("Rotation", fields: [replacedById], references: [id])
    replaces     Session?  @relation("Rotation")
    createdAt    DateTime  @default(now())
  }
  ```

- **Cookies (FR-AUTH-04).** Both cookies: `httpOnly`, `SameSite=Lax`, `Secure` in production
  (omitted only on `http://localhost` dev so local sign-in works). On sign-in/sign-out they are
  set via `next/headers` `cookies()` from the server action/handler; on transparent refresh the
  proxy sets them on its `NextResponse` via `response.cookies.set(...)` — never via
  `document.cookie`. Both use `Path=/` so the proxy receives the `access_token` and the
  `refresh_token` on every cabinet route and can refresh in place. `SameSite=Lax` (not `Strict`)
  so the top-level navigation from sign-in carries the cookie; combined with same-origin server
  actions/handlers this covers CSRF for MVP. Cookie `Max-Age` mirrors the token TTLs.

- **Route guard + transparent refresh both live in `proxy.ts` (Next 16, Node runtime).** Next 16
  renamed the `middleware` file convention to `proxy`, and `proxy` runs on the **Node.js** runtime
  (the `runtime` config option is unavailable in proxy files and throws if set). Because proxy is
  Node, the shared `lib/db` Prisma client runs there directly — there is no edge constraint, so no
  separate node refresh endpoint is needed. One file does the whole guard:
  - `proxy.ts` at the project root exports `export function proxy(request: NextRequest)` and
    `export const config = { matcher: [...] }`. The matcher protects every path except `/sign-in`,
    `/api/auth/*`, `/respond/*` (respondent shell), and Next static assets (`_next/*`, favicon).
  - For a protected (cabinet) request, `proxy` verifies the `access_token` JWT (signature + expiry,
    no DB). **Valid** → `NextResponse.next()`, request passes. **Expired/absent but a
    `refresh_token` cookie is present** → look up its hash in `Session` via `lib/db`; if the
    session is live, rotate it (revoke old, create new), build a `NextResponse.next()`, set the
    new `access_token` + `refresh_token` cookies on that response, and pass the request through —
    transparent refresh, the user only ever sees the requested page (FR-AUTH-03). **No valid
    access token and no live refresh session** → redirect to `/sign-in?next=<path>` and clear any
    stale cookies (FR-AUTH-01, FR-AUTH-05).
  - `next` is validated as a same-origin relative path (must start with `/`, no `//` or scheme)
    before any redirect, so the redirect cannot be turned into an open-redirect.
  - Any `next.config` flag carrying the old name is renamed accordingly (e.g.
    `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`); this slice introduces no such flag.

- **Sign-in via a server action, not a client fetch.** `app/sign-in/page.tsx` is a server
  component rendering a form bound to a `signIn` server action. The action Zod-parses
  `{ email, password }` (TC-VALID-01), looks up the `HrUser` by email via the shared `lib/db`
  client, and verifies the submitted password against that row's `passwordHash` with
  `verifyPassword` (constant-time scrypt compare). On success it creates a `Session` for that
  user and sets both cookies, then redirects to the validated `next`. On any failure — unknown
  email **or** wrong password — it returns a single generic error ("Невірний email або пароль");
  to avoid timing-based enumeration when the email is unknown, it still runs a `verifyPassword`
  against a dummy hash before failing. No field-level hint, no enumeration. Loading state via
  `useFormStatus` on a thin client submit button; empty state is the pristine form; error state
  is the inline message. The action returns a Zod-typed result, never throws to the client.

- **Env is validated once, server-side (TC-VALID-01, NFR-SEC-02).** No user credential lives in
  env — only `AUTH_JWT_SECRET` (the JWT signing key) does. `lib/schemas/auth.ts` holds
  `authEnvSchema` (`AUTH_JWT_SECRET` min 32 chars, optional `AUTH_ACCESS_TTL`/`AUTH_REFRESH_TTL`).
  `lib/env.ts` parses `process.env` against it once and exports the typed result; importing it
  from any client component is prevented by it pulling server-only values (it is only imported in
  the sign-in action, the sign-out handler, and `proxy.ts`). No secret is ever passed to a client
  component or the bundle. Credential provisioning is a DB operation: `scripts/hash-password`
  prints a `scrypt$…` hash for a chosen password (so the plaintext is never committed or
  transmitted), and `scripts/create-hr-user` hashes a password and upserts the `HrUser` row by
  email via `lib/db`, so an admin can stand up the single account in one step.

- **i18n (NFR-I18N-01).** Auth UI strings live in `lib/i18n/uk.ts` (Ukrainian-first) with an
  `en.ts` fallback of the same shape; the page imports the `uk` object. Sentence case, calm tone,
  no exclamation marks, no emoji, Lucide outline icons only — per `DESIGN.md`.

## Risks / Trade-offs

- **DB round-trip on refresh, not on every request** → access-token verification is stateless
  (signature + expiry, no DB), so an authorized request passes the proxy without a query
  (NFR-PERF-01); only the (infrequent) refresh hits the `Session` table. Accepted: this is the
  standard access/refresh split.

- **Prisma in `proxy.ts`** → fine in Next 16 because proxy runs on the Node.js runtime (the
  `runtime` option is not configurable in proxy and throws if set), so the shared `lib/db` pg
  client runs there directly. The doc note that proxy "should not rely on shared modules or
  globals" targets CDN-deployed rewrite/redirect proxies; this auth proxy is intentionally
  server-resident and DB-touching, which the Node runtime supports.
- **Adding a `Session` table reverses the foundation's "no auth tables" note** → justified:
  FR-AUTH-05 is unattainable for a stateless token. Kept minimal (one table, single-account) and
  documented as the modified `data-model` capability; revisited again only if multi-user lands.
- **`SameSite=Lax` + same-origin handlers as the CSRF posture (no explicit CSRF token)** →
  adequate for MVP given httpOnly cookies, a scoped refresh-cookie path, and state-changing
  endpoints being POST server actions/handlers. A dedicated CSRF token is deferred; noted so the
  cabinet slice can revisit if cross-site embedding is ever needed.
- **`scrypt` (`node:crypto`) for passwords** → password verification only ever runs in the
  sign-in path, never in the proxy; keeping it out of `tokens.ts` keeps the token module
  dependency-light. The split is intentional, not incidental.
- **Rotation as a side effect of a passed-through cabinet request** → safe because it is gated by
  the httpOnly refresh cookie and same-origin; a reused old refresh token after rotation is
  already revoked, so a replay just lands on sign-in, and `next` is validated to a relative path
  to prevent open redirects.
