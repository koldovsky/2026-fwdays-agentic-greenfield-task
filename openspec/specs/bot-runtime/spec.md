# bot-runtime

## Purpose

Bot process bootstrap: configuration loading from environment and long-polling
connection to Telegram.

## Requirements

### Requirement: Long-polling bot bootstrap

The bot SHALL connect to Telegram using long polling via `python-telegram-bot` and
SHALL load configuration from environment variables at startup. (TC-STACK-01,
TC-DEPLOY-01)

#### Scenario: Bot starts with valid config

- **WHEN** `BOT_TOKEN` and `ALLOWED_USER_IDS` are set and the entrypoint is run
- **THEN** the application initializes and begins polling without raising config errors

#### Scenario: Database initialized before polling

- **WHEN** the bot starts successfully
- **THEN** the SQLite schema is initialized before the polling loop accepts updates

### Requirement: Config module

The system SHALL provide a config module that parses `BOT_TOKEN`, `ALLOWED_USER_IDS`
(comma-separated integers), and optional `DATABASE_PATH` (default `./data/bot.db`).
(NFR-OPS-01)

#### Scenario: Allowlist parsed from env

- **WHEN** `ALLOWED_USER_IDS` is set to `12345,67890`
- **THEN** the config exposes a set `{12345, 67890}`

#### Scenario: Invalid allowlist rejected

- **WHEN** `ALLOWED_USER_IDS` contains non-numeric values
- **THEN** startup fails with a clear configuration error

### Requirement: Reminder jobs scheduled at startup

After the application is built, the bot SHALL register Sunday reminder `JobQueue` jobs for all
eligible users. (FR-REM-01)

#### Scenario: Startup schedules reminders

- **WHEN** `build_application` completes and `post_init` runs
- **THEN** reminder jobs are registered for allowlisted users with completed setup

### Requirement: Telegram command menu registration

On startup, the bot SHALL register the canonical v1 command roster with Telegram via
`set_my_commands` so the menu appears in the Telegram client. (FR-CMD-01)

#### Scenario: Command menu set after application build

- **WHEN** the bot application is built and the post-init hook runs
- **THEN** `set_my_commands` is called with `BotCommand` entries matching the canonical roster
  command names and Ukrainian descriptions

#### Scenario: Menu registration uses Ukrainian descriptions

- **WHEN** `set_my_commands` is invoked at startup
- **THEN** every registered command description is non-empty Ukrainian text
