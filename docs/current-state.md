# Current state — agent handoff

> Living log of the last agent session. Update at the end of every meaningful run.
> Sources of truth: [product-brief.md](product-brief.md), [requirements.md](requirements.md) (Stage 2, pending),
> and [docs/adr/](adr/).

## Last updated

`2026-06-30T19:15:00+03:00` (Europe/Kyiv)

## Phase

**Stage 5 — Per-slice build:** **`app-shell`**, **`i18n`**, **`currency-list`**,
**`converter`**, **`currency-picker`** done, reviewed, archived. Next:
**`rate-history`** → **`trend-hint`** → *(optional)* **`footer-sayings`**.

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
  converter, and a code/name filter over the list with an honest empty-result state.
- **Done (slices):** `app-shell`, `i18n`, `currency-list`, `converter`, **`currency-picker`**
  — all archived **and committed** (`54290cf`, `b1d6f34`, `9bd6c96`, `2ccb87b`,
  pending commit for `currency-picker`).
- **In progress:** — (await commit for `currency-picker`)
- **Blocked:** —

## Next steps

1. **Commit** the `currency-picker` slice with `Slice:` / `Refs:` trailers.
2. **Reload the session** so `kurs-maker`/`kurs-reviewer`/`kurs-eval-judge` register as
   real isolated Task-tool subagents (still pending across all 5 slices this session).
3. **`/propose-slice rate-history`** — needs the **range endpoint**
   (`NBU_Exchange/exchange_site`, ADR-0002), a different shape from
   `lib/nbu/mapRates.ts` (which targets `statdirectory/exchange`); plan a
   `lib/nbu/mapHistory.ts` rather than reusing `mapRates`. De-duplicate
   weekend/holiday carry-over rows per ADR-0002's note.
4. Then `trend-hint` → *(optional)* `footer-sayings`.

## Notes / decisions

- **`lib/currency/`** established: `parseAmount` (comma decimals, spaces ignored,
  total), `convert` (foreign-to-uah / uah-to-foreign, guards non-finite and `rate <= 0`),
  `formatAmount` (uk-UA via `toLocaleString`, default 2 decimals), **`filterRates`**
  (case-insensitive substring on code or name, empty query = full list unchanged).
- Converter remounts on `rate.code` change (`key` prop) — resets direction/amount per
  design.md Decision 3.
- **Don't reuse vendored `@/components/ds` composite components that bake in behaviour
  this app doesn't have honest data for** — established twice now: `RateRow` (forces a
  trend pill, avoided in `currency-list`) and `CurrencyPicker` (composes `RateRow` +
  hardcodes non-spec empty-state wording, avoided in `currency-picker`). `CurrencyRow`
  (our own) is the one reused everywhere rows are needed.
- **Selection persists across filtering** — `RatesView`'s `activeRate` reads the full
  `result.rates`, not the filtered view, so a selected currency stays focused even if
  its row is filtered out of sight. Verified deliberate by Checker #1.
- Review suggestions (non-blocking, converter): permissive `parseAmount` strip on mixed
  input; icon-only swap (tooltip/`aria-label`); optional invalid-input hint on blur.
- Review suggestions (non-blocking, currency-picker): pre-existing `Input` a11y pattern
  (placeholder-only accessible name, not a new regression); no Unicode normalisation in
  the filter (low-risk for the fixed NBU name set).
- Three manual fixes applied post-converter-review (sticky focus column, Input focus
  ring, `<body>` `suppressHydrationWarning`) — already committed in `2ccb87b`.
- Requirement IDs touched: **FR-CONVERT-01…05, NFR-LOCALE-01, NFR-OBS-01** (converter);
  **FR-PICK-01…03** (currency-picker).
