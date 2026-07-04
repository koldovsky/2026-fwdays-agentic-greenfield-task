# onboarding-flow

## Purpose

One-time `/start` setup: Sunday reminder time, optional first weigh-in, defaults, and
`setup_completed_at` persistence (FR-ONB-01..05, FR-CMD-02).

## Requirements

### Requirement: Start command runs one-time two-step setup

When `setup_completed_at` is NULL, `/start` SHALL run a two-step setup flow in order: (1) choose
Sunday reminder time, (2) optionally log the first weigh-in. (FR-ONB-01)

#### Scenario: New user begins onboarding

- **WHEN** an allowlisted user with `setup_completed_at` NULL sends `/start`
- **THEN** the bot replies in Ukrainian with step 1 asking for Sunday reminder time

#### Scenario: Step order is reminder then weigh-in

- **WHEN** the user completes step 1 (preset, custom time, or skip)
- **THEN** the bot presents step 2 offering to log the first weigh-in now or later

### Requirement: Reminder time step offers presets custom entry and skip

Step 1 SHALL offer preset reminder times, a custom `HH:MM` entry path, and **Skip** that applies
the default `09:00`. (FR-ONB-02)

#### Scenario: Preset time selected

- **WHEN** the user taps a preset reminder-time button during step 1
- **THEN** the bot saves that time and advances to step 2

#### Scenario: Custom time entered

- **WHEN** the user chooses custom time and sends a valid `HH:MM` string
- **THEN** the bot normalizes and saves the time and advances to step 2

#### Scenario: Custom time invalid

- **WHEN** the user sends text that is not a valid `HH:MM` time while awaiting custom time
- **THEN** the bot replies in Ukrainian with a format hint and remains on the custom-time step

#### Scenario: Skip applies default time

- **WHEN** the user taps **Skip** on step 1
- **THEN** the bot saves reminder time `09:00` and advances to step 2

### Requirement: First weigh-in step offers now or later

Step 2 SHALL offer **Now** (start weigh-in immediately) and **Later** (defer to `/вага`).
(FR-ONB-03)

#### Scenario: Now starts weigh-in

- **WHEN** the user chooses **Now** on step 2
- **THEN** the bot prompts for four weigh-in numbers using the same format hint as `/вага` and
  awaits the next text message as a weigh-in entry

#### Scenario: Later defers weigh-in

- **WHEN** the user chooses **Later** on step 2
- **THEN** the bot confirms setup is complete and does not await a weigh-in message

### Requirement: Setup completion sets default display name

When onboarding completes, the bot SHALL set `display_name` to **Оленка** without prompting for a
name during onboarding. (FR-ONB-04)

#### Scenario: Display name after completion

- **WHEN** the user finishes step 2 (Now or Later)
- **THEN** `display_name` in `user_settings` is «Оленка»

### Requirement: Skip and dismiss paths apply PRD defaults

Skipping reminder time or completing setup via dismiss paths SHALL apply defaults: display name
«Оленка», reminder `09:00`, timezone `Europe/Kyiv`. (FR-ONB-05)

#### Scenario: Defaults after skip on reminder step

- **WHEN** the user skips reminder time and completes step 2 with **Later**
- **THEN** `reminder_time` is `09:00`, `display_name` is «Оленка», and `reminder_timezone` remains
  `Europe/Kyiv`

### Requirement: Setup completion is persisted

When onboarding finishes, the bot SHALL set `setup_completed_at` to a non-null ISO timestamp in
`user_settings`. (FR-ONB-01, FR-ONB-05)

#### Scenario: Timestamp recorded

- **WHEN** the user completes step 2
- **THEN** `setup_completed_at` is set in the database

### Requirement: Completed start shows short help

When `setup_completed_at` is set, `/start` SHALL reply with short Ukrainian help instead of
re-running setup. (FR-CMD-02)

#### Scenario: Repeat start after onboarding

- **WHEN** an allowlisted user with non-null `setup_completed_at` sends `/start`
- **THEN** the bot replies with short help listing key commands and the weigh-in input format
- **AND** does not present onboarding step 1 again
