# Tasks: S-02 · OTP Authentication

## 1. Data model and env

- [x] 1.1 Add Prisma models `user`, `otp_code`, `session` (design D1) and create the migration; apply locally
- [x] 1.2 Add `AUTH_SECRET`, `SMS_MODE`, `TURBOSMS_TOKEN` to config validation and `.env.example`; fail-fast startup check: `SMS_MODE=turbosms` requires `TURBOSMS_TOKEN` (D7)

## 2. SMS delivery layer

- [x] 2.1 `SmsSender` interface + `DevSmsSender` (logs the code, exposes it for the dev-mode `devCode` response field) + `TurboSmsSender` (TurboSMS HTTP API), selected by `SMS_MODE` (D7)
- [x] 2.2 Unit tests: sender selection, fail-fast without token, TurboSMS payload against a mocked HTTP layer

## 3. OTP + session core (API)

- [x] 3.1 Phone normalization/validation util (`+380…`, D10) with unit tests
- [x] 3.2 `POST /api/auth/otp/request`: rate limits 1/60s and 5/24h derived from `otp_code` rows (429 + error codes), invalidate previous active codes, HMAC-hash and store the new code, send via `SmsSender`; `devCode` in dev mode only (D3, D4, D6)
- [x] 3.3 `POST /api/auth/otp/verify`: single active code per phone, constant-time hash compare, attempts counter with invalidation on the 5th failure, TTL and single-use enforcement, upsert `user` by phone, create session + set cookie (D2, D4)
- [x] 3.4 `POST /api/auth/logout` (revoke session, clear cookie) and `GET|PATCH /api/auth/me` (profile with optional name)
- [x] 3.5 `SessionGuard` as global `APP_GUARD` + `@Public()` decorator on health and OTP endpoints; 401 JSON for everything else (D5)
- [x] 3.6 Hourly cleanup job (`@nestjs/schedule`): drop `otp_code` rows older than 24h and expired sessions (D8)
- [x] 3.7 Unit tests for the OTP service state machine: rate limits, TTL, attempts, single-use, supersede-previous-code, account upsert

## 4. Web (login, guard, profile)

- [x] 4.1 Read `/web-conventions`; scaffold the `auth` feature: facade (signals `user`/`status`), API client, error-code → Ukrainian message map (D6, D9)
- [x] 4.2 `/login` route: two-step form (phone → code) on Material components, request-again action, rate-limit/attempt error states (Ukrainian copy)
- [x] 4.3 Functional `canActivate` guard (redirect to `/login`) + HTTP interceptor redirecting to `/login` on 401; app bootstrap resolves `GET /api/auth/me`
- [x] 4.4 Minimal profile UI: show phone, edit optional name, «Вийти» action
- [x] 4.5 Web unit tests: facade + login form states (validation, error mapping)

## 5. E2E and verification

- [x] 5.1 api-e2e specs: request/verify happy path (dev `devCode`), 60s and daily rate limits, 5-attempt invalidation, expired/reused code (rows manipulated via Prisma), guard 401 + public allowlist, logout revocation, cookie attributes
- [x] 5.2 web-e2e (Playwright): login happy path via dev code, rate-limit message shown, redirect-to-login for unauthenticated visitor, logout, session survives page reload
- [x] 5.3 All task checkboxes above `[x]`; `npm run verify` passes
- [x] 5.4 Smoke test on a real DB: full login/logout cycle, inspect `user`/`otp_code`/`session` rows, confirm hashes-only and invariants
- [x] 5.5 Playwright e2e for the slice's critical paths green (5.2)

## 6. Review, deploy, closeout

- [x] 6.1 Adversarial review by `slice-reviewer` (ADR-0010): freeze range at an explicit end SHA, one pass, fix critical/high + re-verify; log medium/low dispositions for the retro
- [x] 6.2 Set Railway env vars (`AUTH_SECRET`, `SMS_MODE=turbosms`, `TURBOSMS_TOKEN` from the user) and deploy; launch-and-look: walk the happy path locally and on prod (one real SMS)
- [x] 6.3 Archive the change; `npx openspec list` is empty; `npx prettier --write openspec/specs/**/*.md`
- [x] 6.4 Update `docs/current-state.md` and `docs/traceability-matrix.md` (FR-AUTH-01…04, NFR-SEC-01/02 → spec → test → demo check)
- [x] 6.5 Session retrospective via `/slice-retro` → `docs/cycles/S-02.md`
