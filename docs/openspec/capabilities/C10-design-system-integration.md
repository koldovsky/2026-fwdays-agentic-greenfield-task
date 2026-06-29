# C10 — Design-System Integration

**OpenSpec change:** `add-design-system-integration`
**Owner:** `app/layout.tsx`, `app/globals.css`, `components/ds/*`
**Depends on:** `docs/design-system/` (source only — no code deps; can start early)
**Maps to:** requirements.md §4 (visuals), §5.3, §8

## Purpose
Make the design system usable inside the Next app: vendor its components and tokens
into the app, load global styles/fonts, and expose components for import. The look of
every screen depends on this.

## Requirements

### Requirement: Vendor DS components
The system SHALL copy the design-system components into the app and mark them as client
components (they attach event handlers), importable from `@/components/ds/<group>/<Name>`.

#### Scenario: Import a DS component
- **WHEN** app code imports `BookCard` from `@/components/ds/book/BookCard`
- **THEN** it renders with the DS styling

### Requirement: Load tokens, fonts, and base styles globally
The system SHALL load the DS `styles.css` (tokens + fonts + base resets) in the root
layout, with `<html lang="en">`.

#### Scenario: Tokens available app-wide
- **WHEN** any page renders
- **THEN** `var(--…)` tokens and the DS fonts resolve

### Requirement: App does not import from `docs/`
The running app SHALL NOT import from `docs/design-system/`; it uses the vendored copy.

#### Scenario: Build has no docs/ import
- **WHEN** building the app
- **THEN** no module under `docs/` is in the import graph
