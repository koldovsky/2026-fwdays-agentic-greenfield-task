## 1. i18n String

- [x] 1.1 Add `theme.toggle: "Перемкнути тему"` to `lib/i18n/uk.ts` (accessible label for the toggle button)
- [x] 1.2 Add `theme.toggle: "Toggle theme"` to `lib/i18n/en.ts`

## 2. FOWT-Free Blocking Script

- [x] 2.1 In `app/layout.tsx`, add an inline `<script>` as the **first child of `<head>`** (before any CSS link or font preload) that:
  - Reads `localStorage.getItem("nadvori-theme")`
  - Falls back to `window.matchMedia("(prefers-color-scheme: dark)").matches` when no stored value
  - Calls `document.documentElement.setAttribute("data-theme", theme)` synchronously
  - Wraps everything in `try/catch` to handle restricted storage environments
- [x] 2.2 Add `suppressHydrationWarning` to the `<html>` element in `layout.tsx` (the blocking script mutates `data-theme` before React hydrates, which triggers a mismatch warning without this flag)

## 3. ThemeToggle Client Component

- [x] 3.1 Create `app/components/ThemeToggle.tsx` as a `"use client"` component
- [x] 3.2 On mount (`useEffect`), read `document.documentElement.getAttribute("data-theme")` to initialize `isDark` state — do **not** read `localStorage` again (blocking script already set the attribute)
- [x] 3.3 Toggle handler: flip `isDark`, call `document.documentElement.setAttribute("data-theme", next)`, and `localStorage.setItem("nadvori-theme", next)`
- [x] 3.4 Render an icon-button: `Moon` icon (16 px, stroke 1.75) when light → will go dark; `Sun` icon when dark → will go light
- [x] 3.5 Style as an icon-button using design-system tokens: `rounded-pill border border-border-subtle bg-surface px-2.5 py-1.5 text-text-secondary hover:bg-surface-hover` — matches the visual weight of the old `ThemeIndicator`
- [x] 3.6 Add `aria-label={uk.theme.toggle}` and `aria-pressed={isDark}` to the button
- [x] 3.7 Add `suppressHydrationWarning` to the button element (SSR renders light state; client corrects after mount)

## 4. Wire into TopBar

- [x] 4.1 In `app/components/TopBar.tsx`, remove the `ThemeIndicator` function (and its `SunIcon` / `MoonIcon` helpers if they become unused)
- [x] 4.2 Import and render `<ThemeToggle />` in place of `<ThemeIndicator />` in the header right slot

## 5. Verification

- [x] 5.1 Build passes with no TypeScript or lint errors (`next build`)
- [x] 5.2 In a fresh browser (no localStorage), page loads in **light** mode when OS is light and **dark** mode when OS is dark — no flash
- [x] 5.3 Clicking the toggle switches the theme instantly with no page reload
- [x] 5.4 Refreshing after toggling preserves the chosen theme (localStorage persistence)
- [x] 5.5 Clearing localStorage and reloading falls back to OS preference correctly
- [x] 5.6 Toggle button has a visible focus ring on keyboard navigation (`NFR-A11Y-01`)
- [x] 5.7 All interactive elements remain readable in dark theme — spot-check: header, day cards, comfort badges, city search dropdown, footer (`NFR-A11Y-02`)
- [x] 5.8 No console errors or warnings in either theme (`NFR-OBS-01`)
- [x] 5.9 Confirm no Leaflet or animated-background regressions in dark mode (map tiles are always light; sky gradients have dark variants in the token set)
