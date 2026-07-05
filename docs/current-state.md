# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short, overwrite stale content, don't append endlessly.

**Updated:** 2026-07-05

## Last action

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

- Nothing in flight. Tree clean. **All 10 batch tasks are DONE.** What remains is
  environment-blocked (see below), not implementation.

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
4. **Ops (task 3):** set prod env (`CV_ENCRYPTION_KEY`, `DATABASE_URL`, `AUTH_SECRET`,
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
