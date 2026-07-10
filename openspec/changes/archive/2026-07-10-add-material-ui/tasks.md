## 1. Setup

- [x] 1.1 Add `@mui/material`, `@mui/material-nextjs`, `@emotion/react`, `@emotion/styled` to `furniture-configurator/package.json` and install
- [x] 1.2 Create `src/lib/theme.ts` exporting a `createTheme()` result (palette, typography)
- [x] 1.3 Wrap `src/app/layout.tsx` with `AppRouterCacheProvider` (from `@mui/material-nextjs/v16-appRouter` or current version-matched entrypoint per the `material-ui-nextjs` skill), MUI `ThemeProvider`, and `CssBaseline`
- [x] 1.4 Run `npm run dev` and confirm all routes (`/login`, `/manager`, `/admin`) render with MUI's baseline styles, no console hydration warnings

## 2. Login Page

- [x] 2.1 Replace raw form elements in `src/app/login/page.tsx` with MUI `TextField`, `Button`, `Paper`/`Card`
- [x] 2.2 Replace any error message markup with MUI `Alert`
- [x] 2.3 Verify login still succeeds/fails identically to before (manual check + existing tests still pass)

## 3. Manager / Configurator Form

- [x] 3.1 Replace raw elements in `src/app/manager/page.tsx` with MUI `Paper`/`Typography`/layout components
- [x] 3.2 Replace form controls in `src/app/manager/ConfiguratorForm.tsx` with MUI `TextField`/`Select`/`Button`, keeping all dictionary-ID-based selects (no free-text attribute inputs introduced)
- [x] 3.3 Verify configurator submission and validation behavior is unchanged

## 4. Admin Pages

- [x] 4.1 Replace raw elements in `src/app/admin/page.tsx` with MUI layout/navigation components (e.g., `Tabs` or `Paper` sections)
- [x] 4.2 Restyle `CatalogEntriesSection.tsx` using MUI `Table`, `Dialog`, `TextField`, `Button`
- [x] 4.3 Restyle `PartSpecsSection.tsx` using MUI `Table`, `Dialog`, `TextField`, `Button`
- [x] 4.4 Restyle `StandardSizesSection.tsx` using MUI `Table`, `Dialog`, `TextField`, `Button`
- [x] 4.5 Restyle `SimpleDictionarySection.tsx` using MUI `Table`, `Dialog`, `TextField`, `Button`
- [x] 4.6 Restyle `HardwareSection.tsx` using MUI `Table`, `Dialog`, `TextField`, `Button`
- [x] 4.7 Verify each admin section's create/edit/delete actions still perform the same underlying operations

## 5. Cleanup & Verification

- [x] 5.1 Trim `src/app/globals.css` to remove resets superseded by `CssBaseline`, keeping only what's still needed (e.g., font variables, if Geist fonts are kept)
- [x] 5.2 Decide and apply: keep Geist fonts via `next/font`, or switch to MUI's default font stack (kept Geist — already wired via `theme.ts` typography.fontFamily referencing `--font-geist-sans`)
- [x] 5.3 Run `npm test` to confirm the Vitest suite (domain logic in `src/lib/configurator/*`) still passes unmodified
- [x] 5.4 Run `npm run build` to confirm no SSR/build errors from the MUI/Emotion integration
- [x] 5.5 Manually click through login → manager → admin in the browser to confirm consistent styling and no regressions
