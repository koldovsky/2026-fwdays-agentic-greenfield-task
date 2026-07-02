## 1. Auth foundation

- [x] 1.1 Auth.js chosen + wired: `next-auth@5.0.0-beta.31`, JWT sessions, Credentials provider over `authenticateWithPassword`; `src/app/auth.ts` + `/api/auth/[...nextauth]` (see design.md, TC-STACK-07)
- [x] 1.2 `entities/user` model + `shared/lib/auth` service + session helper (`currentUserId()` in `src/app/auth.ts`); password hash stays out of the entity (NFR-SEC).
- [x] 1.3 Real storage over the Queryable port: `shared/lib/db/user-repo` + `credentials-repo` + migration `0002_auth.sql` (credentials + oauth_accounts, cascade). No stub needed — pglite-verified.

## 2. Credential + OAuth flows

- [x] 2.1 `shared/lib/auth`: salted-scrypt `hashPassword`/`verifyPassword` + `registerWithPassword`/`authenticateWithPassword` service; uniform `invalid_credentials` + timing-equalized unknown-email path. pglite + unit tested.
- [~] 2.2 Storage ready (`oauth_accounts` table); OAuth flow deferred — needs the Auth.js library choice + Google creds.
- [ ] 2.3 Password-reset: request endpoint (uniform response), single-use time-limited emailed link, set-new-password

## 3. UI + session boundary

- [ ] 3.1 `features/sign-in` (form + Google button) + top-bar session state (signed-in vs anonymous)
- [x] 3.2 `currentUserId()`/`auth()` usable in route handlers (GDPR endpoints use it); sign-out via Auth.js `/api/auth/signout` + exported `signOut`. Live-verified over HTTP (register→sign-in→session→delete).
- [ ] 3.3 Enforce sign-in only at export/paywall; keep one free anonymous tailoring (FR-ONBOARD-01)
- [ ] 3.4 Confirm user IDs never enter LLM payloads (NFR-SEC-02)

## 4. Verify & review

- [ ] 4.1 agent-verify: build/tsc/lint/tests; evidence for FR-AUTH-01/02/03, FR-ONBOARD-01, NFR-SEC-02
- [x] 4.2 Verified: credential column is a `scrypt$` hash (no plaintext); sign-in errors uniform for wrong-password vs unknown-email (no enumeration).
- [ ] 4.3 Independent checker-review vs PRD + FSD import rules + privacy constraints
