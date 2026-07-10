# design-system

## Purpose

The Vouch brand design system as wired into the app: color/type/spacing tokens
exposed through Tailwind v4 `@theme`, Bricolage/Hanken fonts via `next/font`, and
the non-negotiable brand + accessibility rules. Full reference in `docs/DESIGN.md`
and `docs/vouch-design-system/`. Traces: TC-STACK-02, BC-BRAND-01, NFR-A11Y-01.

## Requirements

### Requirement: Design tokens exposed as utilities
The system SHALL define the brand tokens (colors, type scale, radii, shadows,
fonts) in Tailwind v4 `@theme` in `src/app/globals.css`, so styling uses
utilities (e.g. `bg-ink`, `text-brand`, `font-display`, `rounded-xl`,
`shadow-card`). Implements TC-STACK-02.

#### Scenario: Brand utility resolves to token
- **WHEN** a component uses `bg-ink` or `text-brand`
- **THEN** it renders the exact token value (`#16243d` / `#3257c5`) from `@theme`

### Requirement: Brand typefaces loaded via next/font
The system SHALL load Bricolage Grotesque (display) and Hanken Grotesk (body)
through `next/font` in `src/app/layout.tsx`, mapped to `--font-display` /
`--font-body`. Implements BC-BRAND-01.

#### Scenario: Fonts applied app-wide
- **WHEN** the app renders any route
- **THEN** display text uses Bricolage Grotesque and body text uses Hanken Grotesk

### Requirement: Non-negotiable brand rules
The system SHALL NOT introduce brand hues beyond the defined palette, and SHALL
NOT use emoji, exclamation points, or icon libraries in product UI. Status colors
are fixed (`met`/`partial`/`gap`/`overclaim-risk`). Implements BC-BRAND-01.

#### Scenario: No off-palette or emoji UI
- **WHEN** a UI surface is built
- **THEN** it uses only palette tokens and contains no emoji, exclamation points, or icon-library glyphs

### Requirement: Accessible interactive elements
The system SHALL give every interactive element a visible focus style and an
accessible name, targeting Lighthouse Accessibility ≥ 95. Implements NFR-A11Y-01.

#### Scenario: Visible focus
- **WHEN** a user tabs to a button or link
- **THEN** a visible focus indicator is shown and the element exposes an accessible name
