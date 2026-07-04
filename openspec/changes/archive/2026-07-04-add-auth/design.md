## Context

`data-model` (archived) already defines `User { id, email, passwordHash, createdAt, updatedAt }` with a unique `email`. `app-foundation` (archived) provides a `(dashboard)` route group with placeholder routes (`notes`, `settings`, `archive`, `trash`, `favorites`, `pinned`) that currently render without any auth gate. This change adds the first real identity boundary in the app: every dashboard route and every future note mutation must resolve to a known `userId`.

This codebase runs a modified fork of Next.js (see root `AGENTS.md`): the `middleware.ts` file convention does not exist here and has been replaced by `proxy.ts`, confirmed in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`. No auth library (Auth.js or otherwise) is currently installed, and none of this fork's docs demonstrate or confirm Auth.js compatibility with the `proxy.ts` convention. The fork's own authentication guide (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`) walks through a from-scratch pattern instead: Server Actions for credential capture, `jose` for stateless signed-cookie sessions, `proxy.ts` for optimistic route redirects, and a Data Access Layer (DAL) for the authoritative check. This design follows that documented pattern rather than introducing a third-party auth library of unverified compatibility.

## Goals / Non-Goals

**Goals:**
- Register (FR-001) and log in (FR-002) with email + password.
- Session survives a browser refresh (FR-003).
- Passwords hashed with bcrypt (SEC-001).
- Auth form input validated with Zod on the client (immediate feedback) and re-validated on the server (SEC-002) — client-side validation is never trusted alone.
- State-changing auth Server Actions are protected against CSRF (SEC-003).
- Unauthenticated users are redirected away from `(dashboard)` routes; authenticated users are redirected away from `/login` and `/register`.
- Provide `verifySession()` / `getUser()` in a DAL that `notes-core` and later phases can call to scope all data access to `DATA-001`.

**Non-Goals:**
- Email verification and password-reset flows — mentioned narratively in `docs/PRD.md` but not backed by a stable requirement ID in `docs/requirements.md`; deferred to a future change if prioritized.
- OAuth/social login, multi-factor auth, role-based access control — no requirement calls for these.
- Rate limiting / brute-force lockout on login — not in `SEC-00x`; flagged as an open question below since `docs/PRD.md`'s Security section mentions rate limiting narratively.
- Any schema change — `User` table is already sufficient.

## Decisions

### 1. Custom credentials auth over an auth library
Use Server Actions + `bcryptjs` + `jose`, not Auth.js. **Why:** the fork's docs list Auth.js as one of several optional libraries but the only end-to-end example given (session cookies, `proxy.ts` integration) is the custom one — safest path given `proxy.ts` is a fork-specific rename with unknown third-party library support. **Alternative considered:** Auth.js with Credentials provider — rejected for this change due to unverified compatibility; can be revisited later without changing the `User` schema.

### 2. Stateless (JWT-in-cookie) sessions, not database sessions
Session payload (`{ userId, expiresAt }`) is signed with `jose` (HS256) and stored in an `httpOnly`, `secure`, `sameSite=lax` cookie. **Why:** satisfies FR-003 with no new table, matches DATA model's current scope (no `Session` model was defined in `data-model`), and is the pattern the fork's docs demonstrate end-to-end. **Alternative considered:** database-backed sessions — gives revocation-on-demand but requires a new `Session` table and migration, which is out of scope for `add-data-model` (already archived) and not required by any FR/SEC ID. Can be added later as a `data-model` delta if a logout-all-devices requirement emerges.

### 3. `bcryptjs` over native `bcrypt` or `argon2`
SEC-001 allows either Argon2 or bcrypt. **Why bcryptjs:** pure-JS implementation, no native build step, avoids native-binding failures in sandboxed/CI environments. **Alternative considered:** `argon2` (native bindings, stronger KDF) — rejected only for portability; revisit if a native build step is later acceptable in this environment.

### 4. `proxy.ts` performs optimistic checks only; DAL performs the authoritative check
`proxy.ts` at the project root decrypts the session cookie and redirects unauthenticated requests hitting `(dashboard)/*` to `/login`, and authenticated requests hitting `/login` or `/register` to `/`. It never queries the database (per the fork's guidance: Proxy runs on every request including prefetches, so it must stay cheap). The DAL's `verifySession()` (in `app/lib/dal.ts`, wrapped in React's `cache()`) is called from every Server Action, route handler, and data-fetching function that touches user data — this is the real security boundary, matching the fork docs' explicit warning that Proxy/route redirects alone are insufficient.

### 5. CSRF protection via explicit origin check in a shared action wrapper
SEC-003 is called out as its own requirement even though same-origin `fetch`/form submission to Server Actions has some inherent protection in stock Next.js. To make the protection explicit and testable, all state-changing Server Actions (`register`, `login`, `logout`) call a shared `assertSameOrigin()` helper that compares the `Origin` header against the deployment's expected host before doing any work. **Why explicit rather than relying on framework defaults:** this fork has already changed other security/routing primitives (`proxy.ts`); do not assume undocumented CSRF behavior carries over unchanged. **Alternative considered:** double-submit cookie token — more moving parts than needed for same-origin form actions; revisit only if a cross-origin client (e.g., a future public API) is introduced.

### 6. Route structure
- `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx` — new route group, public.
- `app/actions/auth.ts` — `register`, `login`, `logout` Server Actions.
- `app/lib/session.ts` — `encrypt`/`decrypt`/`createSession`/`deleteSession`, marked `import 'server-only'`.
- `app/lib/dal.ts` — `verifySession()`, `getUser()`, marked `import 'server-only'`.
- `app/lib/definitions.ts` — Zod schemas (`RegisterFormSchema`, `LoginFormSchema`) shared by client forms and server actions.
- `proxy.ts` — project root (sibling to `app/`), per the fork's file-convention requirement.

## Risks / Trade-offs

- **[Risk]** Stateless sessions cannot be revoked server-side before expiry (e.g., no "log out all devices"). → **Mitigation:** keep session TTL short-to-moderate (7 days, matching the fork docs' example) and document the limitation; revisit with a database-session `data-model` delta if a revocation requirement appears.
- **[Risk]** `SESSION_SECRET` misconfiguration (missing/weak in production) breaks session integrity silently. → **Mitigation:** fail fast at startup if `SESSION_SECRET` is unset; document required env var in `.env.example`.
- **[Risk]** bcryptjs is slower than native bcrypt/argon2 under high load. → **Mitigation:** acceptable for expected MVP traffic; note as a future optimization if login/register latency becomes an issue.
- **[Trade-off]** No email verification means unverified emails can register. Accepted because no FR requires verification; revisit if abuse becomes a problem.

## Migration Plan

No data migration required (`User` schema already supports this). Rollout is additive:
1. Add dependencies and env var.
2. Add `app/lib/session.ts`, `app/lib/dal.ts`, `app/lib/definitions.ts`.
3. Add `app/actions/auth.ts` and `app/(auth)/{login,register}` pages.
4. Add root `proxy.ts` gating `(dashboard)/*`.
5. Add logout control to dashboard shell.

Rollback: remove `proxy.ts` (route protection) and revert dashboard shell changes; no destructive schema change to undo.

## Open Questions

- Should login attempts be rate-limited (PRD mentions rate limiting narratively but no SEC/NFR ID covers it)? Deferred until a requirement ID exists or abuse is observed.
- Session TTL of 7 days assumed from the fork's documented example — confirm with product if a shorter/longer default is preferred.
