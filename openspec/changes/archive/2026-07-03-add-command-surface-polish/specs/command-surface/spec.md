## ADDED Requirements

### Requirement: Canonical v1 command roster

The system SHALL define a single canonical list of the nine v1 bot commands with Ukrainian
descriptions suitable for Telegram's command menu. (FR-CMD-01)

The roster SHALL include exactly: `/start`, `/вага`, `/прогрес`, `/історія`, `/місяць`,
`/весь_час`, `/налаштування`, `/скасувати`, `/допомога`.

#### Scenario: Roster matches PRD

- **WHEN** the canonical roster is read from the command-surface module
- **THEN** it contains exactly the nine commands listed in FR-CMD-01 with non-empty Ukrainian
  descriptions

### Requirement: Handler coverage for roster commands

The bot application SHALL register a `MessageHandler` for each command in the canonical roster so
that allowlisted users can invoke every listed command. (FR-CMD-01)

#### Scenario: Each roster command has a handler

- **WHEN** `build_application` is called with valid config
- **THEN** the application has a registered handler that matches each command name in the canonical
  roster
