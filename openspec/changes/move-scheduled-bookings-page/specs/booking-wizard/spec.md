# Delta: booking-wizard

## MODIFIED Requirements

### Requirement: Wizard without embedded queue (FR-WIZ-01)

The What → Who → When → Confirm wizard SHALL remain the sole content on `/book` aside from page chrome.

#### Scenario: No inline scheduled panel

- **WHEN** user is on `/book` during or after the wizard
- **THEN** scheduled job management is only available via `/scheduled`
