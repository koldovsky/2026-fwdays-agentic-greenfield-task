## ADDED Requirements

### Requirement: Live local-time display in header

The application SHALL display the visitor's current local time in the header bar. The time MUST update every second to reflect the current local time. The display MUST use 24-hour format (`HH:MM:SS`).

#### Scenario: Clock visible on page load

- **WHEN** the visitor loads the application
- **THEN** the header shows the current local time adjacent to the theme toggle
- **THEN** the time is formatted as two-digit hours, minutes, and seconds separated by colons

#### Scenario: Clock updates every second

- **WHEN** one second elapses while the page is open and active
- **THEN** the displayed time advances to the new current local time

### Requirement: Non-blocking clock updates

Clock ticks MUST NOT cause re-rendering of the main content area, footer, or other header controls beyond the clock element itself.

#### Scenario: Main content stability during ticks

- **WHEN** the clock updates each second
- **THEN** the main configuration panel and footer do not re-render as a consequence of the clock tick

#### Scenario: Theme toggle unaffected

- **WHEN** the clock updates each second
- **THEN** the theme toggle remains interactive and does not lose focus or reset state

### Requirement: Stable clock layout

The clock display MUST use a fixed-width monospace presentation so digit changes do not shift adjacent header elements.

#### Scenario: No layout shift on tick

- **WHEN** the seconds digit changes (e.g. from 9 to 10)
- **THEN** the header layout does not shift horizontally

#### Scenario: Typography per design system

- **WHEN** the clock renders
- **THEN** it uses Geist Mono with `text-sm` and `tabular-nums` styling per DESIGN.md

### Requirement: Clock accessibility label

The clock MUST expose an accessible name in Ukrainian sourced from the local i18n dictionary. The element MUST use a semantic `<time>` tag with a valid `dateTime` attribute.

#### Scenario: Screen reader label

- **WHEN** assistive technology inspects the clock
- **THEN** the element has a Ukrainian accessible name from the local dictionary
- **THEN** the element includes an ISO 8601 `dateTime` attribute reflecting the displayed instant
