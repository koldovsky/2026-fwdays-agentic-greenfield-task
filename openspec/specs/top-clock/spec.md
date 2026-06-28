# top-clock

## Purpose

Displays a compact live clock in the application header showing the user's current local time. Provides a real-time, accessible, hydration-safe time display with no third-party dependencies.

## Requirements

### Requirement: Live local-time clock in header

The application header SHALL display a compact clock showing the user's current local time in 24-hour HH:MM:SS format. The clock MUST update once per second while the page is open. The component MUST NOT produce a React hydration mismatch between server and client renders. (FR-CLOCK-01)

#### Scenario: Clock displays local time

- **WHEN** a user opens or navigates to the app
- **THEN** the header shows the current local time in HH:MM:SS 24-hour format within one second of page load

#### Scenario: Clock updates every second

- **WHEN** the clock is mounted and the page remains open
- **THEN** the displayed time increments by one second on each subsequent tick

#### Scenario: No hydration mismatch on load

- **WHEN** the page is server-rendered and then hydrated on the client
- **THEN** no React hydration mismatch error or warning is produced in the browser console

#### Scenario: Interval is cleaned up on unmount

- **WHEN** the `TopClock` component is unmounted (e.g., during navigation)
- **THEN** the one-second interval is cleared and no further state updates occur

### Requirement: Accessible clock label

The clock element SHALL use the `<time>` HTML element with a `dateTime` attribute set to the ISO-8601 local datetime string and an `aria-label` combining a localised prefix with the formatted time. All user-facing strings SHALL be sourced from `lib/i18n/uk.ts` (primary) and `lib/i18n/en.ts`. (FR-CLOCK-01, NFR-A11Y-01, NFR-A11Y-02, NFR-I18N-01)

#### Scenario: Semantic time element present

- **WHEN** the clock renders
- **THEN** the time value is wrapped in a `<time>` element
- **AND** the `dateTime` attribute contains a valid ISO-8601 local datetime string

#### Scenario: Accessible label present

- **WHEN** the clock renders
- **THEN** the `<time>` element has an `aria-label` that includes a localised prefix (e.g., "Поточний час:") followed by the HH:MM:SS value

#### Scenario: Strings sourced from i18n module

- **WHEN** the label prefix is rendered
- **THEN** it originates from `lib/i18n/uk.ts` or `lib/i18n/en.ts`, not a hard-coded string in the component

### Requirement: Clock has no third-party dependencies and minimal bundle impact

The `TopClock` component SHALL rely solely on React built-ins (`useState`, `useEffect`) and the native `Date` API. It SHALL add no new npm packages. (NFR-PERF-03, TC-STACK-01)

#### Scenario: No additional npm packages

- **WHEN** the `TopClock` component file is reviewed
- **THEN** its imports reference only React hooks, the `Date` global, and `lib/i18n/` — no third-party packages

#### Scenario: Bundle size unaffected

- **WHEN** the production bundle is analyzed
- **THEN** the client JS total remains within the NFR-PERF-03 limit of 200 KB gzipped
