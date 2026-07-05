# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short, overwrite stale content, don't append endlessly.

**Updated:** 2026-07-05

## Last action

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
| 10 | Whole-app UA/EN toggle | **TODO** — landing now i18n-ready (renders en); **Cyrillic fonts = the remaining blocker** | P2 |

## Working on

- **T10 whole-app UA/EN toggle — IN PROGRESS 2026-07-05 (ultracode).** User chose the Cyrillic
  font swap: **Unbounded (display) + Golos Text (body)**, replacing Bricolage + Hanken app-wide, both
  with cyrillic subsets. Spec-first change `add-language-toggle`. Plan below.

### Plan — T10 add-language-toggle

Note: the app views (account/history/auth/checkout) already default `locale="ua"`, so they render
Ukrainian today but in a latin-only fallback font (broken Cyrillic). The font swap fixes that
immediately; the landing is the only surface pinned to `"en"`.

1. **Spec-first:** `add-language-toggle` change (NFR-I18N-01, BC-BRAND-01, NFR-PERF-04). Modifies
   design-system (font tokens) + app-shell (locale resolution + switch).
2. **Phase 1 — fonts:** `layout.tsx` swap to `Unbounded` + `Golos_Text`, `subsets:["latin","cyrillic"]`;
   repoint `globals.css` `@theme` `--font-display`/`--font-body`/`--font-sans`; DESIGN.md + tokens sync.
   PERF: font payload grows (Cyrillic + a display face) against the ~20ms LCP margin, unmeasurable in
   sandbox (no Chrome) — flag for perf-audit before prod.
3. **Phase 2 — locale infra:** a `locale` cookie helper (server read + a client setter), resolve
   locale in the root layout for `<html lang>` (dynamic), and a `LanguageSwitch` in the top bar that
   sets the cookie + refreshes. Default stays Ukrainian-first (t() default ua).
4. **Phase 3 — flip call sites:** resolve the cookie locale in each page and pass to its view; flip
   the landing off the pinned `"en"` to the resolved locale. UA copy still pending native review.
5. **Verify:** lint + build + test (LanguageSwitch + cookie-helper tests); adversarial review → fix →
   commit per phase. perf-audit deferred (no Chrome).

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
  `extract-landing-i18n` (9, done + reviewed SHIP), `add-payments-emulator`, `add-stripe-payments`,
  `harden-sentry-privacy`, `add-legal-pages`.
