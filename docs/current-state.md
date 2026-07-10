# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short, overwrite stale content, don't append endlessly.

**Updated:** 2026-07-09

## Last action

- **`fix-billing-locale` (bug) DONE + committed `70ff874` (2026-07-10).** User-reported: subscription screen
  (/account/billing) header language switch to English did nothing. Root cause: the page never read the
  locale cookie (unlike its sibling /account/profile), so TopBar + AccountBillingView fell back to the "ua"
  default. Fix (page-only, mirror profile): resolve `parseLocale(cookies().get(LOCALE_COOKIE))`, thread
  `locale` to TopBar + AccountBillingView (both already accept it); force-dynamic retained. Workflow
  (wf_42baf08b): maker(sonnet)→test-author(sonnet, +4 page tests: en→en, absent/invalid→ua)→checker(sonnet
  SHIP, 0 findings)+verifier(sonnet PASS: lint + build 33 routes + 146 files/1415 passed). NFR-I18N-01,
  FR-BILLING-01, FR-SHELL-01. FOLLOW-UP: audit other authed pages for the same missing-locale-read bug
  (checkout, history) — profile is correct; billing was the reported one.
- **`honest-plan-claims` DONE + gate green (2026-07-10).** Marked the unfounded Ultra/Pro differentiators
  "(coming soon)"/"(незабаром)" per user decision (one global model for all, binary paid access, no
  queue/priority, no per-plan limit — investigated). maker(opus)→test-author(sonnet, i18n.test.ts marker +
  parity tests)→checker(opus). Checker fix-first, 0 blockers, 1 major + 1 minor — both real HONESTY catches:
  the flagship model (claude-opus-4-8) is ALREADY used for every plan, so "flagship... not just the fast one"
  falsely implied free/Pro get a lesser tier, and marking "flagship (coming soon)" implied today's tailorings
  use a worse model. APPLIED: REMOVED the flagship-model bullet from ultra in all 3 locations × 2 locales
  (upgrade.planFeature.ultra, billing.planBenefits.ultra, landing.pricing.ultra) — it is neither a current
  nor future Ultra perk since Opus is universal; kept priority/high-volume "(coming soon)". Reconciled the
  ultra length constants 6→5 (EXPECTED_PLAN_FEATURE_LENGTHS + EXPECTED_PLAN_BENEFITS_LENGTHS). Also in this
  change: Pro "priority generation" marked "(coming soon)" (no queue exists); ultra intro no longer implies a
  Pro daily cap; legal.offer payment line de-Stripe'd (emulator + [TODO], matching the privacy fix);
  legal.privacy + legal.offer `updated` → 9 July 2026. Gate: lint 0/0 + build (29 routes) + 146 files/1415
  passed/0 failed. BC-HONESTY-01, BC-BRAND-01, BC-PRIVACY-02, FR-BILLING-01, FR-SALES-03, NFR-I18N-01.
- **`restack-checklist-preview` — DONE + gate green (2026-07-09). Landing "Know exactly where you
  stand" section reworked (user ask).** `src/views/landing/ui/ChecklistPreview.tsx` ONLY: the
  "Strong fit, honestly scored" MatchScore now sits in a card container on TOP (`rounded-xl border
  border-hairline bg-surface-card px-6 py-5`, matches Pillars/HowItWorks/Pricing cards, no new hue/accent);
  the checklist bullets render as a two-column grid below (was a single stacked list). Two iterations on
  user feedback: (1) first pass split rows into two dividered sub-lists — checker caught a mobile-only
  junction-divider gap; (2) user reported column SHIFT (unequal row heights) → restructured to a SINGLE
  flat `grid auto-rows-fr sm:grid-cols-2` of direct ChecklistRow cells (equal-height rows fix the shift),
  trailing dividers dropped via CSS arbitrary variants (`[&>*:last-child]:border-b-0`
  `sm:[&>*:nth-last-child(2)]:border-b-0`) — no shared-component change. maker(me)→test-author(sonnet,
  17 tests, structural + auto-rows-fr locked)→checker(opus), separate contexts (maker≠checker). Checker
  SHIP, 0 blockers/majors/minors (prior mobile-divider minor marked fixed): verified divider correctness
  both breakpoints for the real 6 rows, arbitrary-variant specificity (0,2,1) beats ChecklistRow border-b,
  auto-rows-fr is a real shift fix with CLS 0 / no overflow, DESIGN/FSD/i18n clean. Gate: lint 0/0 +
  build (29 routes) + ChecklistPreview 17/17. Review artifact `.claude/reviews/restack-checklist-preview.json`
  (validator 3/3). Implements FR-SALES-02, FR-CHECKLIST-02/04, BC-BRAND-01, NFR-I18N-01. Follow-up:
  perf-audit still Chrome-blocked (landing layout changed — re-run Lighthouse when available, NFR-PERF-04).
- **T2+T3 `fix-faq-and-privacy-accuracy` — DONE + gate green (2026-07-09, ultracode). LAST functional
  unit of the 8-task batch.** i18n-only accuracy fixes across en.ts/ua.ts + legal page.
  maker(opus)→test-author(sonnet,+14)→checker(opus)+verifier(sonnet), separate contexts (Workflow
  wf_34126d8a-625). **T2 FAQ/pricing:** `faq.coverLetter`+`faq.attach` "Pro"→"any paid plan" (gate is
  `hasPaidAccess`=pro/ultra/job_hunt_pass, not Pro-only; both in-sentence "Pro" mentions fixed);
  `pricing.free.cadence` "2 tailorings"→"1 tailoring" (FREE_TAILORING_LIMIT=1). **T3 privacy:** rewrote
  `legal.privacy` 3→7-section full best-effort GDPR draft (data inventory incl. credentials-hash + JD
  text + cookies/no-trackers; subprocessors; retention; legal basis; rights; contact/controller), kept
  the draft banner, added Ultra to `legal.offer` Plans; FIXED export claim JSON→PDF and dropped the
  "all your data" overclaim (names what the PDF actually holds). Verifier PASS: lint 0/0 + build (29
  routes) + **145 files / 1380 passed + 5 skipped, 0 failed.** Checker fix-first, 0 blockers; applied
  its findings INLINE (I was orchestrator, not maker — maker≠checker preserved): (1 major, BC-PRIVACY-02)
  removed the false Stripe-subprocessor disclosure — Stripe has ZERO code presence (only the in-repo
  emulator, hard-disabled in prod) → now "in-app emulator; no live processor yet + [TODO] production
  processor"; (2 minors) broadened the export caveat (requirements + tailored results also not yet
  exported, not just JD text) and softened the legal Ultra line to "higher-priced subscription tier"
  (code has no per-plan model routing / limit differential). Re-ran gate inline after fixes: lint 0/0 +
  build compiled + 35/35 touched tests green + no dangling refs. Implements BC-HONESTY-01, BC-PRIVACY-01/02,
  NFR-GDPR-01/02, NFR-SEC-02, FR-COVERLETTER-01, FR-CV-01, FR-ONBOARD-01, NFR-COST-02, FR-BILLING-01.
  Follow-ups (flagged, NOT in scope): (a) pre-existing pricing.ultra marketing claim "flagship Claude
  model on every tailoring" (en.ts:135/175/566) is the SAME unshipped per-plan-model overclaim — should
  be softened in a T2-marketing follow-up; (b) `legal.offer` payment line still names Stripe (pre-existing
  offer copy, out of this privacy-accuracy scope); (c) legal.privacy `updated` date still "4 July 2026"
  though body rewritten 2026-07-09; (d) UA privacy + Ultra copy wants native marketing/legal review;
  (e) legal-counsel facts (entity/DPA/authority/transfer mechanism) ship as clearly-marked [TODO]
  placeholders. **8-task batch now COMPLETE (T7/T1/T8/T4+T5/T6/T2+T3 all shipped).**
- **T6 `export-account-pdf` — DONE + gate green (2026-07-09, ultracode).** "Download my data" now returns a
  human-readable PT Sans PDF (vouch-export.pdf, application/pdf), REPLACING the JSON export (user decision).
  New `account-export-pdf.tsx` (@react-pdf/renderer, PT Sans registered like resume/cover-letter routes):
  Account (id/name/email/created), CV profiles (skills + rawText; decryptionFailed → placeholder, not a
  crash), tailoring history. Route returns the PDF + keeps auth-gate + per-profile decrypt guard + calm
  coded 500 + no-plaintext-logging (NFR-SEC-01/NFR-OBS-01); export stays FREE + owner-only. next.config
  outputFileTracingIncludes adds /api/account/export fonts (Vercel). ExportDataButton downloads .pdf.
  PRD synced (NFR-GDPR-01: PDF, portability tradeoff noted). maker→test-author→checker+verifier. Verifier
  PASS (145 files / 1367 passed + 5 skipped). Checker fix-first was a FALSE ALARM (predicted a jsdom
  Blob.stream red that does NOT reproduce here — verified 25/25 export tests green); I applied its 2 real
  minors inline (typo `TailoringDisplayRow`; added Account ID row) + a GUARDED `Blob.prototype.stream`
  polyfill in vitest.setup.ts (portability for older-jsdom CI, retires the recurring pre-existing-red note).
  Gate re-run inline: lint 0/0 + build + **145 files / 1367 passed + 5 skipped, 0 failed.** Implements
  NFR-GDPR-01(revised), NFR-GDPR-02, NFR-SEC-01, NFR-OBS-01. Follow-up: JD text still not in the export
  (GDPR completeness) — flagged, not in scope.
- **T4+T5 `gate-tailor-and-tier-states` (+ `gate-tailor-fixes`) — DONE + gate green (2026-07-09, ultracode).**
  /tailor is now AUTHENTICATED-ONLY, enforced at the page (redirect to /sign-in?callbackUrl=%2Ftailor,
  open-redirect-guarded) AND server-side in ALL THREE tailoring routes (analyze + generate + one-shot each
  return coded 401 for anon before any LLM work, NFR-SEC-04). FREE_TAILORING_LIMIT 2→1. Analyze phase is
  tier-branched: free-with-run-left = gated PDF zone + banner + résumé text + JD + Analyze; free-exhausted
  = reused Paywall (reason="tailoring-limit", heading "Unlock full access" — not literally "Upgrade your
  subscription", flagged) INSTEAD of inputs; premium = enabled drag&drop + premium badge + JD + Analyze,
  NO résumé textarea (CV from upload; Analyze disabled until cvText non-empty). Server reserve +
  hasPaidAccess stay the trust boundary; freeExhausted is presentational, lenient on counter read error.
  PRD synced (FR-ONBOARD-01 revised to sign-in-required + 1/account; NFR-SEC-03/04 drop /tailor from public
  endpoints). maker(opus)→test-author(sonnet)→checker(opus)+verifier(sonnet), + a follow-up round
  (gate-tailor-fixes) that gated analyze (checker major), added a paid empty-CV guard, and reconciled 2
  stale anon-lifecycle tests. Verifier PASS: lint 0/0 + build (33 routes) + **145 files / 1363 passed +
  5 skipped, 0 failed** (ExportDataButton flaky test now green too). Checker ship, 0 blockers/0 majors;
  3 minors informational (retained ANON_TAILORING_LIMIT; SignInForm relies on page-level redirect guard —
  follow-up: add a defense-in-depth client re-check comment). Implements FR-ONBOARD-01(rev), FR-PAYWALL-01/02,
  NFR-SEC-04, NFR-COST-02, BC-HONESTY (untouched). Heading-string + native UA copy = flagged follow-ups.
- **T7 P0 payments bug `fix-checkout-session-and-revalidation` — DONE + gate green (2026-07-09, ultracode).**
  maker(opus)→test-author(sonnet, +12 tests)→checker(opus)+verifier(sonnet), separate contexts.
  Verifier PASS: lint 0/0 + build (all 3 return pages confirmed dynamic ƒ: /checkout /tailor
  /account/billing) + **138 files / 1305 passed + 5 skipped, 0 failed.** Checker ship, 0 blockers; 1 major
  = diagnosis nuance (load-bearing fix is force-dynamic — the return pages were STATIC prerenders, so even
  the original full-reload showed stale "free"; router.push+refresh is a consistent secondary change),
  no code change needed. Implements FR-PAYWALL-03, FR-SHELL-01. Two fixes:
  - FIX 1 (header showed "Sign in" for a logged-in user on /checkout): `src/app/checkout/page.tsx`
    now `await auth()` like its siblings (/tailor, /account/billing) and passes `user` to TopBar.
    Display-only; the HMAC-signed-token write path is untouched — no blocking token-vs-session IDOR
    check added (would regress completion when the auth cookie is absent), left as a noted follow-up.
  - FIX 2 (FR-PAYWALL-03, subscription stayed "free" after "simulate a successful payment"): the DB
    write already lands; the stale state was the Next client Router Cache serving a pre-payment
    render of the return page. (a) Added `export const dynamic = "force-dynamic"` to
    `src/app/tailor/page.tsx` + `src/app/account/billing/page.tsx` so the subscription-bearing return
    pages render per-request (landing verified NOT paid-dependent → skipped). (b) `CheckoutView` now
    injects a `useRouter` seam: after the webhook returns 200 it calls `router.refresh()` (clears the
    client Router Cache for the current route, refetches Server Components per the 16.2.9 use-router
    doc) BEFORE navigating, and navigation is now `router.push` (SPA into the freshly-cached segment).
    `navigate`/`refresh` stay injectable seams for tests.
  - API decision (Cache Components is OFF in next.config → classic route-segment config is valid;
    v16 only removes `dynamic` when cacheComponents is enabled): used `dynamic = "force-dynamic"` +
    client `router.refresh()`. Did NOT use server-action `revalidatePath`/`refresh` from `next/cache`
    because the completion path posts to a Route Handler (the webhook), not a Server Action, so those
    APIs aren't reachable without adding a server action — the client refresh is the idiomatic fit.
  Follow-up (not done, noted): optional token-vs-session IDOR check on /checkout (defense-in-depth).
  **NEXT in batch-8 order: T1 landing UA UI → T8 history race → T4+T5 tailor → T2+T3 → T6.**
- **`harden-agentic-loop` DONE + gate green + independently verified (2026-07-09, ultracode) —
  raised C3 (loop/automation) + C5 (maker≠checker) from convention/prose to enforcement/artifact
  after a rubric self-assessment scored both 3/4.** Shipped: **(C3)** `.github/workflows/ci.yml`
  (push+PR, node 20, frozen-lockfile, `lint→typecheck→build→test→check-review-findings`) + new
  `typecheck` script (`tsc --noEmit`) + **blocking `yarn lint` gate** in the Stop hook (fires on
  code-file changes before the handoff check; full test suite stays in CI to keep the local loop
  fast) + Stop timeout 15s→120s. **(C5)** `.claude/review-findings.schema.json` (draft-07) +
  zero-dep `scripts/check-review-findings.mjs` validator (wired into CI) + `checker.md` /
  `checker-review` SKILL now EMIT `review-findings.json` per change — **dogfooded** as
  `.claude/reviews/harden-agentic-loop.json`. Workflow: 4 parallel makers (sonnet, disjoint files)
  → verifier (sonnet) → checker (opus), all separate contexts. **The new gates immediately paid
  off**: `typecheck` surfaced 7 real pre-existing TS errors that `next build` was masking, and the
  `test` gate surfaced the long-documented ExportDataButton `Blob.stream` red — all fixed for real
  (vi.fn generic form; readonly-array spread-copy; `as unknown as` cast; `Blob.prototype.stream`
  polyfill in vitest.setup.ts), not suppressed. Checker (opus, fresh ctx) verdict fix-first →
  1 blocker + 2 majors (real CV_ENCRYPTION_KEY-looking value in ci.yml → build env block dropped;
  reproducible-green goal) + 1 minor, ALL fixed → dogfood artifact reconciled to ship/0-open.
  Verifier (fresh ctx) PASS on all 5 gates + secret check + hook dry-runs + schema shape. Final
  gate: **lint 0 · typecheck 0 · build ok · 135 files / 1293 passed + 5 skipped · validator 1/1.**
  Refs: AGENTS.md (loop, separation-of-duties, plan-first), NFR-OBS-01, NFR-SEC-01, BC-PRIVACY-01.
  Follow-up (not blocking): presence-enforcement (CI failing when a change LACKS a findings file)
  deferred — validator only shape-checks existing files today.

- **Vercel deploy runbook added to `README.md` (2026-07-09).** Appended a "Deploy to Vercel"
  section: prereqs (Vercel + managed Postgres + Anthropic key), required env (`DATABASE_URL`,
  `CV_ENCRYPTION_KEY`, `AUTH_SECRET`, `ANTHROPIC_API_KEY`) + optional env (`NEXT_PUBLIC_SITE_URL`
  build-inlined, `COVERAGE_JUDGE`, `MAINTENANCE_SECRET`, LLM/SSL/Sentry), manual idempotent
  `yarn db:migrate`, deploy, and the optional cleanup-cron curl. Facts verified against env.ts /
  auth.ts / next.config.ts / migrate.mjs (not guessed). Payments emulator noted as hard-disabled in
  prod. Docs-only; no code change.
- **Live honesty-eval `add-live-honesty-eval` DONE + live-verified + reviewed (2026-07-08, ultracode).**
  New KEY-GATED live harness `src/views/evals/honesty-live.eval.test.ts` (views layer — cross-layer
  composition, imports downward via public barrels; FSD-clean). Runs the REAL shipped honesty paths
  against real Anthropic (`.env` key, loaded via `node --env-file=.env ./node_modules/.bin/vitest`,
  never printed) and grades with the existing pure graders. Groups: (1) coverage judge — asserts no
  `met` from gap, unfounded gaps stay `gap`, every off-gap upgrade carries the citation-gated rationale
  prefix (grounding proof), score bounded by all-`met` ceiling; (2) grounded cover letter — grounded
  input → non-null letter; overclaim input → fail-honest (null OR truthful disclaimer, never crash);
  (3) NEW adversarial gate test — a hardcoded fabricated letter through the REAL verification pass MUST
  be rejected (`supported:false` OR unsupportedClaims>0) — the real teeth; (4) deterministic resume
  overclaim-exclusion (no LLM). **LIVE RESULT: honesty core verified correct — judge never inflated;
  letter never fabricated (model self-disclaims the gap). 7/7 pass, stable across 2 consecutive live
  runs.** Eval-author(opus)→I diagnosed 2 real findings→eval-author fixes→checker(opus)+verifier(sonnet),
  separate contexts. Both initial "failures" were WRONG TEST ASSERTIONS, not honesty regressions:
  (a) judge rationale citation truncated by the ≤100-char cap → assert grounded-prefix instead of full
  `«…»`; (b) overclaim fail-honest is null OR truthful disclaimer, not only null — mechanical
  keyword/negation scale-detection is unsound on free prose (self-disclaimers mention the same scale
  words), so fabrication-detection moved to the adversarial gate test. Checker ship, 0 blockers/0 majors,
  1 minor FIXED (bare `/не /i` cue → specific disclaimer phrases). Gate: lint 0/0 + build + **135 files /
  1284 passed + 4 skipped** (live groups skip keyless, CI stays green). Implements BC-HONESTY-01/02,
  FR-CHECKLIST-01, FR-COVERLETTER-01/02, FR-EXPORT-01/02, NFR-COST-01, NFR-SEC-02, TC-PURE-01.
  **DECISION RESOLVED (user, 2026-07-08): flip `COVERAGE_JUDGE` default ON.** Done — `isCoverageJudgeEnabled()`
  now defaults ON (key-gated); explicit `0`/`false`/`off` opts out; fails-soft OFF without `ANTHROPIC_API_KEY`
  (so CI/keyless is byte-identical to the heuristic path). Scoring logic UNCHANGED — pure frequency change,
  no honesty regression (checker-confirmed). Doc comments (env.ts + loop.ts) updated; flag test rewritten
  to the new contract (26 tests). Maker(me)→test-author(sonnet)→checker(opus, 1 major FIXED: stale comment
  head)+verifier(sonnet). Gate: lint 0/0 + build + 135 files / 1293 passed + 5 skipped, 0 failed.
  NFR-COST-01 note: adds ~1 LLM call per tailoring when a prod key is set.
- **Ops follow-up `wire-tailoring-cleanup-route` DONE + gate green (2026-07-08, ultracode).**
  Wired the previously-uncalled `markAbandonedPending` sweeper behind an auth-protected route.
  New `getMaintenanceSecret()` in `shared/config/env.ts` (env-only, throws unset/empty; barrel-exported)
  + new `POST /api/maintenance/tailoring-cleanup`: 503 when secret unset, `Bearer <secret>` auth compared
  with `crypto.timingSafeEqual` (constant-time; length-guard pre-check), `getDb()` →
  `markAbandonedPending(db, 30min)` → `{ swept: N }`, calm coded 500 on DB error (no stack/schema leak),
  logs only stable non-secret lines (no token/PII). FSD-clean (app route → shared only; shared/config
  framework-free). Investigators(3, haiku-tier) → maker(sonnet, workflow) → test-author(sonnet, workflow)
  → checker(opus)+verifier(sonnet), all separate contexts. Checker ship, 0 blockers/0 majors; 3 minors:
  1 real FIXED (auth compare was JS `===` byte-short-circuit → `timingSafeEqual`, NFR-SEC-01/SOC2 access
  control), 2 test minors closed by a fresh test-author (stale note corrected + 2 timing-safe edge tests
  restored, +4). Final verifier gate: **lint 0/0 + build + 134 files / 1282 tests green.** Implements
  NFR-COST-02, FR-ONBOARD-01, NFR-SEC-01, NFR-OBS-01, TC-PURE-01. The periodic cron/curl INVOKER remains
  an ops step (Remaining §4). Reassessed + DEFERRED this session: T5 #7 (per-bullet role provenance —
  needs Bullet.sourceRoleIndex in the gen pipeline + migration; own spec-first change; fidelity-only) and
  T5 #8 (server-side export honesty gate — LOW value: self-authored resume text in a self-downloaded PDF
  is not an overclaim; keep the documented accepted trust boundary, no schema change).
- **T5 DONE (all 5 groups) + WHOLE 6-TASK BATCH COMPLETE (2026-07-07, ultracode).** Group 5 = final
  whole-change verify + adversarial review across the COMBINED honesty surface (heuristics + flagged
  judge + grounded letter + resume merge). Whole-change verifier PASS: lint 0/0 + build + **133 files
  / 1234 tests**, full FR/NFR evidence table green (FR-CHECKLIST-01/02/03/04, FR-WIZARD-02,
  FR-COVERLETTER-01/02, FR-EXPORT-01/02/03/04, FR-BULLETS-02/03, BC-HONESTY-01/02, NFR-COST-01=1 judge
  call/<=2 letter calls, NFR-PERF-02, NFR-SEC-01/02, TC-PURE-01); deterministic honesty guards green,
  live evals correctly deferred on ANTHROPIC_API_KEY. Whole-change checker: **ship, 0 blockers** —
  adversarial trace found NO score-inflation path (claimed-only never→met; tenure lifts only grounded
  duration reqs; judge upgrades only gap with verbatim+relevant citation), export honesty holds
  (overclaim bullets dropped pre-export, gates read includedInExport only), grounding-lane isolation
  intact, flag-off byte-identical to heuristics. 2 majors were honest-by-construction follow-ups, both
  ADDRESSED: (1) resume-export spec scenario RELAXED to match impl (kept bullets → most-recent role;
  per-source-role placement needs a Bullet-model change, tracked); (2) export content trust boundary
  (client-authored section text rendered verbatim) DOCUMENTED in the pdf/docx route headers as accepted
  (self-authored resume, same boundary as the pre-existing flat path) with a server-side-gate
  defense-in-depth follow-up recorded. 5.5 openspec validate = CLI-unavailable (blocker below).
- **T5 GROUP 4 (structured resume export) + deferred §1.1/1.3 — DONE + gate green (2026-07-07, ultracode).**
  Maker pass + independent review completed after the prior session hit its limit mid-group. CvDocument
  (contact/summary/experience+dates/skills/education) + `parseCvDocument` (pure, never throws, en+ua
  months); tenure lifts a GROUNDED duration req partial→met, never credits an ungrounded skill;
  ExportDocument gains optional sections; `buildExportDocument` merges KEPT bullets, excluded overclaim
  bullets absent from EVERY section (BC-HONESTY-02); pdf/docx/clipboard render sections consistently
  with flat fallback + PT Sans Cyrillic + unchanged footer/402; contact PII is export-render only,
  never in any LLM payload (NFR-SEC-01/02, sentinel-tested). Maker(opus)→test-author(sonnet, +129
  tests)→verifier+checker(opus), all separate contexts. **Real UA-first defect caught + FIXED:**
  present-marker regex used ASCII `\b` (broke дотепер/нині/донині tenure) → Unicode `\p{L}` lookarounds;
  test-author flipped 2 bug-documenting tests to assert the fix + added positive markers. Checker ship,
  0 blockers; 2 minors FIXED (global present-replace; pdf/docx routes now shape-validate the `sections`
  PII payload at the trust boundary, defense-in-depth), 1 DEFERRED follow-up (kept bullets attach to
  role[0] — honest, needs a per-bullet→role tag in the Bullet model to place under source role). Gate:
  lint 0/0 + build + **133 files / 1234 tests green.** Implements FR-CHECKLIST-01/04, FR-EXPORT-01/02/03/04,
  BC-HONESTY-01/02, NFR-SEC-01/02, NFR-I18N-01, TC-PURE-01. **Next: T5 Group 5 (final whole-change
  verify; openspec validate blocked — CLI unavailable). This is the LAST group of the last batch task.**
  Historical maker-pass detail below (superseded):
- **T5 GROUP 4 (structured resume export) — MAKER pass (2026-07-06), tasks 1.1/1.3/4.1-4.5:**
  - §1.1/§4.1: `entities/cv-profile` gains `CvDocument` (contact/summary/experience+dates/skills/
    education) + `parseCvDocument` (pure, never throws, en+ua months, present/дотепер, unparseable →
    zero tenure). New exports: `parseCvDocument`, `parseDateRange`, `totalTenureMonths`, `tenureYears`,
    `absMonthOf`, types `CvDocument/CvRole/CvDateRange/CvContact`.
  - §1.3: `checklistItem` gains a 4th optional param `candidateTenureYears`; `requiredYears()` detects
    "N+ years" reqs; tenure lifts a GROUNDED duration req partial→met, NEVER credits an ungrounded
    skill (BC-HONESTY-01). Loop parse-cv computes tenure via `parseCvDocument`+`tenureYears`, threads
    it into the score step (contact PII discarded, never scored/logged/sent to LLM).
  - §4.2: `ExportDocument` gains optional `sections` (ExportContact/summary/ExportExperienceRole/
    skills/education), framework-free.
  - §4.3 (honesty-critical): `buildExportDocument` optional `cvDocument` → merges KEPT
    (`includedInExport`) bullets into role[0]; excluded overclaim bullets dropped up front, present in
    NO section; original role bullets NOT re-inserted; titles/dates pass through original language.
  - §4.4: plain-text + PDF + DOCX render sections consistently, flat fallback when no sections; PT Sans
    + footer + 402 unchanged.
  - §4.5: contact PII is client-set in TailorWorkspace (`parseCvDocument(cvText)`) → ExportStepper
    `cvDocument` prop → export builder → export routes ONLY. NEVER in letterEvidence or any LLM payload.
  - NEXT: run gate (lint/build/test), dispatch test-author (see mapped behaviors), then checker (4.7).
    Do NOT commit yet.

- **T5 GROUP 2 (flagged LLM coverage judge) — DONE + gate green (2026-07-06, ultracode).**
  `isCoverageJudgeEnabled()` flag (DEFAULT OFF, requires ANTHROPIC_API_KEY when on, non-throwing).
  Batched one-call judge prompt over CV sentences + requirements ONLY (NFR-COST-01); tolerant parser
  yields per-req {covered|adjacent|uncovered} + a verbatim citation. Pure deterministic scorer
  `applyCoverageJudge` (new `judge-score.ts`, local `judge-types.ts`, no llm import, TC-PURE-01) only
  upgrades `gap` rows and ONLY when the citation passes a RELEVANCE GATE: verbatim-in-CV + non-trivial
  (>=8 chars, real tokens) + shares a requirement keyword-token (reuses checklist.ts tokenize/
  containsToken). covered→partial (never met), adjacent→info; fabricated/irrelevant/short citations
  discarded → heuristic gap kept (score cannot inflate from thin air, BC-HONESTY-01). Loop wires an
  OPTIONAL judge step before score, fail-soft via runOptional; judge keys added to GROUNDING_FORBIDDEN
  + `judge-coverage` skill; flagged score step now honestly records `coverageVerdicts` in contextKeys
  (flag-OFF keys unchanged). **FLAG-OFF = byte-identical to Group 1 (no LLM call/step recorded), test-
  locked.** Maker(opus)→test-author(sonnet)→verifier+checker(opus). Checker ship, 0 blockers; 3 minors:
  2 FIXED (loose citation gate → relevance-aware = a real inflation vector, closed + proven by
  matchScore-identity test; trace contextKeys honesty), 1 no-op (intentional type dup, documented).
  +105 tests (incl. 3 loose-citation fixtures reconciled). Gate: lint 0/0 + build + **124 files /
  1045 tests green.** Implements FR-CHECKLIST-01 (flagged path only), BC-HONESTY-01/02, NFR-SEC-02,
  NFR-OBS-01, NFR-COST-01, TC-PURE-01. Live judge eval deferred (deterministic proxies green).
  **Next: T5 Group 4 (structured resume doc + deferred CvDocument §1.1/1.3) → Group 5 (final).**
- **T5 GROUP 3 (grounded LLM cover letter) — DONE + gate green (2026-07-06, ultracode).**
  Wired the WIP `generateGroundedCoverLetter` (had ZERO callers) into the paid cover-letter export.
  Integration point = `POST /api/export/cover-letter` (already holds provider + paywall; export-time
  action so it stays OFF the checklist critical path, NFR-PERF-02). Body carries the deterministic
  fallback `document` PLUS an optional validated `letter` context (cvSentences, confirmedAnswers,
  requirements, careerStage, framing). When context present + paid: two-pass verified letter via
  `resolveLlmProvider()`; on null (gen/parse/verify failure OR any rejected claim OR provider-resolve
  throw) render the deterministic reflow. Render input is ALWAYS {verified paragraphs + i18n framing}
  OR {deterministic reflow} — unverified prose can NEVER reach the render (BC-HONESTY-01/02, NFR-OBS-01).
  Bullet-grounding lane byte-identical, no letter ctx threaded in (FR-BULLETS-03, asserted by
  `bullet-grounding-isolation.test.ts`). Framing reuses existing `export.coverLetter.*`+`export.footer`
  (no new i18n keys). Maker(opus)→test-author(sonnet, +74 tests incl. inline honesty-eval fixtures:
  grounded→accepted, overclaim→rejected)→verifier+checker(opus). Checker ship, 0 blockers; 2 minors
  FIXED (unused `vi` import; route now element-validates requirements/confirmedAnswers at the trust
  boundary, defense-in-depth, fail-honest preserved). Gate: lint 0/0 + build + **118 files / 940 tests
  green.** Implements FR-COVERLETTER-01/02, BC-HONESTY-01/02, FR-BULLETS-03, TC-PURE-01, NFR-OBS-01,
  NFR-PERF-02. Live letter eval deferred (deterministic proxies green). **Next: T5 Group 2 (flagged
  coverage judge) → Group 4 (structured resume doc + deferred CvDocument §1.1/1.3) → Group 5 (final).**
- **T5 Group 1 slice A committed `b5b0c90`; starting Group 3 (LLM cover letter) — `ANTHROPIC_API_KEY`
  now available in `.env` (2026-07-06).** Key unblocks live honesty-eval. Taking Group 3 before Group 2
  (flagged judge, off-by-default = lower impact) because the natural senior cover letter is a direct
  user ask and now fully evaluable. Mapping the existing cover-letter + two-pass LLM path with a
  read-only investigator before implementing (reuse `parseCoverLetterResponse`/`CoverLetterOutput` +
  any dead letter prompt). Plan lands after the map. NOTE: `.env` is secret — do not read/print it.

- **T5 Group 1 slice A DONE + reviewed green (2026-07-06).**
  verifier PASS; checker fix-first: **1 blocker FIXED** — short aliases were substring-matched so
  `ts`→"results"/`aws`→"laws"/`ui`→"build" fabricated `met` (score inflation = honesty failure). Fix:
  alias matching is now WORD-BOUNDARY (`containsToken`), keyword itself still substring (backward-compat);
  +8 regression tests lock it. Minor rationale-length + em-dash also fixed. Full suite 867/869 (only the
  2 pre-existing export reds). Committing now.
  Re-grouped Group 1: shipping the pure, contained honesty fixes FIRST (alias + seniority + derive),
  deferring CvDocument+tenure (§1.1/1.3) to fold with Group 4 (resume doc, which also needs CvDocument).
  Slice A (done, lint+build+scoring/derive/build tests green — 5 files / 55 tests, +19):
  - **§1.2 alias table** in `shared/lib/scoring/checklist.ts` — conservative synonym groups
    (k8s↔kubernetes, aws↔"amazon web services", node↔nodejs, rest, c#, …; short/overloaded tokens
    go/r/c/ai deliberately excluded). Keyword coverage is alias-aware by whole-group membership;
    unrecognized keywords unchanged. Kills false gaps when a CV uses a synonym.
  - **§1.4/1.5 seniority relaxation** — `checklistItem(req, cv, seniority?)` (new local `SeniorityLevel`
    in scoring/types, no llm import). Claimed-only skill: mid/senior → "partial" (claimed-covered,
    honest rationale), junior/undefined → "overclaim-risk" (strict, unchanged). A claimed-only skill
    NEVER reaches "met" (met needs prose). `build.ts` + `loop.ts` forward `careerStage`. Kills the false
    overclaim flags for experienced candidates.
  - **§1.6 derive.ts** — `ELIGIBLE_STATUSES` = `{gap}` only (was partial+gap); stops over-asking.
  Maker(opus, this thread — overrode the Fable-5 routing since this is the honesty-critical core) →
  test-author(sonnet, separate ctx) → **checker(opus) + verifier(sonnet) running now.** Isolation note
  verified in code: checklist status is a coverage-panel/score signal only; bullet grounding
  (export-exclusion) is a separate pass, untouched (BC-HONESTY-01/02). Implements FR-CHECKLIST-01/03/04,
  FR-WIZARD-02. **Next after gate: commit slice A, then §2 judge / §3 letter / §4 resume+CvDocument.**

- **T4 `gate-premium-upload-zone` — DONE + committed `1080213` (2026-07-06, ultracode).**
  Split `features/upload-cv/ui/UploadCvDropzone.tsx` into `TextUploadZone.tsx` (free/ungated parse →
  `onExtracted`, FR-CV-01/FR-ONBOARD-01) + `PremiumAttachZone.tsx` (paid-gated original-PDF attach) +
  a thin composer with the SAME external props (no call-site edit; `views/tailor-workspace` untouched).
  Free/anon PremiumAttachZone = blurred inert shell (`blur-sm` + `pointer-events-none`, aria-hidden)
  under an `absolute inset-0` Premium banner (headline/body/CTA); **renders NO `<input type=file>` and
  NO drop/dragover handlers → no client path to attach without paid** (NFR-SEC-04, cosmetic-only per
  spec). Paid = live PDF drop target. Attach now DECOUPLED from the parse file (own zone/input). New
  `uploadCv.premiumZone.{headline,body,upgradeAction}` i18n (ua+en). Server gate in
  `api/tailor/generate` unchanged (still `attachmentAllowed=false` unless `hasPaidAccess`).
  Maker(opus, this thread) → **test-author(sonnet, separate ctx)** wrote PremiumAttachZone/TextUploadZone
  tests + rewrote the composer test (upload: **6 files / 40 tests green**, removed 3 stale coupled-attach
  tests). lint + build green. **verifier + checker subagents (opus, separate ctx) running now.**
  Implements FR-CV-01, FR-ONBOARD-01, FR-PAYWALL-01/02, NFR-SEC-04, BC-HONESTY-01, NFR-I18N-01, BC-BRAND-01.
  **PRE-EXISTING RED (not T4):** `features/export-data-button/ui/ExportDataButton.test.tsx` fails 2
  tests (`TypeError: object.stream is not a function` — jsdom `Blob` lacks `.stream()` under
  `new Response(new Blob())` at line 44/76). **Confirmed it fails identically at HEAD `27d4861` with all
  T4 work stashed** → environment/version-sensitive artifact in the T3 slice, green when T3 shipped.
  Belongs to a separate T3-slice test-hardening change, NOT T4. **Next: land verifier/checker verdicts,
  fix any T4 blocker, commit T4, then T5.** verifier PASS (4 gates) + checker fix-first (0 blockers;
  1 major + 1 minor test-coverage gaps closed by the test-author, +4 tests, 0 code changes). Upload
  6 files / 44 tests green; full suite 846/848. **T5 is the last batch task (runs on Fable 5).**

- **T2 DONE + gate green (2026-07-06, ultracode).** `rework-subscription-plans`: new `ultra` tier
  ($30/mo) threaded through EVERY plan union (entities Plan, PaymentsPlan+PAYMENTS_PLANS,
  SubscriptionPlan, PAID_PLANS, SyntheticInvoice.plan, start-checkout param) with no stranded bimap;
  **migration renamed 0005→0006** (`0006_ultra_plan.sql`, 0005 taken by T1) — additive CHECK widen;
  per-plan period map `{pro:30, ultra:30, job_hunt_pass:14}` in BOTH emulator + invoices;
  PLAN_AMOUNT_USD ultra:30 + Pass 19→20; `upgrade.planFeature`→`readonly string[]` + new
  `billing.planBenefits`; landing Pricing four-plan layout (Free strip + Pro/Ultra/Pass, Ultra
  featured); UpgradePlans 3-plan grid w/ bullets; BillingPortal current-plan benefit list.
  **User decision honored:** Ultra's unbuilt features (interview prep, private community) labeled
  "(coming soon)" / "(незабаром)" in en+ua — not sold as live. Enemy-centric copy, no
  emoji/!/em-dash, no honesty claims in marketing copy. Maker(opus)→test-author(sonnet, +67 tests)→
  verifier+checker(opus). Checker fix-first 0 blockers; 2 major FIXED (Pass FAQ 30→14 day in en+ua) +
  1 minor FIXED (unused test var). Gate: lint 0/0 + build + **114 files / 831 tests green.**
  Implements FR-BILLING-01/02, FR-PAYWALL-02, FR-SALES-03, NFR-I18N-01, BC-BRAND-01. Spec tasks ticked
  except 7.4 (manual dev smoke). **UA copy + tier naming still want a native marketing-voice review**
  (non-blocking). **Next: T4.**
- **T3 DONE + gate green (2026-07-06, ultracode).** `harden-account-export-ux`: fetch-based GDPR
  download via new `features/export-data-button` slice (idle|pending|error state machine mirroring
  DeleteAccountButton, blob→objectURL→synthetic anchor→revoke, NO href/navigation, inline
  `exportError` via role=alert); per-profile decrypt guard defense-in-depth (service.ts primary +
  cv-profile-repo.getRawText returns null instead of throwing) → one bad profile yields
  `rawText:null, decryptionFailed:true` and export still 200 (GDPR-graceful); decrypt logs carry
  profile id + stable code only, NO key/plaintext/ciphertext (NFR-SEC-01); route now returns a calm
  coded 500 when the key is unset. `exportPending`/`exportError` i18n (ua+en). Maker(opus)→
  test-author(sonnet, +31 tests)→verifier+checker(opus) separate contexts. Checker ship, 0 findings.
  Gate: lint + build + **113 files / 760 tests green.** Implements NFR-GDPR-01/02, NFR-SEC-01,
  NFR-OBS-01. Spec tasks ticked. **Prod env fix (CV_ENCRYPTION_KEY/DATABASE_URL + db:migrate) remains
  ops-blocked** — this diff hardens the code path, does not set the env. **Next: T2.**
- **T1 DONE + gate green (2026-07-06, ultracode).** `persist-tailoring-lifecycle`: migration 0005
  (status col pending|complete|failed, CHECK, back-fill existing→complete, auto-registered by the
  dir-scanning runner); repo `createPending`+`updateStatus`(+`cvProfileId` threaded)+`save` delegates
  +`listByUser` filters status='complete'; `tailoring-cleanup.ts markAbandonedPending` (pure over
  Queryable); BOTH gen routes persist a PENDING row at START for ALL logged-in users (best-effort,
  never blocks stream), update on result/failure; counter reserved before LLM, released only on clean
  pre-LLM failure (mid-run abandon keeps slot); read routes drop paid gate (auth-only, IDOR 404),
  `tailoringStatus` i18n (ua+en). Maker(opus)→test-author(sonnet)→verifier+checker(opus) all separate
  contexts. Checker ship, 0 blockers; 1 major fixed (cvProfileId drop); 7 stale old-contract tests
  reconciled by a fresh test-author (none deleted). Gate: lint + build + **111 files / 730 tests green.**
  Spec tasks ticked except 8.4 (manual dev trace) + 9.2 (openspec archive — CLI unavailable here).
  **Next: T3 (harden-account-export-ux).**
- **T6 DONE + committed (`990fb97`, 2026-07-06).** `fix-checklist-pill-i18n`: locale threaded through
  StatusPill + ChecklistRow + ChecklistPreview AND ChecklistPanel (checker caught tailor-workspace +
  history-detail still rendering UA pills once ChecklistRow gained the prop). UA default preserved.
  +36 tests. Gate green: lint + build + 107 files / 677 tests. Maker→test-author→checker→verifier all
  separate contexts per the separation-of-duties rule; checker blocker (ChecklistPanel) fixed. Spec
  tasks ticked. GroundingBadge = documented follow-up. **Next: T1.**
- **NEW 6-task batch — investigation DONE + decisions locked, entering spec phase (2026-07-06, ultracode).**
  6-agent investigation workflow (`wn9s3sx77`) root-caused every task (see per-task plan below).
  User decisions:
  - **T5 scoring:** heuristics now + LLM coverage judge behind a feature flag (flag off until
    ANTHROPIC_API_KEY + honesty-eval fixtures land). Relax FR-CHECKLIST-01 to "deterministic scorer
    over LLM-cited, CV-grounded evidence" ONLY for the flagged path; pure heuristic path stays default.
  - **T5 scope:** BOTH — promote grounded LLM cover letter (deterministic reflow = fail-honest
    fallback) AND build a real structured resume doc (contact/summary/experience+dates/skills/edu).
  - **T1 history:** persist on START for ALL logged-in users (not paid-only), update the row on EACH
    step (analyze→generate→done); enforce the 1-free-tailoring cap SERVER-SIDE for free/anon.
  - **T2 JobHunt Pass:** 14-day period (per-plan period, emulator is a single 30-day constant today).
- **NEW 6-task batch started — investigation phase (2026-07-06, ultracode).** Pre-build gate:
  launched a read-only investigation workflow (`vouch-batch6-investigate`, 6 parallel investigators,
  task 5 on Fable 5) to root-cause + map each task against code + PRD BEFORE any code. The 6 tasks:
  1. [bug] Tailoring not saved to history — persist record on tailoring START (link JD+CV+answers+score), match mocked flow.
  2. [rework] Plans across app (account/billing + landing): benefit bullets on plan list + current plan; new tiers (Pro/Ultra/JobHunt Pass), improved names+copy (enemy-centric, no emoji/!/em-dash), ua+en.
  3. [bug] "Download my data" still shows export_failed in web.
  4. [rework] Upload-CV premium banner: text-paste zone works; separate blurred file-drop zone gated by a semi-transparent Premium banner; **server-side enforcement** so devtools can't bypass.
  5. [rework, Fable 5] Scoring/seniority/honesty + cover letter + downloadable resume doc. Stop the false 30/100 + false 'unsafe' flags; infer seniority from whole resume; ask only about fully-uncovered fields; natural senior cover letter; real resume document (not bullet dump).
  6. [bug] Landing "Know exactly where you stand" checklist demo renders UA labels when EN selected.
- **Model-routing enforcement hook added (2026-07-06).** New `PreToolUse` hook
  `.claude/hooks/model-routing-reminder.sh` (matcher `Agent|Workflow`, registered in
  `.claude/settings.json`). Advisory + non-blocking: injects a complexity-grading reminder when a
  dispatch omits `model` and is not a `fork`; silent when `model` set / fork / other tools. All 5
  branches smoke-tested green. AGENTS.md model-routing section notes the enforcement.
- **Model-routing rule added to `AGENTS.md` (2026-07-05).** After analyzing requirements, grade
  complexity (low/medium/high) and route to cheapest capable model: low→`haiku`, medium→`sonnet`,
  high→`opus`; omit `model` to inherit session (fork ignores it). Plus token-lean dispatch
  (locator/Explore subagents, no double search). Size up one tier when unsure. Docs-only.
- **Strict pre-build gate added to `AGENTS.md` (2026-07-05).** "Before you build": no new feature
  implemented until (1) requirements analyzed → PRD IDs mapped, ask if unclear; (2) specs authored
  (OpenSpec delta, WHEN/THEN); (3) architecture stated (FSD slice, data/pipeline, NFR risk);
  (4) `current-state.md` plan written. Code before gate = hard violation. Docs-only.
- **Strict separation-of-duties rule added to `AGENTS.md` (2026-07-05).** Declares maker ≠ checker ≠
  test author: code review and unit/integration/e2e test authoring MUST run in a separate sub agent
  with clean context + its own skill/settings, never the maker's. Review → `checker`; verify →
  `verifier`; tests → dedicated **test-author** subagent (does NOT exist yet — flagged as a gap to
  build; until then use a clean-context general sub agent with an explicit test brief). Docs-only.
- **T10 whole-app UA/EN language toggle DONE (2026-07-05, ultracode). ALL 10 TASKS COMPLETE.**
  Change `add-language-toggle` (`d9e0f0b` fonts, `215cd31` locale infra, `463aa9d` review fixes).
  User-approved Cyrillic font swap **Unbounded + Golos Text** (fixes broken Cyrillic across the app,
  weights pinned for payload). Locale cookie (Ukrainian-first default) + `parseLocale` (pure) +
  `LanguageSwitch` (UA|EN, a11y, sets cookie + `router.refresh()`); root layout sets `<html lang>`
  (`uk`/`en`); every page threads the resolved locale to its view + top bar; landing now renders the
  cookie locale (defaults ua). Gate green: **lint + build + 104 files / 646 tests.** 4-lens adversarial
  review (maker≠checker) → all findings fixed. **Two documented perf tradeoffs need `perf-audit`
  before prod:** heavier Cyrillic fonts + the landing is now dynamic (`ƒ`, was static) because the
  cookie read at the root opts routes into per-request rendering (inherent to cookie i18n without URL
  prefixes). **UA landing copy is now visible by default and still awaits native marketing review.**
- **Landing i18n extraction DONE (T9 remaining piece), spec-first + reviewed green (2026-07-05, ultracode).**
  Change `extract-landing-i18n` (`86bdf7c` spec, `fc0446d` code, `3e275de` review fix). Moved all
  ~130 landing strings (content.ts + hardcoded section heads, inline labels, final CTA, footer credit,
  hero demo card) into the i18n `Dictionary`, authored in both en + ua. `content.ts` is now
  locale-parameterized assemblers merging i18n text with local structural data (accent/status/
  grounding/price/hrefs); collections keyed by stable id. Section components take a `locale` prop.
  **Font-safety:** every landing call site passes explicit `"en"` (t() defaults to ua; display fonts
  are latin-only), so the page still renders English until T10 wires Cyrillic. Checker verdict SHIP
  (0 blockers, 2 minors; the real one fixed in `3e275de`). Gate green: lint + build + 103 files /
  641 tests (i18n ua/en parity + no-emoji/exclamation guards cover the new keys). **UA copy flagged
  for native marketing-voice review** before T10 makes it visible.
- **Premium PDF-attach surfaced on landing (T8 last gap closed), spec-first + reviewed (2026-07-05, ultracode).**
  New change `surface-premium-attach-landing` (`1963fe0`): Pro pricing feature line + one FAQ item
  representing the shipped T5 attach honestly (enriches generation only, never grounding, never
  fabricates). Checker subagent PASS on code/honesty/brand: FAQ copy ground-truthed against the
  generation-only attachment path + `GROUNDING_FORBIDDEN` denylist + paid gating. Gate green (103
  files / 641 tests). One checker blocker was a **spec archive-ordering dependency** (not a code
  defect): this delta MODIFIES a requirement still ADDED-only in unarchived `update-landing-flow`, so
  archives MUST run `update-landing-flow` → `surface-premium-attach-landing`. Documented in the change
  proposal/tasks + Blockers below. Also discovered + recorded: task 6's 0004 integration test already
  exists and is green (`persistence.integration.test.ts`), and T8/T9's content pass already shipped via
  `update-landing-flow`.
- **T7 `landing-animations` DONE (implemented, reviewed, fixed, verified green) (2026-07-05, ultracode).**
  T7 shipped in `fe65f2f` ("UI updates"): motion tokens + reduced-motion kill switch in
  `globals.css`, `shared/ui/reveal` primitive (IntersectionObserver, SSR-visible default,
  `fade={false}` LCP-safe), scroll-reveal wired on all below-fold landing sections, hero `.rise-in`
  entrance (h1 + demo card stay static for LCP), Button hover/press micro-interactions. That commit
  drifted the handoff doc (left T7 "in progress"); corrected here.
- **T7 closeout this session (`f638efe`).** Ran a gate + adversarial 4-lens review workflow
  (a11y-motion, perf/CLS/LCP, FSD/DESIGN/spec, correctness), each finding independently verified. 9
  confirmed findings, all fixed:
  1. **a11y bug (NFR-A11Y-01):** reduced-motion zeroed animation-*duration* but not *delay*, so the
     `both`-filled hero `.rise-in` sat hidden through its delay then snapped visible. Fixed: the
     reduced-motion block now removes `.rise-in` animation and zeroes `animation-delay`/`transition-delay`.
  2. **Button:** disabled link form (`aria-disabled <a>`) kept hover lift/color (`disabled:` does not
     match anchors). Fixed via `aria-disabled:` + `pointer-events-none`.
  3. **Test rigor:** added a `renderToStaticMarkup` test locking the SSR-visible contract.
  4. **Docs:** corrected `:root`-vs-`@theme` token claim, narrowed hero-entrance scope in proposal/tasks
     to match code, dropped stale "kicker" comment, removed new em-dashes.
  Gate: **lint + build + 103 files / 641 tests green.** Lighthouse deferred (no Chrome in sandbox);
  CLS-0 by construction, LCP protected by the static h1/demo-card.

## Evidence-based status of the 10-task batch (see git log)

| # | Task | Status | Crit |
|---|------|--------|------|
| 1 | Tailoring intelligence (seniority / info tag / cover letter) | **DONE** (shipped + archived) | P1 |
| 2 | Delete profile ECONNRESET | **DONE** (`fcf39c5`) | P0 |
| 3 | GDPR export `export_failed` | **DONE (code)**; needs prod env set | P1 |
| 4 | Header rework | **DONE**; openspec archive pending | P1 |
| 5 | Premium PDF attach | **DONE** (`b341245`..`ac90fad`); §4 archive/live-eval sandbox-blocked | P1 |
| 6 | Tailoring history | **DONE (E2E green)**; 0004 integ-test exists (green); archive pending | P2 |
| 7 | Landing animations | **DONE** (`fe65f2f` + review fixes `f638efe`); Lighthouse + archive pending | P2 |
| 8 | Landing → new flow (cover letter / info tag / attach / history) | **DONE** (`update-landing-flow` + attach `1963fe0`) | P1 |
| 9 | Landing marketing/copy (enemy-centric) | **DONE** — copy + full i18n extraction (`extract-landing-i18n`); UA copy pending native review | P2 |
| 10 | Whole-app UA/EN toggle | **DONE** (`add-language-toggle`: Unbounded+Golos fonts, cookie locale, LanguageSwitch); perf-audit + archive pending | P2 |

## Working on

### `restack-checklist-preview` — DONE (2026-07-09) — see Last action

Landing "Know exactly where you stand" section rework (user ask). Today: `md:grid-cols-[auto_1fr]`
with MatchScore in the left column + a single stacked ChecklistRow list on the right. Want: the
"Strong fit, honestly scored" MatchScore in a CONTAINER on TOP (full width), and the bullets as a
GRID below (2 columns) instead of a single-column list. FR-SALES-02, FR-CHECKLIST-02/04, BC-BRAND-01,
NFR-I18N-01.

**Plan:**
1. `src/views/landing/ui/ChecklistPreview.tsx` (ONLY file): wrap MatchScore in a card container on top
   (`rounded-xl border border-hairline bg-surface-card px-6 py-5`, matching Pricing/Pillars cards, no
   colored accents); render rows as `mt-8 grid gap-x-12 sm:grid-cols-2`, splitting rows into two
   dividered sub-lists (ceil(n/2) left, rest right) so each column preserves ChecklistRow's border-b
   divider + `last` handling (no shared-component edit needed). Collapses to 1 col below sm.
2. Maker (me) → checker subagent + test-author subagent (clean contexts, maker≠checker). Update the
   existing ChecklistPreview.test.tsx for the new structure.
3. Gate: lint + build + touched tests. Commit. perf-audit remains Chrome-blocked (flag).

DEFERRED same-session (Ultra-claims accuracy, investigated wf a5dbdbb): all 13 Ultra/Pro "flagship
model / priority / high-volume" strings (en+ua upgrade.planFeature, billing.planBenefits,
landing.pricing) are UNFOUNDED — code has ONE global model (opus-4-8), binary hasPaidAccess, no
queue/priority, no per-plan limit. Needs a user decision (soften to honest-now vs mark "coming soon"
vs implement routing) before editing marketing copy. Plus the 3 quick fixes (offer Stripe line,
privacy date, marketing flagship claim). Not doing until the checklist rework lands + decision made.

**Nothing in flight. `fix-billing-locale` + `honest-plan-claims` both DONE (see Last action).**

### `fix-billing-locale` — DONE `70ff874` (2026-07-10) — see Last action

User-reported: on the subscription screen (/account/billing) the header language switch to English does
nothing. ROOT CAUSE (confirmed): `src/app/account/billing/page.tsx` never reads the locale cookie — unlike
its sibling `src/app/account/profile/page.tsx` which does `parseLocale((await cookies()).get(LOCALE_COOKIE))`
and threads `locale` to TopBar + view. Billing passes NO locale, so TopBar + AccountBillingView fall back to
the "ua" default and the switch appears dead. `AccountBillingView` + `BillingPortal` ALREADY accept a
`locale?` prop — the fix is page-only. NFR-I18N-01, FR-BILLING-01, FR-SHELL-01.
**Plan:** billing/page.tsx — import `cookies` + `LOCALE_COOKIE`/`parseLocale`, read locale, pass to
`<TopBar locale=…>` + `<AccountBillingView locale=…>` (mirror profile/page.tsx). Keep force-dynamic (already
per-request). maker→test-author (page threads cookie locale; en cookie → en copy) →checker+verifier. Commit.
Note: audit other authed pages for the same missing-locale bug (history, checkout) as a follow-up.

### `honest-plan-claims` — IN PROGRESS (2026-07-10): maker+tests done, checker pending

Maker copy applied (en.ts/ua.ts, all unfounded Ultra/Pro flagship/priority/high-volume lines marked
"(coming soon)"/"(незабаром)"; ultra intro de-implies a Pro cap; offer Stripe line → emulator+[TODO];
privacy+offer `updated` → 9 July). test-author finished before the session limit hit: `i18n.test.ts`
61/61 GREEN. Session limit KILLED the checker (no verdict) + this earlier bug's original checker/test-author.
Checker (a4f7a81, 2026-07-10) = fix-first, 0 blockers, 1 major + 1 minor (both HONESTY, real):
the flagship model (claude-opus-4-8) is ALREADY used for ALL plans, so (major) "flagship model... not
just the fast one" falsely implies free/Pro get a lesser "fast" tier (none exists); (minor) marking
"flagship model (coming soon)" implies today's tailorings use a worse model (inverts reality). FIX to
apply: REMOVE the flagship-model bullet from ultra in ALL 3 locations × 2 locales (upgrade.planFeature.ultra,
billing.planBenefits.ultra, landing.pricing.ultra) — it can't honestly be a current or future Ultra perk
since Opus is already universal. Keep priority/high-volume "(coming soon)". Then reconcile i18n.test.ts
flagship assertions (test-author). HELD until the concurrent fix-billing-locale workflow lands (its verifier
runs the full suite over en.ts/ua.ts — avoid the edit race). Everything else in the change = checker-clean.
NEXT: after billing lands → apply flagship removal + test reconcile → commit. Uncommitted: en.ts, ua.ts, i18n.test.ts.

### `honest-plan-claims` plan (superseded header above)

User decision (2026-07-09): mark the unfounded Ultra/Pro differentiators "(coming soon)" (not soften,
not implement). Investigation wf a5dbdbb confirmed: ONE global model (opus-4-8) for all, binary
hasPaidAccess, NO queue/priority, NO per-plan limit. So "flagship model / priority generation /
high-volume daily" misrepresent shipped state. BC-HONESTY-01, BC-BRAND-01, FR-BILLING-01, FR-SALES-03.

**Plan (maker opus → test-author sonnet → checker opus, separate ctx):**
1. Mark unfounded plan-feature strings "(coming soon)" / "(незабаром)" in en.ts + ua.ts, matching the
   existing "Interview prep (coming soon)" convention:
   - Ultra flagship/high-volume/priority: `upgrade.planFeature.ultra` (en 135/136/137), `billing.planBenefits.ultra`
     (en 175/176/177), `landing.pricing.ultra` (en 566/567/568) + ua mirrors.
   - Pro "priority generation" (also unfounded — no queue): `upgrade.planFeature.pro` (en 131),
     `billing.planBenefits.pro` (en 171), `landing.pricing.pro` (en 556) + ua mirrors.
   - `upgrade.planFeature.ultra` intro (en 134 "plus room to apply every single day") falsely implies a
     Pro volume cap (Pro is also unlimited) → make honest ("Everything in Pro" or similar).
2. Remaining accuracy fixes (same files): `legal.offer` payment line still names Stripe (no Stripe in
   code, emulator only) → align w/ the privacy fix (emulator, no live processor); `legal.privacy.updated`
   date "4 July 2026" → "9 July 2026" (body rewritten today).
3. test-author: assert marked strings carry "(coming soon)"/"(незабаром)"; checker verifies no unfounded
   claim remains unmarked + brand rules. Gate + commit.

**Nothing else in flight — 8-task batch COMPLETE (T2+T3 was the last); restack-checklist-preview shipped.** T2+T3 shipped (see Last action). Remaining items are all
environment/tooling/human-review blocked (no code) — see Remaining. Flagged code follow-ups from T2+T3:
pricing.ultra "flagship model" marketing overclaim + legal.offer Stripe payment line (both pre-existing,
own small change); UA privacy native review; legal-counsel [TODO] placeholders.

### T2+T3 `fix-faq-and-privacy-accuracy` — DONE (2026-07-09, ultracode) — see Last action

Last functional unit of the 8-task batch. Copy/honesty accuracy fixes across i18n + legal page, no
new runtime. maker(opus)→test-author(sonnet)→checker(opus)+verifier(sonnet), separate contexts.
Root-caused (investigator, this session): defects are stale copy that drifted from shipped behavior.

**Plan (numbered):**
1. **T2 FAQ + pricing accuracy** (`en.ts`/`ua.ts` `landing.*`):
   - `faq.coverLetter`: "Pro turns…" → "Any paid plan…" (cover-letter export gated by
     `hasPaidAccess` = pro/ultra/job_hunt_pass, not Pro-only). BC-HONESTY-01, FR-COVERLETTER-01.
   - `faq.attach`: "Yes, on Pro." → "Yes, on any paid plan." (attach gate = `hasPaidAccess`,
     server-enforced in api/tailor/generate). NFR-SEC-04, FR-CV-01.
   - `pricing.free.cadence`: "2 tailorings, lifetime" → "1 tailoring, lifetime" (FREE_TAILORING_LIMIT
     is 1 since T4+T5; matches finalCta "first tailoring is free"). NFR-COST-02, FR-ONBOARD-01.
2. **T3 privacy full GDPR draft** (`en.ts`/`ua.ts` `legal.privacy` + `legal.offer`):
   - Fix export format: "export…as JSON" → "as a PDF" (T6 replaced JSON w/ PDF). NFR-GDPR-01.
   - Drop the "all your data" overclaim → enumerate what the PDF actually contains (account, résumé
     profiles, tailoring history); note JD text not yet included (best-effort draft caveat).
     BC-HONESTY-01, NFR-GDPR-01.
   - Expand to a full best-effort GDPR draft (locked decision 2026-07-09): data inventory (account
     email/name, credentials/password hash, CV text encrypted, tailoring history incl. JD text,
     usage counter, session+locale cookies — no trackers), subprocessors (Anthropic US for
     gen/grounding — CV+JD sent, user IDs excluded NFR-SEC-02; Stripe test-mode payments; hosting),
     retention, legal basis, international transfer (US subprocessor), rights (access/export/delete/
     rectify/portability/complaint), CLEARLY-MARKED placeholders for legal entity / DPA contact /
     supervisory authority. KEEP the draft banner. BC-PRIVACY-01/02, NFR-GDPR-01/02, NFR-SEC-02.
   - `legal.offer.Plans`: add the Ultra tier (Free/Pro/Ultra/Job-hunt Pass) — currently missing.
     FR-BILLING-01.
3. **Tests** (test-author, separate ctx): en-locale Faq assertions (no "Pro"-gated wording for
   attach/coverLetter), LegalView privacy asserts PDF (not JSON) + Ultra present + placeholder markers
   + draft banner.
4. **PRD sync** where wording changed (NFR-GDPR-01 already PDF from T6; add privacy-draft note if needed).
5. checker(opus) + verifier(sonnet), separate ctx. Commit. Refresh handoff.

UA copy = flagged for native marketing/legal review (non-blocking). Legal-counsel facts (entity/DPA/
authority) ship as marked TODO placeholders.

---

### T4+T5 `gate-tailor-and-tier-states` — MAKER DONE (2026-07-09), NOT committed

Maker pass complete; lint 0/0 clean; tsc clean on all touched files (the 4 pre-existing tsc errors in
`maintenance/tailoring-cleanup/route.test.ts`, `evals/coverage-judge-trajectory.test.ts`,
`llm/coverage-judge.test.ts` are unchanged at HEAD — NOT mine). Tests + checker + verifier are for
SEPARATE agents (maker≠checker). Touched: `usage-counter.ts` (FREE_TAILORING_LIMIT 2→1), `tailor/page.tsx`
(auth redirect + freeExhausted signal), `TailorWorkspace.tsx` (freeExhausted prop → Paywall vs inputs),
`AnalyzeForm.tsx` (paid prop → hide cvText textarea, CV from prop), `PremiumAttachZone.tsx` (premium badge
on paid branch), `api/tailor/generate/route.ts` + `api/tailor/route.ts` (401 on anon, dead anon paths
removed), `sign-in/page.tsx` (callbackUrl + open-redirect guard) + `SignInView.tsx` (redirectTo passthrough),
`cv-agent-requirements.md` (FR-ONBOARD-01 + NFR-SEC-03/04 revised). ANON_TAILORING_LIMIT kept exported
(still used by pure tailoringLimit("anonymous"); no route admits anon). NEXT: test-author, then
checker+verifier in clean contexts; then commit.

### Plan — T4+T5 `gate-tailor-and-tier-states` (superseded by maker-done above)

/tailor becomes AUTHENTICATED-ONLY (user decision 2026-07-09, revises FR-ONBOARD-01: anon no longer
tailors, free allowance = 1 per free ACCOUNT). Server reserve + hasPaidAccess stay the trust boundary
(NFR-SEC-04); freeExhausted is presentational only. Steps:
1. `usage-counter.ts`: FREE_TAILORING_LIMIT 2 → 1.
2. `tailor/page.tsx`: redirect("/sign-in?callbackUrl=/tailor") when userId null (keep force-dynamic);
   for authed user compute `freeExhausted = !paid && !canTailor(counter ?? {userId,tailoringsUsed:0},"free")`,
   lenient on read error (false); pass {paid, freeExhausted} to view.
3. `TailorWorkspace`: accept freeExhausted; analyze phase → if (!paid && freeExhausted) render Paywall
   reason="tailoring-limit" INSTEAD of inputs (keep section head/lead + WizardSteps); else inputs + pass
   paid to AnalyzeForm.
4. `AnalyzeForm`: accept paid?; when paid DON'T render cvText textarea (CV comes from upload zone); keep JD
   + honeypot + Analyze; cvText still flows from upload path.
5. `PremiumAttachZone`: render premium badge span on PAID branch too.
6. `api/tailor/generate/route.ts` + `api/tailor/route.ts`: reject anonymous (401 coded) instead of IP
   anon rate-limit branch; keep reserve(userId, FREE_TAILORING_LIMIT) for free. Remove dead anon paths.
7. `sign-in/page.tsx`: read callbackUrl searchParam (await, Next 16 Promise) → SignInForm redirectTo, with
   open-redirect guard (same-origin relative "/..." only, else /tailor).
8. i18n: reuse paywall.* (title "Unlock full access" + limitLead) — no new keys.
9. PRD: revise FR-ONBOARD-01 + NFR-SEC-03/04 wording, cite 2026-07-09 decision.
Implements FR-ONBOARD-01(revised), FR-PAYWALL-01/02, NFR-SEC-04, NFR-COST-02, FR-AUTH-01, NFR-I18N-01.

**NEW 8-task batch (2026-07-09, ultracode) — investigated (8 parallel investigators), decisions locked,
executing sequentially P0→down (file overlaps on tailor/page.tsx + en.ts/ua.ts force sequential, not parallel).**
Each task: maker→test-author→checker+verifier in separate contexts, commit per unit.

**STATUS (2026-07-09): T7 ✅ (`37b1868`) → T1 ✅ (`7d1ce25`) → T8 ✅ (`52c6c8e`) → T4+T5 ✅ (this commit).
T4+T5 ✅ (`30f2962`) → T6 ✅ (this commit). T2/T3 PENDING (last functional unit). Deferred: T1/T8
dedicated test-author tests (final cleanup). ExportDataButton Blob.stream red = RETIRED (polyfilled in T6).** BLOCKER: subagent SESSION LIMIT hit (resets 9am Europe/Kiev) — it killed the
test-author/checker/verifier stages of T1 + T8 (only the maker stages completed). T1 + T8 were committed
after I ran the gate INLINE (lint 0/0 + build + 138 files/1305 passed, 0 failed) and reviewed each diff
independent of the maker subagent (maker≠checker preserved — subagents wrote the code, main thread
verified). DEFERRED to session reset: dedicated test-author tests — T1 structural mobile-stack
assertions; T8 sweep-then-complete + double-terminal integration cases. Remaining T4/T5 (tailor auth +
tier states), T2/T3 (FAQ + privacy), T6 (export PDF) are substantive multi-file changes that REQUIRE the
maker≠checker subagent split (STRICT, AGENTS.md) — cannot proceed inline without violating it. Resume the
orchestrated flow after the limit resets.

LOCKED DECISIONS (user, 2026-07-09):
- **/tailor = authenticated-only.** Anon redirected to sign-in; the free allowance moves to free
  ACCOUNTS. Revises FR-ONBOARD-01 (anon no longer tailors). Gate BOTH the page AND the generate API
  (server-side, NFR-SEC-04) — not just a UI redirect.
- **Free account = 1 free tailoring** (`FREE_TAILORING_LIMIT` 2→1). Makes "first tailoring is free"
  copy accurate. Anon tailoring path retired.
- **Download my data = PDF (replace JSON).** Update NFR-GDPR-01 (drop the JSON constraint); note the
  portability tradeoff. Reuse the PT Sans @react-pdf renderer. GDPR export stays free (not paywalled).
- **Privacy = full best-effort GDPR draft** with clearly-marked placeholders for legal-entity/DPA/
  supervisory-authority; keep the draft banner.

PRIORITY ORDER + per-task scope (root-caused, file:line evidence in the wf_f5cbb546-be7 investigation):
1. **T7 payment (P0, S)** `fix-checkout-session-and-revalidation`: (a) checkout/page.tsx never calls
   auth()→TopBar shows "Sign in"; add `auth()` + pass user. (b) DB write DOES land (signed-token
   userId, correct upsert) — "stays free" is stale Next Router Cache; add force-dynamic on return pages
   (tailor, account/billing) + revalidate/router.refresh after webhook 200. READ node_modules/next docs
   (caching breaking changes). IDs FR-PAYWALL-03/01, FR-SHELL-01.
2. **T1 landing UA UI (P1, S)** `fix-landing-checklist-ua-layout`: MatchScore.tsx add min-w-0;
   ChecklistPreview grid `sm:grid-cols-[220px_1fr]`→auto; ChecklistRow mobile stack. CSS-only, no new
   hues (DESIGN.md). IDs NFR-I18N-01, BC-BRAND-01, FR-SALES-02.
3. **T8 history race (P2, S)** `guard-tailoring-status-transitions`: tailoring-repo.updateStatus add
   `AND status='pending'` to both UPDATEs + skip child inserts on 0 rows-affected. IDs FR-TAILOR-04.
4. **T4+T5 tailor auth+tier states (P1, S/M)** `gate-tailor-and-tier-states`: gate page+API (anon→
   sign-in, decision A); FREE_TAILORING_LIMIT→1; page reads usage-counter→pass `freeExhausted`+`paid`
   to view (presentational; server reserve stays trust boundary, NFR-SEC-04); TailorWorkspace: used-free
   →Upgrade UI instead of inputs; AnalyzeForm: premium suppresses résumé textarea (the corruption);
   PremiumAttachZone: show premium badge on paid branch; sign-in page reads callbackUrl (open-redirect
   guard). i18n upgrade copy. IDs FR-ONBOARD-01(revised), FR-PAYWALL-01/02, NFR-COST-02, NFR-SEC-04.
5. **T2 FAQ + T3 privacy (P1, S)** `fix-faq-and-privacy-accuracy`: FAQ attach/coverLetter "Pro"→"any
   paid plan" (hasPaidAccess); free-limit copy→"first tailoring is free" (now 1, accurate); a11y comment
   honesty; en-locale Faq test. Privacy: full GDPR draft (subprocessor=Anthropic US, qualify no-training,
   full data inventory incl. JD/credentials/cookies, retention, legal basis, rights, intl transfer),
   fix "all your data" claim, add Ultra plan, entity/DPA placeholders. IDs BC-HONESTY-01, NFR-SEC-02,
   BC-PRIVACY-01/02, NFR-GDPR-01/02. UA copy → native review (flag). NOTE: en.ts/ua.ts touched by T5,
   T2, T3, T6 — sequence them to avoid churn.
6. **T6 download PDF (P2, S)** `export-account-pdf`: replace JSON export with a PT Sans PDF render of
   AccountExport; route content-type/filename; ExportDataButton downloads .pdf; update NFR-GDPR-01.
   NOTE: also fold the ExportDataButton jsdom Blob.stream test (was flaky/env — verify current).

Deferred/flagged: marketing-voice UA rewrites (native review); privacy legal-counsel facts (entity/DPA/
authority) as TODO placeholders; the periodic cleanup-cron invoker (ops).

---

**`harden-agentic-loop` — ✅ DONE + gate green + verified (see Last action). Ready to commit.**
Caps: `.github/`, `.claude/` (hooks/agents/skills/schema/reviews), `scripts/`, `package.json`,
plus 4 pre-existing test files + vitest.setup.ts (fixing the reds the new gates surfaced).
Refs: AGENTS.md (loop, separation-of-duties, plan-first), NFR-OBS-01, NFR-SEC-01, BC-PRIVACY-01.

### Plan (numbered — all complete)
1. **C3 CI** — `.github/workflows/ci.yml`: push+PR, node 20, frozen-lockfile,
   `lint → typecheck → build → test → node scripts/check-review-findings.mjs`; `typecheck`
   script (`tsc --noEmit`) added to package.json; placeholder env in build step.
2. **C3 Stop hook** — `current-state-stop-check.sh`: blocking `yarn lint` on code-file changes
   before the handoff check (stop_hook_active guard kept); Stop timeout 15s→120s in settings.json.
3. **C5 artifact** — `.claude/review-findings.schema.json` (draft-07) + zero-dep
   `scripts/check-review-findings.mjs` (scans openspec/changes/**+.claude/reviews/*, shape-checks,
   exit 1 on malformed) + `checker.md`/`checker-review` SKILL emit `review-findings.json` per change.
4. **Verify + review (separate ctx)** — verifier runs the gate + dry-runs the hook + validator;
   checker reviews the whole diff and DOGFOODS `.claude/reviews/harden-agentic-loop.json`.
5. **Close** — fix blockers, re-verify, commit, refresh this handoff.

Non-goals: presence-enforcement (validator only shape-checks existing files); full test suite in
the Stop hook (CI owns it). openspec archive stays blocked (CLI unavailable).

---

**Live honesty-eval harness (change `add-live-honesty-eval`) — ✅ DONE + live-verified 7/7 (see Last action).**
User scope decision: **free-user surface = coverage judge; premium surface = all three** (judge +
grounded cover letter + structured resume). Real Anthropic spend accepted (`ANTHROPIC_API_KEY` in `.env`).
Caps: shared/lib/evals, honesty-core. IDs: BC-HONESTY-01/02, FR-CHECKLIST-01, FR-COVERLETTER-01/02,
FR-EXPORT-01/02, NFR-COST-01, TC-PURE-01.

Key finding (investigation): only TWO of the three have a live LLM call. **Resume export
(`buildExportDocument`) is fully deterministic — no LLM** — its honesty is the pure `includedInExport`
gate (BC-HONESTY-02), already unit-tested. So the harness = 2 live paths + 1 deterministic assertion,
reported honestly (no fake "live" resume run).

### Plan (numbered)
1. **Eval-author (separate ctx, opus, honesty-eval skill)** writes a KEY-GATED live harness under
   `src/shared/lib/evals/` — skipped when `ANTHROPIC_API_KEY` unset so CI stays green (matches the
   existing deferred-eval convention). It must call the REAL shipped paths, not reimplement:
   - **Judge (free+premium):** `resolveLlmProvider()` → `buildCoverageJudgePrompt` → `provider.complete`
     → `parseCoverageJudgeResponse` → `applyCoverageJudge`. Grade: score never inflates (gap→partial
     only w/ verbatim+relevant citation; fabricated/short/irrelevant citation discarded → heuristic gap
     kept; covered never→met). Reuse `judge-score`/`coverage-judge` fixtures + graders.
   - **Cover letter (premium):** `generateGroundedCoverLetter(input, { llm: resolveLlmProvider() })`.
     Grade: GROUNDED fixture → non-null grounded paragraphs; OVERCLAIM fixture ("50 engineers"/"10M
     users") → null (fail-honest). Reuse `generate-grounded-letter.test.ts` fixtures.
   - **Resume (premium, deterministic):** assert overclaim bullets never appear in ANY section of
     `buildExportDocument` output (BC-HONESTY-02). Label as deterministic, not live.
2. **Run live (me):** load `.env` WITHOUT printing the key (`node --env-file=.env ./node_modules/.bin/vitest run <files>`), capture per-path pass rates. Report honestly incl. any refusal/parse failures.
3. **Checker (separate ctx)** reviews the harness: does it exercise the shipped path (real provider, real
   parsers, real graders) vs a parallel reimpl? are the honesty gates asserted, not weakened?
4. **If judge eval passes:** flipping `COVERAGE_JUDGE` default-on adds 1 LLM call to every free tailoring
   (NFR-COST-01) — a cost/product decision. CONFIRM with user before changing the default; do not flip
   silently. Commit the harness regardless (green, gated).

Security/cost notes: NEVER read/print `.env` or the key (org rule); harness sends CV+reqs ONLY, no user
ids/PII to the LLM (NFR-SEC-02); live run is bounded (few fixtures) to cap spend.

---

**Ops follow-up: wire `markAbandonedPending` invoker (change `wire-tailoring-cleanup-route`) — ✅ DONE
(2026-07-08, see Last action). Endpoint ships; periodic cron/curl invoker stays ops (Remaining §4).**
Post-batch code work. Caps: shared/config, shared/lib/db, app/api (maintenance). IDs: NFR-COST-02
(abandoned pending rows consume a free user's lifetime slot), FR-ONBOARD-01, NFR-OBS-01, NFR-SEC-01.

Root cause: `markAbandonedPending(db, olderThanMs)` (`shared/lib/db/tailoring-cleanup.ts:21`) ships
with ZERO production callers — only integration tests. No route/cron sweeps abandoned `pending` rows.

### Plan (numbered)
1. **env accessor** — add `getMaintenanceSecret(): string` to `shared/config/env.ts` (mirror
   `getPaymentsWebhookSecret`: throw on unset/empty). Export via `shared/config/index.ts`.
2. **route** — new `src/app/api/maintenance/tailoring-cleanup/route.ts`, `POST`:
   - 503 calm when secret unset (getMaintenanceSecret throws) — mirror webhook 503.
   - Read `Authorization: Bearer <secret>`; constant-time-ish compare; 401 on mismatch/missing.
   - `getDb()` → `markAbandonedPending(db, 30 * 60 * 1000)` (30-min TTL default).
   - 200 `{ swept: <count> }`; catch DB/other → calm coded 500 (no stack/schema leak, NFR-OBS-01).
   - Log only `[api/maintenance/tailoring-cleanup] swept N` — NO user ids / key / plaintext (NFR-SEC-01).
3. **tests** (test-author, separate ctx): unset-secret→503, no/blank header→401, wrong token→401,
   valid token→200 + markAbandonedPending invoked with 30-min TTL, DB throw→500, no secret leak.
4. checker + verifier (separate ctx). Commit. Then update handoff.

Security notes: auth-protected ops route (SOC2 access control); secret via env only, never logged
(no single-point — env gate + bearer check); no PII in payload/logs. Wire the actual cron/curl
invoker is an OPS step (kept in Remaining) — this change ships the safely-callable endpoint.

Deferred (assessed this session, NOT doing now):
- **#7 per-bullet role provenance** — needs `Bullet.sourceRoleIndex` set in the gen/grounding
  pipeline + migration + repo thread. Honesty-core + schema = own spec-first change. Fidelity-only.
- **#8 server-side export honesty gate** — reassessed LOW value: it is the user's OWN resume; self-
  authored text in a self-downloaded PDF is not an overclaim. Routes shape-validate already. Keep the
  documented accepted trust boundary; no schema change.

---

**NEW 6-task batch — ✅ COMPLETE (all 6 tasks shipped, reviewed green).**
Order shipped: **T6 ✅ (`990fb97`) → T1 ✅ (`c2a6dbd`) → T3 ✅ (`c265f89`) → T2 ✅ (`27d4861`) →
T4 ✅ (`1080213`) → T5 ✅** (`b5b0c90` G1a, `126ab08` G3, `7b2a98d` G2, `dca3530` G4, this commit G5).
Every task ran maker → test-author → checker + verifier in SEPARATE contexts, committed per unit.
Batch-end gate: **lint 0/0 + build clean + 133 files / 1234 tests green.** Remaining items are all
environment/tooling/human-review blocked (no code) — see Remaining below.

Archive-order deps (for later, CLI unavailable here): `persist-tailoring-lifecycle` supersedes/depends
on `add-tailoring-history` (archive that first or fold in); `harden-account-export-ux` MODIFIES the
account spec from `fix-gdpr-account-endpoints` (archive that first). `rework-subscription-plans`,
`gate-premium-upload-zone`, `fix-checklist-pill-i18n` are archive-independent.

T2 proposed plan copy authored (Pro/Ultra/Job-Hunt Pass, ua+en) — enemy-centric, but the draft has
em-dashes that MUST be swapped for colons/commas before wiring (BC-BRAND-01). UA copy still needs
native marketing review.

- **T6 [bug] landing checklist pill i18n** (change `fix-checklist-pill-i18n`; caps: shared-ui/marketing-landing; NFR-I18N-01, FR-SALES-02).
  Root cause: `shared/ui/status-pill/ui/StatusPill.tsx:32` hard-imports `ua` dict, no `locale` prop.
  Fix: add `locale?: Locale` to StatusPill + ChecklistRow, thread from ChecklistPreview; resolve via
  `t(locale).checklist.statusLabel`. 3 files, no new strings. (GroundingBadge has same latent pattern
  — follow-up note.)
- **T1 [bug] tailoring history** (change `persist-tailoring-lifecycle`; caps: tailoring-history[new], paywall; FR-TAILOR-04, FR-HISTORY-*, FR-ONBOARD-01, FR-PAYWALL-01, NFR-COST-02, NFR-OBS-01).
  Root cause: (a) live wizard persists only on COMPLETION + paid-only (`api/tailor/generate/route.ts:285-303`);
  (b) migration 0004 unapplied in prod; (c) one-shot `/api/tailor` never persists.
  Fix (per decision): persist a PENDING row at generate START for ALL logged-in users, update on each
  step (status column: pending→complete/failed), read path opens to all logged-in users. Enforce the
  1-free-tailoring cap server-side (usage-counter, FR-ONBOARD-01/NFR-COST-02) so free users can't
  re-run. Cleanup for abandoned pending rows. New migration for status col + CHECK.
- **T3 [bug] GDPR export "export_failed"** (change `harden-account-export-ux`; caps: account/gdpr; NFR-GDPR-01/02, NFR-OBS-01, NFR-SEC-01).
  Root cause: PRIMARY env (CV_ENCRYPTION_KEY/DATABASE_URL unset in prod → 500 `export_failed`);
  plus code gaps — plain `<a href>` navigates to raw JSON on 500 (no in-page error), no per-profile
  decrypt resilience. Fix (code, env stays ops-blocked): fetch-based download + inline `exportError`
  i18n (ua+en) mirroring delete-profile 2-phase; per-profile decrypt try/catch → `rawText:null` +
  `decryptionFailed` flag (GDPR-graceful). Env set + `yarn db:migrate` remain ops.
- **T2 [rework] subscription plans** (change `rework-subscription-plans`; caps: billing/pricing, marketing-landing; FR-SALES-03, FR-PAYWALL-02, FR-BILLING-*, NFR-I18N-01, BC-BRAND-01).
  Add `ultra` tier across: entities/subscription Plan, payments PaymentsPlan+PAYMENTS_PLANS,
  subscription-repo SubscriptionPlan, DB CHECK (new migration), PAID_PLANS set, invoices
  PLAN_AMOUNT_USD (pro 12 / ultra 30 / job_hunt_pass 20), per-plan period (pass=14d). i18n: change
  `upgrade.planFeature` string→`string[]` (benefit bullets) + add `ultra` to every plan-keyed Record
  (ua+en). UI: UpgradePlans (3 paid, bullets `<ul>`), BillingPortal (benefit list on current plan +
  ultra renewal branch), landing Pricing (4 cards layout). Proposed NAMES + enemy-centric copy in the
  spec for review before wiring live (outward-facing). Fix pass price 19→20.
- **T4 [rework] premium upload zone** (change `gate-premium-upload-zone`; caps: upload-cv, paywall; FR-CV-01, FR-ONBOARD-01, FR-PAYWALL-01/02, NFR-SEC-04, BC-HONESTY-01).
  Interpretation (default): zone A = free resume-TEXT input + upload/parse button (`/api/cv/parse`
  stays UNGATED, FR-ONBOARD-01); zone B = the original-PDF-attach drop area, rendered blurred under a
  semi-transparent Premium banner for !paid. Split `UploadCvDropzone` into TextUploadZone +
  PremiumAttachZone. `paid` comes from the server (`tailor/page.tsx`→view). SECURITY: gate stays
  server-side in `api/tailor/generate` (attachmentAllowed default false, flipped only after
  hasPaidAccess) — CSS blur is cosmetic only; overlay also disables the input. New banner i18n (ua+en).
- **T5 [rework, FABLE 5] tailoring quality** (change `improve-tailoring-quality`; caps: checklist, wizard, cover-letter, resume-export[new]; FR-CHECKLIST-*, FR-BULLETS-*, FR-WIZARD-02, FR-COVERLETTER-*, FR-EXPORT-*, BC-HONESTY-*, TC-PURE-01, NFR-COST-01, NFR-PERF-02).
  Four defects (roots): (a) verbatim substring match + AND-aggregation + 0-credit gap in
  `shared/lib/scoring/checklist.ts`; inferred `careerStage` (loop.ts:257-270) never reaches the
  scorer; (b) skills-list-only → `overclaim-risk` for everyone; (c) `derive.ts` ELIGIBLE_STATUSES
  `{partial,gap}` over-asks; (d) deterministic bullet-reflow letter (`export-cover-letter/lib/build-document.ts`),
  dead LLM prompt; (e) ExportDocument model has only headline+bullets+footer.
  Fix (per decision): HEURISTICS now (thread careerStage into checklist; mid/senior skills-list =
  covered not overclaim; infer tenure from parsed dates for duration reqs; soften AND; derive.ts →
  gap-only, must-have-first; junior keeps strict rule; unknown seniority defaults strict). LLM
  coverage judge behind a FLAG (batched 1-call, cited evidence, CV+reqs only, extend
  GROUNDING_FORBIDDEN). Promote LLM cover letter with its own grounding verify + deterministic
  fallback; honesty-eval fixtures (user's example = target). Structured resume doc (extend
  normalizeCvText→sectioned, extend ExportDocument, merge kept bullets into roles, update pdf/docx
  renderers) — exports only grounded/kept content; contact PII included, untouched sections keep CV's
  original language.

Residual from prior 10-task batch: DONE; env/tooling/human items below unchanged.

## Remaining (all blocked on environment/tooling or a human review, no code)

1. **`perf-audit` (needs Chrome, unavailable here):** run Lighthouse on the landing for the T10
   regressions (heavier Cyrillic fonts + landing now dynamic `ƒ`) and T7 animations vs NFR-PERF-04.
   If LCP regresses, options: trim font weights/subsets further, or keep the root layout static and
   set `<html lang>` via middleware/client-effect so `/` re-prerenders.
2. **UA marketing-copy native review:** the Ukrainian landing copy (authored in `extract-landing-i18n`,
   now visible by default) needs a native marketing-voice pass. It is faithful but not team-reviewed.
3. **openspec archives (CLI not installed here):** archive in dependency order — `update-landing-flow`
   → `surface-premium-attach-landing`; plus `rework-app-header`, `add-tailoring-history`,
   `add-premium-pdf-attach`, `landing-animations`, `extract-landing-i18n`, `add-language-toggle`.
4. **Ops (T1 cleanup sweep):** the callable endpoint now EXISTS —
   `POST /api/maintenance/tailoring-cleanup` (auth: `Authorization: Bearer $MAINTENANCE_SECRET`) calls
   `markAbandonedPending(db, 30min)` and returns `{ swept: N }`. Remaining ops step: set
   `MAINTENANCE_SECRET` in prod env, then schedule the periodic invoker (Vercel Cron or external
   `curl -X POST … -H "Authorization: Bearer $MAINTENANCE_SECRET"`). Non-blocking; owner-scoped, no data risk.
   NOTE: `GET /api/tailoring` list+detail are now open to all logged-in users (matches the locked T1
   decision); the history PAGE still gates on `hasPaidAccess` (paywall stays at the view layer).
5. **Ops (task 3):** set prod env (`CV_ENCRYPTION_KEY`, `DATABASE_URL`, `AUTH_SECRET`,
   `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL`), run `yarn db:migrate`, redeploy.
6. **Live honesty-eval (needs `ANTHROPIC_API_KEY`):** tasks 1 + 5 (coverage judge, grounded cover
   letter, structured resume) generation-prompt changes. Deterministic proxies green; flip
   `COVERAGE_JUDGE` on only after live honesty-eval fixtures pass.
7. **T5 follow-up — per-bullet role provenance (resume export):** kept bullets currently attach to the
   most-recent parsed role because the `Bullet` model has no source-role tag. Add per-bullet role
   provenance to place each kept bullet under the role whose original bullet it rewrote, then restore
   the stricter resume-export spec scenario. Honest today (no fabrication), fidelity-only.
8. **T5 follow-up — server-side export honesty gate (defense-in-depth):** the pdf/docx export routes
   render client-authored section/bullet text verbatim after shape validation; the `includedInExport`
   gate is applied client-side in `buildExportDocument`. Accepted (self-authored resume, same boundary
   as the pre-existing flat path, documented in both route headers). Harden by rebuilding sections
   server-side from persisted kept-bullet texts + a server-parsed CvDocument so the gate is
   server-enforced (BC-HONESTY-02, NFR-SEC-04).

## Superseded plan / next steps (kept for context)

1. **Ops (task 3, no code):** once prod DB provisioned, set `CV_ENCRYPTION_KEY` + `DATABASE_URL`
   (+ `AUTH_SECRET`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL`), run `yarn db:migrate`, redeploy.
   Export decrypts (getRawText) so it 500s on an unset/rotated key even when delete works.
2. **Close task 6:** add a pglite integration test for migration 0004 + `persistTailoring`→`listByUser`
   round-trip (mirror the 0003 pattern).
3. **Archives (blocked on tooling):** `openspec archive` for tasks 4, 5, 6, 7 (CLI not installed here);
   tasks are authored/ticked. For task 7 also run `perf-audit`/Lighthouse when Chrome is available.
4. **Tasks 8 + 9 together (landing):** spec-first `marketing-landing` delta, then one `content.ts`
   pass: pain-first/enemy-centric hero, 5th "info/coverable" checklist state in the demo, sell cover
   letters + history + PDF attach, extract strings into `shared/lib/i18n` (ua+en). `perf-audit` after.
5. **Task 10:** wire Cyrillic fonts FIRST (the real blocker), then locale cookie + dynamic `<html lang>`
   + header `LanguageSwitch` + extract landing strings. Spec-first (`add-language-toggle`).

## Decision needed (task 1, user said "can be discussed")

Task 1 is implemented on the **deterministic** cover-letter path (grounded kept bullets reflowed to UA
prose, overclaim cannot leak). A richer grounded-LLM prompt is authored but inactive. **Question:**
keep the deterministic letter, or promote the LLM path (needs honesty-eval + `ANTHROPIC_API_KEY`)?

## Blockers / open questions

- **RESOLVED (2026-07-09, by `harden-agentic-loop`): the 2 pre-existing ExportDataButton reds are
  fixed.** `src/features/export-data-button/ui/ExportDataButton.test.tsx` used to fail 2
  (`TypeError: object.stream is not a function`) because jsdom's `Blob` has no `.stream()`. The new
  CI/typecheck+test gate surfaced it as a blocking red, so a `Blob.prototype.stream` polyfill
  (ReadableStream from blob bytes) was added to `vitest.setup.ts`. ExportDataButton now 12/12 green;
  full suite 1293 passed / 0 failed.
- **Prod env not set / DB not provisioned** (task 3 operational). `yarn db:migrate` must run against
  prod before history/GDPR work end to end.
- **Cyrillic fonts unwired** blocks task 10 (layout.tsx loads latin-only subsets).
- **`ANTHROPIC_API_KEY`** needed for live honesty-eval (tasks 1, 5); deterministic proxies green.
- **Stripe** gated on key rotation; only the emulator exists, hard-disabled in prod.
- **openspec CLI not installed** here, and **Chrome/Lighthouse unavailable**, so archives and
  `perf-audit` are deferred.
- **Archive ORDER matters:** `surface-premium-attach-landing` MODIFIES the "full export flow"
  requirement that is still ADDED-only in unarchived `update-landing-flow`. Archive
  `update-landing-flow` FIRST, then `surface-premium-attach-landing`, or `openspec validate` won't
  resolve the MODIFY target. (`landing-animations` is independent.)

## Prior context (see git log + archived changes)

- Archived: `add-tailoring-intelligence` (task 1), `add-resume-wizard`. Built: FSD foundation, two-pass
  honesty pipeline, auth (credentials), persistence (pg + AES-256-GCM CV at rest), payments emulator,
  security hardening, account/GDPR APIs, top-bar AccountMenu, landing (perf met).
- Open changes not archived: `rework-app-header` (4), `add-tailoring-history` (6),
  `add-premium-pdf-attach` (5), `landing-animations` (7, done + reviewed), `update-landing-flow` (8/9),
  `surface-premium-attach-landing` (8, done + reviewed; archive AFTER update-landing-flow),
  `extract-landing-i18n` (9, done + reviewed SHIP), `add-language-toggle` (10, done + reviewed),
  `add-payments-emulator`, `add-stripe-payments`, `harden-sentry-privacy`, `add-legal-pages`.
