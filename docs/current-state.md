# Current state — agent handoff

> Living log of the last agent session. Update at the end of every meaningful run.
> Sources of truth: [product-brief.md](product-brief.md), [requirements.md](requirements.md) (Stage 2, pending),
> and [docs/adr/](adr/).

## Last updated

`2026-06-30T18:45:00+03:00` (Europe/Kyiv)

## Phase

**Stage 5 — Per-slice build:** **`app-shell`**, **`i18n`**, **`currency-list`**, **`converter`**
done, reviewed, archived.

## Last action

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
  with selection/stale labelling/error recovery, and **bidirectional UAH ⇄ active-currency
  converter** in the focus panel (locale-aware input, uk-UA output, swap control).
- **Done (slices):** `app-shell`, `i18n`, `currency-list`, **`converter`** — all archived;
  `app-shell` + `i18n` committed; **`currency-list`** and **`converter`** not yet committed.
- **In progress:** —
- **Blocked:** —

## Next steps

1. **Commit** `currency-list` + `converter` slices with `Slice:` / `Refs:` trailers.
2. **`/propose-slice currency-picker`** → `rate-history` → `trend-hint`.

## Notes / decisions

- **`lib/currency/`** established: `parseAmount` (comma decimals, spaces ignored,
  total), `convert` (foreign-to-uah / uah-to-foreign, guards non-finite and `rate <= 0`),
  `formatAmount` (uk-UA via `toLocaleString`, default 2 decimals).
- Converter remounts on `rate.code` change (`key` prop) — resets direction/amount per
  design.md Decision 3.
- Review suggestions (non-blocking): permissive `parseAmount` strip on mixed input;
  icon-only swap (tooltip/`aria-label`); optional invalid-input hint on blur.
- Requirement IDs touched: **FR-CONVERT-01…05, NFR-LOCALE-01, NFR-OBS-01, FR-I18N-01,
  FR-RATES-04, BC-HONESTY-01**.
