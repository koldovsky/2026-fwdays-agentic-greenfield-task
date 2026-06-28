# notify Specification

## Purpose

Notify the user when a break is due, using the browser Notification API alongside an in-app card, with explicit permission handling, graceful fallback, and optional sound.

## Requirements

### Requirement: Raise a notification when a break is due
The system SHALL, while the app is open, detect when the next-reminder time is reached
and raise both a Notification (via the Notification API) and an in-app card (backs FR-NOTIFY-01).

#### Scenario: Due time reached while open
- **WHEN** the app is open and the current time reaches the computed next-reminder time
- **THEN** a Notification is raised (if permitted) and the in-app due-break card is shown

### Requirement: Two break actions
The system SHALL offer exactly two actions on the notification and card: "Took a break"
and "Snooze {n} min", where `{n}` is `snoozeMinutes` (backs FR-NOTIFY-02).

#### Scenario: Snooze label reflects settings
- **WHEN** `snoozeMinutes` is 5
- **THEN** the snooze action reads "Snooze 5 min" and choosing it reschedules via `computeSnooze`

#### Scenario: Took a break clears the due state
- **WHEN** the user chooses "Took a break"
- **THEN** the due card is dismissed and the next reminder is recomputed

### Requirement: Permission requested only on explicit action
The system SHALL request Notification permission only in response to an explicit user
action — enabling reminders — and SHALL NOT request it silently on page load
(backs FR-NOTIFY-03, BC-NOTIFY-01).

#### Scenario: No permission prompt on load
- **WHEN** the app loads
- **THEN** no Notification permission prompt is shown

#### Scenario: Prompt on enabling reminders
- **WHEN** the user explicitly enables reminders
- **THEN** the Notification permission is requested at that moment

### Requirement: Graceful fallback when denied
The system SHALL, when Notification permission is denied, fall back to the in-app card
only and SHALL NOT raise an error (backs FR-NOTIFY-04).

#### Scenario: Denied permission still nudges
- **WHEN** permission is denied and a break becomes due
- **THEN** only the in-app card is shown, with no error surfaced

### Requirement: Optional selected sound
The system SHALL play the selected local sound together with the notification only
when `soundEnabled` is true (backs FR-NOTIFY-05). Supported sounds are `"ping"`
(the existing short sound), `"melody-10"` (a 10 second melody), and `"melody-30"`
(a 30 second melody).

#### Scenario: Sound off stays silent
- **WHEN** a break becomes due and `soundEnabled` is false
- **THEN** no sound plays while the notification/card still appears

#### Scenario: Selected melody plays
- **WHEN** a break becomes due, `soundEnabled` is true, and `soundChoice` is `"melody-10"`
- **THEN** the 10 second melody is played while the notification/card appears
