## Why

The project scaffold is still the default Next.js starter — English copy, no app shell, no design tokens, and no shared UI conventions. Every later capability (clock, route input, map, sidebar) depends on a consistent Ukrainian-first layout, theme system, and component library. Phase 1 must establish that foundation before feature work begins.

## What Changes

- Replace the default landing page with the MotoRoute single-page shell: header (logo placeholder, theme-toggle slot), main content area, and attribution footer
- Implement responsive layout breakpoints at 768 px and 1280 px per FR-SHELL-02
- Show a centered empty-state configuration panel on first load with no default route (FR-SHELL-03)
- Wire Tailwind CSS 4 theme tokens and shadcn/ui primitives aligned with root `DESIGN.md` (TC-STACK-02)
- Introduce a local Ukrainian UI dictionary module — no i18n middleware (NFR-I18N-01)
- Apply calm Ukrainian-first copy and visual identity per BC-BRAND-01
- Add footer credits for OpenStreetMap and OSRM with external links (BC-BRAND-02)
- Set `lang="uk"` on the document root and update page metadata for MotoRoute
- **BREAKING**: Remove default Next.js marketing content from `app/page.tsx`

## Capabilities

### New Capabilities

- `app-shell`: Single-page layout with header, main, and footer zones; responsive breakpoints; empty-state centered config card placeholder
- `theme-system`: Light/dark theme via CSS variables, header toggle, `prefers-color-scheme` default
- `ui-i18n`: Local Ukrainian translation tree for all shell copy (no runtime middleware)
- `ui-components`: shadcn/ui base components (Button, Input, Label, Card) wired to design tokens

### Modified Capabilities

<!-- No existing specs in openspec/specs/ yet -->

## Impact

- **App routes:** `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- **New components:** `components/` — layout shell, header, footer, theme toggle, empty-state card
- **New lib:** `lib/i18n/` — Ukrainian dictionary and typed accessor
- **Dependencies:** shadcn/ui CLI init, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` (minimal, with `optimizePackageImports`)
- **Downstream:** `top-clock`, `route-input`, and all later phases inherit layout slots, tokens, and copy conventions from this change
