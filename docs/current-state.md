# Current state — agent handoff

> Living log of the last agent session. Update at the end of every meaningful run.
> Sources of truth: [product-brief.md](product-brief.md), [requirements.md](requirements.md) (Stage 2, pending),
> and [docs/adr/](adr/).

## Last updated

`2026-06-30T21:00:00+03:00` (Europe/Kyiv)

## Phase

**Stage 5 — Per-slice build: 7 of 8 slices done**, reviewed, archived
(`app-shell`, `i18n`, `currency-list`, `converter`, `currency-picker`,
`rate-history`, **`trend-hint`**). Only *(optional)* **`footer-sayings`** remains —
all MVP requirements are now implemented.

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

- **Working:** full app shell, theme toggle, centralised i18n, live NBU currency list
  with selection/stale labelling/error recovery, a bidirectional UAH ⇄ active-currency
  converter, a code/name filter, a real ~30-day rate-history chart with honest
  loading/empty/error states, and a calm 7-day trend sentence above it — **all 25 MVP
  FRs are now implemented.**
- **Done (slices):** `app-shell`, `i18n`, `currency-list`, `converter`, `currency-picker`,
  `rate-history` — all archived **and committed** (`54290cf`, `b1d6f34`, `9bd6c96`,
  `2ccb87b`, `77210b8`, `b191b8b`, plus bugfix `8b63d1f`). **`trend-hint`** archived,
  **not yet committed**.
- **In progress:** — (await commit for `trend-hint`)
- **Blocked:** —

## Next steps

1. **Commit** the `trend-hint` slice with `Slice:` / `Refs:` trailers.
2. **Reload the session** so `kurs-maker`/`kurs-reviewer`/`kurs-eval-judge` register as
   real isolated Task-tool subagents (still pending across all 7 slices this session).
3. **MVP requirement coverage is complete.** Remaining options: *(optional)*
   `footer-sayings` (Future-phase, FR-SAYINGS-01), or move to Stage 8+ — cross-cutting
   hardening (integration test, full Playwright e2e incl. axe a11y light/dark),
   Stage 9–10 (maker self-review + global two-checker review), Stage 11 (QA proof pack:
   traceability matrix, manual test plan, demo script, risk register, acceptance
   report), Stage 12 (PR), Stage 13 (recorded demo).
4. A vision check of the actually-rendered chart/UI (not just DOM measurement) is still
   owed before calling Stage 8/13 done — flagged since `rate-history`.

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
- Requirement IDs touched: **FR-CONVERT-01…05, NFR-LOCALE-01, NFR-OBS-01** (converter);
  **FR-PICK-01…03** (currency-picker); **FR-HISTORY-01…04, TC-DATA-01** (rate-history);
  **FR-TREND-01…03, BC-BRAND-01** (trend-hint).
