## ADDED Requirements

### Requirement: Settings persist in localStorage
The system SHALL persist the settings object in `localStorage` under the key
`break-reminder:settings`, and SHALL restore it on reload (backs FR-SETTINGS-02).
Loading SHALL never throw: absent, partial, or corrupt stored data falls back to
validated defaults.

#### Scenario: Settings survive reload
- **WHEN** a setting is changed and saved, then the app reloads
- **THEN** the changed value is read back from `break-reminder:settings` and applied

#### Scenario: Corrupt stored data falls back to defaults
- **WHEN** the stored value under `break-reminder:settings` is not valid JSON
- **THEN** loading returns the default settings without error

### Requirement: Calm first-run defaults
The system SHALL, when no settings are stored, apply defaults: `workStart "09:00"`,
`workEnd "18:00"`, `workingDays` Mon–Fri, `intervalMinutes 60`, `snoozeMinutes 5`,
`enabled true`, `soundEnabled true` (backs FR-SETTINGS-03). Stored values SHALL be
validated and merged over these defaults so any missing or invalid field is safe.

#### Scenario: First run with empty storage
- **WHEN** the app loads and `break-reminder:settings` is absent
- **THEN** the default settings above are applied without error

#### Scenario: Invalid fields are replaced by defaults
- **WHEN** stored settings contain an invalid `"HH:MM"` time or a non-positive interval
- **THEN** each invalid field falls back to its default while valid fields are kept
