# reminder-engine Specification

## Purpose

The reminder-engine capability provides pure, deterministic functions for computing
when the next reminder (or a snoozed reminder) should fire, given a user's reminder
settings and a reference point in time. All scheduling logic clamps candidate times
into valid working windows and never reads the system clock internally.

## Requirements

### Requirement: Pure next-reminder computation
The system SHALL expose `computeNextReminder(settings, from): Date | null` as a pure
function in `lib/schedule/schedule.ts`. It MUST return `null` when `settings.enabled`
is false, and MUST NOT read the current time internally — `from` is the only source
of "now" (backs FR-REMIND-01, FR-REMIND-05).

#### Scenario: Disabled reminders return null
- **WHEN** `computeNextReminder` is called with `settings.enabled = false` and any `from`
- **THEN** the result is `null` (AC-REMIND-07)

#### Scenario: Determinism
- **WHEN** `computeNextReminder` is called twice with identical `settings` and `from`
- **THEN** both calls return the same value and no `new Date()` is read internally

### Requirement: Working window is half-open
The system SHALL treat a working window as `[workStart, workEnd)` on a working day:
`workStart` is inside the window and exactly `workEnd` is outside it (backs FR-REMIND-02).
`settings.workingDays` is a set of weekday numbers; a day not in that set has no window.

#### Scenario: workEnd boundary is excluded
- **WHEN** `from` is Mon 17:59 with `workEnd = "18:00"` and `interval = 120`
- **THEN** the next reminder is Tue 09:00, because `from + interval` lands at/after `workEnd` (AC-REMIND-06)

### Requirement: Next reminder clamps into the next valid window
The system SHALL compute the next reminder as `from + intervalMinutes`, then clamp it
into the next valid working window: a candidate before `workStart` snaps forward to
`workStart`; a candidate at/after `workEnd` or on a non-working day moves to the start
of the next working day's window (backs FR-REMIND-03).

#### Scenario: Candidate inside the window is kept
- **WHEN** `from` is Mon 10:00 with `interval = 120`
- **THEN** the next reminder is Mon 12:00 (AC-REMIND-01)

#### Scenario: Candidate past workEnd rolls to next working day
- **WHEN** `from` is Mon 17:30 with `interval = 120`
- **THEN** the next reminder is Tue 09:00 (AC-REMIND-02)

#### Scenario: Friday evening rolls over the weekend
- **WHEN** `from` is Fri 17:30 with `interval = 120`
- **THEN** the next reminder is Mon 09:00 (AC-REMIND-03)

#### Scenario: Non-working day rolls to next working day
- **WHEN** `from` is Sat 12:00 with `interval = 120`
- **THEN** the next reminder is Mon 09:00 (AC-REMIND-04)

#### Scenario: Candidate before workStart snaps to workStart
- **WHEN** `from` is Mon 07:30 with `interval = 60`
- **THEN** the next reminder is Mon 09:00 (AC-REMIND-05)

### Requirement: Pure snooze computation
The system SHALL expose `computeSnooze(settings, from): Date | null` as a pure function.
It MUST return `from + snoozeMinutes` clamped by the same window rule as the next-reminder
computation, and MUST return `null` when reminders are disabled (backs FR-REMIND-04).

#### Scenario: Snooze inside the window
- **WHEN** `computeSnooze` is called with `from` Mon 14:00 and `snoozeMinutes = 5`
- **THEN** the result is Mon 14:05 (AC-REMIND-08)

#### Scenario: Snooze past workEnd rolls to next working day
- **WHEN** `computeSnooze` is called with `from` Mon 17:58 and `snoozeMinutes = 5`
- **THEN** the result is Tue 09:00 (AC-REMIND-09)
