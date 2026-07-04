## ADDED Requirements

### Requirement: Python bot project root

The repository SHALL contain a `nedilya-na-vagakh/` directory as the bot project
root with a Python 3.11+ package, `requirements.txt`, and a `tests/` directory for
`pytest`. (TC-STACK-01, TC-STACK-03)

#### Scenario: Project layout exists

- **WHEN** a developer clones the repo
- **THEN** `nedilya-na-vagakh/requirements.txt` and `nedilya-na-vagakh/tests/` are
  present and `python-telegram-bot` is listed as a dependency

#### Scenario: Tests run from bot root

- **WHEN** the developer runs `pytest` from `nedilya-na-vagakh/`
- **THEN** the test suite executes without import errors

### Requirement: Environment variable documentation

The project SHALL ship `.env.example` documenting all required environment variables
for secrets and configuration. Secrets MUST NOT be committed to the repository.
(NFR-OPS-01)

#### Scenario: Example env file lists required vars

- **WHEN** a developer opens `nedilya-na-vagakh/.env.example`
- **THEN** it documents at least `BOT_TOKEN` and `ALLOWED_USER_IDS` with brief
  descriptions

#### Scenario: Missing secrets fail at startup

- **WHEN** the bot starts without `BOT_TOKEN` set
- **THEN** startup fails with a clear error before connecting to Telegram
