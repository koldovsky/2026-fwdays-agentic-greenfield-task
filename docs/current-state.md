# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short — overwrite stale content, don't append endlessly.

**Updated:** 2026-07-02

## Last action

- **`add-auth` — email/password core done + live-verified (2026-07-02).** No external creds:
  - `shared/lib/auth`: `password.ts` (salted-scrypt `hashPassword`/`verifyPassword`, pure Node,
    self-describing `scrypt$N$r$p$salt$hash` envelope) + `service.ts`
    (`registerWithPassword`/`authenticateWithPassword` over injected user/credential ports;
    uniform `invalid_credentials`, timing-equalized unknown-email path — no account enumeration).
  - Storage over the `Queryable` port: `db/user-repo.ts`, `db/credentials-repo.ts` (hash kept
    OUT of user reads, NFR-SEC), migration `0002_auth.sql` (`credentials` + `oauth_accounts`,
    cascade). pglite integration test proves register/auth round-trip + hash-at-rest (FR-AUTH-01,
    task 2.1/4.2). tsc clean, lint 0, build green, **136 tests** (+10).
  - Deferred (need decision/creds): Auth.js library + session helper (1.2/3.2), Google OAuth flow
    (2.2, has `oauth_accounts` table), password-reset email (2.3), `features/sign-in` UI (3.x).
- **`add-persistence` — pg stack chosen + live-verified (2026-07-02).** DB decision:
  **node-postgres (pg) + raw SQL** (fits the `Queryable` port 1:1, no ORM).
  - `shared/lib/db`: `port.ts` (`Queryable`), `pg.ts` (Pool adapter, server-only, kept out of
    the barrel so `pg` never bundles client-side; `getDb()`/`getPool()`), `migrate.ts`
    (forward-only runner, `schema_migrations`, idempotent), `migrations/0001_init.sql`
    (8 tables, ON DELETE CASCADE, CHECK enums; core `gen_random_uuid()`).
  - Repos over the port, hand row↔model mapping, no ORM/entity leak: `cv-profile-repo`
    (AES-256-GCM at rest via `shared/lib/crypto`, FR-CV-04/05, NFR-SEC-01) and `tailoring-repo`
    (tailoring + checklist_items + bullets `ord`-stable, `listByUser`/`findById`, cascade;
    FR-TAILOR-04, FR-HISTORY-01/02).
  - **Verified for real on pglite** (in-process PG, dev dep): migrations apply + idempotent,
    CV ciphertext round-trip, user→cv_profiles and tailoring→children FK cascade. Plus
    fake-`Queryable` unit tests. `DATABASE_URL` in `shared/config/env.ts`.
  - Env: `pg` (dep), `@electric-sql/pglite` + `@types/pg` (dev). tsc clean, lint 0,
    `next build` green (pg/pglite absent from client bundle), **126 tests**.
- **`add-persistence` — crypto + entities (2026-07-02).** `shared/lib/crypto` AES-256-GCM
  (`aes.ts` pure `v1:` envelope + `key.ts` lazy `CV_ENCRYPTION_KEY`, task 1.3). Pure entities
  `user`/`subscription`/`usage-counter` (system-design §7; anon 1 / free 2 / paid ∞ gating).
- **`add-landing-page` shipped + ARCHIVED (2026-07-02).** `views/landing` at `/` (10 sections,
  FAQ only client piece), full SEO (metadata/OG/Twitter, robots.ts, sitemap.ts, opengraph-image,
  JSON-LD), `Button` gained `href`, global `:focus-visible`. Baseline spec
  `openspec/specs/marketing-landing/spec.md`; change in `openspec/changes/archive/`. English copy
  (display font lacks Cyrillic — see blockers).

## Prior (done, see git log)

- Foundation P0–P4: Vitest (pure node + jsdom projects), `shared/lib/scoring` (pure
  checklist/matchScore), `shared/lib/i18n` uk/en, `shared/lib/llm` two-pass prompt core
  (structural honesty), `shared/ui` kit, entities (cv-profile/job-description/requirement/
  tailoring/checklist-item/bullet), widgets (checklist-panel/bullet-list/result-view),
  `views/tailor-workspace` at `/tailor` (stub fixture). SDD baseline specs + 5 change proposals.

## Working on

- **`add-persistence`** + **`add-auth`** — both cores done + pglite-verified. Persistence
  remaining: GDPR endpoints (3.x, need session) + checker-review. Auth remaining: Auth.js
  library/session decision, Google OAuth flow, reset email, `features/sign-in` UI.

## Next steps

1. **Decide the Auth.js library / session strategy** (next-auth v5 vs lucia vs custom HMAC
   session). It gates: `shared/lib/auth` session helper (current-user in route handlers), the
   sign-in HTTP surface (`src/app/api/auth/**`), and therefore the persistence **GDPR endpoints**
   (`GET /api/account/export`, `DELETE /api/account`) which need the current-user id. The
   register/authenticate + repos already exist — only the session/HTTP wrapper is new.
2. **`features/sign-in` UI** + top-bar session state; enforce sign-in only at export/paywall,
   keep one free anonymous tailoring (FR-ONBOARD-01, 3.x).
3. **`add-agent-loop`** — replaces the `/tailor` stub fixture. Needs `ANTHROPIC_API_KEY`
   (+ optional `OPENAI_API_KEY`); reuses `shared/lib/llm`. Keep user ids out of LLM payloads (NFR-SEC-02).
4. **`add-payments-emulator`** — needs persistence (subscriptions/usage_counters) + auth. Emulator.

Also open: features `export-resume`, `edit-bullet`, `upload-cv`/`paste-jd` (parse needs pdf/docx, TC-PARSE-01/02).

## Blockers / open questions

- **Ukrainian-first vs display font** — Bricolage Grotesque (headline font, DESIGN.md mandate)
  has no Cyrillic subset, so UA headlines break the brand. Landing shipped English. Resolve before
  i18n: pick a Cyrillic display face OR accept English marketing (NFR-I18N-01/BC-BRAND-01 tension).
- **Env before launch:** `NEXT_PUBLIC_SITE_URL` (SEO defaults to `https://vouch.app`), `DATABASE_URL`,
  `CV_ENCRYPTION_KEY` (64 hex or base64→32 bytes).
- **Auth.js library / session strategy undecided** (`TC-STACK-07`) — next-auth v5 vs lucia vs
  custom HMAC session. Gates the session helper, sign-in HTTP, and GDPR endpoints. Google OAuth
  also needs client id/secret; reset flow needs an email sender. Merchant-of-record (`TC-STACK-06`) undecided.
- `add-agent-loop` needs LLM SDK choice + `ANTHROPIC_API_KEY`; queue (BullMQ+Redis) not stood up.
- (Housekeeping) Caveman statusline badge + SessionStart hook for `~/.claude/settings.json` was
  auto-blocked as self-modification; apply manually if wanted.
