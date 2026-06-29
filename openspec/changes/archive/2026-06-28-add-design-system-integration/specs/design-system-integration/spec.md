# Design-System Integration

## ADDED Requirements

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
