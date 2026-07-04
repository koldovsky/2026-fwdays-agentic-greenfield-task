# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short — overwrite stale content, don't append endlessly.

**Updated:** 2026-07-04

## Last action

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
  - Verified: `yarn lint` + `yarn build` clean, `yarn test` **92 files / 568 tests green** (+39).
  - **§6 checker-review + verifier subagents running** (maker≠checker). Live honesty-eval (task 3.7)
    remains **blocked on `ANTHROPIC_API_KEY`** — deterministic proxy tests shipped.

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

- **T1 `add-tailoring-intelligence` — §0-6 essentially DONE.** §0-2 blue-info (`43db360`), §3-5
  shipped this session (see Last action). Remaining: §6.1 verifier + §6.2 checker (subagents running
  — apply any findings), then §6.3 openspec-archive the change. **Next roadmap target: T6 history**
  (rank 7, unblocked) or **T5 premium PDF-attach** (rank 8, builds on T1's grounding model).

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

1. **Apply §6 checker + verifier findings** (subagents running on `43db360..HEAD`); re-run
   `yarn lint/build/test` after any fix; commit on the fly.
2. **Archive T1**: `openspec-archive add-tailoring-intelligence` (fold `checklist`/`bullets` deltas +
   new `cover-letter` spec into baselines) once §6 is clean.
3. Next build target by rank: **T6 history** (P2, M, unblocked — IDOR-gated `GET /api/tailoring/:id`)
   or **T5 premium PDF-attach** (P1, L — builds on T1 grounding). Then T8 landing (now unblocked by
   T1). T13 Stripe still gated on key rotation.
4. **T1 client echo (minor):** wizard view should echo `careerStage` from `/api/tailor/analyze` back
   to `/api/tailor/generate` so the wizard path also gets tone calibration (one-shot `/api/tailor`
   path already threads it; API plumbing done, view echo pending).
5. **When `ANTHROPIC_API_KEY` lands:** run honesty-eval on the new seniority + cover-letter prompts
   (task 3.7) — deterministic proxies already green.

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
