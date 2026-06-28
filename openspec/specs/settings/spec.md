# settings Specification

## Purpose

The settings capability owns the user's reminder configuration: the framework-free
defaults, validation, and default-merge logic in `lib/settings/`, plus a thin
`localStorage` persistence layer in `src/storage/`. It guarantees a usable settings
object on first run and never throws on absent, partial, or corrupt stored data.

## Requirements

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
`enabled true`, `soundEnabled true`, `soundChoice "ping"` (backs FR-SETTINGS-03).
Stored values SHALL be validated and merged over these defaults so any missing or
invalid field is safe.

#### Scenario: First run with empty storage
- **WHEN** the app loads and `break-reminder:settings` is absent
- **THEN** the default settings above are applied without error

#### Scenario: Invalid fields are replaced by defaults
- **WHEN** stored settings contain an invalid `"HH:MM"` time or a non-positive interval
- **THEN** each invalid field falls back to its default while valid fields are kept

### Requirement: Editable reminder settings
The system SHALL let the user set `workStart` and `workEnd` (as `"HH:MM"`),
`workingDays`, `intervalMinutes`, `snoozeMinutes`, `enabled`, `soundEnabled`, and
`soundChoice` (`"ping"`, `"melody-10"`, or `"melody-30"`) through the Settings
view, persisting changes via the settings storage layer (backs FR-SETTINGS-01).
The view is delivered with the app shell, which owns the DESIGN.md tokens and
navigation it relies on.

#### Scenario: User edits a field
- **WHEN** the user changes `intervalMinutes` in the Settings view
- **THEN** the new value is held in the active settings object and persisted

#### Scenario: User chooses a reminder sound
- **WHEN** the user chooses `"melody-10"` or `"melody-30"` in the Settings view
- **THEN** that `soundChoice` is held in the active settings object and persisted

### Requirement: Changing a setting recomputes the next reminder
The system SHALL recompute the next reminder immediately whenever any setting
changes, by calling `computeNextReminder` with the updated settings, and reflect
the result in the main view (backs FR-SETTINGS-04).

#### Scenario: Interval change updates the next reminder
- **WHEN** the user changes `intervalMinutes` from 60 to 120
- **THEN** the displayed next-reminder time is recomputed from the new settings at once
