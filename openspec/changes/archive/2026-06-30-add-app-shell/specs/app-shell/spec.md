# App Shell — implementation delta

Implements the baseline capability. Requirements below match
`openspec/specs/app-shell/spec.md`; no behavioural change from baseline.

## ADDED Requirements

### Requirement: Single-page shell (FR-SHELL-01)
The application SHALL present a single-page shell with a header (the «Гривня»
lockup and «Офіційний курс НБУ» subtitle, plus a theme toggle), a main content
area, and a footer.

#### Scenario: Initial load shows the shell
- **WHEN** the application is opened
- **THEN** a header with the «Гривня» lockup and a theme toggle is visible
- **AND** a footer is visible

### Requirement: Responsive layout (FR-SHELL-02)
The shell SHALL adapt its layout to viewport width: a two-column split (rates list
and focus/detail) on desktop that collapses to a single column under ~1100 px.

#### Scenario: Desktop shows two columns
- **WHEN** the viewport is at least 1100 px wide
- **THEN** the rates list and the focus/detail area are shown side by side

#### Scenario: Narrow viewport stacks to one column
- **WHEN** the viewport is narrower than 1100 px
- **THEN** the content is shown in a single column

### Requirement: Theme toggle (FR-SHELL-03)
The shell SHALL let the user switch between light and dark themes via `data-theme`
on the document, without a flash of the wrong theme.

#### Scenario: Switching to dark theme
- **WHEN** the user activates the theme toggle while in light theme
- **THEN** the interface re-renders in dark theme

### Requirement: Honest loading and empty states (FR-SHELL-04)
The shell SHALL show a skeleton of equal footprint while data loads and an honest
empty state when there is nothing to show; it SHALL never render a blank crash.

#### Scenario: Loading shows a skeleton
- **WHEN** rate data is still loading
- **THEN** a skeleton placeholder of comparable size is shown in place of the content
