# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short — overwrite stale content, don't append endlessly.

**Updated:** 2026-07-04

## Last action

- **10-task batch analyzed + P0 ECONNRESET fixed (2026-07-04, ultracode).** User handed a 10-item
  batch (re-scoped version of the roadmap) and asked to prioritize, dedupe against shipped code, and
  continue. Ran a 10-agent evidence workflow (`wf_c452a9aa-e02`) mapping each task to real code state
  (trust code over prose). Result: **half already shipped.** Then fixed the P0 and the one red-suite
  blocker:
  - **Task 2 (P0) FIXED + committed (`fcf39c5`).** `DELETE /api/account` (and export) 500'd with
    `read ECONNRESET`. Root cause: `pg.ts` was a bare `new Pool({connectionString})` — no SSL, no
    idle timeout, no `pool.on('error')`. A managed/serverless PG closes idle sockets → the reused
    pooled client resets on the next query, and an idle-client `error` with no listener crashes the
    process. Fix: pool now sets `ssl` (new `getDatabaseSsl()`, on in prod), `keepAlive`,
    `idleTimeoutMillis` (evict before the server does), `connectionTimeoutMillis`, `max`, a
    `pool.on('error')` logger, and **retry-once** on connection-level errors in `createPgQueryable`
    (query errors still surface). Resolves the whole ECONNRESET class (delete/export/tailor/history).
    +8 tests.
  - **Task 6 red tests FIXED + committed (`7babd9d`).** 2 stale non-UUID fixtures in
    `tailoring/[id]/route.test.ts` collided with the route's UUID guard (404 before the mock). Now
    use valid UUIDs; IDOR case now genuinely tests ownership. **Full suite green: 102 files / 623.**
  - **Latent broken build FIXED + committed (`e134db0`).** `yarn build` was red on the branch: the
    `add-tailoring-history` "unverified" commit left a TS narrowing error in `tailor/generate` (a
    mutable `let` narrowing lost across the `withTransaction` closure → `persistTailoring` saw
    `string | null`). lint + vitest passed but `tsc` failed — the branch was undeployable. Fixed by
    capturing the narrowed value in a const. **`yarn build` + `yarn lint` + 623 tests all green.**

- **Prior (same day): registration 500 + `db:migrate` runner (`73dd267`).** Fresh Vercel deploy 500'd
  on register — no `DATABASE_URL` and **no prod migration step** (`runMigrations` only ran in tests +
  dev pglite). Added `scripts/migrate.mjs` + `db:migrate` npm script (self-contained, per-file tx,
  idempotent, honors `sslmode`). Pushed to `origin/vouch`. **User's DB: not provisioned yet.**

## Evidence-based status of the 10-task batch (see git log for the fix commits)

| # | Task | Status | Effort | Crit |
|---|------|--------|--------|------|
| 1 | Tailoring intelligence (seniority / blue-"info" / cover letter) | **DONE** (shipped + archived) | S | P1 |
| 2 | Delete profile ECONNRESET | **DONE** (`fcf39c5`) | S | P0 |
| 3 | GDPR export `export_failed` | **DONE (code)** — same root cause as #2; needs env set in prod | S | P1 |
| 4 | Header rework (name by burger, no anchor leak, sub link) | **DONE** — only openspec archive pending | S | P1 |
| 6 | Tailoring history | **PARTIAL→green** — feature works E2E; suite now green; archive + 0004 integ-test pending | S | P2 |
| 9 | Landing marketing/copy (enemy-centric) | **PARTIAL** — no pain-first hero, i18n debt | M | P2 |
| 8 | Landing → new flow (cover letter / info tag / attach / history) | **TODO** (deps 1,5,6) | M | P1 |
| 5 | Premium PDF attach | **TODO** — nothing exists; spec-first (security/LLM/honesty) | L | P1 |
| 7 | Animations | **TODO** — `landing-animations` spec exists (unimpl); app-side unspec'd | L | P2 |
| 10 | Whole-app UA/EN toggle | **TODO** — infra only; **Cyrillic fonts unwired = blocker**; landing hardcoded EN | L | P2 |

## Working on

- **Batch cleanup complete for the fast+critical items (2, 6, and confirming 1/3/4 done).** Next up is
  the landing pair (8+9) then the three large spec-first items (5, 7, 10).

## Next steps (ranked: fastest × most critical)

1. **Ops (task 3, no code):** once the prod DB is provisioned, set `CV_ENCRYPTION_KEY` + `DATABASE_URL`
   (+ `AUTH_SECRET`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL`), run `yarn db:migrate`, redeploy.
   Export is the only path that *decrypts* (getRawText) so it 500s on an unset/rotated key even when
   delete works. Optional: a fail-fast boot env check.
2. **Close task 6:** add a pglite integration test for migration 0004 + `persistTailoring`→`listByUser`
   round-trip (mirror the 0003 pattern), then verifier+checker subagents → `openspec archive
   add-tailoring-history`. Also archive `rework-app-header` (task 4). (openspec CLI not installed here.)
3. **Tasks 8 + 9 together (landing, M):** spec-first `marketing-landing` delta, then one `content.ts`
   pass — pain-first/enemy-centric hero, add the 5th "info/coverable" checklist state to the demo, sell
   cover letters + history, extract strings into `shared/lib/i18n` (ua+en) to stop deepening EN-only
   debt. `perf-audit` after (LCP margin ~20 ms). Hold the PDF-attach copy until task 5 ships.
4. **Task 5 (L):** `openspec-propose` premium PDF attach — AES-256-GCM `pdf_binary` column (GDPR
   export + delete-cascade parity), document blocks in the **generation pass only** (keep out of
   grounding: extend `GROUNDING_FORBIDDEN` + adversarial fixture), disabled attach control + "premium"
   badge + new `PaywallReason='attach'`, server-side entitlement. honesty-eval before archive.
5. **Task 7 (L):** implement the spec'd `landing-animations` (motion tokens + reduced-motion guard,
   reveal primitive, hero entrance keeping LCP painted), `perf-audit`; then a *new* change for app-side
   skeletons/optimistic updates.
6. **Task 10 (L):** wire Cyrillic fonts FIRST (Golos Text + Unbounded, cyrillic subset) — the real
   blocker — then locale cookie + `<html lang>` dynamic + header `LanguageSwitch` + extract landing
   strings. Spec-first (`add-language-toggle`).

## Decision needed (task 1 — user said "can be discussed")

Task 1 is **already implemented**. The shipped cover letter is the **deterministic** path (grounded
kept bullets reflowed to UA prose — overclaim cannot leak). A richer grounded-LLM cover-letter prompt
is authored but not the active path. **Question for user:** keep the deterministic letter, or promote
the LLM path (needs honesty-eval + `ANTHROPIC_API_KEY`)?

## Blockers / open questions

- **Prod env not set yet** (task 3 resolution is operational). DB not provisioned. `yarn db:migrate`
  must run against the prod URL before history/GDPR work end to end.
- **Cyrillic fonts unwired** blocks task 10 (layout.tsx loads latin-only subsets).
- **`ANTHROPIC_API_KEY`** still needed for live honesty-eval (tasks 1, 5) — deterministic proxies green.
- **Stripe** (real payments) still gated on key rotation; only the emulator exists, hard-disabled in prod.
- `perf-audit` needs Chrome (unavailable in sandbox) — run on the landing rework (tasks 8/9/7).
- openspec CLI not installed here → archives (tasks 4, 6) are authored/ticked but not folded via CLI.

## Prior context (see git log + archived changes)

- Archived: `add-tailoring-intelligence` (task 1), `add-resume-wizard`. Built: FSD foundation, two-pass
  honesty pipeline, auth (credentials), persistence (pg + AES-256-GCM CV at rest), payments emulator,
  security hardening, account/GDPR APIs, top-bar AccountMenu, landing (perf met).
- Open changes not archived: `rework-app-header` (task 4, done), `add-tailoring-history` (task 6, done),
  `landing-animations` (task 7, unimpl), `add-payments-emulator`, `add-stripe-payments`,
  `harden-sentry-privacy`, `add-legal-pages`.
