# Current state — agent handoff

> Living log of the last agent session. Update at the end of every meaningful run.
> Sources of truth: [product-brief.md](product-brief.md), [requirements.md](requirements.md) (Stage 2, pending),
> and [docs/adr/](adr/).

## Last updated

`2026-06-30T14:10:00+03:00` (Europe/Kyiv)

## Phase

**Stage 5 — Per-slice build:** **`app-shell`** reviewed, archived; next slice **`i18n`**.

## Last action

**`/review-slice app-shell`** — both checkers clean:
- **kurs-reviewer:** CLEAN (4 non-blocking suggestions in [review-findings.md](qa/review-findings.md))
- **kurs-eval-judge:** PASS 96/100 ([eval-report.md](qa/eval-report.md))
- Change archived → `openspec/changes/archive/2026-06-30-add-app-shell/` (`--skip-specs`; baseline spec unchanged)
- **Independent re-check (fresh context):** gates re-run green (7/7 tests; verify green). Applied the one
  reviewer suggestion that touched NFR-OBS-01 — `suppressHydrationWarning` on `<html>` in `app/layout.tsx`
  (prevents a hydration warning on dark-preference reloads). Slice **committed**.

### Prior checkpoint

**`/kurs-maker app-shell`** — tests-first implementation complete; `npm run verify` + `npm run test:run` green.

**Checkpoint commit `953118f`** on branch **`build/hryvnia-foundation`** (off `main`):
189 files — Stages 1–4 + design system + `kurs-uah`.

## Status

- **Working:** full app shell (header · two-column main · footer), theme toggle with no-flash bootstrap, loading skeletons, placeholder slots. Vitest wired (`test:run`).
- **Done (this slice):** FR-SHELL-01 … FR-SHELL-04 implemented, reviewed, archived.
- **In progress:** — (await commit for app-shell slice)
- **Blocked:** —

## Next steps

1. **Commit** app-shell implementation + QA reports with `Slice:` / `Refs:` trailers (hook-enforced).
2. **`/propose-slice i18n`** then kurs-maker for i18n slice.
3. Remaining build order: `i18n` → `currency-list` → `converter` → `rate-history` → `trend-hint` → `currency-picker` → *(optional)* `footer-sayings`.

## Notes / decisions

- Theme storage key: `hryvnia:theme:v1`; light = no `data-theme` attribute, dark = `data-theme="dark"`.
- `useSyncExternalStore` in `useThemePreference.ts` avoids setState-in-effect lint; `ThemeScript` handles pre-paint bootstrap.
- Footer interim copy: «Дані: відкритий API НБУ · без кук і трекерів» (no fake date until `currency-list`).
- Ukrainian strings inline in shell components — `i18n` slice migrates next.
- Review suggestions (optional polish): `suppressHydrationWarning` on `<html>`; `aria-busy` on loading columns; Playwright viewport tests deferred to Stage 8.
- Requirement IDs touched: **FR-SHELL-01, FR-SHELL-02, FR-SHELL-03, FR-SHELL-04**.
