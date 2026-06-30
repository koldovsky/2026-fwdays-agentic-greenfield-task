## 1. Pure theme helpers (tests first)

- [x] 1.1 Add `lib/theme/theme.ts` with `ThemePreference`, `parseThemePreference`, `themeToDataAttribute`, `themeToStorageValue` — total, never throws.
- [x] 1.2 Write `lib/theme/theme.test.ts` from baseline spec scenarios for FR-SHELL-03 (`@trace FR-SHELL-03`): null/unknown → light; `"dark"` → dark; `themeToDataAttribute("dark")` → `"dark"`; observe **RED**.
- [x] 1.3 Implement until tests are **GREEN**; run `npm run test:run -- lib/theme`.

## 2. Shell layout CSS

- [x] 2.1 Add `.shell-main` responsive grid in `app/globals.css` (1 col default; 2 cols at `min-width: 1100px`) using `--content-max`, `--gutter`, `--space-*`.
- [x] 2.2 Add header sticky/translucent styles (backdrop blur, border) per `DESIGN.md` / reference `Header.jsx`.

## 3. App shell components

- [x] 3.1 `ThemeScript` — inline blocking script in `app/layout.tsx`; reads `hryvnia:theme:v1`; sets `data-theme` before paint (`@trace FR-SHELL-03`).
- [x] 3.2 `AppHeader` — logo lockup («Гривня» + «Офіційний курс НБУ»), `Switch` from `@/components/ds`; toggles theme + persists via `themeToStorageValue` (`@trace FR-SHELL-01`, `@trace FR-SHELL-03`).
- [x] 3.3 `AppFooter` — calm provenance line; no exclamation marks (`@trace FR-SHELL-01`).
- [x] 3.4 `ShellSkeleton` — equal-footprint pulse placeholders for left and right columns; respects `prefers-reduced-motion` (`@trace FR-SHELL-04`).
- [x] 3.5 `AppShell` — composes header, `.shell-main` with `left` / `right` slots, footer; `loading` renders skeletons; optional per-slot empty messages (`@trace FR-SHELL-01`, `@trace FR-SHELL-02`, `@trace FR-SHELL-04`).

## 4. Page integration

- [x] 4.1 Replace `app/page.tsx` preview with thin `AppShell` usage: placeholder left/right panels; brief initial `loading` state to demonstrate skeleton path.
- [x] 4.2 Confirm initial load shows header + footer + theme toggle without hydration flash (`@trace FR-SHELL-01`, `@trace FR-SHELL-03`).

## 5. Eval case

- [x] 5.1 Add `evals/cases/app-shell.eval.ts` with rubric: Ukrainian lockup/subtitle readable; theme toggle discoverable; skeleton feels calm (not a blank page); no exclamation marks; empty copy honest if shown.

## 6. Verification

- [x] 6.1 `npm run test:run` — all unit tests green.
- [x] 6.2 `npm run verify` — lint + check:trace + spec:validate + build green.
- [x] 6.3 Tick all tasks above; update `docs/current-state.md` for maker handoff.
