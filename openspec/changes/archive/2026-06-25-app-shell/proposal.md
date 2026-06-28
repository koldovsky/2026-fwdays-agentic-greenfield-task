## Why

The app currently renders the default `create-next-app` starter page; there is
no shell for any product feature to mount into. Every other capability
(`top-clock`, `city-search`, `forecast`, `bottom-jokes`, …) depends on a
responsive layout with defined regions and a first-load hero state. Building the
shell first establishes the responsive grid (FR-SHELL-02) and the empty/hero
state (FR-SHELL-03) that search lands in, and de-risks the design-system wiring
before data-heavy work begins.

## What Changes

- Replace the starter `app/page.tsx` with the Надворі home page rendering the
  shell regions (FR-SHELL-01).
- Add a top bar with the logo/wordmark and a theme indicator (FR-SHELL-01).
- Add a main content area with a responsive layout: mobile single-column,
  tablet two-column at ≥768 px, desktop three-column at ≥1280 px (FR-SHELL-02).
- Add a first-load empty/hero state: calm Ukrainian hero copy with a prominently
  centered city-search slot (FR-SHELL-03).
- Add named placeholder slots for the header clock widget, the search input, the
  forecast area, and the footer, so later capabilities mount without re-laying
  out the page.
- Seed `lib/i18n/uk.ts` (+ `en.ts` fallback) with the shell/hero strings
  (NFR-I18N-01) and add the footer credits scaffold (BC-BRAND-02 placeholder).
- Port the brand assets (logo mark + wordmark) into the top bar.

## Capabilities

### New Capabilities

- `app-shell`: The single-page application shell — top bar (logo, theme
  indicator), responsive main content area with 768/1280 px breakpoints, and the
  first-load empty/hero state with a centered search slot. Provides named
  regions/slots that all subsequent capabilities mount into.

### Modified Capabilities

<!-- None — this is the first capability; no existing specs change. -->

## Impact

- **Code:** rewrites `app/page.tsx`; may add `app/layout.tsx` region wrappers and
  shell components under `app/components/` (or `components/`); adds
  `lib/i18n/uk.ts` and `lib/i18n/en.ts`.
- **Design system:** consumes existing tokens/utilities from `app/globals.css`
  and `app/design-system/`; no token changes expected.
- **Assets:** uses `public/brand/logo-mark.svg` and `logo-wordmark.svg`.
- **Dependencies:** none added; uses the existing Next.js 16 / React 19 /
  Tailwind v4 stack.
- **Downstream:** unblocks `top-clock`, `bottom-jokes`, and `city-search`, which
  mount into the slots this change defines.
