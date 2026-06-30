# Current state — agent handoff

> Living log of the last agent session. Update at the end of every meaningful run.
> Sources of truth: [product-brief.md](product-brief.md), [requirements.md](requirements.md) (Stage 2, pending),
> and [docs/adr/](adr/).

## Last updated

`2026-07-01T02:20:00+03:00` (Europe/Kyiv)

## Phase

**Stage 11 — QA proof pack: COMPLETE (CHECKLIST G6, items 1-2).** Stage 10
(global two-checker review) committed as `c7766d7`. Next: Stage 12 (PR
preparation), Stage 13 (recorded demo — G6 item 3, the automated headless
recordings, lives here too; shot list already written this stage).

## Last action

**Stage 11 — QA proof pack, not yet committed:**

Wrote all five CHECKLIST G6 deliverables, each built from re-verified
evidence (re-grepped/re-read the actual code while writing, not copied from
memory of earlier stages):

1. **[`docs/qa/traceability-matrix.md`](qa/traceability-matrix.md)** — every
   FR/NFR/TC/BC mapped to spec → implementation → unit test → e2e/eval
   evidence. Three cross-cutting claims (`TC-PURE-01`, `TC-DATA-01`,
   `BC-PRIVACY-01`) were independently re-grepped while writing this rather
   than carried forward — confirmed still accurate (one near-miss: `RatesView.tsx`
   imports a *type* from `lib/nbu/fetchTodayRates`, not the function itself,
   so `TC-DATA-01` still holds).
2. **[`docs/qa/manual-test-plan.md`](qa/manual-test-plan.md)** — 10
   non-developer-executable browser tests covering every FR, including a
   DevTools-offline procedure to manually trigger and verify both failure
   states (rates list and history chart) and their retry buttons.
3. **[`docs/qa/demo-script.md`](qa/demo-script.md)** — a ~90s narrated
   walkthrough script for the course-submission recording, plus a 12-clip
   shot list (incl. 2 explicit empty/error clips) for Stage 13's automated
   headless recordings, each clip naming exactly which FRs it must assert
   before the recording is considered valid.
4. **[`docs/qa/risk-register.md`](qa/risk-register.md)** — consolidated
   every risk/trade-off logged across all 8 per-slice reviews + both global
   checker passes. Re-checked each one against current code: 8 were already
   Resolved (mostly by Stage 8/9/10 fixes) and are recorded as such rather
   than left stale as "open"; the rest sorted into accepted trade-offs vs.
   process risks, each with a severity and mitigation. **No High-severity
   risk is currently open.**
5. **[`docs/qa/acceptance-report.md`](qa/acceptance-report.md)** — formal
   gate-by-gate status against `CHECKLIST.md`, current test results
   (122/122 unit, 14/14 e2e), and the eval-report review CHECKLIST G6 itself
   calls for: read `docs/qa/eval-report.md` in full and confirmed **9/9
   scopes (8 slices + the global pass) are PASS, zero FAILs anywhere**,
   lowest individual dimension 80/100 (the exact finding Stage 10 already
   fixed). Signs off the project as ready for Stage 12.

CHECKLIST G6 items 1-2 ticked; item 3 (recordings) explicitly left for
Stage 13, now that its shot list exists.

### Prior

## Last action

**Stage 10 — global two-checker review, committed as `c7766d7`:**

Dispatched both checkers as genuinely independent fresh subagents (no memory
of building this app — Claude Code's project-local `kurs-reviewer`/
`kurs-eval-judge` agent types aren't registered as dispatchable subagent
types in this environment, so their role definitions from
`.claude/agents/*.md` were embedded directly into two `general-purpose`
subagent prompts instead; same independence, different plumbing). Both were
told explicitly to read `docs/qa/global-review.md` (the maker's own
self-review) for context but **not** to trust or rubber-stamp it.

1. **Checker #1 (spec/correctness) — CLEAN.** Independently confirmed all 25
   MVP FRs + FR-SAYINGS-01 actually implemented (not just traced), `lib/`
   framework-free and total, no 500/blank/silent-failure path, `BC-HONESTY-01`
   honoured, ran `npm run verify`/`test:run`/`test:e2e` itself rather than
   trusting docs. 3 non-blocking suggestions, one of which —
   `CurrencyRow.tsx`/`CurrencyFocusPanel.tsx` duplicating the same
   `toLocaleString` options inline — pointed at the same code Checker #2
   found a real bug in.
2. **Checker #2 (quality) — PASS 91/100.** No automatic-fail conditions
   anywhere (zero exclamation marks across all `uk.ts` strings + 12 sayings,
   no fake "today", no `NaN`/raw errors, no toasts). Weakest dimension:
   **number-formatting consistency, 80/100** — found a genuine cross-slice
   defect invisible to any single slice's eval case: the converter's
   "1 USD = X" line was hard-capped to 2 decimals via `formatAmount()`,
   while the currency list / focus panel / history tooltip all showed up to
   4 — for small-rate currencies (JPY, 0.27749) this wasn't cosmetic, it
   silently showed a **different rounded number** for the same currency on
   the same screen. The maker's self-review had logged this as an accepted
   "Decision 5" trade-off; the checker re-derived it as a real defect by
   working through the actual rounding math, not by accepting the prior
   label. Secondary finding: the history-fetch error state had no retry
   button, unlike the sibling rates-fetch error.
3. **Both confirmed findings fixed:**
   - Added `lib/currency/formatRate.ts` (tests-first, RED→GREEN, 5
     assertions) — the single source of truth for displaying an official
     rate (2-4 decimals), distinct from `formatAmount` (fixed 2 decimals,
     correct as-is for *converted* money amounts). Wired into
     `CurrencyRow.tsx`, `CurrencyFocusPanel.tsx`, `HistoryChart.tsx`'s
     tooltip, and — the actual bug — `Converter.jsx`'s rate-quote line.
     Live-verified: JPY now shows `0,2758` identically in the list, the
     focus-panel hero number, and the converter's `1 JPY = 0,2758 ₴` line
     (previously the last one alone showed `0,28`).
   - Added a retry button to `CurrencyHistory.tsx`'s error state
     (`uk.history.retry`, mirroring `RatesView`'s existing rates-retry
     pattern exactly). Required restructuring the fetch into a
     `useCallback` so the initial-load effect and the retry handler share
     one fetch function without the effect synchronously calling `setState`
     (`react-hooks/set-state-in-effect`). Live-verified by patching
     `window.fetch` to force a history failure, confirming the button
     renders, then restoring `fetch` and confirming the click recovers to
     the chart/trend-hint state correctly.
   - Also fixed Checker #1's trivial suggestion: added a missing `@trace`
     line to `convertFlow.integration.test.ts`.
4. **122/122 unit tests** (up from 117 — 5 new `formatRate` tests), **14/14
   e2e**, lint clean, `npm run verify` green — re-confirmed after all fixes,
   not assumed safe.

### Prior

## Last action

**Stage 9 — global maker self-review, committed as `f8b4610`:**

Wrote `docs/qa/global-review.md` — a maker self-audit of the whole app (all
8 slices + Stage 8 hardening) before handing off to Stage 10's independent
two-checker review. Re-checked all eight per-slice `review-findings.md`
"Suggestions (non-blocking)" sections against the current code (not just
copied) and sorted them: already-resolved, accepted trade-off, or still
genuinely open. Found two were stale (already fixed by earlier commits) and
**fixed one more live**: the search `Input` in `RatesView.tsx` had no
`aria-label` (placeholder-only accessible name) — same defect class Stage 8
fixed for the converter's amount field. Added
`aria-label={uk.picker.placeholder}`; re-ran the full suite after the change
(117/117 unit, 14/14 e2e, lint clean, `npm run verify` green) — not assumed
safe just because the change looked small. CHECKLIST G4's per-slice items
(previously template-unticked even though satisfied 8 times over) and G1/G3's
human checkpoints (ticked by the user directly) are now reflected as done.

### Prior

## Last action

**Stage 8 — cross-cutting hardening (G5), now committed as `2a35934`:**

1. **Integration test:** `lib/currency/convertFlow.integration.test.ts` — composes
   `mapNbuRates` + `parseAmount`/`convert`/`formatAmount` end-to-end without
   mocking any step (6 cases: locale-aware conversion both directions,
   malformed-NBU-entries-never-reach-the-converter, garbage-input degrades to
   `0,00`, floating-point round-trip). 6/6 green first run.
2. **Playwright + axe installed:** `@playwright/test`, `@axe-core/playwright`;
   `playwright.config.ts` runs headless Chromium against a real `next dev`
   server on port 3100, hitting **live NBU** (no mocking, consistent with
   every other slice's verification). `npm run test:e2e` added.
3. **`e2e/core-flow.spec.ts`** (5 tests), **`e2e/responsive.spec.ts`** (4 tests,
   measures actual `grid-template-columns` track counts — not a screenshot
   eyeball), **`e2e/a11y.spec.ts`** (5 tests, `@axe-core/playwright` WCAG 2 A+AA
   in both themes, plus a differential focus-ring check).
4. **The a11y pass found and fixed three real, pre-existing defects** (not test
   artifacts — axe ran against the actual app and failed on first try):
   - Light-theme `--text-muted`/`--text-faint` contrast (down to 2.63:1 on
     the `footer-sayings` saying text) — retuned both tokens in
     `app/styles/tokens/colors.css` to the minimum darkening that clears
     4.5:1, computed via the real WCAG relative-luminance formula.
   - Dark-theme `--text-faint` (4.22:1) and `AsOfBadge`'s stale-badge text
     hardcoding the light-tuned `--brass-600` with no dark variant
     (2.5:1) — added a new theme-aware `--accent-strong` semantic alias and
     fixed both `AsOfBadge.jsx` and the unused `Badge.jsx` `accent` tone.
   - **Critical:** the converter's amount `<input>` had no accessible name
     (its visual `<label>` wasn't linked via `htmlFor`/`id`) — added a
     dynamic `aria-label` to the `Input` call in `Converter.jsx`.
   None of these were caught during Stage 5's per-slice reviews — no
   automated a11y scan existed before this stage; exactly the gap closed here.
5. **14/14 e2e green, 117/117 unit tests green** (Vitest config now excludes
   `e2e/**` so it doesn't try to run Playwright specs), lint clean,
   `npm run verify` green.
6. **CI wired:** `.github/workflows/ci.yml` installs Chromium and runs
   `npm run test:e2e` after the build step; uploads the HTML report as an
   artifact on failure.
7. **`docs/qa/automated-verification-latest.md`** written — full command/result
   table + the three defects found and fixed.

### Prior

## Last action

**`footer-sayings` slice — closes Stage 5:**

1. **Propose:** `openspec/changes/add-footer-sayings/` — the one real design
   call: `AppFooter` is reached through `RatesView`'s (`"use client"`) render
   tree, so it is **not** a safe place to call `new Date()` directly (same
   hydration-mismatch class `isStaleRate` already had to avoid in
   `currency-list`). Resolved by computing the saying once in `app/page.tsx`
   (the true Server Component boundary) and threading it as a plain prop
   through `RatesView` → `AppShell` → `AppFooter` — exactly the established
   `initialStale` pattern. `openspec validate --strict` green.
2. **kurs-maker (tests-first):** extended `kyivDate.ts` with `kyivDayOfYear`
   (shares the existing `kyivParts` helper; all 14 pre-existing kyivDate tests
   re-ran unmodified). Wrote a 12-entry Ukrainian money-saying corpus
   (`lib/sayings/sayings.ts`) and a pure `selectSaying` (day-of-year modulo
   corpus length). 13 new assertions, all red-before-green.
3. **Live verification:** independently cross-checked the live-rendered
   saying against a from-scratch Node day-of-year calculation (exact match);
   reloaded the page and confirmed byte-identical text (determinism); read
   the console and confirmed the one hydration warning present is the
   *same pre-existing browser-extension noise* already documented for prior
   slices — not caused by this slice's new prop threading (visible passing
   correctly in the warning's own component stack).
4. **kurs-reviewer (Checker #1):** **CLEAN.**
5. **kurs-eval-judge (Checker #2):** **PASS 95/100** — calm-dry-tone 96,
   money-relevance 94, determinism 96.
6. **Archived:** `openspec/changes/archive/2026-06-30-add-footer-sayings/` (`--skip-specs`).

### Prior

## Last action

**`trend-hint` slice — full loop run, reusing already-fetched data, no new NBU call:**

1. **Propose:** `openspec/changes/add-trend-hint/` — key design call: the spec's
   example sentence uses the declined Ukrainian currency name («Долар…
   зміцнів»), which would need a full gender/case declension table across ~45
   currencies to do correctly. Used the **ISO code as the sentence subject**
   instead («USD за тиждень зміцнів…») — sidesteps the grammar problem
   entirely, consistent with the existing "codes stay Latin" rule, and the
   spec only asks for a sentence "like" the example, not byte-exact.
   Documented as design.md Decision 1, not silently simplified.
2. **kurs-maker (tests-first):** `lib/currency/weeklyMove.ts` (8-point lookback,
   `null` on insufficient history or a zero comparison rate — never divides by
   zero) and `lib/currency/trendSentence.ts` (pure, reads `uk.trend.*`), both
   red-before-green (11 new assertions). Reused the vendored `trendTone` —
   genuinely imported from `@/components/ds` at the **component** layer
   (`TrendHint.tsx`), not duplicated into `lib/`, since `lib/` must stay
   import-clean of `react` even though `trendTone` itself is pure. Wired
   `TrendHint` into `CurrencyHistory`'s existing `ready` branch — no parallel
   fetch, no new loading/error states.
3. **Live verification — most thorough this session:** exercised all
   **three** tone branches against **real live NBU data** (not picked
   fixtures): scanned ~30 currencies via curl + a small Node script to find
   genuine up/down/flat examples, then drove a real Chrome browser to each.
   `EGP` → up («…зміцнів на 0,92%…», colour `#236B46`/`--up-deep`); `XDR`/`XAG`
   → down («…послабшав…», `#934531`/`--down-deep`); `LBP` (move = exactly
   0.000%) → flat («…майже без змін…», `#605949`/`--flat-deep`). Confirmed via
   direct DOM query (`data-tone` + computed colour), not just a screenshot.
4. **kurs-reviewer (Checker #1):** **CLEAN** — review *confirmed* correctness
   the maker's own live testing had already established, rather than finding
   new defects (a first this session). 2 minor non-blocking suggestions.
5. **kurs-eval-judge (Checker #2):** **PASS 98/100** — calm-phrasing 98,
   correct-direction-wording 100, number-then-detail 96 (the one deduction is
   the accepted code-as-subject trade-off, not a flaw).
6. **Archived:** `openspec/changes/archive/2026-06-30-add-trend-hint/` (`--skip-specs`).

### Prior

## Last action

**Two user-reported bugs, fixed and live-verified via real Chrome browser
automation (Claude in Chrome) — first time this session a bug was diagnosed
with an actual browser, not just code reading or curl:**

1. **Switching currency left the old converter visible alongside the new
   one.** Root cause (found via browser console): React's `"Encountered two
   children with the same key"` — `CurrencyFocusPanel.tsx` gave `<Converter>`
   and `<CurrencyHistory>` the **same key** (`rate.code`) as siblings under one
   parent `<div>`. React requires key uniqueness across *all* siblings, not
   just within same-component groups — colliding keys is unsupported behaviour
   and manifested exactly as the report described (stale child persisting).
   **Fix:** prefixed keys (`converter-${code}` / `history-${code}`).
2. **Chart's last X-axis label ("30.06") was clipped.** `AreaChart`'s 8px right
   margin left no room for the last tick's text. **Fix:** `HistoryChart.tsx` —
   16px right margin, `XAxis padding={{left:12,right:12}}`,
   `interval="preserveStartEnd"`.

Both verified precisely (not just visually): console clean of duplicate-key
warnings after the fix; the `30.06` tick's DOM bounding box measured at 476px
right-edge inside a 487px SVG (11px to spare). 86/86 tests, `npm run verify`
green. Documented as a "Post-commit bug fix" entry in
[review-findings.md](qa/review-findings.md) (proportional weight — not a full
slice review, since no new requirement or pure-logic module was involved).

### Prior

## Last action

**`rate-history` slice — full loop run, with a real architectural decision and a
real bug caught mid-review:**

1. **Architecture call before proposing:** the baseline plan (ADR-0001/DESIGN.md)
   assumed Recharts via the vendored `window.Recharts` UMD global, matching
   `RateChart.jsx`. Investigating it surfaced a real risk: Recharts' UMD bundle
   needs `window.React`/`window.ReactDOM` as externals, which would mean **two
   separate React instances** touching the same component tree (Next's bundled
   React reconciling `<AreaChart>` while its internal hooks run against a global
   UMD React) — the classic cause of invalid-hook-call bugs. Recorded as
   **[ADR-0004](docs/adr/ADR-0004-recharts-npm-not-umd.md)**: install `recharts`
   as a real npm dependency, write `HistoryChart.tsx` with normal ESM imports,
   visually matching the vendored design but never touching `window.Recharts`.
   This **supersedes** the "UMD global" clause of `TC-CHART-01` in ADR-0001 —
   the library choice (Recharts) is unchanged, only the delivery mechanism.
2. **Propose:** `openspec/changes/add-rate-history/` — re-verified the range
   endpoint live (fresh probe, not relying on the months-old ADR-0002 capture);
   confirmed weekend/holiday carry-over duplicates are real and should be
   **kept**, not de-duplicated, in a chart (honest representation of an
   unchanged published rate) — different resolution from `currency-list`'s
   single "as of" badge, where the same carry-over data needed staleness
   labelling instead. `openspec validate --strict` green.
3. **kurs-maker (tests-first):** extended `kyivDate.ts` (`kyivYmd`, `addKyivDays`
   — shared the existing `kyivParts` helper; original `kyivDateString`/
   `isStaleRate` tests untouched and still pass) → `historyWindow.ts` →
   `mapHistory.ts` → `fetchHistory.ts`, each red-before-green (26 new
   assertions). Built `app/api/history/route.ts`, `HistoryChart.tsx` (real
   `recharts`), `CurrencyHistory.tsx` (loading/empty/error state machine, keyed
   by `rate.code` like `Converter` — no manual cache needed). Lint caught a real
   `react-hooks/static-components` violation (inline `<Tip />` JSX-per-render)
   in my own new code — fixed by hoisting to module scope. **Live-tested**
   `next dev` + `/api/history?code=USD` → exact 30-point ascending series with
   real carry-over duplicates preserved.
4. **kurs-reviewer (Checker #1) — found and fixed a real bug:** `fetchHistory.ts`
   collapsed a genuinely-empty result into `{ok:false}`, making `CurrencyHistory`'s
   "empty" UI branch **unreachable** — directly contradicting FR-HISTORY-03's
   requirement for *distinct* empty vs. error scenarios. Live-probed NBU for an
   unsupported code (`ZZZ`) and confirmed it returns HTTP 200 + `[]`, identical
   to a genuinely-empty window — so collapsing it into "fetch failed" was
   actively misleading. Fixed: `fetchHistory` now returns `{ok:true, points:[]}`
   for a successful-but-empty response; `{ok:false}` reserved for real I/O
   failure. Test updated and re-verified live. Verdict: **CLEAN (after fix)**.
5. **kurs-eval-judge (Checker #2):** **PASS 94/100** — chart-readability 93,
   honest-y-domain 95, calm-empty-error 96 (explicitly noting this only passes
   because Checker #1's fix landed first), loading-never-blank 94.
6. **Archived:** `openspec/changes/archive/2026-06-30-add-rate-history/` (`--skip-specs`).

### Prior

## Last action

**`currency-picker` slice — full loop run:**

1. **Propose:** `openspec/changes/add-currency-picker/` — key call: do **not** reuse
   the vendored `@/components/ds` `CurrencyPicker` (it composes `RateRow`, which forces
   the same fabricated trend pill avoided in `currency-list`, and hardcodes non-spec
   wording). Reused the already-built `CurrencyRow` instead; filter lives directly in
   `RatesView` (no new wrapper component — nothing to encapsulate beyond the pure
   function). `openspec validate add-currency-picker --strict` green.
2. **kurs-maker (tests-first):** `lib/currency/filterRates.test.ts` (7 tests) written
   first, confirmed **RED**, then `filterRates.ts` (pure, total, case-insensitive
   substring on code or name) — **GREEN**. Added `uk.picker.*` (placeholder + the
   exact spec wording «Нічого не знайдено», locked in `uk.test.ts`). Wired a search
   `Input` + `showEmpty` branch into `RatesView`; `AsOfBadge` deliberately kept outside
   the empty-result conditional so it never disappears. 60/60 tests, `npm run verify`
   green; live build confirms the placeholder string renders.
3. **kurs-reviewer (Checker #1):** **CLEAN.** Verified (not just assumed) that selection
   persists when the selected row is filtered out of view — `activeRate` reads the full
   list, not the filtered one — confirmed deliberate via design.md, not an oversight.
   2 non-blocking suggestions (pre-existing `Input` a11y pattern, no new regression; no
   Unicode normalisation in the filter, low-risk for the fixed NBU name set).
4. **kurs-eval-judge (Checker #2):** **PASS 97/100** — filter-correctness 97,
   empty-result-calm 98, selection-still-works 96.
5. **Archived:** `openspec/changes/archive/2026-06-30-add-currency-picker/` (`--skip-specs`).

### Prior

**`/review-slice converter`** — both checkers clean:
- **kurs-reviewer:** CLEAN (all five spec scenarios pass; 52/52 tests; verify green).
- **kurs-eval-judge:** PASS (95/100 weighted; no automatic fails).
- Archived `add-converter` → `openspec/changes/archive/2026-06-30-add-converter/`
  (`--skip-specs` — baseline `openspec/specs/converter/spec.md` already matched delta).
- QA reports: `docs/qa/review-findings.md`, `docs/qa/eval-report.md`.

**Post-review manual fixes (visual issues spotted by eye, applied directly — no new
OpenSpec change, folded into this slice's commit):**
- **Sticky focus column:** `AppShell.tsx` right section gets `shell-main__column--sticky`;
  CSS scoped to the ≥1100px breakpoint (`position: sticky; top: calc(68px + var(--space-4))`)
  so the converter stays in view while a long rates list scrolls.
- **Input focus ring:** `components/ds/core/Input.jsx` no longer swaps border colour to
  brand on focus (was doubling up with the box-shadow ring); `base.css`'s global
  `:focus-visible` rule no longer targets `input` either (the only raw `<input>` in the
  app is this component, which manages its own ring on the wrapper — confirmed no other
  element relied on the removed selector).
- **Hydration warning:** `<body>` now also has `suppressHydrationWarning` (was only on
  `<html>`). Root cause was browser-extension-injected attributes (`cz-shortcut-listen`,
  `bis_register`) landing on `<body>` before hydration — not an app bug; this is the
  standard Next.js mitigation for that exact false positive.
- Re-verified after the fixes: `npm run verify` green, 52/52 tests, sticky class confirmed
  present in the built static HTML.

## Status

- **Working:** the full product — app shell, theme toggle, centralised i18n, live NBU
  currency list with selection/stale labelling/error recovery, a bidirectional UAH ⇄
  active-currency converter, a code/name filter, a real ~30-day rate-history chart with
  honest loading/empty/error states, a calm 7-day trend sentence, and a deterministic
  daily footer saying. **All 25 MVP FRs + the 1 Future FR are implemented and
  cross-cutting-hardened (Stage 8 / CHECKLIST G5 complete).**
- **Done (slices):** all 8 — `app-shell`, `i18n`, `currency-list`, `converter`,
  `currency-picker`, `rate-history`, `trend-hint`, `footer-sayings` — all archived
  **and committed** (`54290cf`, `b1d6f34`, `9bd6c96`, `2ccb87b`, `77210b8`, `b191b8b`,
  bugfix `8b63d1f`, `395e992`, `1981e1e`). Stage 8 hardening committed as `2a35934`;
  Stage 9 self-review committed as `f8b4610`; Stage 10 global review + fixes committed
  as `c7766d7`.
- **In progress:** Stage 11 (5 QA proof-pack docs under `docs/qa/`) is complete and
  verified but **not yet committed**.
- **Blocked:** —

## Next steps

1. **Commit** Stage 11 (the 5 QA proof-pack documents + the two CHECKLIST G6 ticks).
2. **Reload the session** so `kurs-maker`/`kurs-reviewer`/`kurs-eval-judge` register as
   real isolated Task-tool subagents (the Stage 10 global review used embedded-prompt
   `general-purpose` subagents instead, since the project-local agent types aren't
   dispatchable as named subagent types in this environment — same independence,
   different plumbing; worth re-checking after a session reload).
3. **Stage 11 is complete (CHECKLIST G6 items 1-2 ticked). Move to Stage 12+:**
   - Stage 12 — PR preparation. `docs/technical/*` and a README usage section are
     still outstanding (CHECKLIST G7's remaining items) — fold into this stage.
   - Stage 13 — the automated headless demo recordings (CHECKLIST G6 item 3 — shot
     list is ready in `docs/qa/demo-script.md`, not yet implemented) + the 1-2 min
     narrated walkthrough for the course submission (script also ready). A genuine
     **vision check** of the rendered UI (axe catches WCAG-detectable issues only, not
     visual/layout defects) belongs here too — flagged since `rate-history`, still owed.

## Notes / decisions

- **`lib/currency/`** now covers the full domain: `parseAmount`, `convert`,
  `formatAmount`, `filterRates`, **`weeklyMove`**, **`trendSentence`** — all pure,
  total, colocated tests (104 total unit tests across the project).
- **`trendTone` (vendored, pure) is reused at the component layer, never duplicated
  or imported into `lib/`** — `lib/` must stay literally `react`-import-free
  (`TC-PURE-01`) even though the specific function never touches React at runtime;
  `TrendHint.tsx` is where the impure-file boundary is crossed, same pattern as
  `CurrencyAvatar`/`AsOfBadge`/`Input`/`Converter`.
- **Trend sentences use the ISO code as subject, not the declined Ukrainian currency
  name** — a deliberate, documented scope cut (a full Ukrainian gender/case declension
  table across ~45 currencies was judged disproportionate for one sentence). See
  `openspec/changes/archive/2026-06-30-add-trend-hint/design.md` Decision 1.
- **Live-verified all three trend tones against real NBU data** (not picked fixtures):
  scanned ~30 currencies via script to find genuine up/down/flat examples, confirmed
  exact `--trend-{up,down,flat}-deep` token colours via DOM query.

- **`lib/currency/`** established: `parseAmount`, `convert`, `formatAmount`, `filterRates`
  — all pure, total, colocated tests.
- **`lib/nbu/`** now covers both NBU shapes: `mapRates.ts` (today endpoint) and
  **`mapHistory.ts`** (range endpoint — different fields: `units`/`rate_per_unit`/
  `calcdate`, none of which the chart needs). `kyivDate.ts` extended with `kyivYmd`/
  `addKyivDays` (UTC-anchored calendar arithmetic, DST-immune) — shared by
  `historyWindow.ts`. `fetchHistory.ts` mirrors `fetchTodayRates.ts`'s never-throw contract.
- **ADR-0004:** Recharts is delivered via real npm import (`HistoryChart.tsx`), not the
  vendored `window.Recharts` UMD global — avoids a real dual-React-instance risk.
  Supersedes the "UMD global" clause of `TC-CHART-01` in ADR-0001; the library choice
  (Recharts) itself is unchanged.
- **Carry-over duplicate rates are kept, not de-duplicated, in the history chart** —
  the opposite resolution from `currency-list`'s single "as of" badge (which labels
  staleness). A chart plotting the real unchanged daily value is the honest
  representation; ADR-0002's "must de-duplicate or label" concern was specifically
  about the single-value badge case.
- **A genuinely empty NBU response is `{ok:true, points:[]}`, not `{ok:false}`** —
  fixed during `rate-history`'s review after the original code collapsed them and
  made the spec's required "empty" UI state unreachable. NBU returns HTTP 200 + `[]`
  both for an unsupported currency code and for a window with no data — verified live.
  (Contrast: `currency-list`'s `fetchTodayRates` deliberately *does* treat zero rows as
  failure — reasonable there because an empty "all currencies today" response is itself
  anomalous, unlike a per-currency history window.)
- **Don't reuse vendored `@/components/ds` composite components that bake in behaviour
  this app doesn't have honest data for** — established three times now: `RateRow`
  (trend pill), `CurrencyPicker` (composes `RateRow` + non-spec wording), `RateChart`
  (UMD delivery risk). `CurrencyRow`/`HistoryChart` (ours) are reused everywhere instead.
- **Selection persists across filtering** — `RatesView`'s `activeRate` reads the full
  `result.rates`, not the filtered view. Verified deliberate by Checker #1.
- `react-hooks/static-components` correctly fired on `HistoryChart.tsx`'s original
  inline `<Tip />` — fixed by hoisting to module scope, passed as a function reference
  to `Tooltip`'s `content` prop (not a JSX element).
- Review suggestions (non-blocking, converter): permissive `parseAmount` strip on mixed
  input; icon-only swap (tooltip/`aria-label`); optional invalid-input hint on blur.
- Review suggestions (non-blocking, currency-picker): pre-existing `Input` a11y pattern;
  no Unicode normalisation in the filter.
- Review suggestions (non-blocking, rate-history): empty/error states share one CSS
  class (wording is already correctly distinct); chart-shaped loading skeleton would be
  a nice-to-have; a vision check of the actual rendered chart is still owed (Stage 8/13).
- Three manual fixes applied post-converter-review (sticky focus column, Input focus
  ring, `<body>` `suppressHydrationWarning`) — committed in `2ccb87b`.
- **`trendTone` (vendored, pure) is reused at the component layer, never duplicated or
  imported into `lib/`** — `lib/` must stay literally `react`-import-free (`TC-PURE-01`)
  even though the specific function never touches React at runtime; `TrendHint.tsx` is
  where the impure-file boundary is crossed, same pattern as
  `CurrencyAvatar`/`AsOfBadge`/`Input`/`Converter`.
- **Trend sentences use the ISO code as subject, not the declined Ukrainian currency
  name** — a deliberate, documented scope cut (a full Ukrainian gender/case declension
  table across ~45 currencies was judged disproportionate for one sentence).
- **Footer saying computed once server-side in `page.tsx`, threaded as a prop through
  `RatesView` → `AppShell` → `AppFooter`** — `AppFooter` is reached through `RatesView`'s
  client boundary, so calling `new Date()` inside it directly would risk a hydration
  mismatch (same class as `isStaleRate`). Confirmed clean live, not just reasoned about.
- **`lib/currency/`** now covers the full domain: `parseAmount`, `convert`,
  `formatAmount`, `filterRates`, `weeklyMove`, `trendSentence` — all pure, total,
  colocated tests. **`lib/sayings/`** (new): `sayings.ts` (12-entry corpus) +
  `selectSaying.ts` (pure day-of-year modulo selection). 124 total unit tests across
  the project.
- Review suggestions (non-blocking, rate-history): empty/error states share one CSS
  class (wording is already correctly distinct); chart-shaped loading skeleton would be
  a nice-to-have; a vision check of the actual rendered chart is still owed (Stage 8/13).
- Review suggestions (non-blocking, trend-hint): no explicit gap-tolerance fallback in
  `weeklyMove` if a future data source has missing days (current `mapHistory.ts` output
  has none, verified live).
- Review suggestions (non-blocking, footer-sayings): two `new Date()` calls in
  `page.tsx` could be consolidated into one; the 12-entry corpus repeats ~monthly.
- Requirement IDs touched: **FR-CONVERT-01…05, NFR-LOCALE-01, NFR-OBS-01** (converter);
  **FR-PICK-01…03** (currency-picker); **FR-HISTORY-01…04, TC-DATA-01** (rate-history);
  **FR-TREND-01…03, BC-BRAND-01** (trend-hint); **FR-SAYINGS-01** (footer-sayings).
- **All 25 MVP FRs + FR-SAYINGS-01 (Future) now implemented — Stage 5 complete.**
- **Stage 8 (cross-cutting hardening) added a new theme-aware token,
  `--accent-strong`** (`app/styles/tokens/colors.css`) — text/icon color paired with
  `--accent-soft`, distinct from `--accent` (tuned for icons/borders on neutral
  surfaces, not for small text on the soft-accent background; only reaches 2.5:1
  there). Retuned `--text-muted`/`--text-faint` in both themes — all four were found
  failing WCAG AA 4.5:1 live via axe, not by inspection. `app/styles/tokens/colors.css`
  is **not** part of the read-only vendored DS boundary (that's `docs/design-system/**`
  and `components/ds/**` per `eslint.config.mjs`'s comment) — it's live app code under
  `app/`, so editing it to fix a real defect was in scope without forking the vendor copy.
- **`e2e/**` is excluded from Vitest's test discovery** (`vitest.config.ts`) — Playwright
  spec files also match Vitest's default `*.spec.ts` glob and were being picked up and
  failing under the wrong test runner before this was added.
- Requirement IDs touched (Stage 8): **NFR-A11Y-01, NFR-A11Y-02, TC-TEST-01**.
- **`lib/currency/formatRate.ts` is now the single source of truth for displaying an
  official NBU rate** (2-4 decimals); `formatAmount` stays fixed-2-decimal and is now
  used *only* for converted money amounts (the converter's input/result fields). Before
  Stage 10, `Converter.jsx`'s rate-quote line used `formatAmount` (wrong — it's a rate,
  not a converted amount), which silently rounded small-rate currencies to a visibly
  different number than the rest of the app showed for the same currency.
- **`docs/qa/global-review.md`** (maker self-review, Stage 9) and the **`## Global
  Review — 2026-07-01`** sections appended to `docs/qa/review-findings.md` /
  `docs/qa/eval-report.md` (Stage 10, two independent checker passes) are the
  whole-app counterparts to the per-slice review docs — read those first for
  anything spanning more than one capability.
- Requirement IDs touched (Stage 10 fixes): **NFR-LOCALE-01** (`formatRate`),
  **NFR-OBS-01** (history retry button).
- **`docs/qa/` is now the full QA proof pack**: `review-findings.md`,
  `eval-report.md` (per-slice + global), `automated-verification-latest.md`,
  `global-review.md`, `traceability-matrix.md`, `manual-test-plan.md`,
  `demo-script.md`, `risk-register.md`, `acceptance-report.md`. Anyone
  picking this project up cold should start at `acceptance-report.md` (the
  summary) and follow its links outward, not read all nine files in order.
