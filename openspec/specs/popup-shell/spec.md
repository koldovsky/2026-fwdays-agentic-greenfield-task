# popup-shell Specification

## Purpose

Defines the 4-state (idle / in-progress / success / error) layout and styling contract for the Ticket2MD popup. State transitions are driven by the real export flow (extraction, serialization, downloads) as wired by `popup-wiring`; the `export-flow` capability defines the orchestration behind those transitions.

## Requirements

### Requirement: Idle State Layout
The popup SHALL render an idle state containing the title "Export ticket to MD", an anonymization checkbox that is checked by default, and an Export button. When the active tab is not a recognized Jira ticket page, the Export button SHALL be disabled and a muted hint "Open a Jira ticket" SHALL be shown under the title (FR-04).

#### Scenario: Popup opens on a recognized ticket page
- **WHEN** the user opens the toolbar popup on a tab that looks like a Jira ticket page
- **THEN** the popup shows the title "Export ticket to MD", a checked anonymization checkbox, and an enabled Export button, with no hint

#### Scenario: Popup opens on a non-ticket page
- **WHEN** the user opens the toolbar popup on a tab that does not look like a Jira ticket page
- **THEN** the Export button is disabled and the muted hint "Open a Jira ticket" is shown under the title

### Requirement: In-Progress State Layout
The popup SHALL render an in-progress state showing a loader, replacing the idle state's controls while an export runs.

#### Scenario: In-progress state is displayed
- **WHEN** the popup is switched to the in-progress state
- **THEN** a loader is visible and the idle-state Export button and checkbox are not interactive

### Requirement: Success State Layout
The popup SHALL render a success state showing a message confirming the export completed successfully. When the export completed but one or more attachments could not be downloaded, the success state SHALL additionally show a caveats details block listing the attachments that failed (FR-07, FR-12).

#### Scenario: Full success
- **WHEN** the export completes with every file downloaded
- **THEN** a confirmation message is visible stating the export completed successfully, with no caveats block

#### Scenario: Success with missing attachments
- **WHEN** the export completes but some attachments could not be downloaded
- **THEN** the success message is shown together with a details block listing each attachment that failed

### Requirement: Error State Layout
The popup SHALL render an error state showing an error message with a details area for specifics about what broke.

#### Scenario: Error state is displayed
- **WHEN** the popup is switched to the error state
- **THEN** an error message is visible along with a details area (e.g. for a list of attachments that failed to download)

### Requirement: Anonymization Checkbox Introduces No Extra State
The anonymization checkbox SHALL only be present in the idle state and SHALL NOT cause any additional popup state beyond idle/in-progress/success/error. Popup state transitions SHALL be driven by the real export flow (extraction, serialization, downloads) rather than a dev-only affordance.

#### Scenario: Toggling the checkbox stays in the idle state
- **WHEN** the user toggles the anonymization checkbox in the idle state
- **THEN** the popup remains in the idle state and no new state is shown

#### Scenario: State transitions come from the export flow
- **WHEN** the user clicks Export
- **THEN** the popup moves idle → in-progress → success (with optional caveats) or error, driven by real extraction and download results, with no dev-only state switcher present in the production build

### Requirement: Pico CSS Styling Only
The popup SHALL be styled using only Pico CSS variables, with vanilla TypeScript and no UI framework, and with no hardcoded color values.

#### Scenario: Popup markup is inspected for styling
- **WHEN** the popup's stylesheet is reviewed
- **THEN** all colors resolve through Pico CSS custom properties and no React/Preact/other UI framework dependency is present in `app/`
