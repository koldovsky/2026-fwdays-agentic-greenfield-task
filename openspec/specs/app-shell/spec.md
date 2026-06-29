# app-shell capability

## Purpose
The app shell provides the single navigational frame for the Plant Growth & Watering Tracker, letting the Owner move between the plant list and a plant's detail view, rendered in a single light "paper" theme per the «Поливайко» design system (FR-SHELL-02a; no light/dark toggle). It also DEFINES the shared inline form-error pattern that every other capability (plants, growth, watering) reuses. UI copy is Ukrainian; this capability is the home for the cross-cutting accessibility, responsive, and localization NFRs that all capabilities must honor.

Future (excluded from MVP, do not report as bugs): data export/import (FR-SHELL-04), authenticated multi-user accounts (FR-SHELL-05), a light/dark theme toggle (FR-SHELL-02 was SUPERSEDED on 2026-06-30 by FR-SHELL-02a — the app now ships a single light "paper" theme and the toggle is removed), and any additional top-level navigation beyond list and detail views.

## Requirements

### Requirement: Single shell with list/detail navigation
The system SHALL present a single application shell that lets the Owner navigate between the plant list view and an individual plant's detail view (FR-SHELL-01). Core flows (add plant, log watering, log measurement) SHALL be reachable in at most two clicks from the relevant view (NFR-USA-01). The shell SHALL be responsive and usable from 360 px wide up to desktop widths (NFR-COMPAT-01) and SHALL function on current evergreen browsers — latest Chrome, Firefox, Safari, and Edge (NFR-COMPAT-02). All shell controls SHALL be keyboard operable with accessible labels (NFR-A11Y-04).

#### Scenario: Navigate from list to detail
- **WHEN** the Owner activates a plant entry in the plant list
- **THEN** the shell renders that plant's detail view and the address/route reflects the selected plant

#### Scenario: Navigate back from detail to list
- **WHEN** the Owner activates the shell's back/list navigation from a plant detail view
- **THEN** the shell renders the plant list view

#### Scenario: Core flows reachable in two clicks
- **WHEN** the Owner is on the relevant view (plant list for add plant, plant detail for log watering or log measurement)
- **THEN** the entry point for that flow is reachable within at most two clicks (NFR-USA-01)

#### Scenario: Keyboard-only navigation
- **WHEN** the Owner uses only the keyboard to move focus through shell navigation controls and activates a control with Enter or Space
- **THEN** focus is visible, every control exposes an accessible name, and the activation performs the same navigation as a pointer click (NFR-A11Y-04)

#### Scenario: Responsive at minimum width
- **WHEN** the shell is rendered in a viewport 360 px wide
- **THEN** navigation and primary content remain visible and operable with no horizontal overflow or clipped controls (NFR-COMPAT-01)

#### Scenario: Unknown route surfaces a friendly state
- **WHEN** the Owner opens a route for a plant id that does not exist
- **THEN** the shell shows a not-found state with a link back to the plant list, never a raw 500 or blank screen

### Requirement: Single light "paper" theme
The system SHALL render the app in a single light "paper" theme per the «Поливайко» design system, with NO light/dark theme toggle (FR-SHELL-02a). This requirement SUPERSEDES the former persisted light/dark theme toggle (FR-SHELL-02, superseded 2026-06-30 by the design-system scope change). The UI SHALL pass automated accessibility (axe) checks in the paper theme (NFR-A11Y-01) and text and interactive elements SHALL meet WCAG 2.1 AA contrast in the paper theme (NFR-A11Y-02). The «Поливайко» tokens and components themselves are defined in the design-system capability (FR-DS-01..06).

#### Scenario: App renders in the paper theme
- **WHEN** the app is loaded
- **THEN** the shell renders in the single light "paper" theme (warm paper background per the «Поливайко» design system) and the document's rendered theme is the paper theme on first paint (FR-SHELL-02a)

#### Scenario: No theme toggle is present
- **WHEN** the Owner inspects the shell controls
- **THEN** no light/dark theme toggle control is present, and there is no theme preference to persist (FR-SHELL-02a, superseding FR-SHELL-02)

#### Scenario: Theme is stable across reload
- **WHEN** the Owner reloads the app
- **THEN** the app re-renders in the same single paper theme without reading or writing any persisted theme preference (FR-SHELL-02a)

#### Scenario: Contrast in the paper theme
- **WHEN** the settled plant list and plant detail screens are inspected in the paper theme
- **THEN** text and interactive elements meet WCAG 2.1 AA contrast and axe reports no violations (NFR-A11Y-01, NFR-A11Y-02)

### Requirement: Shared inline form-error pattern
The system SHALL surface invalid input inline next to the offending field, never as a raw server error (e.g. an unhandled 500) and never as a silent failure (FR-SHELL-03). All forms SHALL show clear validation messages and confirm destructive actions (NFR-USA-02). This pattern is DEFINED here and reused by the plants, growth, and watering capabilities. Validation messages SHALL be presented in Ukrainian (NFR-LOC-01) and SHALL be programmatically associated with their field for assistive technology (NFR-A11Y-04).

#### Scenario: Invalid field shows inline message
- **WHEN** the Owner submits a form whose field fails validation (for example a required plant name left empty)
- **THEN** an inline error message appears next to that field, the field is marked invalid for assistive technology, and the form is not submitted

#### Scenario: Server-side rejection is surfaced inline, never as a raw 500
- **WHEN** a submission passes client checks but is rejected by the server action
- **THEN** the rejection is rendered as an inline field-level or form-level error message and the Owner sees no raw 500 page or silent no-op

#### Scenario: Locale-formatted and out-of-range numbers are rejected inline
- **WHEN** the Owner enters a non-numeric, negative, or decimal-comma-formatted value into a numeric field that rejects it (per FR-GROWTH-05)
- **THEN** an inline error appears next to that field explaining the value is invalid, and the value is not persisted

#### Scenario: Over-length free-text value is rejected inline, never silently truncated
- **WHEN** the Owner submits a free-text field (for example a plant name or watering note) whose length exceeds the field's defined maximum
- **THEN** an inline error appears next to that field stating the value is too long, the value is not persisted and is not silently truncated, and the Owner sees no raw 500 page

#### Scenario: Numeric value above the field maximum is rejected inline
- **WHEN** the Owner submits a numeric field with a value that exceeds the field's defined maximum
- **THEN** an inline error appears next to that field stating the value exceeds the allowed maximum, the value is not persisted, and the Owner sees no raw 500 page

#### Scenario: Error message is in Ukrainian
- **WHEN** any inline validation error is shown
- **THEN** the message text is Ukrainian copy (NFR-LOC-01)

#### Scenario: Destructive action requires confirmation
- **WHEN** the Owner triggers a destructive action such as delete
- **THEN** the UI presents an explicit confirmation step before the action proceeds, and cancelling leaves data unchanged (NFR-USA-02)
