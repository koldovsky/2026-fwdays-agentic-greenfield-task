# app-shell

## Purpose

The single-page application shell: top bar, responsive layout, and a landing
empty state with a clear primary call to action and no auto-processing. An
anonymous visitor can complete one full tailoring before any sign-in. Traces:
FR-SHELL-01/02/03, FR-ONBOARD-01.

## Requirements

### Requirement: Application shell
The system SHALL render a top bar (logo, nav links: Features, Pricing) and a main
content area as a single-page app. Implements FR-SHELL-01.

#### Scenario: Shell present on load
- **WHEN** the app loads any primary route
- **THEN** the top bar with logo and Features/Pricing nav and a main content area are visible

### Requirement: Responsive layout
The system SHALL adapt the layout at the 768px and 1280px breakpoints: a single
column on mobile and a two-column result view on desktop. Implements FR-SHELL-02.

#### Scenario: Mobile single column
- **WHEN** the viewport width is below 768px
- **THEN** content is laid out in a single column

#### Scenario: Desktop two-column result
- **WHEN** the viewport width is at or above 1280px and a tailoring result is shown
- **THEN** the result view uses a two-column layout

### Requirement: Landing empty state
The system SHALL show, on first load, a centered hero with positioning copy and a
prominent primary CTA, and SHALL NOT auto-process anything on load. Implements FR-SHELL-03.

#### Scenario: No auto-processing
- **WHEN** the landing page loads with no user input
- **THEN** the hero and primary CTA are shown and no tailoring is started automatically

### Requirement: One free anonymous tailoring
The system SHALL allow an anonymous visitor to complete one full tailoring (CV
upload through result) without signing in, with the paywall appearing at export.
Implements FR-ONBOARD-01.

#### Scenario: Anonymous completes a tailoring
- **WHEN** a signed-out visitor uploads a CV and runs one tailoring
- **THEN** they reach the result view without signing in, and the paywall is presented at the export step
