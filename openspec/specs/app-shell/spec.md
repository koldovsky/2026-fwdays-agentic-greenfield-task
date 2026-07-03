# app-shell Specification

## Purpose

The application shell is the global frame every route renders inside: the
Ukrainian-localized document and metadata, the responsive layout container,
the vendored Prokhidnyi design-system styling and brand typography, accessible
non-color-only signaling, and the always-present honesty disclaimer and
deadline surfaces. It carries no chance-calculation logic itself; downstream
capabilities render into the frame and reuse its locale formatting helpers.

## Requirements

### Requirement: Ukrainian localized shell
The application shell SHALL render its UI in Ukrainian. The root document SHALL
declare `lang="uk"`, and app-level metadata (title, description) SHALL be Ukrainian.
The shell SHALL expose `uk-UA` locale formatting helpers for numbers, percentages,
and dates so downstream capabilities format values to the Ukrainian standard.
(Traces: BC-LANG-01.)

#### Scenario: Document language is Ukrainian
- **WHEN** any route renders
- **THEN** the root `<html>` element has `lang="uk"`
- **AND** the browser/page title is Ukrainian text (not the scaffold default)

#### Scenario: Numbers and percentages format to uk-UA
- **WHEN** a caller formats a numeric value with the shell's number helper
- **THEN** it is rendered with `uk-UA` grouping/decimal conventions (space thousands separator, comma decimal)
- **AND** a percentage helper renders values like `54 %` per the Ukrainian standard

#### Scenario: Dates format to uk-UA
- **WHEN** a caller formats a date with the shell's date helper
- **THEN** the output uses the `uk-UA` locale (Ukrainian month/format order)

### Requirement: Responsive layout frame
The shell SHALL provide a global frame (header/navigation region plus a centered,
max-width content container) that adapts from a desktop viewport down to a
phone-sized browser window without horizontal overflow or clipped content. All
interactive targets in the shell SHALL be at least 44×44px. (Traces: NFR-RESP-01,
TC-PLATFORM-01.)

#### Scenario: Adapts from desktop to phone width
- **WHEN** the viewport is resized from a desktop width down to a phone-sized width (~360px)
- **THEN** the layout reflows to fit the narrow width with no horizontal scrollbar
- **AND** content remains readable and no element is clipped or overlapping

#### Scenario: Touch targets meet the minimum size
- **WHEN** any interactive control in the shell (nav item, button, link) is measured
- **THEN** its hit area is at least 44×44px

### Requirement: Design-system styling only
The shell SHALL style all UI using the vendored Prokhidnyi design system CSS,
imported in the order tokens → typography → base → components. The app SHALL NOT
depend on a CSS framework (no Tailwind or equivalent) and SHALL NOT hardcode colors,
sizes, radii, or shadows that a `--pk-*` token already defines; shell markup SHALL
use `.pk-*` component classes and `--pk-*` tokens. (Traces: TC-STACK-01.)

#### Scenario: Design-system CSS loads in the required order
- **WHEN** the application boots
- **THEN** the design-system stylesheets are applied in the order tokens → typography → base → components
- **AND** `--pk-*` custom properties and `.pk-*` classes are available to every route

#### Scenario: No CSS framework dependency
- **WHEN** the project's dependencies and styling pipeline are inspected
- **THEN** no CSS framework (e.g. Tailwind) is present or imported
- **AND** shell components use `.pk-*` classes / `--pk-*` tokens rather than hardcoded color/size/radius/shadow values

### Requirement: Brand typography
The shell SHALL load Unbounded for headings and numerals and Manrope for body text,
self-hosted through the framework's font optimization, and bind them to the design
system's `--pk-font-*` tokens so headings/numerals and body text render in the
correct families across all routes. (Traces: NFR-A11Y-01 — legible fonts.)

#### Scenario: Heading and body fonts are applied
- **WHEN** a page with a heading and body copy renders
- **THEN** headings and numerals use Unbounded
- **AND** body text uses Manrope
- **AND** the families are wired through the `--pk-font-*` design tokens

### Requirement: Accessible, non-color-only signaling
Shell UI SHALL meet accessibility expectations: sufficient text/background contrast
and legible type, and it SHALL NOT convey meaning through color alone — any status
or chance signal SHALL be reinforced with text or shape (e.g. a label or dot
alongside the traffic-light color). (Traces: NFR-A11Y-01.)

#### Scenario: Meaning is not color-only
- **WHEN** the shell surfaces a state that uses the traffic-light chance palette or a status color
- **THEN** the state is also conveyed by an accompanying label, icon, or shape, not color alone

#### Scenario: Contrast is sufficient
- **WHEN** shell text is rendered on its background
- **THEN** the contrast is sufficient for legibility (meets WCAG AA for the text size)

### Requirement: Global honesty disclaimer surface
The shell SHALL render a persistent disclaimer surface on every route stating that
chances are estimates and never a guarantee of admission. This is a passive surface
(always present); it does not compute or gate any chance value. (Traces:
BC-HONESTY-01 — passive disclaimer portion.)

#### Scenario: Disclaimer is present on every route
- **WHEN** any route renders
- **THEN** a disclaimer is visible communicating that chances are estimates, not guarantees
- **AND** it is styled with design-system components (not ad-hoc markup)

### Requirement: Global deadline surface
The shell SHALL provide a prominently placed deadline banner slot rendered on every
route to surface admissions deadlines. For this capability the banner is a passive
surface populated with static/placeholder deadline content; active reminders are out
of scope. (Traces: BC-DEADLINE-01 — passive surfacing.)

#### Scenario: Deadline banner is surfaced prominently
- **WHEN** any route renders
- **THEN** a deadline banner is visible in a prominent position using the design-system banner component
- **AND** it displays admissions-deadline content (static/placeholder for this capability)
