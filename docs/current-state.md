# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short, overwrite stale content, don't append endlessly.

**Updated:** 2026-07-06

## Last action

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

**NEW 6-task batch — IMPLEMENTATION phase.** Specs committed (`a36aa97`). Per-task plan below.
Implement order: **T6 ✅ → T1 ✅ → T3 ✅ → T2 (next) → T4 → T5**. Each task = maker → test-author →
checker subagent → verifier → commit → update this doc. Task 5 runs on Fable 5.

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
4. **Ops (T1 cleanup sweep):** `markAbandonedPending(db, olderThanMs)` ships in
   `shared/lib/db/tailoring-cleanup.ts` but has NO wired invoker. Wire a cron/route or run it as a
   periodic maintenance job so abandoned `pending` rows (which consume a free user's lifetime slot,
   intended non-refund) get swept (default TTL 30 min). Non-blocking; owner-scoped, no data risk.
   NOTE: `GET /api/tailoring` list+detail are now open to all logged-in users (matches the locked T1
   decision); the history PAGE still gates on `hasPaidAccess` (paywall stays at the view layer).
5. **Ops (task 3):** set prod env (`CV_ENCRYPTION_KEY`, `DATABASE_URL`, `AUTH_SECRET`,
   `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SITE_URL`), run `yarn db:migrate`, redeploy.
5. **Live honesty-eval (needs `ANTHROPIC_API_KEY`):** tasks 1 + 5 generation-prompt changes.

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
