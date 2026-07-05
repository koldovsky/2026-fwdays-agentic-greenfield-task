## Why

Every note operation requires a known, authenticated owner (DATA-001), and no capability in `notes-core` or later phases can be built until users can register, log in, and stay logged in. `app-foundation` and `data-model` are archived, so this is the next unblocking phase per `docs/openspec-capabilities.md`.

## What Changes

- Add email/password registration (FR-001) and login (FR-002) using Next.js Server Actions against the existing `User` table from `data-model`.
- Add stateless, cookie-based session management (FR-003) so sessions survive browser refreshes, using signed/encrypted session cookies (`jose`) per this fork's documented pattern (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`).
- Add a `proxy.ts` at the project root to optimistically redirect unauthenticated requests away from the `(dashboard)` route group to `/login`, and authenticated requests away from `/login` and `/register` — **note:** this fork renamed the `middleware.ts` file convention to `proxy.ts`; there is no `middleware.ts` support.
- Add a Data Access Layer (`app/lib/dal.ts`) with a `verifySession()` helper as the authoritative (non-optimistic) auth check, called from every server action, route handler, and page that touches user data.
- Hash passwords with bcrypt (SEC-001) and validate all auth form input with Zod on both client and server (SEC-002).
- Add CSRF protection (SEC-003) via same-origin verification on state-changing Server Actions, since this fork's Server Actions do not by themselves guarantee origin checking is enabled for this project's configuration.
- Add logout action that clears the session cookie.
- **BREAKING**: none — this is new capability; no existing routes or schema change shape.

## Capabilities

### New Capabilities

- `auth`: registration, login, logout, session persistence, and route protection for the Notely application, covering FR-001, FR-002, FR-003, SEC-001, SEC-002, SEC-003.

### Modified Capabilities

_None._ `data-model`'s `User` table already provides `email` and `passwordHash`; no schema change is required.

## Impact

- **New code**: `app/(auth)/login/`, `app/(auth)/register/`, `app/actions/auth.ts`, `app/lib/session.ts`, `app/lib/dal.ts`, `app/lib/definitions.ts` (Zod schemas), `proxy.ts` (project root).
- **Dependencies**: add `bcryptjs` (password hashing, pure JS — avoids native-binding issues), `jose` (session JWT sign/verify), `zod` (validation), `server-only` (guard server modules).
- **Env**: new `SESSION_SECRET` environment variable (documented in `.env.example`).
- **Affected existing code**: `app/(dashboard)/` routes gain a real auth gate in place of the placeholder, unauthenticated access from `add-app-foundation`.
- **Downstream**: unblocks `add-notes-core`, which needs `verifySession()` / `getUser()` to scope note queries to `DATA-001`.
