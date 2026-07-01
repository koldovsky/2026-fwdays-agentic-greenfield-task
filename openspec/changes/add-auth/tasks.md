# Tasks — add-auth

Test-first on pure logic; build shared → api → mobile. Reference `specs/auth/spec.md` for
behavior and `design.md` for approach. Run `npm run gate` before committing each layer.

## 1. Shared contracts + pure password validator (TC-PURE-01, TC-TEST-01)

- [x] 1.1 Add auth contracts to `@honeydo/shared`: `SignUpRequest`, `SignInRequest`, `GoogleSignInRequest`, `RefreshRequest`, `AuthTokens`, `AuthUser` (never includes password)
- [x] 1.2 Write failing unit tests for a pure `validatePassword(password)` (min length, character-class/entropy rules) returning a typed `{ valid, errors }` result
- [x] 1.3 Implement `validatePassword` framework-free; get tests to 100% coverage
- [x] 1.4 Export from the shared barrel; `npm run build -w @honeydo/shared` green

## 2. Data model + migration

- [x] 2.1 Add Prisma models `User` (unique email, optional `passwordHash`), `AuthIdentity` (`provider`, `providerUserId`, `userId`, unique per provider+providerUserId), `RefreshToken` (hashed token, `userId`, `expiresAt`, `revokedAt`, `replacedById`), with indexes
- [x] 2.2 `prisma migrate dev --name add-auth`; regenerate client
- [x] 2.3 Add env keys to `.env` + `.env.example`: `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## 3. API — password auth, hashing, tokens (FR-AUTH-01/02, NFR-SEC-01)

- [ ] 3.1 Add deps: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `argon2`, `google-auth-library`
- [ ] 3.2 `AuthModule` + `AuthService`: argon2 hash/verify; issue short-lived access JWT + opaque refresh token (store only its hash)
- [ ] 3.3 `POST /auth/signup` — validate password via shared validator, reject weak (FR-AUTH-01) and duplicate email; return `AuthTokens`
- [ ] 3.4 `POST /auth/signin` — verify credentials, issue tokens; reject invalid without disclosing which factor (FR-AUTH-02)
- [ ] 3.5 DTOs use class-validator; confirm the global `ValidationPipe` strips/rejects extras (TC-STACK-02)
- [ ] 3.6 e2e: signup → signin happy path + weak-password + duplicate-email + bad-credentials

## 4. API — refresh rotation, sign-out (FR-AUTH-05, NFR-SEC-01)

- [ ] 4.1 `POST /auth/refresh` — validate against a non-revoked/non-expired row, rotate (issue new pair, mark old rotated via `revokedAt`/`replacedById`)
- [ ] 4.2 Reuse detection — presenting a rotated token is rejected and revokes the user's token chain
- [ ] 4.3 `POST /auth/logout` — revoke the current refresh token server-side (FR-AUTH-05)
- [ ] 4.4 e2e: refresh rotates + old token rejected; logout then refresh rejected

## 5. API — Google sign-in + account linking (FR-AUTH-03/04)

- [ ] 5.1 `POST /auth/google` — verify the Google `id_token` with `google-auth-library` (strict audience + issuer)
- [ ] 5.2 Provision on first sign-in; create `User` + `google` `AuthIdentity` (FR-AUTH-03)
- [ ] 5.3 Link by verified email: if a `User` exists, attach a `google` identity instead of creating a duplicate (FR-AUTH-04)
- [ ] 5.4 e2e (mocked verifier): first Google sign-in provisions; same-email password account links, not duplicates

## 6. API — authorization primitives (FR-AUTH-06)

- [ ] 6.1 `JwtAuthGuard` (passport-jwt) + `@CurrentUser()` param decorator, exported for later capabilities
- [ ] 6.2 Protect a sample endpoint (e.g. `GET /auth/me` returning `AuthUser`); unauthenticated → 401
- [ ] 6.3 e2e: no/invalid token → 401; valid token → 200 with the user

## 7. Mobile — session plumbing (FR-AUTH-06)

- [ ] 7.1 Add `expo-secure-store` + `expo-auth-session`; store/read access + refresh tokens securely
- [ ] 7.2 API client attaches the access token; on 401 attempts one refresh + retry, else clears session and routes to auth
- [ ] 7.3 Auth state/context (`useAuth`) exposing `signIn`/`signUp`/`signInWithGoogle`/`signOut` + current user

## 8. Mobile — auth screen (FR-AUTH-01/02/03, FR-THEME-03)

- [ ] 8.1 Auth screen: email/password form (client-side `validatePassword` from shared) + "Continue with Google", built from design tokens (no raw hex)
- [ ] 8.2 Wire Google OAuth 2.0 + PKCE via `expo-auth-session`; send `id_token` to `POST /auth/google`
- [ ] 8.3 Sign-out control clears the session
- [ ] 8.4 Restyle pass deferred until the brand decision is resolved (tracked in current-state.md)

## 9. Finalize

- [ ] 9.1 `npm run gate` green (shared + api); mobile lint/typecheck green
- [ ] 9.2 `openspec validate add-auth --strict`
- [ ] 9.3 Update `docs/current-state.md`; commit each layer to `dev` (reviewed, referencing FR-AUTH IDs)
- [ ] 9.4 `openspec archive add-auth` once implemented and verified
