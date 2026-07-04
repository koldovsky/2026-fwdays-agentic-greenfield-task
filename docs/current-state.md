# Current state

> Live handoff between agent sessions. Read first, update before finishing.
> Keep short — overwrite stale content, don't append endlessly.

**Updated:** 2026-07-04

## Last action

- **T5 premium PDF attach DONE (verified green), starting T7 animations (2026-07-04, ultracode).**
  T5 (`add-premium-pdf-attach`) §1-3 shipped across commits `b341245`..`ac90fad`: server-gated PDF
  attachment feeding the GENERATION pass only, grounding-isolation guard, attach control UI + new
  `PaywallReason="attach"`. Re-verified this session: **lint + build + 102 files / 635 tests all
  green.** §4.2/4.3 (live honesty-eval, openspec archive) remain sandbox-blocked (no `ANTHROPIC_API_KEY`,
  no openspec CLI).
- **Now implementing T7 (`landing-animations`, P2/L)** — the last spec-ready task. Picked over T10
  (language toggle) because T10 is blocked on a real font question (fonts are Bricolage+Hanken,
  latin-only subsets — Cyrillic support unconfirmed, may force a brand font swap = user decision).
  Plan below.

- **Prior context (see git log):** ECONNRESET P0 (`fcf39c5`), red-suite fix (`7babd9d`), latent build
  fix (`e134db0`), `db:migrate` runner (`73dd267`), landing rework T8+T9 (`583e150`).

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
| 5 | Premium PDF attach | **DONE** (§1-3, `b341245`..`ac90fad`); §4 archive/live-eval sandbox-blocked | L | P1 |
| 7 | Animations | **IN PROGRESS** — implementing `landing-animations` spec this session | L | P2 |
| 10 | Whole-app UA/EN toggle | **TODO** — infra only; **Cyrillic fonts unwired = blocker**; landing hardcoded EN | L | P2 |

## Working on

- **T7 `landing-animations` (P2/L) — implementing this session.** Spec-ready change
  `openspec/changes/landing-animations`. Restrained motion: scroll-reveal below the fold, LCP-safe
  hero entrance, CTA micro-interactions. Constraints: motion is `opacity`/`transform` only (CLS 0),
  reduced-motion fully disables it, must not regress the razor-thin LCP budget (NFR-PERF-04, ~20 ms
  margin). Plan below.

### Plan — T7 (landing-animations)

1. **Motion foundation** — `globals.css`: motion tokens (`--ease-out`, `--reveal-duration`,
   `--reveal-distance`) + `[data-reveal]` transition CSS + `[data-revealed="false"]` hidden state;
   extend the existing reduced-motion block to force revealed/visible. Mirror tokens in
   `docs/vouch-design-system/tokens/motion.css` + DESIGN.md note (sync rule).
2. **Reveal primitive** — new `shared/ui/reveal` client slice: polymorphic `as`, `delay`, and a
   `fade` prop (default true; `fade={false}` = transform-only, keeps LCP element painted). SSR-visible
   default (`revealed` starts true → paints visible without JS); `useLayoutEffect` hides then an
   IntersectionObserver reveals once; `matchMedia` reduced-motion guard stays visible. Unit tests.
3. **Wire landing** — Reveal (fade) on below-fold sections (Pillars, BeforeAfter, ChecklistPreview,
   HowItWorks, Pricing, Faq, FinalCta); hero entrance uses `fade={false}` so the LCP headline never
   goes to opacity 0.
4. **CTA micro-interactions** — Button: add ghost hover + restrained hover transition on primary;
   keep `:focus-visible` halo (NFR-A11Y-01). Existing `active:scale-[0.97]` press stays.
5. **Verify** — lint + build + test (add Reveal tests). `perf-audit`/Lighthouse **deferred** (no
   Chrome in sandbox) — CLS-0 guaranteed by construction (opacity/transform only), LCP protected by
   the `fade={false}` hero. Then multi-dimension adversarial review workflow → fix findings → commit
   per unit → archive (openspec CLI unavailable, tick tasks).

### T5 — DONE (context)

Change `add-premium-pdf-attach` §1-3 shipped (`b341245`..`ac90fad`): server-gated PDF into the
generation pass only, grounding-isolation guard, attach UI + `PaywallReason="attach"`. §4.2 live
honesty-eval + §4.3 archive remain sandbox-blocked. **D1 was resolved request-scoped** (no at-rest
storage); §5 (encrypted `pdf_binary` persistence) deferred to a future change if history re-open is
wanted.

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
