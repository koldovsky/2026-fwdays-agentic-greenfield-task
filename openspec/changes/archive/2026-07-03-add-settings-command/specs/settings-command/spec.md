# settings-command

## Purpose

`/налаштування` handler for viewing and updating `display_name` and Sunday reminder time
(FR-SET-01, FR-SET-02).

## ADDED Requirements

### Requirement: Settings command shows current preferences

The `/налаштування` command SHALL reply in Ukrainian with the user's current `display_name`
when set, or a label indicating general (non-personalized) messages when `display_name` is
NULL, and the configured `reminder_time` in `HH:MM` format. (FR-SET-01)

#### Scenario: Name set and reminder time shown

- **WHEN** an allowlisted user with `display_name` «Оленка» and `reminder_time` `09:00` sends
  `/налаштування`
- **THEN** the reply shows the name «Оленка» and reminder time `09:00`

#### Scenario: Cleared name shown as general messages

- **WHEN** an allowlisted user with `display_name` NULL sends `/налаштування`
- **THEN** the reply indicates general messages (no personalized name prefix)

### Requirement: Settings command offers change actions

The `/налаштування` reply SHALL offer the user actions to change display name, clear display
name, and change reminder time without leaving the command flow. (FR-SET-01, FR-SET-02)

#### Scenario: Change name action

- **WHEN** the user chooses to change display name from `/налаштування`
- **THEN** the bot prompts for a new name in Ukrainian and waits for the next text message

#### Scenario: Clear name action

- **WHEN** the user chooses to clear display name from `/налаштування`
- **THEN** the bot sets `display_name` to NULL and confirms that future messages will be general
  (FR-SET-02)

#### Scenario: Change reminder time action

- **WHEN** the user chooses to change reminder time from `/налаштування`
- **THEN** the bot prompts for a time in `HH:MM` format and waits for the next text message
  (FR-SET-01)

### Requirement: Settings command persists valid updates

After a valid name or reminder-time input, the bot SHALL persist the change to `user_settings`
and reply with a short Ukrainian confirmation. (FR-SET-01, FR-SET-02)

#### Scenario: Name update saved

- **WHEN** the user submits a valid display name while the settings flow awaits name input
- **THEN** `display_name` is updated in the database and the bot confirms the new name

#### Scenario: Reminder time update saved

- **WHEN** the user submits a valid `HH:MM` reminder time while the settings flow awaits time
  input
- **THEN** `reminder_time` is updated in the database and the bot confirms the new time

#### Scenario: Invalid name rejected

- **WHEN** the user submits an invalid display name (empty after trim or longer than 40
  characters) while awaiting name input
- **THEN** the bot replies in Ukrainian with a validation error and does not persist the change
  (FR-SET-03)

#### Scenario: Invalid reminder time rejected

- **WHEN** the user submits text that is not a valid `HH:MM` time while awaiting reminder input
- **THEN** the bot replies in Ukrainian with a format hint and does not persist the change
