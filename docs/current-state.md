# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short, overwrite stale content, don't append endlessly.
> **Commits are the source of truth** (`git log`); this file is the plan + pointers.

**Updated:** 2026-07-10

## Last action (most recent first)

- **`db-test-seam` DONE (2026-07-10).** Added `src/shared/lib/db/test-db.ts` `makeTestDb()` — the seam to
  run the DB-integration suite against a real Postgres (env `TEST_DATABASE_URL`, per-file schema isolation)
  while defaulting to in-process PGlite. Refactored the 4 `*.integration.test.ts` onto it (dropped the
  copy-pasted adapter), added `test:pg` script + `.env.example` (keys only, `!.env.example` is git-tracked)
  + dev-setup note. NEW integration coverage for two previously-zero-coverage security-critical paths:
  `findExportGrant` (returns ALL bullet texts incl. `included=false` per FR-BULLETS-02 + owner/status/IDOR)
  and `subscription.upsert` (ON CONFLICT path). maker(main) ≠ test-author(sonnet) ≠ checker(opus,
  approve-with-nits; close()-robustness nit applied) + verifier. No-regression gate GREEN: 151 files /
  1509 tests. Discovered `127.0.0.1:5544` is PGlite-over-wire (`@electric-sql/pglite-socket`), not native
  PG — `test:pg` against it fails on the socket shim's connection limits (endpoint limitation, NOT a seam
  defect; seam is correct for native PG). NFR-SEC-04, NFR-COST-02, BC-HONESTY-02, TC-STACK-05.
- **`role-provenance-best-effort` (T5 #7, rescoped) DONE (2026-07-10).** Kept bullets now land under their
  best-effort SOURCE ROLE on export instead of all piling onto the most-recent role. Original T5 #7 (persist
  `Bullet.sourceRoleIndex` via migration) was proven infeasible (bullets are cross-role syntheses; no role
  back-pointer; CV blob not persisted) → user chose CLIENT-ONLY best-effort. `build-document.ts`
  `attributeRoleIndex` matches a cv-source bullet's grounding evidence to a role's original lines (tolerant),
  falls back to most-recent for user-confirmed/overclaim/no-match. NO migration/LLM/persistence change; the
  text-membership export gate is untouched (union of role bullets == kept texts — checker PROVED the honesty
  invariant). Spec scenario + tasks.md restored to best-effort. maker(main) ≠ test-author(sonnet, 15 attribution
  cases) ≠ checker(opus, approve/ship, 0 blockers). Green: lint, export 182/182, full suite 149 files/1503
  tests. Residual (documented): bidirectional-`includes` matcher can mis-place (never drop/dupe) — optional
  future word-boundary hardening; full persisted provenance deferred. FR-EXPORT-01/02/03, FR-BULLETS-02, BC-HONESTY-02.
- **`harden-export-gate` (T5 #8 hardening) DONE (2026-07-10).** The base server-side export gate was
  already built + committed (`ca103fa`); the doc had drifted. Adversarial review (2 opus red-teamers)
  confirmed the engaged path sound but found the gate was ADDITIVE — a paid caller could OMIT `tailoringId`
  → shape-only validation → inject fabricated bullets (self-harm, but the exact T5 #8 vector). User decision:
  make it MANDATORY. `enforce-grounding.ts` now takes `tailoringId: string | null`, returns `ok` for a
  bulletless doc and `missing_tailoring` (400) for a bullet-bearing doc with no id; pdf+docx normalize the id
  and call the gate unconditionally past the paywall. Adjacent: FR-EDIT forward-guard comment, un-gated
  profile-fields doc+test, hand-written openspec delta (`changes/harden-export-gate`, bullets capability).
  maker(main) ≠ test-author(sonnet) ≠ checker(opus, approve; nits fixed) + verifier(sonnet). Green: lint,
  export 72/72, full suite 148 files/1488 tests, 0 fail. Residual (accepted): cross-tailoring superset
  smuggling. BC-HONESTY-02, NFR-SEC-04, FR-BULLETS-02/03.
- **`fix-premium-attach-overlay` DONE (2026-07-10).** Fixed the corrupted non-premium tailor UI.
  Root cause: `PremiumAttachZone` free branch put the premium banner in an `absolute inset-0` overlay
  while a short blurred shell drove height (parent `overflow-hidden`), clipping the banner + CTA and
  overlapping `AnalyzeForm`. Fix inverts the layers (blurred shell → aria-hidden absolute backdrop;
  banner → normal flow, drives height). Non-premium now cleanly shows PDF-upload + premium banner +
  résumé textarea + JD + Analyze. Audited the other 3 asks (auth-gate, free-exhausted upgrade UI,
  premium drag&drop) — all already shipped. maker(main) ≠ checker(opus, approved: security/DESIGN/FSD
  clean) ≠ test-author(sonnet: retargeted the tests that encoded the old buggy structure, added a
  structural regression guard — CTA has no `absolute` ancestor — consolidated to one test file).
  Verifier green: lint pass, PremiumAttachZone 15/15, full suite 148 files/1478 tests, no upload-cv
  typecheck errors. FR-CV-01/02/03, FR-SALES-03, NFR-SEC-04, DESIGN.md.
- **`test-tailoring-race-guard` DONE `c872595` (2026-07-10).** 3 PGlite integration cases for the
  `updateStatus` status-race guard: (a) sweep-then-complete rejected, (b) double-terminal no-op,
  (c) zero-rows child-skip. Checker mutation-tested (guard removed → all 3 fail). A future-cutoff-sweep
  flake was found + fixed (back-date own row + positive TTL). Full suite 6/6 green. FR-TAILOR-04.
- **`honest-plan-claims` DONE `d109922` (2026-07-10).** Unfounded Ultra/Pro perks (priority / high-volume)
  marked "(coming soon)"; the "flagship model" claim REMOVED entirely (Opus is already universal, so it is
  neither a current nor future Ultra differentiator — checker catch); legal.offer de-Stripe'd (emulator +
  [TODO]); privacy+offer dates → 9 July. BC-HONESTY-01, BC-BRAND-01, BC-PRIVACY-02.
- **`fix-billing-locale` DONE `70ff874` (2026-07-10).** /account/billing now reads the locale cookie
  (mirrors /account/profile) so the header UA/EN switch works. Verified no other authed page has the gap.
  NFR-I18N-01, FR-BILLING-01, FR-SHELL-01.
- **`restack-checklist-preview` DONE `62e686e` (2026-07-09).** Landing "where you stand": MatchScore card on
  top, bullets in an equal-height (`auto-rows-fr`) 2-col grid; CSS-only dividers. FR-SALES-02, FR-CHECKLIST-*.
- **`fix-faq-and-privacy-accuracy` (T2+T3) DONE `34cdd5e` (2026-07-09).** FAQ "Pro" → "any paid plan";
  free cadence "1 tailoring"; full best-effort GDPR privacy draft (JSON→PDF, [TODO] legal placeholders,
  Ultra added to offer). Completed the 8-task batch.

## Working on

Nothing actively in progress. Recently closed (see Last action): `db-test-seam`,
`role-provenance-best-effort` (T5 #7), `harden-export-gate` (T5 #8), `fix-premium-attach-overlay`, and the
checkout/history follow-up audit.

**Highest-value next (now unblocked-ish):** implement the spec'd `add-docker-dev-env` change — a native
`docker-compose.yml` (Postgres 16) + `db:up`/`db:down`. That gives `test:pg` a REAL engine so the new DB
seam actually catches PGlite-vs-Postgres divergence (the local 5544 is PGlite-over-wire and its socket
shim can't serve the pooled/isolated `test:pg` path). Spec + design already exist in
`openspec/changes/add-docker-dev-env/`; implement + archive.

Openspec deltas awaiting archival (CLI env-blocked): `harden-export-gate` + the un-relaxed
`improve-tailoring-quality` resume-export scenario.

Accepted residuals (documented, not scheduled): T5 #8 cross-tailoring "superset smuggling"; T5 #7 matcher
can mis-place a bullet (never drop/dupe); `findExportGrant` IDOR is repo-level-tested — a route-level
404-on-mismatch e2e is a nice follow-up (NFR-SEC-04).

## Next steps (code-doable, pick by value)

- **Backlog is drained of the queued code items.** T5 #7 + T5 #8 shipped; the checkout/history
  follow-ups were audited and closed as verified-safe (below). Next work is either the blocked items
  (need env/human, see below) or new scope from the product owner.

**Audited & closed (2026-07-10, no code change needed):**
- **checkout/history missing-locale read** — both pages already read the locale cookie with the exact
  fixed-billing pattern (`parseLocale((await cookies()).get(LOCALE_COOKIE)?.value)`). No gap. NFR-I18N-01.
- **/checkout token-vs-session IDOR** — NO vulnerability. The checkout token is HMAC-signed and embeds
  `userId` (minted from `currentUserId()`); completion (`/api/payments/checkout/complete`) builds the
  event `userId` from the VERIFIED TOKEN (not the session) and returns it signed; the webhook grants to
  `event.userId`. So a grant always binds to the token's user regardless of who views `/checkout`. A hard
  `token.userId === session.userId` page gate would add no security and regress the no-cookie context.
  The page's display-only session resolve is correct. NFR-SEC-04, FR-PAYWALL-03.

## Blocked (env / tooling / human — no code here)

- **perf-audit** — Lighthouse needs Chrome (unavailable). Re-run on landing (restack + Cyrillic fonts +
  dynamic route) vs NFR-PERF-04; LCP margin ~20ms.
- **openspec archives** — CLI not installed. ~8 changes to fold in dependency order (`update-landing-flow`
  → `surface-premium-attach-landing`; `harden-account-export-ux` after `fix-gdpr-account-endpoints`; etc.).
- **Prod env + migrate** — set `CV_ENCRYPTION_KEY` / `DATABASE_URL` / `AUTH_SECRET` / `ANTHROPIC_API_KEY` /
  `NEXT_PUBLIC_SITE_URL`, run `yarn db:migrate`, redeploy. GDPR export + history need this end-to-end.
- **Live honesty-eval** — needs `ANTHROPIC_API_KEY` in this env; deterministic proxies green. `COVERAGE_JUDGE`
  defaults ON (key-gated), fails-soft OFF without a key.
- **Ops cron** — `POST /api/maintenance/tailoring-cleanup` (Bearer `$MAINTENANCE_SECRET`) exists; set the
  secret in prod + schedule the periodic invoker (Vercel Cron / curl).
- **UA marketing/legal native review** — landing + privacy/plan copy is faithful but not team-reviewed;
  legal-counsel facts ship as clearly-marked `[TODO]` placeholders.

## Blockers / open questions

- None active. The items above are gated on environment/tooling/human access, not on a decision.

## Prior context (source of truth = `git log` + archived changes)

- Built: FSD foundation, two-pass honesty pipeline, auth (credentials), persistence (pg + AES-256-GCM CV
  at rest), payments emulator (Stripe hard-disabled in prod), account/GDPR APIs, top-bar + AccountMenu,
  landing, UA/EN i18n toggle (Unbounded + Golos fonts, locale cookie), tailoring history, CI +
  typecheck/lint gates, review-findings artifact convention.
- Agentic loop: `maker ≠ checker ≠ test-author` (STRICT, separate contexts); plan-first via this file
  (hook-enforced); commit-on-the-fly; model routing (low→haiku / medium→sonnet / high→opus);
  spec-driven (OpenSpec). See `AGENTS.md`.
