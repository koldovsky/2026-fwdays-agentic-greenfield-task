# Design: S-02 · OTP Authentication

## Context

S-01 delivered the walking skeleton: NestJS + Prisma over MySQL (empty
baseline migration), SPA served by the API process, prod on Railway. There is
no user model and no protected endpoint yet. Fixed by ADRs (do not
re-decide): auth is OTP via SMS only, TurboSMS + mandatory dev fallback, OTP
transit store is a MySQL table, session is a server-side token in an httpOnly
cookie (ADR-0004, TC-AUTH-01); frontend is zoneless + OnPush, signals +
facades (ADR-0009, `/web-conventions`); Angular Material (ADR-0011).
Normative requirements: FR-AUTH-01…04, NFR-SEC-01/02 (see spec delta).

## Goals / Non-Goals

**Goals:**

- Full vertical login flow: phone → SMS code → account/session → logout,
  working locally (dev fallback) and on prod (TurboSMS).
- Server-side enforcement of every limit (TTL, attempts, send rate) so the
  UI is convenience, not the security boundary (NFR-SEC-02).
- A global auth guard S-03+ can rely on: "current user" is always available
  in protected handlers.

**Non-Goals:**

- Domain data, owner-scoped resources (S-03+); roles/admin; phone change or
  recovery flows; session management UI ("all devices").

## Decisions

### D1. Data model: `user`, `otp_code`, `session` (all in one migration)

- **What:** three Prisma models. `user`: `id` BIGINT AI, `phone` unique
  (normalized `+380…`), `name?`, `created_at`. `otp_code`: `id`, `phone`
  (indexed), `code_hash`, `expires_at`, `attempts` (int, default 0),
  `consumed_at?`, `created_at`. `session`: `id`, `token_hash` unique,
  `user_id` FK, `expires_at`, `created_at`.
- **Why:** matches PRD §9.1. The daily/60s send limits are **derived by
  querying `otp_code` rows** (`COUNT`/`MAX(created_at)` per phone over the
  window) instead of stored counters — the table is already a send log, and
  derived counters cannot drift (BC-PRIN-01). A `session` table (not in PRD
  §9.1, which lists only domain entities) is required by ADR-0004's
  server-side token: logout must revoke server-side.
- **Alternatives:** stored counter columns — rejected (drift, reset logic);
  JWT stateless session — rejected, logout revocation and ADR-0004 both
  demand server-side state.

### D2. Session token: 256-bit random, stored hashed, fixed 30-day expiry

- **What:** `crypto.randomBytes(32)` → base64url token in the cookie; DB
  stores `sha256(token)`. Expiry fixed at 30 days from login (no sliding
  renewal). Cookie: `httpOnly`, `SameSite=Lax`, `path=/`, `maxAge` 30d;
  `Secure` is env-driven (on in prod, off for `http://localhost`).
- **Why:** FR-AUTH-04 says "≥ 30 days or until logout" — a fixed window
  satisfies it without renewal bookkeeping. Hashing the token means a DB
  read/leak cannot mint valid cookies. Conditional `Secure` because Safari
  drops `Secure` cookies on plain-HTTP localhost, which would break local
  dev; prod always sets it (NFR-SEC-01).
- **Alternatives:** sliding expiration — nicer UX, more writes and edge
  cases; rejected for the POC. `express-session` + store — heavier than one
  table and one lookup.

### D3. OTP hashing: HMAC-SHA256 keyed by an app secret

- **What:** `code_hash = HMAC-SHA256(AUTH_SECRET, phone + ":" + code)`;
  verification recomputes and compares constant-time. `AUTH_SECRET` is a
  required env var (also documented in `.env.example`).
- **Why:** NFR-SEC-01 requires hashes only. A 6-digit code has 10^6 entropy —
  offline brute force is trivial for _any_ fast hash, so the real control is
  the 5-attempt cap; the HMAC key just makes stolen rows useless without the
  env secret. bcrypt/argon2 would add cost per verify for no real gain here
  (BC-PRIN-01).
- **Alternative:** plain SHA-256 — rainbow-table-able over 10^6 codes per
  phone; HMAC costs nothing extra.

### D4. Verification flow state machine

- **What:** `request-otp`: normalize phone → check 60s/24h limits (query
  `otp_code`) → invalidate previous active codes for the phone (mark
  consumed) → insert new row → send via `SmsSender`. `verify-otp`: load the
  single active (unconsumed, unexpired) code for the phone → if none, "request
  a new code" error → compare hash; on mismatch increment `attempts`
  (5th failure marks consumed) → on match mark consumed, upsert `user` by
  phone (creates on first login, FR-AUTH-01), create session, set cookie.
  Both endpoints are throttled and never reveal whether an account exists
  (responses are identical for new/existing phones). Both flows are
  serialized **per phone** by an in-memory `KeyedMutex`, and the attempt
  counter uses an atomic `{ increment: 1 }` — otherwise concurrent requests
  race the rate-limit reads (TOCTOU) and under-count failed attempts
  (S-02 slice-review findings, ADR-0010). In-memory locking is a correct
  concurrency control here because the app is fixed to a single instance
  (ADR-0002/0003).
- **Why:** "only the latest code is valid" removes ambiguity with multiple
  in-flight codes and makes the attempt counter per-code exactly as
  FR-AUTH-02 words it. Upsert-by-phone makes registration and login one code
  path — no separate signup.

### D5. Global guard: `APP_GUARD` + `@Public()` allowlist

- **What:** a `SessionGuard` registered as `APP_GUARD`: reads the cookie,
  looks up the session by token hash, checks expiry, attaches `user` to the
  request; otherwise `401` JSON. `@Public()` decorator marks the allowlist:
  `GET /api/health`, `POST /api/auth/otp/request`, `POST /api/auth/otp/verify`.
- **Why:** secure-by-default — S-03+ endpoints are protected the moment they
  are written; forgetting a decorator fails closed (an endpoint is
  accidentally private, never accidentally public).

### D6. API surface and error contract

- **What:** `POST /api/auth/otp/request` `{phone}`;
  `POST /api/auth/otp/verify` `{phone, code}` → sets cookie, returns user;
  `POST /api/auth/logout`; `GET /api/auth/me`; `PATCH /api/auth/me` `{name}`.
  Errors carry a machine-readable `code` (e.g. `RATE_LIMITED_60S`,
  `RATE_LIMITED_DAILY`, `OTP_INVALID`, `OTP_EXPIRED_OR_MISSING`,
  `OTP_ATTEMPTS_EXCEEDED`) + HTTP status (`429` for rate limits, `400` for
  bad code/phone, `401` from the guard). The SPA maps codes to Ukrainian
  messages.
- **Why:** user-facing text is Ukrainian and lives in the frontend
  (language-split convention); the API stays locale-free and the e2e tests
  assert stable codes, not copy.

### D7. `SmsSender`: TurboSMS in prod, dev fallback returns the code

- **What:** `SmsSender` interface with two implementations. `TurboSmsSender`
  (prod): TurboSMS HTTP API, token from `TURBOSMS_TOKEN`. `DevSmsSender`
  (non-prod): logs the code and the `request-otp` response additionally
  carries `devCode`. Selection via `SMS_MODE` env (`turbosms` | `dev`),
  defaulting from `NODE_ENV`; `SMS_MODE=turbosms` without `TURBOSMS_TOKEN`
  aborts startup (fail-fast per ADR-0004).
- **Why:** ADR-0004 explicitly allows "log **or dev-mode response**";
  returning `devCode` makes api-e2e and Playwright tests trivial and
  deterministic (no log scraping). The field exists only in dev mode, so
  prod behavior is unchanged.

### D8. Expired-row cleanup: scheduled job via `@nestjs/schedule`

- **What:** one hourly job deletes `otp_code` rows older than 24h (older
  rows are no longer needed for the daily limit) and expired `session` rows.
- **Why:** ADR-0004 fixes background cleanup for the transit store; an
  hourly interval with two `DELETE`s is the whole job. `@nestjs/schedule` is
  the standard Nest mechanism and is committed together with the code that
  uses it (fallow unused-deps rule).
- **Alternative:** opportunistic cleanup inside `request-otp` — couples
  request latency to cleanup and silently stops when traffic stops.

### D9. Web: `/login` route + auth facade + functional guard + 401 interceptor

- **What:** per `/web-conventions` (ADR-0009): `auth` feature with a facade
  (signals: `user`, `status`), login container (two-step phone → code form,
  Material components, Ukrainian copy, error-code → message map), a
  `canActivate` functional guard redirecting unauthenticated visitors to
  `/login` (app bootstraps by calling `GET /api/auth/me`), an HTTP
  interceptor that redirects to `/login` on `401`, and a minimal profile UI
  (show phone, edit name, «Вийти»).
- **Why:** the interceptor centralizes session-expiry handling so later
  slices get it for free; facade keeps components presentational.

### D10. Phone normalization on the API

- **What:** accepted inputs `0XXXXXXXXX`, `380…`, `+380…` (spaces/dashes
  stripped) normalize to `+380` + 9 digits; anything else is `400`. The
  normalized form is the unique key in `user` and the key for rate limits.
- **Why:** FR-AUTH-01 fixes the normalized format; normalizing server-side
  keeps the uniqueness and rate-limit guarantees independent of UI input
  masks (the UI may still pre-format for UX).

## Risks / Trade-offs

- [SMS budget abuse via open registration — PRD risk table] → server-side
  60s/daily limits in this slice; allowlist is a known trivial follow-up if
  abuse happens (kept out of scope deliberately).
- [Concurrent request storms racing the limit checks (TOCTOU) and the
  attempt counter — found by the slice review, ADR-0010] → per-phone
  `KeyedMutex` around request/verify + atomic attempts increment; unit and
  api-e2e concurrency regressions pin the behavior. Revisit (DB locks) only
  if the single-instance constraint ever changes.
- [Rate limits make tests flaky/slow (60s waits)] → tests use unique phone
  numbers per run and assert limits by issuing back-to-back requests on one
  number; no sleeps needed. TTL/expiry cases manipulate `otp_code` rows
  directly via Prisma in api-e2e rather than waiting.
- [`Secure` cookie off in local dev is a prod/dev behavior split] → single
  env-driven flag, asserted in api-e2e (dev) and noted as a prod demo check
  in the traceability matrix.
- [devCode in a response is a footgun if it ever leaks to prod] → emitted
  only by `DevSmsSender`, which cannot be selected in prod (fail-fast
  startup check); api-e2e asserts the field is absent when mode is
  `turbosms` (unit level).
- [Fixed 30-day session means a hard re-login later] → acceptable per
  FR-AUTH-04 ("≥ 30 days"); revisit only if it bites.
- [TurboSMS HTTP integration is unverifiable in CI] → isolated behind
  `SmsSender` (unit-tested against a mocked HTTP layer); real send verified
  once on prod during launch-and-look.

## Migration Plan

Additive Prisma migration (three new tables) — applied by the existing
migrate-on-start pipeline. New env vars (`AUTH_SECRET`, `SMS_MODE`,
`TURBOSMS_TOKEN`) added to `.env.example` and set on Railway **before**
deploying the slice (prod fails fast without them — that is by design).
Rollback: redeploy previous image; tables are additive and unused by S-01
code.

## Open Questions

- `TURBOSMS_TOKEN` (and sender name) must come from the user's TurboSMS
  cabinet before the prod deploy step — blocks the deploy/launch-and-look
  task only, not implementation (dev mode covers everything else).
