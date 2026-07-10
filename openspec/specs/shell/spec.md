# Shell Specification

## Purpose

The shell capability provides the static Weather Explorer frame before any data
features exist. It replaces the create-next-app starter with a Ukrainian-first
landing state, a top bar, and a responsive main content area that future slices
can fill with search, forecast, map, and compare modules.

## Requirements

### Requirement: Single-page app shell

The system SHALL render a single-page Weather Explorer shell with a top bar,
logo wordmark, theme indicator, and main content area (`FR-SHELL-01`,
`BC-BRAND-01`, `NFR-I18N-01`).

#### Scenario: Top bar and main region render

- **GIVEN** the visitor opens the home page
- **WHEN** the shell renders
- **THEN** the page shows the Weather Explorer wordmark
- **AND** the page shows a non-interactive theme indicator placeholder
- **AND** the primary content is contained in a semantic `main` region

#### Scenario: UI strings come from the i18n scaffold

- **GIVEN** the shell renders user-facing copy
- **WHEN** the copy is maintained
- **THEN** Ukrainian strings are centralized in `lib/i18n/uk.ts`
- **AND** English fallback strings exist in `lib/i18n/en.ts`

### Requirement: Responsive shell layout

The system SHALL adapt the shell layout at the design breakpoints: single column
below 768 px, two columns from 768 px to 1279 px, and three columns from 1280 px
and above (`FR-SHELL-02`, `DESIGN.md`).

#### Scenario: Mobile-first layout

- **GIVEN** the viewport is narrower than 768 px
- **WHEN** the shell renders
- **THEN** the hero/search area stacks above placeholder forecast and map panels
- **AND** the content remains readable without horizontal scrolling

#### Scenario: Tablet and desktop layout

- **GIVEN** the viewport is at least 768 px wide
- **WHEN** the shell renders
- **THEN** the shell exposes separate layout regions for search/side content,
  forecast content, and map content
- **AND** the desktop layout can expand to three columns at 1280 px and above

### Requirement: First-load empty state

The system SHALL show an empty state on first load with calm Ukrainian hero copy
and a prominently centered city-search placeholder. It SHALL NOT select a
default city or ask for geolocation on page load (`FR-SHELL-03`,
`BC-PRIVACY-02`).

#### Scenario: No default city on first load

- **GIVEN** the visitor opens the home page with no location query parameters
- **WHEN** the shell renders
- **THEN** no city forecast is shown as selected
- **AND** no geolocation prompt is triggered

#### Scenario: Search placeholder is prominent

- **GIVEN** the first-load empty state is visible
- **WHEN** the visitor scans the hero area
- **THEN** the city search placeholder is visually prominent and labeled in
  Ukrainian
- **AND** the copy remains calm and contains no exclamation marks
