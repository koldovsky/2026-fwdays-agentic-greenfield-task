## 1. Dependencies & env

- [x] 1.1 Add `jose` (dependency) for JWT sign/verify. No other runtime dep
  (`scrypt`/SHA-256 come from `node:crypto`/WebCrypto). (TC-PURE-01)
- [x] 1.2 Update `.env.example` with `AUTH_JWT_SECRET` (min 32 chars) and optional
  `AUTH_ACCESS_TTL` / `AUTH_REFRESH_TTL` placeholders — no real secrets. No HR email/password in
  env (the credential lives in the `HrUser` table). (NFR-SEC-02)
- [x] 1.3 Add `scripts/hash-password` (tiny node script) that prints a `scrypt$…` hash for a
  chosen password, so the plaintext is never committed or sent anywhere; and
  `scripts/create-hr-user` that hashes a password and upserts the single `HrUser` row (email +
  hash + optional name) via `lib/db`. (FR-AUTH-02)

## 2. Schemas & env parsing (Zod, TC-VALID-01)

- [x] 2.1 Add `lib/schemas/auth.ts`: `signInInputSchema` (`email`, `password`),
  `accessPayloadSchema` (subject = HrUser id + issued/expiry), `authEnvSchema` (`AUTH_JWT_SECRET`
  + optional TTLs only); export types via `z.infer` only — no hand-written parallels. (TC-VALID-01)
- [x] 2.2 Add `lib/env.ts`: parse `process.env` once against `authEnvSchema`, export the typed
  result; server-side only, never imported by a client component. (NFR-SEC-02)

## 3. Pure token & credential logic (lib/auth/, TC-PURE-01)

- [x] 3.1 `lib/auth/tokens.ts`: `signAccessToken(payload, secret)`,
  `verifyAccessToken(jwt, secret) → payload | null`, `generateRefreshToken() → {token, tokenHash}`,
  `hashRefreshToken(token)`. JWT via `jose` (HS256), hashing via WebCrypto `subtle.digest`. No
  `next/*`, `react`, DOM, or `node:*` — runtime-agnostic and portable. Key passed in, never read
  from env inside `lib/`. (TC-PURE-01, FR-AUTH-03)
- [x] 3.2 `lib/auth/password.ts`: `hashPassword(plain)` and `verifyPassword(plain, storedHash)`
  using `node:crypto` `scrypt` + `timingSafeEqual`; format `scrypt$N$r$p$salt$hash`. Node-only,
  imported only from node-runtime paths. (FR-AUTH-02)
- [x] 3.3 Unit tests (Vitest): access-token sign→verify roundtrip; expired token → null;
  tampered/wrong-secret token → null; refresh-token hash is deterministic and != token;
  `verifyPassword` true on match, false on mismatch, constant-time path exercised;
  `signInInputSchema` rejects bad input. (TC-PURE-01, TC-VALID-01)

## 4. Auth tables (data-model)

- [x] 4.1 Add to `prisma/schema.prisma`, in **one** migration: `HrUser` (`id` cuid, `email`
  unique, `passwordHash`, `name?`, `createdAt`) — the single HR account, added by an admin, no
  self-registration (FR-AUTH-02) — and `Session` (`tokenHash` unique, `subject` = owning HrUser
  id, `expiresAt`, `revokedAt?`, `replacedById?` rotation link, `createdAt`) (FR-AUTH-05).
- [x] 4.2 Run a single Prisma migration adding the `HrUser` and `Session` tables;
  `prisma validate` + generate green.
- [x] 4.3 Add `lib/auth/session.ts` (node, DB): `createSession`, `rotateSession`
  (revoke old + create new), `revokeSession`, `findLiveSessionByToken` — all via the shared
  `lib/db` client; revocation/expiry checks return only live sessions. (FR-AUTH-03, FR-AUTH-05)

## 5. Route guard & transparent refresh (FR-AUTH-01, FR-AUTH-03)

- [x] 5.1 Add `proxy.ts` at the project root (Next 16 file convention; renamed from
  `middleware`). Export `export function proxy(request: NextRequest)` and
  `export const config = { matcher: [...] }`; the matcher excludes `/sign-in`, `/api/auth/*`,
  `/respond/*`, and Next static assets (`_next/*`, favicon). Proxy runs on the Node.js runtime —
  do **not** set a `runtime` option (it is unavailable in proxy and throws). (FR-AUTH-01)
- [x] 5.2 In `proxy`: verify `access_token` (signature + expiry, no DB). Valid →
  `NextResponse.next()`. Expired/absent **and** a `refresh_token` cookie present → look up + rotate
  the session via `lib/db`, set new `access_token` + `refresh_token` cookies on a
  `NextResponse.next()`, pass through (transparent refresh). No valid access token and no live
  session → redirect `/sign-in?next=…` and clear stale cookies. (FR-AUTH-01, FR-AUTH-03, FR-AUTH-05)
- [x] 5.3 Add a same-origin/relative-path `next` validator (must start with `/`, reject `//` or
  any scheme) used by the proxy redirect and the sign-in action, so no redirect can be hijacked.

## 6. Sign-in page & sign-out (FR-AUTH-04)

- [x] 6.1 Add `lib/i18n/uk.ts` + `en.ts` (same shape) with the auth strings — sentence case, no
  exclamation marks, no emoji. (NFR-I18N-01)
- [x] 6.2 Add the `signIn` server action: Zod-parse input, look up `HrUser` by email via `lib/db`
  and `verifyPassword` against its `passwordHash` (constant-time; run a dummy compare on unknown
  email to avoid timing enumeration), on success `createSession` for that user and set both
  cookies (`httpOnly`, `SameSite=Lax`, `Secure` in prod; `access_token` `Path=/`, `refresh_token`
  `Path=/` so the proxy receives it on every cabinet route), redirect to the validated `next`; on
  failure return one generic error (no enumeration). (FR-AUTH-02, FR-AUTH-04)
- [x] 6.3 Add `app/sign-in/page.tsx`: minimal Kolo360-token-styled sign-in (wordmark, email +
  password fields, submit). Explicit empty (pristine), loading (`useFormStatus`), and error
  (inline generic message) states; 2px accent focus ring, accessible names. (FR-AUTH-04,
  FR-SHELL-03, NFR-A11Y-01)
- [x] 6.4 Add `POST /api/auth/sign-out` (node): `revokeSession` for the current refresh token,
  clear both cookies, redirect to `/sign-in`. (FR-AUTH-05)

## 7. Verify (maker ≠ checker)

- [x] 7.1 Manual check: signed-out request to a cabinet path redirects to `/sign-in`; valid
  sign-in sets two `httpOnly` cookies (verify in devtools they are not JS-readable, not in
  `localStorage`, not in the URL); access token expiring triggers a transparent refresh; reusing
  a rotated/old refresh token lands on sign-in; sign-out invalidates the session. (FR-AUTH-01..05)
- [x] 7.2 Run `npm run lint && tsc --noEmit && npm test && npm run build`; all green. No `any`,
  no casts, no `@ts-ignore`. Console silent at runtime. (NFR-DX-01, NFR-OBS-01)
- [x] 7.3 Independent review pass (separate agent) verifies the slice against FR-AUTH-01..05 and
  the typing/validation rules before it is relied on. (maker ≠ checker) — verdict
  APPROVE-WITH-NITS; all FRs + typing/purity met. Fixed #1 (single-winner atomic rotation, no
  token fork — confirmed by a concurrent probe: 1 winner / 7 to sign-in / 1 live session) and #2
  (segment-anchored matcher exclusions). Deferred (no current route triggers them): #3 API
  redirect-vs-401, #4 `destination` typing nit, #5 CSRF token revisit in the cabinet slice.
- [x] 7.4 Update `docs/current-state.md` (slice done, files added, next step: `cabinet-shell`).
