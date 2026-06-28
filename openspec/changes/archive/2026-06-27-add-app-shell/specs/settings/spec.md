## ADDED Requirements

### Requirement: Editable reminder settings
The system SHALL let the user set `workStart` and `workEnd` (as `"HH:MM"`),
`workingDays`, `intervalMinutes`, `snoozeMinutes`, `enabled`, and `soundEnabled`
through the Settings view, persisting changes via the settings storage layer
(backs FR-SETTINGS-01). The view is delivered with the app shell, which owns the
DESIGN.md tokens and navigation it relies on.

#### Scenario: User edits a field
- **WHEN** the user changes `intervalMinutes` in the Settings view
- **THEN** the new value is held in the active settings object and persisted

### Requirement: Changing a setting recomputes the next reminder
The system SHALL recompute the next reminder immediately whenever any setting
changes, by calling `computeNextReminder` with the updated settings, and reflect
the result in the main view (backs FR-SETTINGS-04).

#### Scenario: Interval change updates the next reminder
- **WHEN** the user changes `intervalMinutes` from 60 to 120
- **THEN** the displayed next-reminder time is recomputed from the new settings at once
