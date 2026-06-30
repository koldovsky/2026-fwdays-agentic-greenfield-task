## Context

- Baseline spec: `openspec/specs/app-shell/spec.md` (FR-SHELL-01 … FR-SHELL-04).
- Current state: `app/layout.tsx` loads fonts + Lucide; `app/page.tsx` is a temporary
  single-column design-system preview with inline theme toggle.
- Reference UI: `docs/design-system/ui_kits/hryvnia/{App,Header,Footer}.jsx` —
  sticky translucent header, two-column main (`--content-max` 1120 px,
  `--bp-desktop` 1100 px), calm footer.
- This slice establishes structure only; rate data, picker, converter, and chart
  arrive in later slices inside the shell slots.

## Goals / Non-Goals

**Goals:**

- One shared shell every page capability renders inside (header · main · footer).
- Desktop two-column grid (rates list slot | focus + detail slot); stacks at
  `<1100 px`.
- Theme toggle with `data-theme="dark"` on `<html>`; persisted in
  `localStorage` when available; **no flash** on load.
- Skeleton placeholders matching final footprint while slots are loading; honest
  empty copy when a slot is intentionally empty.
- Pure, unit-tested theme helpers in `lib/theme/` (`TC-PURE-01`).

**Non-Goals:**

- NBU fetch, rates rows, converter logic, history chart (later slices).
- Moving all copy into `lib/i18n/uk.ts` (the `i18n` slice follows immediately).
- Footer day-of-year saying (`footer-sayings` — Future); use a static provenance
  line for now.
- Header `AsOfBadge` with live stale date (needs `currency-list` data).

## Decisions

### 1. Component structure

```
app/layout.tsx          — fonts, Lucide, ThemeScript (blocking inline), body shell
app/page.tsx            — thin page: <AppShell left={…} right={…} loading={…} />
components/app-shell/
  AppShell.tsx          — grid layout, footer, children slots
  AppHeader.tsx         — lockup + Switch (client)
  AppFooter.tsx         — provenance line (static until footer-sayings)
  ShellSkeleton.tsx     — equal-footprint placeholders for both columns
  ThemeScript.tsx       — inline script: read localStorage → set data-theme before paint
```

Server Components by default; `"use client"` only on header (Switch) and any
interactive theme hook.

### 2. Pure `lib/theme/` module

Framework-free helpers (colocated `*.test.ts`):

```ts
export type ThemePreference = "light" | "dark";

/** Parse stored value; unknown/missing → "light". Never throws. */
export function parseThemePreference(raw: string | null | undefined): ThemePreference;

/** Attribute value for <html>: "" (light default) or "dark". */
export function themeToDataAttribute(theme: ThemePreference): "" | "dark";

/** Serialise for localStorage. */
export function themeToStorageValue(theme: ThemePreference): "light" | "dark";
```

Client components call `parseThemePreference(localStorage.getItem("hryvnia:theme:v1"))`
inside effects; the inline `ThemeScript` uses the same key and logic inlined to
avoid flash (`BC-PRIVACY-01`: no cookies).

### 3. No-flash theme bootstrap

**Chosen:** blocking inline `<script>` in `layout.tsx` (before `{children}`), mirroring
React docs pattern for client-only prefs and the MVP plan risk note.

**Rejected:** `useEffect`-only toggle — causes visible flash on hydration.

The script sets `document.documentElement.dataset.theme` from
`localStorage["hryvnia:theme:v1"]` using the same rules as `parseThemePreference`.

### 4. Responsive layout

CSS in `globals.css` (or a small `app-shell.css` import):

```css
.shell-main {
  display: grid;
  gap: var(--space-5);
  grid-template-columns: 1fr;
}
@media (min-width: 1100px) { /* var(--bp-desktop) */
  .shell-main { grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); }
}
```

Uses design tokens (`--content-max`, `--gutter`, `--space-*`) — no raw hex.

### 5. Loading and empty states (FR-SHELL-04)

- **`loading` prop** on `AppShell`: when true, both slots render `ShellSkeleton`
  (card-shaped blocks with pulse animation respecting `prefers-reduced-motion`).
- **Empty slot:** optional `emptyMessage` per slot — calm Ukrainian sentence, no
  exclamation marks; never render nothing (avoid blank crash).
- Until `currency-list` exists, the page demonstrates the loading skeleton path
  via a short deferred `loading` state so the scenario is testable in UI/e2e.

### 6. Footer content (interim)

Static provenance: «Дані: відкритий API НБУ · без кук і трекерів» (no fake
«станом на» date until rates slice provides `exchangedate`). Matches
`BC-PRIVACY-01` / `NFR-COST-01`.

## Risks / Trade-offs

| Risk | Mitigation |
| --- | --- |
| Theme flash on first visit | Inline `ThemeScript` before paint; share key + parsing rules with `lib/theme/`. |
| `localStorage` throws (private mode) | Try/catch in client persistence; fall back to light; helpers never throw. |
| Shell ships before data slices | Placeholder slots + skeletons; left/right accept `ReactNode` from future Server Components. |
| Duplicate strings before `i18n` slice | Accept short-term inline Ukrainian in shell components; `i18n` slice migrates them next. |
| Two-column only visible with wide viewport | Playwright viewport test at 1200 px and 800 px; unit tests cover theme helpers. |

## Migration Plan

1. Implement `lib/theme/` + tests (red → green).
2. Add `components/app-shell/*` and layout CSS.
3. Replace `app/page.tsx` preview with `AppShell` + placeholders.
4. Verify `npm run verify` green; hand off to checkers.
5. On archive, sync no delta specs (implementation-only); baseline spec unchanged.

## Open Questions

- None blocking — breakpoint (1100 px), storage key, and header/footer structure
  are fixed by `DESIGN.md` and the baseline spec.
