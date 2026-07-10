# Proposal: S-02 · OTP Authentication

> Plan item: **S-02 «Автентифікація OTP»** (cycle Е-2) from
> [docs/mvp-capability-plan.md](../../../docs/mvp-capability-plan.md).
> PRD codes covered: **FR-AUTH-01…04**, **NFR-SEC-01**, **NFR-SEC-02**,
> **TC-AUTH-01** (fixed by ADR-0004).

## Why

The walking skeleton (S-01) is live in production but has no notion of a user:
every later slice (houses S-03, tickets S-04+) stores per-user data and
requires an authenticated owner for its isolation rules (FR-ACCESS-01). S-02
introduces the only authentication mechanism the product has — passwordless
OTP over SMS (TC-AUTH-01) — plus a durable session, so subsequent slices can
assume "current user" exists and only add domain behavior.

## What Changes

- **DB**: `user` table (`id`, `phone` unique normalized, `name?`,
  `created_at`) and `otp_code` transit table (code hash, TTL, attempt counter,
  rate-limit counters — ADR-0004, PRD §9.1) via a new Prisma migration.
- **API**: auth endpoints — request-otp (issues a 6-digit code, enforces
  send rate-limits FR-AUTH-03), verify-otp (validates code with TTL /
  single-use / ≤5 attempts FR-AUTH-02; first success for a phone creates the
  account FR-AUTH-01), logout, and a current-user/profile endpoint (optional
  `name` per PRD §4). Server-side enforcement of all limits (NFR-SEC-02).
- **Session**: server-side session token in an httpOnly + Secure +
  SameSite=Lax cookie (NFR-SEC-01), lifetime ≥ 30 days or until explicit
  logout (FR-AUTH-04).
- **Guard**: global auth guard — every `/api` endpoint except health and the
  auth endpoints themselves requires a valid session; unauthenticated
  requests get `401`.
- **SMS delivery**: `SmsSender` interface with TurboSMS implementation for
  prod and a mandatory dev fallback that logs the code instead of sending
  (ADR-0004); prod without a TurboSMS key refuses to start.
- **Web**: login screen (phone → code) with rate-limit/attempt error states,
  logout action, minimal profile (display/edit optional name); unauthenticated
  visitors are routed to login.
- **Security hygiene**: OTP codes stored only as hashes; phones and codes
  never logged in plain text (NFR-SEC-01).

## Capabilities

### New Capabilities

- `otp-auth`: passwordless authentication — OTP request/verify over SMS with
  TTL, attempt and rate limits; account auto-creation on first login; durable
  cookie session with logout; auth guard protecting all non-public API
  endpoints; minimal user profile (optional name); dev-mode SMS fallback.

### Modified Capabilities

_None — `app-skeleton` requirements are unchanged (health stays public; SPA
serving and deploy contour untouched)._

## Impact

- `api/` — new auth module (controllers/services/guard), Prisma schema +
  migration for `user`, `otp_code`, and the session store table; `SmsSender`
  abstraction with TurboSMS + dev-log implementations; env vars for TurboSMS
  key and session/OTP tuning added to `.env.example` and Railway.
- `web/` — login route/screen, auth facade + HTTP interceptor handling `401`,
  logout action, minimal profile UI (per `/web-conventions`, ADR-0009).
- `api-e2e/` — specs for request/verify/limits/guard behavior (dev fallback,
  no real SMS); `web-e2e/` — Playwright login/logout critical path.
- New runtime dependency on the TurboSMS HTTP API (prod only); zero SMS cost
  in dev/CI (ADR-0004).
- No breaking changes for S-01 behavior; `/api/health` remains public.

## Non-goals

- Any domain data (houses, tickets) — S-03+.
- Roles, admin, managing other users — the product has a single "user" role
  (PRD §4).
- Account recovery flows beyond OTP itself; changing the phone number.
- Sign-out from "all devices" / session management UI.
- Allowlist against SMS-budget abuse — noted as a risk mitigation in the PRD,
  added later only if needed (trivial change).
