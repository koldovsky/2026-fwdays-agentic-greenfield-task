## ADDED Requirements

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
