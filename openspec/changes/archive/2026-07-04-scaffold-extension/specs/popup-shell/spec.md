## ADDED Requirements

### Requirement: Idle State Layout
The popup SHALL render an idle state containing the title "Export ticket to MD", an anonymization checkbox that is checked by default, and an Export button.

#### Scenario: Popup opens with no prior action
- **WHEN** the user opens the toolbar popup and no export has been triggered
- **THEN** the popup shows the title "Export ticket to MD", a checked anonymization checkbox, and an enabled Export button

### Requirement: In-Progress State Layout
The popup SHALL render an in-progress state showing a loader, replacing the idle state's controls while an export runs.

#### Scenario: In-progress state is displayed
- **WHEN** the popup is switched to the in-progress state
- **THEN** a loader is visible and the idle-state Export button and checkbox are not interactive

### Requirement: Success State Layout
The popup SHALL render a success state showing a message confirming the export completed successfully.

#### Scenario: Success state is displayed
- **WHEN** the popup is switched to the success state
- **THEN** a confirmation message is visible stating the export completed successfully

### Requirement: Error State Layout
The popup SHALL render an error state showing an error message with a details area for specifics about what broke.

#### Scenario: Error state is displayed
- **WHEN** the popup is switched to the error state
- **THEN** an error message is visible along with a details area (e.g. for a list of attachments that failed to download)

### Requirement: Anonymization Checkbox Introduces No Extra State
The anonymization checkbox SHALL only be present in the idle state and SHALL NOT cause any additional popup state beyond idle/in-progress/success/error.
The 4-state popup shell in this change is a scaffold: state switching is driven by a dev-only affordance (not real export logic), superseded when `popup-wiring` wires actual extraction and download behavior.

#### Scenario: Toggling the checkbox stays in the idle state
- **WHEN** the user toggles the anonymization checkbox in the idle state
- **THEN** the popup remains in the idle state and no new state is shown

#### Scenario: State can be previewed without triggering a real export
- **WHEN** a developer uses the dev-only state-switching affordance
- **THEN** each of the 4 states renders correctly with no `chrome.downloads` call and no DOM parsing performed

### Requirement: Pico CSS Styling Only
The popup SHALL be styled using only Pico CSS variables, with vanilla TypeScript and no UI framework, and with no hardcoded color values.

#### Scenario: Popup markup is inspected for styling
- **WHEN** the popup's stylesheet is reviewed
- **THEN** all colors resolve through Pico CSS custom properties and no React/Preact/other UI framework dependency is present in `app/`
