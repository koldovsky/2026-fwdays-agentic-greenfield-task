## Why

The furniture configurator's admin, manager, and login screens currently render with unstyled default HTML elements (plain `globals.css`, no component library), which makes the app look unfinished and hard to scan (forms, tables, and buttons have no visual hierarchy). Adopting Material UI (MUI) gives the app a consistent, professional look with minimal custom CSS, using accessible, pre-built components.

## What Changes

- Add `@mui/material`, `@mui/material-nextjs`, `@emotion/react`, and `@emotion/styled` as dependencies.
- Wire up the App Router Emotion cache provider in `src/app/layout.tsx` (via `AppRouterCacheProvider`) so MUI styles render correctly with SSR.
- Define a shared MUI theme (`src/lib/theme.ts` or similar) with a `ThemeProvider` + `CssBaseline` wrapping the app.
- Restyle existing pages/components using MUI components in place of raw HTML elements:
  - `login/page.tsx` — `TextField`, `Button`, `Paper`/`Card`, `Alert` for errors.
  - `manager/page.tsx` and `ConfiguratorForm.tsx` — `TextField`, `Select`, `Button`, `Paper`, form layout via `Grid`/`Stack`.
  - `admin/page.tsx` and its `*Section.tsx` components — `Table`, `Tabs` or navigation, `Dialog`/`TextField`/`Button` for CRUD sections.
- Remove now-unused custom CSS in `globals.css` that MUI's `CssBaseline` supersedes (keep only truly global resets not covered by MUI).
- No changes to domain logic, API routes, Prisma schema, or validation rules in `src/lib/configurator/*` — this is a UI-layer-only change.

## Capabilities

### New Capabilities
- `ui-theming`: Establishes the MUI theme, App Router SSR integration (Emotion cache), and global layout/styling conventions used across all pages.

### Modified Capabilities
(none — this change is presentation-only; no product/business requirements from `product-configuration`, `catalog-matching`, `dictionary-management`, or `role-access` change)

## Impact

- **Affected code**: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/login/page.tsx`, `src/app/manager/page.tsx`, `src/app/manager/ConfiguratorForm.tsx`, `src/app/admin/page.tsx`, `src/app/admin/*Section.tsx`.
- **New dependencies**: `@mui/material`, `@mui/material-nextjs`, `@emotion/react`, `@emotion/styled`.
- **No changes** to Prisma schema, API routes, `src/lib/configurator/*` domain logic, or tests in those areas (existing Vitest suite for domain logic is unaffected; any component-level tests touching removed markup/classnames may need selector updates).
