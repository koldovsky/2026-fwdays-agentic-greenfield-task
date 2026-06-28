# Current state — Kolo360

> Working-memory handoff between sessions. Read this first; update it after any
> meaningful change. Short and current — overwrite stale lines, don't append a log.

**Last action:** 2026-06-28 — implemented slice `add-auth` (FR-AUTH-01..05): single HR account
in DB (`HrUser`), access JWT (jose) + rotating refresh token (opaque, hashed in `Session`),
httpOnly/Secure/SameSite cookies, transparent refresh + route guard in `proxy.ts` (Next 16
renamed `middleware`→`proxy`, Node runtime), minimal token-styled sign-in page, sign-out.
Migration `add_auth_tables` applied. Full loop green (lint/tsc/32 tests/build) + a live
proxy smoke test (guard redirect, valid pass, transparent refresh, rotation revokes old token).

**Phase:** Implementation. Auth reviewed (APPROVE-WITH-NITS), spec synced → `openspec/specs/auth/`,
and **archived** (`archive/2026-06-28-add-auth`). No active change. Next slice: `cabinet-shell`.

## Done so far

- Groundwork: `docs/requirements.md` (PRD), `product-brief.md`, `DESIGN.md` + in-app design
  system, `AGENTS.md`, OpenSpec, `docs/mvp-capability-plan.md`. (archived)
- **Slice `add-token-cost-calculator`** (archived) — pure `cost()` in `lib/ai/`, Zod usage
  schemas in `lib/schemas/usage.ts`, seed price table; `zod`+`vitest` infra, `@/` alias.
- **Slice `add-foundation`** (archived) — `prisma/schema.prisma` (9 models + 4 enums), shared
  `lib/db/` client, Prisma 7 adapter; Neon provisioned, migration `init` applied.
- **Slice `add-auth`** (FR-AUTH-01..05; reviewed + archived; spec → `openspec/specs/auth/`) — credentials in `HrUser`; pure
  `lib/auth/{tokens,password,redirect,cookies}.ts` (+ tests) and DB-backed `session.ts`;
  `lib/schemas/auth.ts` + lazy `lib/env.ts` (only `AUTH_JWT_SECRET` in env); `proxy.ts` guard +
  transparent refresh; `app/sign-in/` (server action + client form) and `app/api/auth/sign-out`;
  `lib/i18n/{uk,en}.ts`; `scripts/{hash-password,create-hr-user}.mts`; migration `add_auth_tables`.
  Added `jose`; `tsconfig` got `allowImportingTsExtensions` (for `.mts` scripts). 32 tests.

## Next step

1. Next slice: `cabinet-shell` (FR-SHELL-01..03 — sidebar + sticky header + respondent shell),
   rendered inside the now-protected area. Reuses `lib/i18n` and the session/cookie helpers.
   Propose via `/opsx:propose`, then `/opsx:apply`.
2. Carry-over nits from the add-auth review (archived tasks.md 7.3): #3 make guarded `/api/*`
   return 401 JSON (not a redirect) when those routes land; #5 revisit CSRF token. Address when
   the cabinet slice adds routes/APIs behind the guard.
3. Set `AUTH_JWT_SECRET` in env per environment; provision the HR account with
   `node scripts/create-hr-user.mts <email> "<password>" ["Name"]`. `DATABASE_URL`/`DIRECT_URL`
   already in `.env.local`. (A test row `test.user@test.com` exists in Neon — drop before prod.)

## Open questions / blockers

- None. (Deferred to Future: real email delivery via Resend, Telegram channel, full
  360° multi-reviewer, AWS self-hosting.)
