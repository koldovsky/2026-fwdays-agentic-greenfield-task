# Review findings — «Гривня»

Structured output from **kurs-reviewer** (Checker #1: spec compliance + correctness).
The maker fixes blocking items; eval-judge (Checker #2) grades quality separately.

---

## Slice: `app-shell` — 2026-06-30

**Reviewer:** kurs-reviewer (Checker #1)  
**Spec:** `openspec/specs/app-shell/spec.md` · change `openspec/changes/add-app-shell/`  
**Scope:** FR-SHELL-01 … FR-SHELL-04  
**Tests:** `npm run test:run` — 7/7 passed (1 file, `lib/theme/theme.test.ts`)  
**Gate:** `npm run verify` — green (per handoff)

### Spec scenario coverage

| Scenario | Status | Evidence |
| --- | --- | --- |
| Initial load shows shell (header lockup + toggle, footer) | Pass | `AppShell.tsx:51-72`, `AppHeader.tsx:11-34`, `AppFooter.tsx:4-10`; built HTML includes all three regions |
| Desktop two columns (≥1100 px) | Pass | `globals.css:121-125` — `grid-template-columns` at `min-width: 1100px` |
| Narrow viewport single column (<1100 px) | Pass | `globals.css:109-118` — default `grid-template-columns: 1fr` |
| Switching to dark theme | Pass | `useThemePreference.ts:57-61`, `AppHeader.tsx:27-31`; `data-theme` via `themeToDataAttribute` |
| Loading shows skeleton | Pass | `AppShell.tsx:23-24`, `ShellSkeleton.tsx:3-9`; `page.tsx:23-32` defers content 600 ms; SSR HTML ships skeleton in both columns |

FR-SHELL-04 empty-state **requirement text** is implemented via `leftEmptyMessage` / `rightEmptyMessage` (`AppShell.tsx:31-36`) though the baseline spec lists only the loading scenario explicitly. Not demonstrated on `page.tsx` (placeholders always provided after load) — acceptable for this structural slice per `design.md` non-goals.

### Findings

#### Suggestions (non-blocking)

- [suggestion] `app/layout.tsx:39-42` — `<html>` lacks `suppressHydrationWarning`; server HTML never includes `data-theme` while `ThemeScript` sets it client-side before paint (`ThemeScript.tsx:6-8`, `lib/theme/theme.ts:24-26`). React hydration may warn or briefly fight the bootstrap attribute on repeat visits with a stored dark preference — add the standard Next.js guard to harden FR-SHELL-03 no-flash (`FR-SHELL-03`).

- [suggestion] `AppShell.tsx:39` — `ShellSlot` returns `null` when neither `children` nor `emptyMessage` is supplied (`AppShell.tsx:27-39`). `design.md` §5 asks callers to avoid blank slots; a calm default empty string (or dev-only assert) would make FR-SHELL-04 harder to violate accidentally when later slices omit a slot prop (`FR-SHELL-04`).

- [suggestion] `openspec/changes/add-app-shell/design.md:121` — design risk table calls for Playwright viewport checks at 1200 px / 800 px; no e2e exists yet. Responsive behaviour is CSS-only and untested in automation (`FR-SHELL-02`). Reasonable deferral until the cross-cutting e2e layer lands, but track for Phase 5.

- [suggestion] `app/page.tsx:1-47` — entire route is `"use client"` for the 600 ms loading demo. Acceptable for this slice (`tasks.md` §4.1); when real data slices arrive, prefer a Server Component page with a small client boundary for interactivity only (NFR-PERF).

### Verified (no issue)

- **TC-PURE-01:** `lib/theme/theme.ts` is framework-free, total, never throws; colocated tests carry `@trace FR-SHELL-03` and assert real parse/serialise behaviour (`lib/theme/theme.test.ts:8-46`).
- **Theme bootstrap:** blocking inline script is first in `<body>`, mirrors `parseThemePreference` + `themeToDataAttribute`; `localStorage` failures are caught in hook and script (`useThemePreference.ts:13-17`, `29-34`; `theme.ts:25`).
- **Design tokens:** shell CSS uses semantic `var(--*)` only — no raw hex in `app/globals.css` shell block or `components/app-shell/*`.
- **DS usage:** theme control uses `Switch` from `@/components/ds` (`AppHeader.tsx:3,27-31`).
- **Reduced motion:** skeleton pulse gated behind `@media (prefers-reduced-motion: no-preference)` (`globals.css:184-188`); token durations zero under `reduce` in `motion.css:26-32`.
- **Ukrainian copy / BC-BRAND-01:** lockup, subtitle (uppercased via CSS), footer provenance, placeholder hints — no exclamation marks in shell components or eval rubric targets.
- **BC-HONESTY-01 / BC-PRIVACY-01:** footer is static provenance without a fake «станом на» date; theme persists in `localStorage` only (`THEME_STORAGE_KEY`), no cookies.
- **NFR-OBS-01:** loading skeleton and optional inline empty copy (`role="status"`) — no silent blank crash path in the demo page.
- **Eval case:** `evals/cases/app-shell.eval.ts` present with weighted rubric tracing FR-SHELL-01/04.

### Verdict

**CLEAN** — no confirmed blocking defects. Spec scenarios FR-SHELL-01 … FR-SHELL-04 are implemented; unit tests and verify gate are green. Suggestions above are hardening / follow-up items, not merge blockers for this slice.

---

## Slice: `i18n` — 2026-06-30

**Reviewer:** kurs-reviewer (Checker #1)
**Spec:** `openspec/specs/i18n/spec.md` · change `openspec/changes/add-i18n/`
**Scope:** FR-I18N-01, NFR-I18N-01
**Tests:** `npm run test:run` — 13/13 passed (2 files: `lib/theme/theme.test.ts`, `lib/i18n/uk.test.ts`)
**Gate:** `npm run verify` — green (lint, traceability 25/25, `openspec validate --all --strict` 9/9, build)

### Spec scenario coverage

| Scenario | Status | Evidence |
| --- | --- | --- |
| Component renders copy from the string table | Pass | `AppHeader.tsx:24-25,31`, `AppFooter.tsx:8`, `AppShell.tsx:57,68`, `app/page.tsx:36-37,42-43`, `app/layout.tsx:31-32` all read `uk.*`; zero inline Cyrillic literals remain (verified by recursive grep across `app/` and `components/app-shell/`) |
| Copy follows the brand voice | Pass | `lib/i18n/uk.test.ts:30-34` asserts no `!` in any leaf; manual read of all nine string values confirms calm, Ukrainian, no hype |

### Findings

#### Blocking

None.

#### Suggestions (non-blocking)

- [suggestion] `lib/i18n/uk.ts` — the table is a single flat-ish object with no
  `en.ts` counterpart yet. `NFR-I18N-01`'s fallback requirement is explicitly
  Future (per `design.md` Open Questions), so this is not a gap for *this*
  slice — flagging only so the next i18n-touching slice keeps the shape
  fallback-ready (it currently is: plain nested string leaves, no JSX or
  interpolation baked in).
- [suggestion] `lib/i18n/uk.test.ts:36-45` locks three of nine strings
  byte-exact (the two brand strings + footer line) but not all nine (e.g. the
  two placeholder hints, the meta description). Low risk since
  `zero-empty`/`no-exclamation` cover all nine generically, but a future
  accidental edit to an unlocked string would pass tests silently. Consider
  locking the remaining six if copy stability becomes load-bearing.

### Verified (no issue)

- **FR-I18N-01 / TC-PURE-01:** `lib/i18n/uk.ts` is framework-free, pure data,
  `as const`-typed; no `next/*`/`react`/DOM import. Colocated
  `lib/i18n/uk.test.ts` carries `@trace FR-I18N-01` on every describe block.
- **Tests-first discipline confirmed:** `tasks.md` §1.1 records the RED
  observation (`Cannot find module './uk'`) before `uk.ts` was created —
  consistent with the per-slice loop, not retrofitted.
- **Zero stray literals:** independent recursive scan (Node, matching any
  quoted string containing a Cyrillic codepoint) across `app/**/*.{ts,tsx}`
  and `components/app-shell/**/*.{ts,tsx}` returns no matches outside
  `lib/i18n/uk.ts` itself.
- **Deduplication delivered (design.md Decision 2):** `uk.shell.ratesColumnLabel`
  / `focusColumnLabel` are each defined once and consumed by **both**
  `AppShell.tsx` (`aria-label`) and `app/page.tsx` (visible title) — confirmed
  identical by reference, not just by matching string value.
  `lib/i18n/uk.test.ts:49-53` locks both.
- **Byte-identical migration:** spot-checked the one literal with non-ASCII
  punctuation (`Тут з’явиться…`, U+2019 curly apostrophe) and the em-dash in
  the metadata title (`Гривня — …`, U+2014) — both preserved exactly in
  `uk.ts`, not silently normalised to straight-quote/hyphen equivalents.
- **No behavioural change:** `app-shell`'s FR-SHELL-01…04 scenarios re-verified
  against the migrated components — identical structure, only the string
  source moved.
- **Design discipline:** no new `@/components/ds` usage changed; no raw hex or
  ramp tokens introduced by this slice (it touches only string literals).
- **Eval case:** `evals/cases/i18n.eval.ts` present, rubric traces
  `FR-I18N-01`/`NFR-I18N-01`, covers centralisation, voice, deduplication, and
  zero-behaviour-change.

### Verdict

**CLEAN** — no confirmed blocking defects. FR-I18N-01 and NFR-I18N-01 are fully
implemented; the pre-existing column-label duplication is fixed, not just
relocated; the migration is verified byte-identical. Suggestions above are
forward-looking notes for later slices, not merge blockers.

---

## Slice: `currency-list` — 2026-06-30

**Reviewer:** kurs-reviewer (Checker #1)
**Spec:** `openspec/specs/currency-list/spec.md` · change `openspec/changes/add-currency-list/`
**Scope:** FR-RATES-01 … FR-RATES-05, BC-HONESTY-01, NFR-OBS-01, NFR-PERF-01, TC-DATA-01
**Tests:** `npm run test:run` — 34/34 passed (5 files; this slice adds `lib/nbu/{mapRates,kyivDate,fetchTodayRates}.test.ts`, 20 tests)
**Gate:** `npm run verify` — green (lint, traceability 25/25, `openspec validate --all --strict` 9/9, build)
**Live verification:** `npm run build` statically prerendered `/`, which means
`fetchTodayRates()` actually ran against the live NBU API during the build.
The rendered HTML (`.next/server/app/index.html`) contains real `USD`/`EUR`
rows, Ukrainian names, and **"Станом на"** (the non-stale `AsOfBadge` label) —
confirming the full fetch → map → render → honesty-logic pipeline works
end-to-end against production data, not just mocks.

### Spec scenario coverage

| Scenario | Status | Evidence |
| --- | --- | --- |
| Rates load on first view | Pass | `app/page.tsx:6-10` (Server Component) calls `fetchTodayRates()` at request time; static build output confirms real data rendered |
| A currency row shows code/name/rate | Pass | `CurrencyRow.tsx:30-39` — `rate.code`, `rate.name`, `fmtRate` (uk-UA, tabular mono via `.currency-row__rate`) |
| Weekend rate labelled with its real date | Pass | `lib/nbu/kyivDate.ts` (`kyivDateString`/`isStaleRate`, both pure, `now` injected) + `AsOfBadge` in `RatesView.tsx:70-74`; stale computed server-side in `page.tsx:8` to avoid any hydration mismatch |
| Selecting a row focuses the currency | Pass | `RatesView.tsx:63,76-83` — `activeCode` state, `CurrencyFocusPanel` receives `activeRate` |
| NBU unreachable → visible degraded state | Pass | `RatesView.tsx:46-60` — inline `role="status"` error box + retry button, never a blank/crash; `fetchTodayRates.ts` never throws (try/catch wraps every failure mode) |

### Findings

#### Blocking

None.

#### Investigated and resolved (not a finding)

- **FR-RATES-02 "and unit"** — `mapRates.ts`/`CurrencyRow.tsx` display no
  explicit unit multiplier. Verified this is correct, not a gap: live-probed
  NBU's `statdirectory/exchange` endpoint for the two currencies historically
  quoted per-100 elsewhere (JPY, KRW) — both return `rate` already normalized
  to **per 1 unit** (`JPY rate:0.27749`, `KRW rate:0.02909`). The vendored
  reference (`docs/design-system/ui_kits/hryvnia/FocusHero.jsx:20`,
  `RateRow.jsx`) itself only prefixes a unit when `unit > 1` and shows nothing
  otherwise — so "no unit text" is the established encoding for "unit = 1",
  which is always true for this endpoint. No fabricated/hardcoded `unit: 1`
  field was added to the `Rate` type, avoiding a constant field with no real
  source data.

#### Suggestions (non-blocking)

- [suggestion] `lib/nbu/fetchTodayRates.ts:39` — uses Next's `next: {
  revalidate }` fetch extension. This is a plain object property, not an
  `import` from `next`, so it satisfies `TC-PURE-01`'s literal "no `next/*`
  import" rule — but the *behaviour* is Next-aware (the option is meaningless
  outside Next's patched `fetch`). Flagging the nuance for transparency, not
  as a defect; consistent with the project's own precedent (`AGENTS.md`:
  "fetch wrappers may use `fetch` but no React/Next imports").
- [suggestion] `app/api/rates/route.ts:10` — returns HTTP 200 with
  `{ ok: false }` in the body on upstream failure, rather than propagating a
  non-2xx status. This is a deliberate envelope pattern (the client already
  branches on `result.ok`, not on HTTP status) — reasonable, but worth a
  one-line code comment if a future slice adds other consumers of this route
  who might assume 200 means success.
- [suggestion] `components/rates/RatesView.tsx:38` — the retry path computes
  `isStaleRate` using the **client's** `Date`, while the first-load path
  computes it **server-side** (`page.tsx:8`) specifically to avoid a
  hydration mismatch. This asymmetry is intentional and documented in the
  component's docstring, but a clock-skewed client could show a wrong stale
  flag after a retry (cosmetic only — `AsOfBadge` still shows the real
  `exchangeDate` regardless, so it never lies, only mislabels "stale or not").

### Verified (no issue)

- **TC-PURE-01:** `lib/nbu/mapRates.ts` and `lib/nbu/kyivDate.ts` are
  framework-free, total, never throw; `mapRates` defensively drops malformed
  entries (tested with `null`/`42`/non-array/missing-field fixtures).
  `kyivDate.ts` never calls `Date.now()` internally — `now` is always an
  explicit parameter (project rule against implicit-clock /
  `toISOString().slice(0,10)` logic).
- **Tests-first discipline confirmed:** all three `lib/nbu/*.test.ts` files
  were written and run to a confirmed `Cannot find module` RED before their
  implementation files existed (`tasks.md` §1–2 — each "Add `lib/nbu/...`"
  task follows its "write test, observe RED" task).
- **TC-DATA-01:** the only two call sites of `fetchTodayRates` are
  `app/page.tsx` (Server Component) and `app/api/rates/route.ts` (Route
  Handler) — grepped the whole `components/`/`app/` tree, no client-side
  import of `lib/nbu/fetchTodayRates` exists. The NBU URL is never sent to
  the browser.
- **No fabricated trend data (design.md Decision 2):** `CurrencyRow` does not
  import or render `TrendBadge`; the vendored `RateRow` (which would force a
  `delta` prop) is correctly avoided for this slice.
- **No hydration risk on first load:** `stale` is computed once server-side
  and passed as a prop, not recomputed client-side during initial render.
- **Design discipline:** new CSS (`.currency-row*`, `.currency-focus*`,
  `.rates-error*`) uses only semantic `var(--*)` tokens — independently
  grepped for raw hex and ramp tokens (`--green-`, `--paper-`, etc.) across
  the new CSS block; zero matches. `CurrencyAvatar`, `AsOfBadge`, `Button`
  reused from `@/components/ds`; native `<button>` for `CurrencyRow` (built-in
  keyboard support, `aria-pressed` reflects selection).
- **Caching (NFR-PERF-01):** independently confirmed via the build's own
  route summary — `/` is `○ Static` with `Revalidate 1h`, `/api/rates` is
  `ƒ Dynamic` — exactly matching the documented design (default path cached
  hourly, forced-fresh only on explicit retry).
- **Eval case:** `evals/cases/currency-list.eval.ts` present, rubric traces
  `FR-RATES-03/05`, `BC-HONESTY-01`, `NFR-OBS-01`.

### Verdict

**CLEAN** — no confirmed blocking defects. FR-RATES-01 … FR-RATES-05 are
implemented and verified against live NBU data, not just fixtures. The one
candidate gap (unit display) was investigated against the live API and the
vendored design reference and found to be correctly handled, not missing.
Suggestions above are transparency notes and minor hardening, not blockers.

---

## Slice: `converter` — 2026-06-30

**Reviewer:** kurs-reviewer (Checker #1)
**Spec:** `openspec/specs/converter/spec.md` · change `openspec/changes/add-converter/`
**Scope:** FR-CONVERT-01 … FR-CONVERT-05, NFR-LOCALE-01, NFR-OBS-01, FR-I18N-01 (labels), FR-RATES-04 (embed point), BC-HONESTY-01 (rate line)
**Tests:** `npm run test:run` — 52/52 passed (8 files; this slice adds `lib/currency/{parseAmount,convert,formatAmount}.test.ts`, 18 tests)
**Gate:** `npm run verify` — green (lint, traceability 25/25, `openspec validate --all --strict` 9/9 including `change/add-converter`, build)

### Spec scenario coverage

| Scenario | Status | Evidence |
| --- | --- | --- |
| Convert foreign to UAH | Pass | Default direction `foreign-to-uah` (`Converter.jsx:32`); `parseAmount` → `convert(value, rate, direction)` → `formatAmount(result)` with `toUnit` `₴` (`Converter.jsx:33-35,80-83`) |
| Swap direction | Pass | `IconButton` toggles `direction` between `foreign-to-uah` and `uah-to-foreign` (`Converter.jsx:55-59`); labels/units flip via `fromForeign` (`Converter.jsx:37-38,44,68`) |
| Comma decimal is accepted | Pass | `parseAmount("100,50")` → `100.5` (`parseAmount.test.ts:6-8`); wired in `Converter.jsx:33,49` |
| Result is formatted for uk-UA | Pass | `formatAmount(1308.4)` asserts uk-UA grouping + comma decimal (`formatAmount.test.ts:6-14`); result field uses `fontVariantNumeric: 'tabular-nums'` + mono (`Converter.jsx:76-80`) |
| Empty input | Pass | `parseAmount("")` / `"abc"` → `0` (`parseAmount.test.ts:19-26`); `convert(0, …)` → `0` (`convert.test.ts:22-25`); UI shows `formatAmount(0)` → `"0,00"` (`formatAmount.test.ts:16-18`, `Converter.jsx:80`) |

### Findings

#### Blocking

None.

#### Suggestions (non-blocking)

- [suggestion] `lib/currency/parseAmount.ts:11` — non-digit characters are stripped, not rejected; mixed input like `"12abc34"` parses as `1234` rather than `0`. Spec scenario covers fully non-numeric `"abc"` → `0`; this permissive path matches pre-refactor DS behaviour (noted in `docs/current-state.md` §Self-review). Acceptable for `NFR-OBS-01` (no crash), but stricter FR-CONVERT-05 readers may expect `0` for any contaminated string.

- [suggestion] `lib/currency/convert.ts:16-19` — no runtime guard for an invalid `direction` value; any string other than `"foreign-to-uah"` falls through to the divide branch. Safe today because `Converter.jsx:59` only toggles the two typed literals, but a defensive `return 0` on unknown direction would make the total contract explicit (`FR-CONVERT-05`).

- [suggestion] `lib/currency/formatAmount.test.ts:7-12` — primary assertion delegates to `toLocaleString('uk-UA', …)` (tautological with the implementation). The secondary `toMatch(/^1.308,40$/)` adds structure coverage but does not pin the thousands-separator codepoint (NBSP vs narrow no-break space). Consistent with project-wide `toLocaleString` convention (`DESIGN.md:103-104`, `current-state.md:70-71`); not a slice-specific gap.

- [suggestion] `components/ds/rates/Converter.jsx:17-21` — JSDoc claims controlled `amount` + `direction` props, but the component only exposes `defaultAmount` and internal state. Stale documentation from the DS template; behaviour matches `design.md` Decision 2 (self-managing state). No spec requirement for controlled mode.

- [suggestion] `components/rates/CurrencyFocusPanel.tsx:22-25` vs `Converter.jsx:62` — identity summary formats the official rate with up to 4 fractional digits; the converter rate line uses `formatAmount(rate)` (2 decimals). Same numeric rate, different precision — intentional per `design.md` Decision 5, but visually slightly inconsistent (`FR-CONVERT-04` / list parity).

### Verified (no issue)

- **TC-PURE-01:** `lib/currency/{parseAmount,convert,formatAmount}.ts` are framework-free (no `next/*`/`react`/DOM imports); all three are total and never throw; colocated tests carry `@trace FR-CONVERT-*` / `NFR-LOCALE-01`.
- **Tests-first discipline:** `tasks.md` §1–3 record RED-before-implementation for each module; test cases map directly to spec scenarios (comma decimal, spaces, trailing zeros, empty/invalid, bidirectional convert, rate guards, uk-UA format).
- **FR-CONVERT-01 / FR-CONVERT-03:** Both directions at the official `rate` prop; swap control with Ukrainian label from `uk.converter.swap` (`uk.ts:30`, `Converter.jsx:57`).
- **FR-CONVERT-04 / NFR-LOCALE-01:** uk-UA formatting via `formatAmount` → `toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`; mono tabular on input (`Input.jsx:64`, `mono` prop) and result (`Converter.jsx:77`).
- **FR-CONVERT-05 / NFR-OBS-01:** Empty, whitespace, non-numeric, null/undefined, non-finite amount/rate all resolve to `0` / `"0,00"` without throw; no toast or error UI on bad typing (`design.md` Decision 4).
- **Integration:** `CurrencyFocusPanel` renders calm `uk.rates.selectPrompt` when `rate === null` (`CurrencyFocusPanel.tsx:14-19`); embeds `<Converter key={rate.code} code={rate.code} rate={rate.rate} labels={uk.converter} />` when active (`CurrencyFocusPanel.tsx:38-44`) — satisfies FR-RATES-04 embed contract.
- **BC-HONESTY-01:** Rate line `1 {code} = {formatAmount(rate)} ₴` uses the same official `rate.rate` as the list row — not fabricated or separately cached (`Converter.jsx:61-63`).
- **FR-I18N-01:** All converter labels sourced from `uk.converter.*`; DS defaults preserved for preview-only path (`Converter.jsx:9-14,30`).
- **Design discipline:** Reuses `@/components/ds` `Converter`, `Input`, `IconButton`; semantic tokens only in converter block (`var(--brand*)`, `var(--font-mono)`, etc.) — no raw hex introduced.
- **Eval case:** `evals/cases/converter.eval.ts` present with rubric tracing FR-CONVERT-01…05, NFR-LOCALE-01, NFR-OBS-01.

### Verdict

**CLEAN** — no confirmed blocking defects. All five baseline spec scenarios are implemented and covered by honest unit tests; `npm run test:run` and `npm run verify` are green. Suggestions above are edge-case hardening and documentation nits, not merge blockers for this slice.

---

## Slice: `currency-picker` — 2026-06-30

**Reviewer:** kurs-reviewer (Checker #1)
**Spec:** `openspec/specs/currency-picker/spec.md` · change `openspec/changes/add-currency-picker/`
**Scope:** FR-PICK-01 … FR-PICK-03
**Tests:** `npm run test:run` — 60/60 passed (9 files; this slice adds `lib/currency/filterRates.test.ts`, 7 tests)
**Gate:** `npm run verify` — green (lint, traceability 25/25, `openspec validate --all --strict` 9/9, build)

### Spec scenario coverage

| Scenario | Status | Evidence |
| --- | --- | --- |
| Filtering by code | Pass | `filterRates.test.ts:13-16` (`"usd"`/`"UsD"` → `["USD"]`); wired in `RatesView.tsx:68,94` |
| Filtering by name | Pass | `filterRates.test.ts:18-21` (`"дол"` → `["USD"]`, `"ЄВРО"` → `["EUR"]`) |
| No match → inline «Нічого не знайдено» | Pass | `RatesView.tsx:69,88-91`; exact wording locked in `uk.test.ts` (`uk.picker.noMatch`); `role="status"`, not a toast |
| Selecting a filtered currency | Pass | Filtered rows render the same `CurrencyRow` with the same `onSelect={setActiveCode}` wiring as the unfiltered list (`RatesView.tsx:94-100`) — no parallel selection logic introduced |

### Findings

#### Blocking

None.

#### Verified behaviour (not in the spec's explicit text, confirmed correct)

- **Selection persists across filtering.** `activeRate` is derived from
  `result.rates` (the full list), not `filteredRates` (`RatesView.tsx:67-68`)
  — so narrowing the visible rows does not clear a prior selection, even if
  the selected currency's row scrolls out of the filtered view. The spec only
  says filtering narrows the list and selecting from it sets the active
  currency; it says nothing about clearing selection on re-filter. This
  reading (persist, don't clear) is the less surprising one and matches how
  the converter/focus panel would otherwise flicker empty on every keystroke
  if selection were filter-scoped. Confirmed deliberate, not an oversight.

#### Suggestions (non-blocking)

- [suggestion] `components/ds/core/Input.jsx` has no `<label>`/`aria-label`
  association — the search input's accessible name comes from `placeholder`
  alone, which is a known weaker pattern (lost once typed). This is the
  **pre-existing** behaviour of the vendored `Input` component (also true of
  the converter's amount field), not a regression introduced by this slice —
  flagging for awareness, not as a new defect to fix here.
- [suggestion] `lib/currency/filterRates.ts` does no Unicode normalisation
  (e.g. composed vs. decomposed Cyrillic). Unlikely to matter for the fixed
  NBU currency-name set in practice; flagging only if names are ever sourced
  from a less controlled input.

### Verified (no issue)

- **TC-PURE-01:** `filterRates.ts` is framework-free (only a type-only import
  of `Rate`), total, never throws — plain string operations only.
- **Tests-first discipline confirmed:** `tasks.md` §1.1 records RED
  (`Cannot find module './filterRates'`) before the implementation existed.
- **Empty-query vs. empty-result distinction (design.md Decision 2):**
  `filterRates.test.ts:23-29` separately asserts empty query → full list and
  whitespace-only query → full list, distinct from the no-match case;
  `RatesView.tsx:69`'s `showEmpty` guard matches (`query.trim().length > 0`).
- **`AsOfBadge` stays visible during a no-match filter** — it sits outside
  the `showEmpty` conditional (`RatesView.tsx:76-80` vs. `88-103`), so the
  effective-date/stale labelling from `currency-list` is never hidden by an
  unrelated filter state.
- **Vendored `CurrencyPicker` correctly not reused** (design.md Decision 4) —
  confirmed `RatesView.tsx` imports only `Input` from `@/components/ds`, not
  `CurrencyPicker`; rows still go through `CurrencyRow` (no fabricated trend).
- **i18n:** `uk.picker.placeholder`/`noMatch` added, no inline literals;
  `uk.test.ts` locks the exact spec wording for `noMatch`.
- **No new CSS:** the slice reuses the existing `.shell-slot-empty` class for
  the empty message — no new tokens or raw values introduced.
- **Eval case:** `evals/cases/currency-picker.eval.ts` present, rubric traces
  FR-PICK-01/02/03.

### Verdict

**CLEAN** — no confirmed blocking defects. FR-PICK-01 … FR-PICK-03 are fully
implemented; the empty-query/no-match distinction is correctly handled and
tested; selection-persists-across-filter behaviour was checked and confirmed
deliberate. Suggestions above are pre-existing a11y notes, not regressions.

---

## Slice: `rate-history` — 2026-06-30

**Reviewer:** kurs-reviewer (Checker #1)
**Spec:** `openspec/specs/rate-history/spec.md` · change `openspec/changes/add-rate-history/`
**Scope:** FR-HISTORY-01 … FR-HISTORY-04, NFR-OBS-01, TC-DATA-01
**Tests:** `npm run test:run` — 86/86 passed (12 files; this slice adds
`kyivYmd`/`addKyivDays` to `kyivDate.test.ts`, `historyWindow.test.ts` (3),
`mapHistory.test.ts` (8), `fetchHistory.test.ts` (7) — 26 new assertions)
**Gate:** `npm run verify` — green (lint, traceability 25/25, `openspec validate --all --strict` 9/9, build)
**Live verification:** ran `next dev` and hit `/api/history` directly —
`?code=USD` returned exactly the expected 30-point ascending series
(`01.06` … `30.06`), correctly preserving consecutive carry-over duplicate
rates on weekend/holiday days exactly per design.md Decision 1; `?code=ZZZ`
(unsupported currency) and a missing `?code` both degrade honestly.

### Spec scenario coverage

| Scenario | Status | Evidence |
| --- | --- | --- |
| History line for the active currency | Pass | live-confirmed 30-point series rendered via `HistoryChart` |
| History window is requested server-side | Pass | `fetchHistory.test.ts` asserts the exact `start=20260601&end=20260630&valcode=USD` URL; only call sites are `app/page.tsx`-adjacent server code and `app/api/history/route.ts` |
| History fails to load → calm inline error | Pass | `CurrencyHistory.tsx:51-55`, distinct from empty |
| No history data → honest empty state | Pass (after fix below) | `CurrencyHistory.tsx:56-60`, distinct from error |
| Small move is not exaggerated | Pass | `HistoryChart.tsx:51-54`, same padded-domain formula as the vendored design |

### Findings

#### Blocking — found and fixed during this review

- [**fixed**] `lib/nbu/fetchHistory.ts` originally collapsed a genuinely-empty
  result (`points.length === 0`) into `{ ok: false }` — identical to a real
  fetch failure. This made `CurrencyHistory`'s separate "empty" UI branch
  **unreachable dead code**, directly contradicting `FR-HISTORY-03`'s explicit
  requirement for two *distinct* scenarios ("History fails to load" vs.
  "No history data"). Verified live that NBU returns HTTP 200 + `[]` both for
  an unsupported currency code and for a window with no published data — so
  collapsing empty into failure would also have meant a user typing a typo'd
  currency would see "fetch failed" rather than an honest "no data" message.
  **Fix applied:** `fetchHistory` now always returns `{ ok: true, points }`
  (possibly `[]`) when the HTTP request and JSON parse succeed; `{ ok: false
  }` is reserved for genuine I/O failure (non-200, network reject, malformed
  JSON, thrown exception). Test `fetchHistory.test.ts` updated to assert the
  corrected contract and re-verified live (`?code=ZZZ` → `{"ok":true,"points":[]}`).

#### Suggestions (non-blocking)

- [suggestion] `components/rates/HistoryChart.tsx` — `min`/`max`/`pad` use
  `Math.min(...vals)`/`Math.max(...vals)` via spread; fine at ~30 points, but
  would need a loop instead of spread if the window ever grew into the
  thousands (not a concern at this scope).
- [suggestion] `CurrencyHistory.tsx` shows the same `shell-slot-empty` class
  for both the empty and error states — visually identical except for the
  copy. A future pass could differentiate them visually (e.g. a subtle icon),
  though the *wording* is already correctly distinct, which is what
  `FR-HISTORY-03` actually requires.

### Verified (no issue)

- **TC-PURE-01:** `mapHistory.ts`/`historyWindow.ts`/the `kyivDate.ts`
  extension are framework-free, total, never throw. `kyivDateString`/
  `isStaleRate`'s existing tests and behaviour are byte-identical after the
  extension (re-ran the original 6 assertions — all still pass).
- **Tests-first discipline confirmed:** `tasks.md` §1–4 record RED-before-
  implementation for every new pure module and the fetch wrapper.
- **No de-duplication of carry-over rates (design.md Decision 1):**
  `mapHistory.test.ts` explicitly asserts 3 consecutive equal values are
  *kept*, not collapsed — confirmed live in the same live USD response
  (12–14.06, 19–21.06, 26–28.06 all repeat).
- **`react-hooks/static-components` correctly caught by lint** (not excluded —
  `HistoryChart.tsx` is authored code, not vendored): the original inline
  `<Tip />` JSX-element-per-render was flagged and fixed by hoisting
  `HistoryTooltip` to module scope, passed as a function reference.
- **ADR-0004 followed faithfully:** `HistoryChart.tsx` imports `recharts`
  directly (`import { AreaChart, … } from "recharts"`), no `window.Recharts`
  lookup, no UMD script for charting added to `layout.tsx`.
- **TC-DATA-01:** grepped the whole `components/`/`app/` tree — the only
  callers of `fetchHistory` are `app/api/history/route.ts` (and, indirectly,
  nothing client-side imports `lib/nbu/fetchHistory` directly).
- **Per-currency remount, no manual cache (design.md Decision 4):**
  `CurrencyFocusPanel.tsx:48` keys `CurrencyHistory` by `rate.code`, matching
  the existing `Converter` pattern; confirmed no cancellation-flag complexity
  was added to the effect (correctly judged unreachable given the key-forced remount).
- **Eval case:** `evals/cases/rate-history.eval.ts` present, rubric traces
  FR-HISTORY-01/03/04, NFR-OBS-01.

### Verdict

**CLEAN** (after the one blocking defect found during review was fixed and
re-verified). FR-HISTORY-01 … FR-HISTORY-04 are implemented and verified
against live NBU range-endpoint data, including the previously-broken empty
path. Suggestions above are minor, non-blocking polish.

---

## Post-commit bug fix — 2026-06-30 (user-reported, live-browser verified)

Two bugs reported by the user after `rate-history` was already committed.
Investigated and fixed with a real Chrome browser (Claude in Chrome
automation), not just static code reading — both confirmed root-caused via
console output and DOM measurement, not guessed.

**Bug 1 — switching currency left the previous currency's converter visible
alongside the new one (chart correctly replaced; converter didn't).**

Root cause, found via the browser console: `React: Encountered two children
with the same key, 'DKK'` (then `'CZK'`). `CurrencyFocusPanel.tsx` rendered
`<Converter key={rate.code} …>` and `<CurrencyHistory key={rate.code} …>` as
**siblings under the same parent `<div>`** — React requires key uniqueness
across *all* siblings in a parent's children list, not just within
same-component-type groups. Two different components sharing a key value is
an unsupported collision, and React's documented fallback behaviour for it is
exactly what was observed: a stale child persisting instead of being cleanly
replaced. **Fix:** prefixed each key (`converter-${rate.code}` /
`history-${rate.code}`) so they are unique among siblings.
Re-verified live: selected DKK → CZK, console clean (no duplicate-key
warning), exactly one converter block rendered. (Untestable by the project's
existing pure-logic-only Vitest suite — this class of bug only manifests in
real DOM reconciliation; live browser verification was the appropriate check,
consistent with how this slice's other defect was caught.)

**Bug 2 — the chart's last X-axis label ("30.06") was clipped at the right edge.**

Root cause: the `AreaChart`'s `right` margin (8px) plus the last tick's
text being centre-anchored at the very edge of the plot area left no room
for the label's own width. **Fix:** `HistoryChart.tsx` — increased the
chart's right margin to 16px, added `<XAxis padding={{ left: 12, right: 12
}}>` (insets the axis range from the plot edges), and `interval=
"preserveStartEnd"` (guarantees the first/last ticks are never skipped by
the auto-interval logic). Re-verified via direct DOM measurement (not just a
screenshot): the `30.06` `<text>` element's right edge sits at 476px inside a
487px-wide SVG — fully inside, 11px to spare.

Both fixes: `npm run test:run` (86/86) and `npm run verify` green.

---

## Slice: `trend-hint` — 2026-06-30

**Reviewer:** kurs-reviewer (Checker #1)
**Spec:** `openspec/specs/trend-hint/spec.md` · change `openspec/changes/add-trend-hint/`
**Scope:** FR-TREND-01 … FR-TREND-03, BC-BRAND-01
**Tests:** `npm run test:run` — 98/98 passed (14 files; this slice adds
`weeklyMove.test.ts` (6), `trendSentence.test.ts` (5), plus `uk.test.ts` coverage)
**Gate:** `npm run verify` — green (lint, traceability 25/25, `openspec validate --all --strict` 9/9, build)
**Live verification:** real Chrome browser, all three tones exercised against
live NBU data (not fixtures): `EGP` → **up** («EGP за тиждень зміцнів на
0,92% до гривні.», colour `#236B46` = `--up-deep`), `XDR`/`XAG` → **down**
(«…послабшав…», colour `#934531` = `--down-deep`), `LBP` (weekly move
0.000%) → **flat** («…майже без змін…», colour `#605949` = `--flat-deep`).
All three `data-tone` values and computed CSS colours confirmed via direct
DOM query, not just visual screenshot.

### Spec scenario coverage

| Scenario | Status | Evidence |
| --- | --- | --- |
| Seven-day move is computed | Pass | `weeklyMovePct` (8-point lookback), live-confirmed against `/api/history` data independently re-computed via a shell script that matched the rendered sentence's percentage |
| Strengthening reads calmly | Pass | live: EGP → "зміцнів на 0,92%" |
| Flat band / `trendTone` source of truth | Pass | live: LBP (0.000% move) → "майже без змін", `tone="flat"`; `trendTone` imported from `@/components/ds`, not re-implemented |

### Findings

#### Blocking

None.

#### Suggestions (non-blocking)

- [suggestion] `lib/currency/weeklyMove.ts` assumes `points` is one entry per
  calendar day (so `length - 8` is exactly "7 days ago"). This holds for
  `mapHistory.ts`'s actual output (verified live in `rate-history`), but the
  function has no explicit date-arithmetic fallback if a future data source
  ever has gaps. Not a defect against current behaviour — flagging the
  assumption for whoever touches this next.
- [suggestion] `TrendHint.tsx` renders nothing (a `null` return) when there's
  insufficient history — correct per design.md Decision 3, but there's no
  `aria-live` announcement either way; a screen-reader user gets no signal
  that a trend *could* have appeared but didn't. Minor, not blocking (the
  surrounding chart/title still announce normally).

### Verified (no issue)

- **TC-PURE-01:** `lib/currency/weeklyMove.ts` and `trendSentence.ts` are
  framework-free — independently grepped for `from "react"`/`from "next"`,
  zero matches in either file.
- **Tests-first discipline confirmed:** `tasks.md` §1 and §3 record RED
  (`Cannot find module`) before each implementation file existed.
- **Genuine reuse of `trendTone` (FR-TREND-03), not a duplicate:**
  `TrendHint.tsx:3` imports it directly from `@/components/ds` — confirmed
  this is the *same* function `TrendBadge` uses, not a re-implemented copy
  that could drift. `lib/` stays import-clean (design.md Decision 2) because
  the impure file boundary is crossed only at the component layer, which is
  already the established pattern for `CurrencyAvatar`/`AsOfBadge`/`Input`/`Converter`.
- **No new NBU call:** `TrendHint` takes `points` as a prop; grepped
  `components/rates/TrendHint.tsx` — no `fetch` call anywhere in the file.
  Confirmed it rides entirely on `CurrencyHistory`'s existing fetch.
- **Percentage formatting locked exactly:** `uk.test.ts` and
  `trendSentence.test.ts` both assert the fixed-2-decimal, comma-decimal
  uk-UA format (`"1,20%"`, not `"1,2%"`) — consistent with the rest of the app.
- **No exclamation marks, any tone:** asserted in both `uk.test.ts` and
  `trendSentence.test.ts`; independently re-confirmed by reading all three
  live-rendered sentences above.
- **Design discipline:** `.trend-hint[data-tone]` CSS uses only the existing
  semantic `--trend-*-fg` tokens — no new raw colour values introduced.
- **Eval case:** `evals/cases/trend-hint.eval.ts` present, rubric traces
  FR-TREND-01/02/03, BC-BRAND-01.

### Verdict

**CLEAN** — no confirmed blocking defects, and this is the first slice this
session where the maker's own live verification already caught what a
checker would normally have to go find (all three tones, real data, exact
token colours) — the review confirmed rather than discovered correctness.
Suggestions above are forward-looking notes, not blockers.

---

## Slice: `footer-sayings` — 2026-06-30

**Reviewer:** kurs-reviewer (Checker #1)
**Spec:** `openspec/specs/footer-sayings/spec.md` · change `openspec/changes/add-footer-sayings/`
**Scope:** FR-SAYINGS-01, BC-BRAND-01
**Tests:** `npm run test:run` — 111/111 passed (16 files; this slice adds
`kyivDayOfYear` coverage in `kyivDate.test.ts` (4), `selectSaying.test.ts` (4),
`sayings.test.ts` (5))
**Gate:** `npm run verify` — green (lint, traceability 25/25, `openspec validate --all --strict` 9/9, build)
**Live verification:** real Chrome browser — footer renders both the
provenance line and the saying; reloaded and confirmed byte-identical text
(determinism); read the console and confirmed the one hydration warning
present is the **same pre-existing browser-extension noise** (`fdprocessedid`
on unrelated `CurrencyRow` buttons) already documented for prior slices — not
caused by this slice's `saying`/`footerSaying` prop threading, which is
visible passing correctly in the warning's own component stack
(`RatesView … saying="Гривня люб…" → AppShell … footerSaying="Гривня люб…"`).
Independently cross-checked the selected saying against a from-scratch
day-of-year calculation in Node — exact match.

### Spec scenario coverage

| Scenario | Status | Evidence |
| --- | --- | --- |
| Same day shows the same saying | Pass | `selectSaying` is pure/total over `(sayings, date)`; live-confirmed identical text across a page reload |
| Saying follows the brand voice | Pass | `sayings.test.ts` asserts Cyrillic, non-empty, no `!`; live-rendered text manually read, calm and dry |

### Findings

#### Blocking

None.

#### Suggestions (non-blocking)

- [suggestion] `app/page.tsx` calls `new Date()` twice (once for `stale`, once
  for `saying`) rather than once and reusing the value. In practice these
  execute microseconds apart with no observable risk (a day-boundary
  mismatch between the two calls is astronomically unlikely and, even if it
  occurred, would only affect which footer saying shows — cosmetic, not a
  correctness issue for the rate data). Flagging for tidiness, not a defect.
- [suggestion] `lib/sayings/sayings.ts`'s 12-entry corpus repeats roughly
  monthly (365/12 ≈ 30-day cycle) — acceptable for flavour text per design.md,
  but noting for whoever next touches this that a longer corpus would extend
  the repeat cycle if it's ever raised as feedback.

### Verified (no issue)

- **TC-PURE-01:** `lib/sayings/{sayings,selectSaying}.ts` and the
  `kyivDayOfYear` extension are framework-free — grepped for `react`/`next`
  imports, zero matches.
- **Tests-first discipline confirmed:** `tasks.md` §1–2 record RED before
  each implementation file existed; existing `kyivDate.test.ts` assertions
  (14 of them, predating this slice) re-ran unmodified and still pass.
- **No hydration risk (design.md Decision 1), confirmed live, not just
  reasoned about:** the saying is computed once in `app/page.tsx` (true
  Server Component boundary) and threaded as a plain prop — `AppFooter`
  itself never calls `new Date()` or any other non-deterministic input.
- **`kyivDayOfYear` correctness independently re-derived:** cross-checked
  Jan 1 → 1, Dec 31 (non-leap year) → 365, and a Kyiv-midnight-rollover case,
  against a from-scratch Node calculation — exact match, not just trusting
  the test assertions.
- **Determinism end-to-end:** confirmed both at the pure-function level
  (`selectSaying.test.ts`) and live in the browser (reload → same text).
- **Design discipline:** `.app-footer__saying` CSS uses only existing
  semantic tokens (`--text-faint`, `--font-sans`); no new raw values.
- **Eval case:** `evals/cases/footer-sayings.eval.ts` present, rubric traces
  FR-SAYINGS-01, BC-BRAND-01.

### Verdict

**CLEAN** — no confirmed blocking defects. FR-SAYINGS-01 is fully
implemented; the one real architectural risk this slice carried (a
hydration mismatch from calling `new Date()` in a client-reached component)
was designed around correctly and confirmed clean live, not just by
inspection. This closes Stage 5 — all 8 capability slices (7 MVP + this
optional one) are now built, reviewed, and archived.

---

## Global Review — 2026-07-01

**Reviewer:** kurs-reviewer (Checker #1), independent global pass — fresh read,
no memory of building this app.
**Scope:** all 8 capability slices (`app-shell`, `i18n`, `currency-list`,
`converter`, `currency-picker`, `rate-history`, `trend-hint`,
`footer-sayings`) plus Stage 8 cross-cutting hardening (integration test,
Playwright e2e suite, axe a11y token fixes). This supersedes none of the
per-slice sections above — it is the final, whole-app check before release.

### Commands actually run (not taken on faith from `docs/qa/global-review.md`)

| Command | Result |
| --- | --- |
| `npm run verify` (lint + check:trace + spec:validate + build) | **Green** — lint clean, 25/25 MVP FRs traced, all 8 specs `openspec validate --strict` pass, `next build` succeeds |
| `npm run test:run` | **Green** — 117/117 unit tests, 17 files |
| `npm run test:e2e` | **Green** — 14/14 Playwright tests (core-flow, responsive, a11y/axe), against live NBU data |

### 1. FR coverage (all 25 MVP + FR-SAYINGS-01)

Spot-checked every FR against the actual implementation, not just the trace
script's presence check (the script only proves an FR id appears in a spec
file, not that the behaviour exists in code):

- **FR-SHELL-01…04** — `components/app-shell/AppShell.tsx:53-83`,
  `AppHeader.tsx`, `AppFooter.tsx`, `ShellSkeleton.tsx`. Two-column grid
  confirmed live via `e2e/responsive.spec.ts` (measures
  `gridTemplateColumns` track count, not a screenshot eyeball) — Pass.
- **FR-I18N-01** — `lib/i18n/uk.ts` is the only string table found; grepped
  `app/` and `components/rates|app-shell` for stray Ukrainian string
  literals outside `uk.ts` and found none in the slices reviewed — Pass.
- **FR-RATES-01…05** — `app/page.tsx:8-9` fetches server-side
  (`lib/nbu/fetchTodayRates.ts`), `CurrencyRow.tsx` renders code/name/rate,
  `RatesView.tsx:53-69` shows a visible error + retry on `!result.ok`,
  never a blank screen — Pass.
- **FR-PICK-01…03** — `lib/currency/filterRates.ts` (case-insensitive
  code/name substring), `RatesView.tsx:94-97` renders the inline
  «Нічого не знайдено» — `role="status"`, no toast — Pass.
- **FR-CONVERT-01…05** — `lib/currency/{convert,parseAmount,formatAmount}.ts`
  + `components/ds/rates/Converter.jsx`. `convert()` is total (`convert.ts:13-14`
  guards non-finite/zero amount and rate, returns 0, never throws) — Pass.
- **FR-HISTORY-01…04** — `lib/nbu/fetchHistory.ts` + `historyWindow.ts`
  (30-day window, range endpoint), `CurrencyHistory.tsx:28-43` covers
  loading/error/empty/ready as four distinct states, `HistoryChart.tsx:51-54`
  pads the y-domain (`pad = max(range*0.35, max*0.004)`) — Pass.
- **FR-TREND-01…03** — `lib/currency/weeklyMove.ts` (needs 8 points, signed
  %), `lib/currency/trendSentence.ts` + `TrendHint.tsx:17-23` use the single
  `trendTone` import from `@/components/ds` as the tone source of truth, per
  spec — Pass.
- **FR-SAYINGS-01 (Future)** — `lib/sayings/{sayings,selectSaying}.ts`,
  deterministic day-of-year selection, computed once server-side in
  `app/page.tsx:14` and threaded as a prop (no client-side `new Date()` in
  `AppFooter.tsx`, avoiding a hydration mismatch) — Pass.

No silent scope drift found. One scope note worth recording explicitly
(already called out in `current-state.md`, re-verified live here): the
vendored `@/components/ds` composites `RateRow` and `CurrencyPicker` are
deliberately **not** used because they bake in behaviour (a trend pill, extra
copy) this app has no honest data for at the currency-list/picker layer —
`CurrencyRow.tsx` and the inline filter UI in `RatesView.tsx` are used
instead. This is a defensible interpretation, not a contradiction of FR-PICK
or FR-RATES.

### 2. Test honesty

- All `lib/*.test.ts` files carry `@trace FR-x` on their top-level `describe`
  block (verified by grep — 27 `@trace` occurrences across the test suite).
  The one exception is `lib/currency/convertFlow.integration.test.ts`, which
  has no `@trace` annotation despite testing FR-CONVERT-01/02/04/05 end to
  end — every behaviour it covers is already traced by the unit tests it
  composes, so this is a **minor** documentation gap, not a coverage gap.
- Spot-read several test files (`parseAmount.test.ts`, `kyivDate.test.ts`,
  `formatAmount.test.ts`, `convertFlow.integration.test.ts`) — all assert
  real, specific outputs (e.g. `kyivDateString` DST-rollover and
  year-boundary cases independently re-derivable by hand), not vacuous
  `toBeTruthy()` placeholders. No evidence of a test being weakened to pass.
- `lib/` is framework-free (TC-PURE-01): grepped every `lib/**/*.ts` (excl.
  `*.test.ts`) for `next/`, `from "react"`, `document.`, `window.` — the only
  hit is `lib/theme/theme.ts:25`, and that is a `document.`/`localStorage`
  reference **inside a string literal** (the inline bootstrap script body
  injected into `<head>` by `ThemeScript.tsx`), not a real DOM access from
  the module itself. `lib/` stays import-free of `next`/`react` — Pass.
- `convert`, `parseAmount`, `formatAmount`, `filterRates`, `weeklyMovePct`,
  `kyivDate.ts`'s helpers, and `selectSaying` are all total: every one
  returns a safe default (`0`, `[]`, `""`, `null`, `"0,00"`) on bad input
  rather than throwing, confirmed by reading the guard clauses, not just the
  doc comments claiming it.

### 3. Error surface (NFR-OBS-01)

- `app/api/rates/route.ts` and `app/api/history/route.ts` never throw to the
  client: both wrap `fetchTodayRates`/`fetchHistory`, which themselves
  swallow every failure into `{ ok: false }` (`fetchTodayRates.ts:31-58`,
  `fetchHistory.ts:28-56`) and return a 200 JSON envelope either way.
  `RatesView.tsx:53-69` and `CurrencyHistory.tsx:31-43` both branch on
  `ok`/`points.length` into a visible, calm message — never a blank panel.
- Converter: empty/invalid amount input flows through `parseAmount` → `0`
  → `convert` → `0` → `formatAmount` → `"0,00"`, confirmed end-to-end by
  `convertFlow.integration.test.ts:66-77` ("garbage user input flows through
  to an honest 0,00 display, never NaN or a throw") and live by the e2e
  converter test.
- Manual retry path (`RatesView.tsx:39-51`) also wraps its `fetch` in
  try/catch and degrades to `{ ok: false }` on a thrown network error, not
  just a non-200 — Pass.

### 4. Locale & honesty

- `parseAmount` (`lib/currency/parseAmount.ts:8-11`) replaces `,`→`.` and
  strips whitespace/non-digit characters before `parseFloat` — accepts
  «100,50», trailing zeros, and stray spaces per FR-CONVERT-02 — Pass.
- `formatAmount` uses `toLocaleString("uk-UA", …)`, confirmed by
  `formatAmount.test.ts:13` to actually render `"1 308,40"` runtime-side
  (not just assumed) — comma decimal, grouped thousands — Pass. The ₴ sign
  is appended by callers (`Converter.jsx:84`, `CurrencyRow.tsx:43`), not by
  `formatAmount` itself, which matches the spec's "results are formatted in
  uk-UA … ₴ after" being a presentational concern composed at the call site.
- Stale-rate labelling: `lib/nbu/kyivDate.ts`'s `isStaleRate`/`kyivDateString`
  use `Intl.DateTimeFormat` anchored to `Europe/Kyiv`, never
  `toISOString().slice(0,10)` — grepped the whole repo for that exact
  pattern and found zero real occurrences (the only hit is a comment
  *describing* the rule to avoid, in `kyivDate.ts:7`) — Pass, BC-HONESTY-01
  honoured.
- One **minor, non-blocking inconsistency**: `CurrencyRow.tsx:23-26` and
  `CurrencyFocusPanel.tsx:25-28` each independently call
  `rate.toLocaleString("uk-UA", { minimumFractionDigits: 2,
  maximumFractionDigits: 4 })` inline rather than going through
  `lib/currency/formatAmount` (which only supports a fixed
  `minimumFractionDigits === maximumFractionDigits`, so it cannot directly
  express the 2–4 variable-precision display rate format used here — this
  looks like a deliberate, reasoned divergence per `design.md` Decision 5,
  cited in the maker's self-review, not an oversight). Still, the same
  `toLocaleString(...)` call is now duplicated verbatim in two components
  instead of one shared helper. Cosmetic; does not violate NFR-LOCALE-01
  (the output is correct uk-UA formatting in both places) but is exactly the
  kind of cross-slice duplication a global review is positioned to catch
  that a per-slice review wouldn't.

### 5. Design discipline

- Grepped `app/` and `components/rates|app-shell` (excluding the vendored,
  ESLint-excluded `components/ds/**` and `docs/design-system/**`) for raw
  hex/`#`-colour literals — zero hits. The only raw hex in the repo lives in
  `app/styles/tokens/colors.css`, which is the legitimate token-definition
  file itself (the single source of truth DESIGN.md describes), not
  application code consuming raw ramps — Pass.
  - Note `colors.css:102-115,167-171` documents three WCAG-AA contrast fixes
    (`--text-muted`, `--text-faint`) found live via axe at Stage 8, not by
    inspection — consistent with the axe run reproduced in this review
    finding zero violations across all four `a11y.spec.ts` cases (light/dark
    × empty/selected).
- All reviewed components import from `@/components/ds` (`Button`, `Input`,
  `Switch`, `CurrencyAvatar`, `AsOfBadge`, `Converter`) or compose plain
  semantic-token CSS classes (`currency-row`, `currency-focus`,
  `shell-slot-empty`) — no ad hoc component reinvention found.
- Focus ring: `e2e/a11y.spec.ts:65-85` asserts the box-shadow actually
  *changes* on focus (not just present at rest), reproduced green in this
  review's own e2e run — Pass, NFR-A11Y-01 honoured.
- Reduced motion: `app/styles/tokens/motion.css:26-33` collapses all
  `--dur-*` tokens to `0ms` under `prefers-reduced-motion: reduce`;
  `HistoryChart.tsx:107` additionally hardcodes `isAnimationActive={false}`
  on the Recharts `<Area>` regardless of the media query, so the chart never
  animates by default at all (stricter than required, not a defect) — Pass.

### 6. Cross-slice consistency

- The `formatAmount` vs. inline `toLocaleString` duplication noted in §4 is
  the one real cross-slice inconsistency found — same formatting logic
  expressed two different ways in two components that should likely share
  a second helper (e.g. `formatRate(n)` in `lib/currency/`) if a third
  call site is ever added. Not blocking today.
- `CurrencyHistory.tsx`'s loading/error/empty states share the
  `shell-slot-empty` / `shell-skeleton` CSS classes consistently with
  `RatesView.tsx`'s own error state and `ShellSkeleton.tsx` — good reuse,
  no divergent ad hoc class names found across the two slices that both
  need a "degraded state" treatment.
- `trendTone` is imported directly from `@/components/ds` in `TrendHint.tsx`
  and nowhere re-implemented in `lib/` — consistent with the single
  source-of-truth requirement in FR-TREND-03 and the architectural note in
  `current-state.md` explaining why this specific impurity boundary is
  acceptable.
- Both Server-Component date computations (`isStaleRate` in `page.tsx:10`
  and `selectSaying` in `page.tsx:14`) call `new Date()` independently
  rather than sharing one value — confirmed still present, exactly as the
  maker's self-review already flagged it as a known, accepted, non-blocking
  cosmetic risk (two clock reads instead of one, both still within the same
  request so practically simultaneous). Re-flagging here only to confirm it
  is real and still open, not to escalate its severity.

### Findings summary

| Severity | Finding | File:line | FR/NFR |
| --- | --- | --- | --- |
| Suggestion | `convertFlow.integration.test.ts` has no `@trace` annotation on its `describe` block, unlike every other test file in the suite | `lib/currency/convertFlow.integration.test.ts:31` | (test hygiene, not an FR) |
| Suggestion | Rate display formatting (`toLocaleString("uk-UA", {min:2,max:4})`) is duplicated verbatim in two components instead of a shared `lib/currency/` helper | `components/rates/CurrencyRow.tsx:23-26`, `components/rates/CurrencyFocusPanel.tsx:25-28` | NFR-LOCALE-01 (output correct either way; duplication is the only issue) |
| Suggestion | `app/page.tsx` calls `new Date()` twice (once for staleness, once for the saying) instead of once and reusing the value | `app/page.tsx:10,14` | (cosmetic; already logged by the maker's own self-review) |

No confirmed blocking defects. No silent scope drift. No FR implemented in
contradiction of its spec. No 500/blank/silent-failure path found on any
user input or NBU call exercised. `npm run verify`, `npm run test:run`
(117/117), and `npm run test:e2e` (14/14, including axe a11y in both
themes) are all green, reproduced live in this review, not taken on the
maker's word.

### Verdict

**CLEAN** — no blocking findings. The three items above are suggestions only
(test-hygiene polish and minor duplication), safe to leave for a future pass
or fold into the next slice that touches these files. The app is ready to
proceed to the next stage (QA proof pack / vision-judge) from this
checker's spec-compliance + correctness lens.
