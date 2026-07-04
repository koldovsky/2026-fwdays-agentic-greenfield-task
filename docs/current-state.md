# Current state

Agent-maintained snapshot of the last session. Read at session start; update at session end.

## Last updated

2026-07-04T15:15:00Z

## Last session summary

Proposed and implemented OpenSpec change `add-auth` (phase 2): 29/29 tasks
complete, not yet archived. Discovered this Next.js fork renames
`middleware.ts` to `proxy.ts` (confirmed in `node_modules/next/dist/docs`)
and has no confirmed Auth.js compatibility, so auth is hand-rolled per the
fork's own documented pattern: `bcryptjs` password hashing, `jose`-signed
stateless session cookies (`app/lib/session.ts`), a DAL with
`verifySession()`/`getUser()` (`app/lib/dal.ts`), an explicit same-origin
CSRF guard (`app/lib/csrf.ts`), Server Actions for register/login/logout
(`app/actions/auth.ts`), new `(auth)` route group with Notely-styled forms,
a logout control in the dashboard header, and root `proxy.ts` gating
`(dashboard)/*`. Verified end-to-end in a real browser (Playwright driving
system Chrome, since no browsers were pre-installed) against the local
Postgres: register → session persists across refresh → route
redirects both ways → logout → duplicate-email and wrong-password/
unknown-email generic errors — all 11 checks passed with no console errors.
Confirmed `passwordHash` is a real bcrypt hash in the DB. `tsc --noEmit`,
`npm run lint`, and `npm run build` all clean.

## Current focus

Archive `add-auth` (`/opsx:archive`), then start `add-notes-core` (phase 3)
via `/opsx:propose` — it depends on `auth` + `data-model`, both now done.

## Completed recently

- Implemented `add-auth`: registration, login, logout, session persistence,
  route protection via `proxy.ts`, bcrypt hashing, Zod validation, CSRF guard
  (29/29 tasks) — pending archive
- Archived `add-data-model` → `openspec/changes/archive/2026-07-04-add-data-model/`
- Synced main spec `openspec/specs/data-model/spec.md`
- Implemented Prisma schema, migration, seed script, soft-delete/purge helpers (23/23 tasks)
- Archived `add-app-foundation` → `openspec/changes/archive/2026-07-03-add-app-foundation/`
- Implemented dashboard shell, theme, sidebar, static routes (19/19 tasks)

## Blockers / open questions

- Deployment target for the scheduled 30-day purge job is undecided
  (Vercel Cron vs. external cron); `lib/notes/purge.ts` has the query
  ready but nothing invokes it on a schedule yet.
- Local dev Postgres runs via `docker-compose.yml` (port 5453,
  `notely`/`notely`); `DATABASE_URL` lives in `.env` (gitignored) mirroring
  `.env.example`. `SESSION_SECRET` was generated locally and appended to
  `.env` (gitignored) — not committed anywhere.
- Session TTL (7 days) and no email verification/password reset/rate
  limiting are documented as open questions / non-goals in
  `openspec/changes/add-auth/design.md`; revisit if requirements emerge.
- SEC-003 (CSRF) verified by code inspection (`assertSameOrigin()` runs
  first in every action) rather than a clean end-to-end wire-protocol
  reproduction — hand-crafting Next's Server Actions protocol via curl was
  unreliable; see `openspec/changes/add-auth/tasks.md` task 9.7 for detail.

## Files touched

- `app/lib/session.ts`, `app/lib/dal.ts`, `app/lib/csrf.ts`, `app/lib/definitions.ts`
- `app/actions/auth.ts`
- `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`
- `components/auth/login-form.tsx`, `components/auth/register-form.tsx`
- `components/layout/logout-button.tsx`, `components/layout/app-shell.tsx` (wired logout)
- `components/icons.tsx` (added `IconLogout`)
- `proxy.ts` (project root)
- `prisma/seed.ts` (real bcrypt hash for demo user)
- `package.json` (`bcryptjs`, `jose`, `zod`, `server-only`), `.env.example`, `.env`
- `openspec/changes/add-auth/` (proposal, design, specs/auth/spec.md, tasks.md)
