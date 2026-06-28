## 1. i18n strings scaffold

- [x] 1.1 Create `lib/i18n/uk.ts` with a typed strings object holding shell/hero
      copy (app name/tagline, hero heading, hero subcopy, search placeholder,
      footer credits label); calm voice, no exclamation marks (NFR-I18N-01,
      BC-BRAND-01)
- [x] 1.2 Create `lib/i18n/en.ts` mirroring the same keys as an English fallback;
      export a shared type so both files stay in sync (NFR-I18N-01)
- [x] 1.3 Confirm `lib/` stays framework-free — plain objects only, no `next/*`,
      `react`, or DOM globals (TC-PURE-01)

## 2. Top bar (banner)

- [x] 2.1 Create `app/components/TopBar.tsx` (Server Component) rendering a
      `banner` landmark with the logo mark + wordmark from `public/brand/`
      (FR-SHELL-01)
- [x] 2.2 Add a static theme indicator that reflects the active `data-theme`
      (no toggle UI); use semantic tokens only, ensure an accessible name
      (FR-SHELL-01, NFR-A11Y-01)
- [x] 2.3 Add a `HeaderClockSlot` placeholder region in the top bar for the
      future `top-clock` widget

## 3. Responsive shell layout

- [x] 3.1 Create `app/components/Shell.tsx` defining the page structure: banner,
      `main` landmark with the responsive region grid, and `contentinfo` footer
- [x] 3.2 Implement the grid: single column by default, two columns at `md:`
      (768 px), three columns at `xl:` (1280 px) (FR-SHELL-02)
- [x] 3.3 Add named placeholder regions/slots for search, forecast, and footer
      content; style them as calm neutral skeletons using design tokens

## 4. Hero / empty state

- [x] 4.1 Create `app/components/Hero.tsx` rendering the hero heading + subcopy
      (from `uk.ts`) with a centered `SearchSlot` placeholder (FR-SHELL-03)
- [x] 4.2 Gate hero visibility on a single `hasActiveLocation` boolean so
      `city-search` can later flip it via `?lat=&lon=&name=` URL state without
      re-layout (FR-SHELL-03)
- [x] 4.3 Center the hero across all grid columns while empty; hide forecast
      region content when no active location

## 5. Footer (contentinfo)

- [x] 5.1 Create `app/components/Footer.tsx` (`contentinfo` landmark) with a
      `FooterSlot` placeholder for future jokes and a credits scaffold linking
      Open-Meteo and OpenStreetMap (BC-BRAND-02 placeholder)

## 6. Wire into the page

- [x] 6.1 Replace the starter `app/page.tsx` with the assembled shell (TopBar +
      Shell + Hero + Footer), passing the i18n strings down
- [x] 6.2 Remove the leftover `create-next-app` markup and unused starter assets
      references from the page

## 7. Accessibility & polish

- [x] 7.1 Verify banner/main/contentinfo landmarks are present and unique; all
      interactive elements have visible `:focus-visible` rings and accessible
      names (NFR-A11Y-01)
- [x] 7.2 Verify WCAG AA contrast in both light and dark themes; confirm no raw
      color ramps are used (NFR-A11Y-02, DESIGN.md)
- [x] 7.3 Confirm decorative motion collapses under `prefers-reduced-motion`

## 8. Verify

- [x] 8.1 Manually check the layout at <768 px, 768–1279 px, and ≥1280 px;
      confirm one/two/three columns respectively (FR-SHELL-02)
- [x] 8.2 Run `npm run lint && npx tsc --noEmit && npm test && npm run build`;
      confirm it is green and the console is silent (NFR-DX-01, NFR-OBS-01)
- [x] 8.3 Update `docs/current-state.md` with what was done, requirement IDs, and
      next steps (per AGENTS.md)
