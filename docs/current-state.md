# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short — overwrite stale content, don't append endlessly.

**Updated:** 2026-07-04

## Last action

- **PROD DEPLOY: registration 500 root-caused + `db:migrate` runner added (2026-07-04).**
  User deployed to Vercel from GitHub; registration returns 500. Traced two deploy gaps
  (`route.ts:76-80` swallows the real cause into a generic `server_error` 500 — true error only in
  Vercel function logs):
  1. **Env not set** — `getDb()`→`getDatabaseUrl()` throws when `DATABASE_URL` absent (`env.ts:5-11`).
  2. **Migrations never run in prod** — `runMigrations` (`migrate.ts`) is only called by tests +
     `dev-pglite-server.mjs`; no deploy step, no npm script. Fresh prod DB has no `users`/
     `credentials` tables → INSERT fails → 500. (Also: `pg.ts:26` sets no SSL — managed PG needs
     `?sslmode=require` in the URL.)
  - **Fix shipped:** new `scripts/migrate.mjs` + `db:migrate` npm script — self-contained forward-only
    runner over real Postgres (per-file tx, `schema_migrations` idempotency, honors `sslmode` via the
    URL). Verified: applies all 4 migrations on a fresh pglite, idempotent on re-run; `yarn lint` clean.
  - **User's DB decision:** none provisioned yet (fresh Vercel project). Next: provision Vercel
    Postgres/Neon (auto-injects `DATABASE_URL` w/ SSL), set `AUTH_SECRET` + `CV_ENCRYPTION_KEY`
    (+ `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL`), run `yarn db:migrate` against the prod URL once,
    redeploy. Landmine: `PAYMENTS_PROVIDER=emulator` is hard-disabled in prod (`env.ts:62-67`).

- **T6 history STARTED (2026-07-04, ultracode). Scope discovery = bigger than roadmap "M".**
  Scouted the seams before coding. Findings that reshape the plan:
  - `tailoring-repo.ts` already has `save`/`listByUser`/`findById`/`deleteById` (cites
    FR-HISTORY-01/02) — but **`save` is never called from the live flow**; only GDPR
    export/delete read via the repo. **The entire write path is unwired** → history is empty today.
  - **Nothing** is persisted during a run: no `cv_profiles`, `job_descriptions`, or `tailorings`
    rows are written at upload/analyze/generate. `tailorings.cv_profile_id` is a **NOT NULL FK**
    we don't hold at generate (generate has structured `cvProfile`, not raw CV text).
  - **PRD correction:** history is **paid-only** (FR-TAILOR-04, FR-HISTORY-01: "logged-in paid
    users"; free users see the current-session result only). The generate route already resolves
    `kind` (paid/free) — reuse that gate.
  - No tx helper on the `Queryable` port; no `job-description-repo`.
  - Decision (mine, recorded): **persist-on-generate, paid + signed-in only, best-effort/non-fatal**
    (a save failure must never sink an already-streamed result). Satisfy FKs by (a) migration
    **0004** makes `tailorings.cv_profile_id` **nullable** (history needs job_title/score/checklist/
    bullets, not the CV blob — bullets already embed grounded evidence) + adds `job_title text`;
    (b) persist a `job_descriptions` row (plaintext JD, already the schema) + the tailoring. CV-at-
    rest linkage deferred (its own unbuilt concern; keeps encryption off the hot path).

- **T1 tailoring intelligence §3-5 IMPLEMENTED + committed (2026-07-04, ultracode).** Continued the
  roadmap by rank; T1 (flagship P1) is the last big feature. Worked directly on `vouch` (user
  directive: keep all changes on `vouch`, no worktree — `bgIsolation:none` in `.claude/settings.json`,
  committed as a chore). Mapped the 9 code seams with a parallel-investigator workflow, then
  implemented sequentially, committing per section:
  - **§3 seniority inference** (`feat(tailoring): seniority inference`): CV-prose-only career-stage
    signal (junior/mid/senior), **best-effort/non-fatal** analysis step (a flaky tone hint never
    sinks an honest run — new `runOptional` records a step on success, nothing on exhaustion).
    Threaded into generation tone, **never** grounding (structural: grounding input type has no
    stage channel; `generate-bullet` names `careerStage`, `ground-bullet` never does).
  - **§4 cover-letter export** (`feat(cover-letter): grounded cover-letter export`): new
    `features/export-cover-letter` slice, `/api/export/cover-letter` route (server-side paywall,
    calm 500), PT-Sans Cyrillic PDF renderer, stepper button, ua+en i18n. Shipped path = the
    deterministic MVP (grounded `includedInExport` bullets reflowed to prose, overclaim can't leak —
    decision #6); the grounded LLM prompt is authored as the richer future path.
  - **§5 grounding-isolation guard** (`test(honesty): grounding-isolation regression guard`):
    explicit `GROUNDING_FORBIDDEN` denylist + adversarial fixtures (careerStage/coverLetter both
    trip `grounding-isolation`); grounding-prompt byte-stability test.
  - Verified: `yarn lint` + `yarn build` clean, `yarn test` **92 files / 570 tests green** (+41).
  - **§6 DONE (maker≠checker).** Verifier subagent: PASS (all gates + FR/NFR evidence). Checker
    subagent found **1 major** — the split wizard flow (`TailorWorkspace`) dropped `careerStage`
    before `/api/tailor/generate`, so §3 was **inert in production** (seniority call ran, result
    discarded). **Fixed** (`fix(tailoring): thread careerStage through the wizard generate call`) +
    regression test. Grounding isolation / hues / i18n all clean.
  - **§6.3 DONE: change archived.** `openspec archive add-tailoring-intelligence` folded the
    checklist/bullets deltas + new `cover-letter` spec into baselines (7/7 baseline specs validate);
    moved to `archive/2026-07-04-add-tailoring-intelligence`. Task 3.7 (live honesty-eval) left open —
    **blocked on `ANTHROPIC_API_KEY`**; behavior implemented + deterministically tested.

- **Prior: 13-item roadmap analyzed, P0 bugs fixed, specs authored (2026-07-04).**
  User handed a 13-task batch. Added a **commit-on-the-fly rule** to `AGENTS.md`. Ran a 16-agent
  analysis workflow (`wf_ba635982-08a`) to root-cause the 2 GDPR 500 bugs + cross-reference all 13
  tasks against existing specs/changes/PRD → ranked roadmap in **`docs/roadmap-2026-07.md`**.
  - **Bugs 2 & 3 FIXED + committed (`c39fc9f`).** Both GDPR routes (`DELETE /api/account`,
    `GET /api/account/export`) wrapped no try-catch → any throw (unset `CV_ENCRYPTION_KEY`, DB/FK
    error) surfaced as an opaque raw 500 (root cause of both reports). Now catch → calm coded 500
    (`deletion_failed`/`export_failed`), cause logged server-side only, no schema leak
    (NFR-OBS-01, info-disclosure). +8 tests. Delete cascade confirmed sound (all child FKs are
    `ON DELETE CASCADE`).
  - **Pre-existing broken build fixed:** `@sentry/nextjs@^10` was in package.json but uninstalled
    → `yarn build` failed. Ran `yarn install` (yarn.lock unchanged). Build now clean.
  - **4 OpenSpec change packages authored** (proposals, not yet implemented): `fix-gdpr-account-endpoints`
    (retroactive, new `account` capability, tasks ticked to match the shipped fix — I wrote this by
    hand), plus workflow `wf_2cfd640c-b70` authored `harden-sentry-privacy` (T11, new `observability`
    cap), `add-legal-pages` (T12, new `legal` cap), `add-tailoring-intelligence` (T1: MODIFIED
    `checklist`+`bullets`, new `cover-letter` cap).
  - Verified: `yarn lint` + `yarn build` clean, `yarn test` **88 files / 519 tests green**.

## Ranked roadmap (see docs/roadmap-2026-07.md for detail)

1-2 ✅ BUG-1/2 GDPR 500s (P0, done) · 3 T11 Sentry PII (P1, spec'd) · 4 T4 header (P1) ·
5 T12 legal (P1, spec'd) · 6 T1 tailoring intelligence (P1/XL, spec'd) · 7 T6 history (P2) ·
8 T5 premium PDF-attach (P1) · 9 T13 real Stripe (P1/XL, blocked) · 10 T7 animations (P2) ·
11 T8 landing update (P1, dep T1/T5/T6) · 12 T9 landing copy (P2) · 13 T10 i18n toggle (P2, blocked).

## Working on

- **T6 `add-tailoring-history` — IN PROGRESS.** Change `add-tailoring-history` (empty stub → being
  authored). FR-HISTORY-01/02, FR-TAILOR-04. Paid-only. Plan below.

### Plan — T6 history (add-tailoring-history, spec-first)

1. **Spec** — author `add-tailoring-history` proposal + tasks + `history` capability spec delta
   (WHEN/THEN for persist-on-generate, paid gate, IDOR, list, re-open). `openspec validate`.
2. **Migration 0004** (`0004_tailoring_history.sql`): `ALTER TABLE tailorings ADD COLUMN job_title
   text` + `ALTER COLUMN cv_profile_id DROP NOT NULL`. Verify via pglite integration test.
3. **`extractJobTitle(jd)`** pure helper in `shared/lib` (TC-PURE-01) + unit tests (heuristic: first
   meaningful JD line / role phrase; null when nothing plausible).
4. **Repo** — extend `tailoring-repo`: `jobTitle` on `SaveTailoringInput`/`TailoringSummary`/`Record`,
   `cvProfileId` nullable; persist + select `job_title`. Minimal `job-description-repo` (`save`).
5. **Persist-on-generate** — best-effort helper called after the `result` event in
   `/api/tailor/generate` **only when `kind === "paid"`**: insert JD row + tailoring (job_title
   extracted, cv_profile_id NULL), map checklist/bullets to repo inputs, wrapped in try/catch
   (log server-side, never break the stream). Map ChecklistStatus/grounding → repo enums.
6. **Routes** — `GET /api/tailoring` (list, current user, paid) + `GET /api/tailoring/[id]`
   (detail, **IDOR-gated: 404 when `record.userId !== currentUserId`**, don't leak existence).
7. **`views/history` slice** — list (job title · score · date · re-open) + detail (re-open into
   ResultView read/edit). Thin `/history` + `/history/[id]` app routes.
8. **AccountMenu** — add real History link (paid; honest state for free).
9. **i18n** ua+en `history` block. **Tests** at every seam. **Verify** (verifier + checker
   subagents, maker≠checker) → archive.

### Done — T1 blue "info" checklist status (add-tailoring-intelligence §0-2)

- New `ChecklistStatus` value `"info"` (between partial and gap): a multi-word requirement whose
  full text is absent but a component token is grounded in the CV (e.g. "React Native" ← "React").
  Deterministic, pure (TC-PURE-01); single-word keywords never qualify (conservative).
- Rationale is a Ukrainian cover-letter suggestion naming the adjacent evidence; credit 0.25
  (below partial 0.5, above gap 0). Reuses the **existing brand blue** token (no new hue — DESIGN.md).
- Threaded through every exhaustive map: StatusPill, ChecklistRow, ChecklistPanel, i18n statusLabel
  (ua "Можна підсилити" / en "Coverable"). New migration `0003` widens the `checklist_items.status`
  CHECK constraint. Scoring + panel tests added. lint+build clean, **529 tests** green (migration
  0003 verified via the pglite integration test).

### Done — T12 legal (add-legal-pages)

- `views/legal` slice + `/privacy` + `/oferta` routes (both prerender **static**, crawlable).
- Privacy Policy (data held, encrypt-at-rest, no training, no trackers, GDPR export/delete rights)
  + public offer (parties, Free/Pro/Job-hunt Pass plans, payment/refund, acceptance) — i18n ua+en,
  **marked draft pending legal-counsel sign-off**.
- Footer dead `href="#"` Privacy stub → real `/privacy` + `/oferta` links (typed `legalLinks`);
  checkout surfaces an `/oferta` terms link; both in `sitemap.ts`.
- `TopBarSession` generalized with `showMarketingNav` (default true; legal pages pass false).
- lint+build clean, **525 tests** green. T13 (Stripe) now has its legal seam.
- **OPEN: legal-counsel sign-off** on final Privacy + offer wording before the draft note is
  removed (add-legal-pages §5.3). checker-review §5.2 also pending.

### Done — T4 header (rework-app-header, app-shell MODIFIED)

- `scroll-padding-top: 4rem` on `html` (anchors clear the sticky `h-16` header).
- `TopBar` gained `showMarketingNav` (default **false**); marketing nav (`/#how`,`/#pricing`) now
  landing-only via `TopBarSession`, no longer leaks into app routes.
- Signed-in user's first name shown in the header row (truncated, full name as `title`).
- Tests updated; lint+build clean, **521 tests** green. Not yet checker-reviewed / archived
  (openspec CLI not installed here).
- Footer dead Privacy link intentionally left to T12 `add-legal-pages` (owns footer/legal wiring).

## Decisions resolved 2026-07-04 (user)

- **Cover letter → in scope.** PRD updated: `FR-COVERLETTER-01/02` added, removed from
  "Out of scope (MVP)". `add-tailoring-intelligence` §0.1 + specs reconciled to cite the new IDs.
- **Payments → Stripe sandbox** behind the existing port (more providers later); MoR/VAT deferred,
  not a blocker. TC-STACK-06 updated. New change **`add-stripe-payments`** (spec + todos).
- **Stripe key → placeholder template only** (`.env.example` + dev-setup use `sk_test_…`/`pk_test_…`).
  Real key rotated by user; never in repo.
- **Cyrillic font (my call):** Golos Text (body/UI) + Unbounded (display) — both Cyrillic-capable.
  Unblocks T10; still needs DESIGN.md update + perf-audit before shipping. Recorded, not built.
- **Sentry → skip implementation**; keep `harden-sentry-privacy` spec + todos. Build before any
  real paid/PII E2E (live PII-leak debt).

## Next steps

1. **Start T6 history** (rank 7, P2/M, unblocked): `views/history` slice, `job_title` column
   migration (extract JD title at save), IDOR-gated `GET /api/tailoring/:id` (verify `user_id`),
   list + re-open UI, wire the "coming soon" AccountMenu link — FR-HISTORY-01/02, FR-TAILOR-04.
   Spec first (openspec-propose). **Or T5 premium PDF-attach** (rank 8, P1/L, builds on T1 grounding).
2. Then **T8 landing** (now unblocked by T1 — describe cover letters / blue-info / premium attach),
   with `perf-audit` (~20 ms LCP margin). T13 Stripe still gated on key rotation.
3. **When `ANTHROPIC_API_KEY` lands:** run honesty-eval on the new seniority + cover-letter prompts
   (archived task 3.7) — deterministic proxies already green.

## Blockers / open questions

- **Stripe secret key exposed in chat → rotate before any real integration.** Task 13 currently
  has only the payments *emulator* (`add-payments-emulator`); zero real Stripe in `src/`.
- Env before launch: `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, `CV_ENCRYPTION_KEY`, `AUTH_SECRET`,
  and (task 13) `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` — env
  only, never repo.
- Live LLM E2E still needs `ANTHROPIC_API_KEY` (fully fake-provider tested without one).
- `perf-audit` blocked in sandbox (no Chrome) — re-run on the landing rework (tasks 8/9).

## Prior context (see git log + archived changes)

- `add-resume-wizard` DONE + ARCHIVED (`archive/2026-07-04-add-resume-wizard/`): analyze/generate
  split routes, server-side paywall gate on export, Cyrillic round-trip tests, ExportStepper.
- Built already: FSD foundation, two-pass honesty pipeline (`/api/tailor` + analyze/generate),
  auth (credentials, Google OAuth deferred), persistence (pg + AES-256-GCM CV at rest),
  payments **emulator** + billing portal, security hardening (atomic reserve/release rate limit),
  account-profile + delete-profile + GDPR export/delete APIs (the ones now 500ing), top-bar
  AccountMenu, landing page (perf `NFR-PERF-04` met, LCP margin ≈ 20 ms).
- Open OpenSpec changes not yet archived: `landing-animations` (→ task 7), `add-payments-emulator`
  (→ task 13), `add-security-hardening`, `add-upload-cv`, `add-auth`, `add-persistence`,
  `add-agent-loop`, `add-docker-dev-env`.
