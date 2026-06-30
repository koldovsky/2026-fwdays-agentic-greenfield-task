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
