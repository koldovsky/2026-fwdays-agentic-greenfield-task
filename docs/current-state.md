# Current state — agent handoff

> Living log of the last agent session. Update at the end of every meaningful run.
> Sources of truth: [product-brief.md](product-brief.md), [requirements.md](requirements.md) (Stage 2, pending),
> and [docs/adr/](adr/).

## Last updated

`2026-06-30T20:10:00+03:00` (Europe/Kyiv)

## Phase

**Stage 5 — Per-slice build:** **`app-shell`**, **`i18n`**, **`currency-list`**,
**`converter`**, **`currency-picker`**, **`rate-history`** done, reviewed, archived.
Next: **`trend-hint`** → *(optional)* **`footer-sayings`**.

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
  converter, a code/name filter, and a real ~30-day rate-history chart (recharts, real
  npm import) with honest loading/empty/error states.
- **Done (slices):** `app-shell`, `i18n`, `currency-list`, `converter`, `currency-picker`
  — all archived **and committed** (`54290cf`, `b1d6f34`, `9bd6c96`, `2ccb87b`, `77210b8`).
  **`rate-history`** archived, **not yet committed**.
- **In progress:** — (await commit for `rate-history`)
- **Blocked:** —

## Next steps

1. **Commit** the `rate-history` slice with `Slice:` / `Refs:` trailers.
2. **Reload the session** so `kurs-maker`/`kurs-reviewer`/`kurs-eval-judge` register as
   real isolated Task-tool subagents (still pending across all 6 slices this session).
3. **`/propose-slice trend-hint`** — depends on `rate-history`'s data (a 7-day move
   computed from the same history points already fetched); reuse `mapHistory.ts`'s
   `HistoryPoint[]`, no new NBU call needed. Use the design system's `trendTone`
   (already used by `TrendBadge` in the vendored kit) as the single source of truth
   for up/down/flat classification.
4. Then *(optional)* `footer-sayings`.

## Notes / decisions

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
  **FR-PICK-01…03** (currency-picker); **FR-HISTORY-01…04, TC-DATA-01** (rate-history).
