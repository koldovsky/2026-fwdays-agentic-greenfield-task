## Context

The app is a Next.js 16 App Router project (`furniture-configurator/`) using plain HTML elements styled by a minimal `globals.css` (default `create-next-app` output). There are three route groups with forms/tables: `login/`, `manager/` (the `ConfiguratorForm`), and `admin/` (five CRUD sections: catalog entries, part specs, standard sizes, simple dictionaries, hardware). React is 19.2.4, Next is 16.2.10 — both recent majors, so the MUI + Emotion + Next App Router integration must be verified against these versions rather than assumed from older tutorials (see `AGENTS.md`'s warning that this Next.js build has breaking changes vs. training data).

The `material-ui-nextjs`, `material-ui-styling`, and `material-ui-theming` skills (from `mui/material-ui`, official MUI org) are installed and should be consulted during implementation for the current App Router SSR setup, `sx`/`styled()` conventions, and theming APIs.

## Goals / Non-Goals

**Goals:**
- Replace ad-hoc unstyled markup with MUI components for a consistent, professional look.
- Correct SSR style injection under the App Router (no flash-of-unstyled-content, no hydration mismatch).
- One shared theme (palette, typography) reused across login/manager/admin.
- Keep the change purely presentational — no new routes, no API/schema changes.

**Non-Goals:**
- No redesign of information architecture (page layout/URLs stay the same).
- No new client-side state management (React state/fetch patterns stay as-is).
- No visual design system beyond MUI's default theme + light customization (no Figma-driven pixel-perfect spec).
- Not migrating to Tailwind or CSS Modules — MUI's `sx`/`styled()` is the sole styling approach for touched components.

## Decisions

**1. Use `@mui/material-nextjs`'s `AppRouterCacheProvider` for Emotion SSR integration, added once in the root `layout.tsx`.**
Alternative considered: manual Emotion cache + `useServerInsertedHTML` wiring. Rejected — `@mui/material-nextjs` is the officially maintained package for exactly this (per the `material-ui-nextjs` skill) and avoids reimplementing brittle SSR plumbing.

**2. Single theme module (`src/lib/theme.ts`) exporting a `createTheme()` result, consumed by one `ThemeProvider` + `CssBaseline` in root `layout.tsx`.**
Alternative considered: per-route theming (separate theme for admin vs. manager). Rejected — no requirement for visually distinct sections; one shared theme keeps the design consistent and the setup simple.

**3. Componentize by page, not by a shared design-system layer.**
Each page/section swaps its raw HTML for MUI components directly (`TextField`, `Button`, `Table`, `Dialog`, etc.) using `sx` for one-off spacing/layout. No new shared `<Form>`/`<Card>` wrapper components are introduced in this change — the admin sections already share `SimpleDictionarySection.tsx`-style patterns, and introducing a new abstraction layer is out of scope until repeated pain is observed.
Alternative considered: build a shared `ui/` component kit now. Rejected per the "don't design for hypothetical future requirements" principle — three-plus similar `Table`+`Dialog` blocks are fine to duplicate at this scale.

**4. Server Components keep using MUI where possible; only components needing interactivity (forms, dialogs) get `"use client"`.**
`ConfiguratorForm.tsx` and admin `*Section.tsx` files are already client components (they hold form state); `login/page.tsx` and `admin/page.tsx`/`manager/page.tsx` shells may stay server components using only presentational MUI components (`Paper`, `Typography`, `Table` markup) where they don't need client state — checked case-by-case during implementation.

**5. Keep `globals.css` but strip resets that `CssBaseline` duplicates (box-sizing, margin resets), retaining only the `--font-geist-*` variables wiring (or drop Geist fonts in favor of MUI's default Roboto/system font stack — decided during implementation based on visual outcome).**

## Risks / Trade-offs

- [Risk] MUI/Emotion SSR setup breaking under React 19 / Next 16 due to version-lag in community guidance → Mitigation: follow the `material-ui-nextjs` skill (official, App Router-specific) and verify with `npm run dev` + `npm run build` after wiring the provider, before touching any page.
- [Risk] Removing `globals.css` resets could cause visual regressions in areas not touched by this change (if any exist) → Mitigation: `CssBaseline` is designed as a superset of standard CSS resets; visually spot-check each page after the change.
- [Risk] Existing Vitest tests could rely on DOM structure/classnames in components being restyled → Mitigation: this project's tests target `src/lib/configurator/*` pure functions (per `AGENTS.md`), not component markup, so no test breakage is expected; confirm with `npm test` after UI changes.
- [Trade-off] Introducing Emotion (MUI's default styling engine) adds a second styling mechanism alongside plain CSS in `globals.css` — accepted, since MUI requires Emotion (or an equivalent) and rewriting `globals.css` in Emotion is out of scope.

## Migration Plan

1. Install dependencies, add `AppRouterCacheProvider` + theme + `CssBaseline` to `layout.tsx`. Verify `npm run dev` renders the (unstyled-content-free) default MUI baseline on all routes before touching page markup.
2. Restyle `login/page.tsx` (smallest surface) first as a smoke test.
3. Restyle `manager/page.tsx` + `ConfiguratorForm.tsx`.
4. Restyle `admin/page.tsx` + the five `*Section.tsx` components.
5. Trim `globals.css` to only what's still needed.
6. Run `npm test` and `npm run build` to confirm no regressions; manually click through login → manager → admin in the browser.

No rollback complexity beyond reverting the commit(s) — no data migration, no API changes.

## Open Questions

- Keep Geist fonts (via `next/font`) alongside MUI's typography, or switch to MUI's default Roboto/system stack? Decide during `login/page.tsx` implementation based on visual result.
