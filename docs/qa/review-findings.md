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
