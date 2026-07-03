## 1. Remove Tailwind / CSS-framework dependency (TC-STACK-01)

- [x] 1.1 Remove `tailwindcss` and `@tailwindcss/postcss` from `package.json` devDependencies and run install to update the lockfile
- [x] 1.2 Delete or empty `postcss.config.mjs` so the `@tailwindcss/postcss` plugin is no longer loaded
- [x] 1.3 Remove `@import "tailwindcss"`, the `@theme` block, and the scaffold color rules from `app/globals.css`
- [x] 1.4 Strip all Tailwind utility classes from `app/layout.tsx` and `app/page.tsx`
- [x] 1.5 Verify `next build` succeeds with no Tailwind reference remaining (`grep -ri tailwind app/ package.json postcss.config.mjs` returns nothing)

## 2. Vendor the design system CSS (DESIGN.md load order)

- [x] 2.1 Copy `docs/design-system/{tokens,typography,base,components}.css` into an app-owned location (e.g. `app/styles/`), noting the source origin in a comment/README
- [x] 2.2 Remove the Google Fonts `@import` from the vendored `typography.css` (fonts will come from `next/font` instead)
- [x] 2.3 Import the four files in the order tokens → typography → base → components from a single entry (root layout or one `globals.css`)
- [x] 2.4 Verify `--pk-*` tokens and `.pk-*` classes are available on a rendered route, confirming order against a production `next build`

## 3. Brand typography via next/font (NFR-A11Y-01)

- [x] 3.1 Load `Unbounded` and `Manrope` with `next/font/google`, each exposed via the `variable` option
- [x] 3.2 Bind the font variables to the design system's `--pk-font-*` tokens (display = Unbounded, body = Manrope) on `<html>`/`<body>`
- [x] 3.3 Verify headings/numerals render in Unbounded and body text in Manrope, with no runtime request to `fonts.googleapis.com`

## 4. Ukrainian localized root layout (BC-LANG-01)

- [x] 4.1 Set `<html lang="uk">` in `app/layout.tsx`
- [x] 4.2 Replace scaffold `metadata` (title/description) with Ukrainian app copy
- [x] 4.3 Add `app/lib/format.ts` with `formatNumber`, `formatPercent`, and `formatDate` helpers built on `Intl` with the `uk-UA` locale
- [x] 4.4 Add a quick check (unit test or demo usage) confirming `uk-UA` grouping/decimal, `54 %`-style percent, and Ukrainian date formatting

## 5. Responsive layout frame (NFR-RESP-01, TC-PLATFORM-01)

- [x] 5.1 Build the shell frame in `app/layout.tsx`: header/nav region + centered max-width content container using `.pk-*` classes / `--pk-*` tokens
- [x] 5.2 Ensure the frame reflows from desktop down to ~360px with no horizontal overflow or clipped/overlapping content
- [x] 5.3 Ensure every interactive control (nav item, button, link) has a ≥ 44×44px hit area

## 6. Global honesty + deadline surfaces (BC-HONESTY-01 passive, BC-DEADLINE-01)

- [x] 6.1 Add a persistent `Disclaimer` component (Ukrainian copy: chances are estimates, not guarantees) rendered on every route via the layout
- [x] 6.2 Add a prominent `DeadlineBanner` component using `.pk-banner` with static/placeholder admissions-deadline content, rendered on every route
- [x] 6.3 Ensure any chance/status color in the shell is paired with a text label or dot/shape (never color-only) per NFR-A11Y-01

## 7. Shell demo page & verification

- [x] 7.1 Replace `app/page.tsx` with a demo page that renders the frame, disclaimer, and deadline banner using design-system components
- [x] 7.2 Run `next build` and manually verify the desktop→phone resize, Ukrainian rendering, fonts, and both global surfaces
- [x] 7.3 Run `openspec validate add-app-shell --strict` and confirm it passes
- [x] 7.4 Update `docs/current-state.md` with an entry for the app-shell implementation
