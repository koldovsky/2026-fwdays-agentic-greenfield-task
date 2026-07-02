# add-auth — design decisions

## Context

TC-STACK-07 allows Auth.js, Supabase Auth, or Clerk — "must support email +
Google OAuth without custom session management". The scrypt credential service
(`shared/lib/auth`) and Postgres repos already exist and are pglite-verified.

## Decision: Auth.js (next-auth v5) with JWT sessions

**Chosen (2026-07-02):** `next-auth@5.0.0-beta.31` (v5 is App Router-native;
v4 "latest" would need `getServerSession` plumbing; both support this Next
major per peer deps).

- **Why not Supabase Auth / Clerk:** both are hosted services requiring
  external accounts/keys — unavailable, and they would displace the existing
  self-hosted user/credentials tables. Auth.js is a library over our own
  Postgres, so nothing built so far is thrown away.
- **Session strategy: stateless JWT** (Auth.js default with Credentials).
  No session table, no DB read per request; the session cookie is HttpOnly and
  signed with `AUTH_SECRET`. This is exactly "no custom session management".
- **Credentials provider delegates** to `authenticateWithPassword` — uniform
  `invalid_credentials`, timing-equalized (no enumeration). Auth.js never sees
  a password hash.
- **Google OAuth (FR-AUTH-02)** plugs in later as a second provider in
  `src/app/auth.ts` + the existing `oauth_accounts` table; blocked only on
  client id/secret.

## Placement (FSD)

`shared/lib` must stay framework-free (TC-PURE-01), so the Auth.js config is
app-layer wiring: `src/app/auth.ts` exports `{ handlers, auth, signIn,
signOut }` + `currentUserId()`; `src/app/api/auth/[...nextauth]/route.ts`
re-exports handlers. Registration is a plain route handler
(`/api/auth/register` — static segment wins over the catch-all) over
`registerWithPassword`. GDPR endpoints (`/api/account*`) resolve the user via
`currentUserId()` and delegate to `shared/lib/account`.

## Env

- `AUTH_SECRET` — required at runtime (any 32+ byte random string).

## Dev verification without Postgres

`scripts/dev-pglite-server.mjs` serves pglite over TCP (port 5544) with
migrations applied, so the real `pg` Pool + full HTTP flow run locally.
Limitation: single connection at a time — stop the app before seeding by hand.
