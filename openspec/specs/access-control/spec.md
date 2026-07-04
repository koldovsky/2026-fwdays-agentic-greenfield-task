# access-control

## Purpose

Telegram user allowlist enforcement before any handler or database access runs.

## Requirements

### Requirement: Allowlist enforcement

Only Telegram user IDs present in the configured allowlist SHALL be permitted to
interact with the bot. All other users MUST be rejected before any command handler
or database access occurs. (FR-SEC-01)

#### Scenario: Allowlisted user passes gate

- **WHEN** an update arrives from a Telegram user ID in `ALLOWED_USER_IDS`
- **THEN** the update is passed to subsequent handlers (none required in foundation)

#### Scenario: Non-allowlisted user blocked

- **WHEN** an update arrives from a Telegram user ID not in `ALLOWED_USER_IDS`
- **THEN** the bot does not read or write any stored user data for that request

### Requirement: Neutral Ukrainian refusal

Non-allowlisted users SHALL receive a brief, neutral refusal message in Ukrainian.
The message MUST NOT reveal whether data exists or disclose internal configuration.
(FR-SEC-02, NFR-I18N-01)

#### Scenario: Refusal message language and tone

- **WHEN** a non-allowlisted user sends any message to the bot
- **THEN** the bot replies in Ukrainian with a neutral personal-use refusal and does
  not expose allowlist contents or other users' data

#### Scenario: No data leakage on rejection

- **WHEN** a non-allowlisted user triggers the refusal path
- **THEN** no query is made against `user_settings` or `weigh_ins` for that user
