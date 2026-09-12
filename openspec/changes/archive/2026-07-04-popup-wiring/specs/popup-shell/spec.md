## MODIFIED Requirements

### Requirement: Idle State Layout
The popup SHALL render an idle state containing the title "Export ticket to MD", an anonymization checkbox that is checked by default, and an Export button. When the active tab is not a recognized Jira ticket page, the Export button SHALL be disabled and a muted hint "Open a Jira ticket" SHALL be shown under the title (FR-04).

#### Scenario: Popup opens on a recognized ticket page
- **WHEN** the user opens the toolbar popup on a tab that looks like a Jira ticket page
- **THEN** the popup shows the title "Export ticket to MD", a checked anonymization checkbox, and an enabled Export button, with no hint

#### Scenario: Popup opens on a non-ticket page
- **WHEN** the user opens the toolbar popup on a tab that does not look like a Jira ticket page
- **THEN** the Export button is disabled and the muted hint "Open a Jira ticket" is shown under the title

### Requirement: Success State Layout
The popup SHALL render a success state showing a message confirming the export completed successfully. When the export completed but one or more attachments could not be downloaded, the success state SHALL additionally show a caveats details block listing the attachments that failed (FR-07, FR-12).

#### Scenario: Full success
- **WHEN** the export completes with every file downloaded
- **THEN** a confirmation message is visible stating the export completed successfully, with no caveats block

#### Scenario: Success with missing attachments
- **WHEN** the export completes but some attachments could not be downloaded
- **THEN** the success message is shown together with a details block listing each attachment that failed

### Requirement: Anonymization Checkbox Introduces No Extra State
The anonymization checkbox SHALL only be present in the idle state and SHALL NOT cause any additional popup state beyond idle/in-progress/success/error. Popup state transitions SHALL be driven by the real export flow (extraction, serialization, downloads) rather than a dev-only affordance.

#### Scenario: Toggling the checkbox stays in the idle state
- **WHEN** the user toggles the anonymization checkbox in the idle state
- **THEN** the popup remains in the idle state and no new state is shown

#### Scenario: State transitions come from the export flow
- **WHEN** the user clicks Export
- **THEN** the popup moves idle → in-progress → success (with optional caveats) or error, driven by real extraction and download results, with no dev-only state switcher present in the production build
