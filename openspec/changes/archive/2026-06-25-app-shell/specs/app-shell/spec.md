## ADDED Requirements

### Requirement: Single-page shell with top bar and main content area

The application SHALL render a single-page shell composed of a top bar and a
main content area. The top bar MUST contain the Надворі logo/wordmark and a
theme indicator reflecting the active `data-theme`. The main content area MUST
host the product regions (header widgets, search, forecast, footer) as named
slots that downstream capabilities mount into. (FR-SHELL-01)

#### Scenario: Shell renders on first load

- **WHEN** a user opens the homepage
- **THEN** a top bar with the logo/wordmark and a theme indicator is visible
- **AND** a main content area is rendered below it
- **AND** named placeholder slots exist for the header clock, search, forecast,
  and footer regions

#### Scenario: Theme indicator reflects active theme

- **WHEN** the document `data-theme` attribute is `light` or `dark`
- **THEN** the top-bar theme indicator reflects that theme
- **AND** all shell colors are drawn from semantic design tokens, never raw
  ramps

### Requirement: Responsive layout at 768 px and 1280 px breakpoints

The shell layout SHALL adapt at the 768 px and 1280 px breakpoints: a single
column below 768 px, a two-column layout from 768 px up to 1280 px, and a
three-column layout at 1280 px and above. (FR-SHELL-02)

#### Scenario: Mobile single-column

- **WHEN** the viewport width is below 768 px
- **THEN** the main content regions stack in a single column

#### Scenario: Tablet two-column

- **WHEN** the viewport width is at least 768 px and below 1280 px
- **THEN** the main content regions arrange into two columns

#### Scenario: Desktop three-column

- **WHEN** the viewport width is at least 1280 px
- **THEN** the main content regions arrange into three columns

### Requirement: First-load empty/hero state with centered search slot

On first load, when no active location is selected, the shell SHALL show an
empty/hero state: calm Ukrainian hero copy with a prominently centered
city-search slot. Copy MUST follow the brand voice (Ukrainian-first, calm, no
exclamation marks) and be sourced from `lib/i18n/uk.ts`. (FR-SHELL-03,
BC-BRAND-01, NFR-I18N-01)

#### Scenario: Hero shown when no location is selected

- **WHEN** the homepage loads with no active location in the URL state
- **THEN** the hero copy is displayed
- **AND** the city-search slot is centered and prominent
- **AND** no forecast region content is shown

#### Scenario: Hero copy follows brand voice

- **WHEN** the hero copy renders
- **THEN** its text contains no exclamation marks
- **AND** every user-facing string originates from `lib/i18n/uk.ts`

### Requirement: Accessible, keyboard-navigable shell

The shell SHALL meet accessibility constraints: a single top-level landmark
structure (banner, main, contentinfo), visible focus rings on all interactive
elements, accessible names, and WCAG AA contrast in both themes. The shell MUST
respect `prefers-reduced-motion`. (NFR-A11Y-01, NFR-A11Y-02)

#### Scenario: Landmarks and focus

- **WHEN** a user navigates the shell with a keyboard
- **THEN** the top bar, main, and footer expose banner/main/contentinfo
  landmarks
- **AND** every interactive element shows a visible focus ring when focused
- **AND** every interactive element has an accessible name

#### Scenario: Reduced motion honored

- **WHEN** the user has `prefers-reduced-motion: reduce` set
- **THEN** decorative shell motion is disabled
