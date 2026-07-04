# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short, overwrite stale content, don't append endlessly.

**Updated:** 2026-07-05

## Last action

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
| 6 | Tailoring history | **DONE (E2E green)**; 0004 integ-test + archive pending | P2 |
| 7 | Landing animations | **DONE** (`fe65f2f` + review fixes `f638efe`); Lighthouse + archive pending | P2 |
| 8 | Landing → new flow (cover letter / info tag / attach / history) | **TODO** (deps 1,5,6) | P1 |
| 9 | Landing marketing/copy (enemy-centric) | **PARTIAL** (no pain-first hero, i18n debt) | P2 |
| 10 | Whole-app UA/EN toggle | **TODO**; **Cyrillic fonts unwired = blocker** | P2 |

## Working on

- **Surfacing shipped premium PDF-attach on the landing (completes T8's last gap), 2026-07-05.**
  Discovery: T8/T9 are already largely DONE via the `update-landing-flow` change (5-status demo incl.
  blue "coverable", cover-letter + history in how-it-works/FAQ, problem-first hero). Task 6's 0004
  integration test also already exists and is green (`persistence.integration.test.ts`, 6 tests). The
  ONE real T8 gap: PDF-attach (T5) shipped but is not on the landing; `update-landing-flow` §3.1
  explicitly guarded it out while T5 was unbuilt. Now unblocked.

### Plan — surface premium PDF-attach (new change `surface-premium-attach-landing`)

1. **Spec-first:** new openspec change; delta MODIFIES marketing-landing "full export flow" requirement
   to represent the original-PDF input as a shipped Pro capability, and supersedes the now-false
   scenario line ("no unbuilt PDF attach advertised"). Honest framing: PDF enriches the GENERATION
   source only, never grounding; still no fabrication (BC-HONESTY-01).
2. **content.ts:** add PDF-attach to the Pro plan features; add a FAQ item (enemy framing: extracted
   text loses your document; Pro reads your full original PDF, still grounded).
3. **Verify:** lint + build + test. `perf-audit` deferred (no Chrome). checker subagent review → fix.
4. **Commit** per unit; tick tasks (openspec archive CLI-blocked).

### Deferred (next, larger) — landing i18n extraction

~90 landing strings are hardcoded EN in `content.ts` + a few inline in FinalCta/Footer; the i18n
`Dictionary` has no `landing` block. Extracting to `shared/lib/i18n` (ua+en) is L-effort and pairs
naturally with T10 (blocked on unwired Cyrillic fonts). Kept as its own change to avoid a huge diff and
to let the user steer the Ukrainian marketing voice. NOT started.

## Next steps (ranked: fastest x most critical)

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
- **openspec CLI not installed** here, and **Chrome/Lighthouse unavailable**, so archives (4/5/6/7)
  and `perf-audit` are deferred.

## Prior context (see git log + archived changes)

- Archived: `add-tailoring-intelligence` (task 1), `add-resume-wizard`. Built: FSD foundation, two-pass
  honesty pipeline, auth (credentials), persistence (pg + AES-256-GCM CV at rest), payments emulator,
  security hardening, account/GDPR APIs, top-bar AccountMenu, landing (perf met).
- Open changes not archived: `rework-app-header` (4), `add-tailoring-history` (6),
  `add-premium-pdf-attach` (5), `landing-animations` (7, done + reviewed), `add-payments-emulator`,
  `add-stripe-payments`, `harden-sentry-privacy`, `add-legal-pages`.
