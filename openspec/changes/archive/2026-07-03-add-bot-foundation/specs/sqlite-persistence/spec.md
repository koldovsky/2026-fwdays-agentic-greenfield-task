## ADDED Requirements

### Requirement: SQLite schema for user settings

The system SHALL persist `user_settings` in SQLite with columns matching the PRD
data model: `telegram_user_id` (PK), `display_name`, `reminder_time`,
`reminder_timezone`, `reminder_weekday`, `setup_completed_at`. (NFR-REL-01,
TC-STACK-02)

#### Scenario: Schema created on first run

- **WHEN** the bot starts with a new database file
- **THEN** the `user_settings` table exists with the expected columns

#### Scenario: Settings survive restart

- **WHEN** a row is inserted into `user_settings` and the bot process restarts
- **THEN** the same row is readable from the database

### Requirement: SQLite schema for weigh-ins

The system SHALL persist `weigh_ins` in SQLite with columns: `id` (PK), `user_id`
(FK → `user_settings`), `recorded_at`, `weight_kg`, `fat_pct`, `muscle_pct`, `bmi`.
(NFR-REL-01)

#### Scenario: Weigh-in table exists

- **WHEN** the bot starts with a new database file
- **THEN** the `weigh_ins` table exists with the expected columns and foreign key

#### Scenario: Weigh-in data survives restart

- **WHEN** a weigh-in row is inserted and the bot process restarts
- **THEN** the row is still present with all metric values intact

### Requirement: Repository layer

The system SHALL expose a repository module with functions to read and write
`user_settings` and `weigh_ins` without handlers executing raw SQL.

#### Scenario: Get or create user settings

- **WHEN** `get_or_create_settings(telegram_user_id)` is called for a new user
- **THEN** a `user_settings` row is created with PRD defaults (`display_name`
  `Оленка`, `reminder_time` `09:00`, `reminder_timezone` `Europe/Kyiv`,
  `reminder_weekday` 6)

#### Scenario: Insert and fetch weigh-in

- **WHEN** a weigh-in is inserted via the repository and fetched by user id
- **THEN** the returned record matches the inserted metrics and timestamp
