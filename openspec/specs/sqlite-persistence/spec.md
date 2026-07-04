# sqlite-persistence

## Purpose

Durable SQLite storage for user settings and weigh-in entries, with a repository
layer that keeps SQL out of handlers.

## Requirements

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

### Requirement: Delete latest weigh-in

The repository SHALL expose a function to delete the most recent `weigh_ins` row for a
given user and return the deleted record, or `None` if no rows exist. (FR-LOG-07)

#### Scenario: Delete latest row

- **WHEN** `delete_latest_weigh_in(user_id)` is called and the user has weigh-ins
- **THEN** the row with the latest `recorded_at` (tie-break by highest `id`) is
  removed and returned

#### Scenario: Delete when empty

- **WHEN** `delete_latest_weigh_in(user_id)` is called and the user has no weigh-ins
- **THEN** the function returns `None` and no database error is raised

### Requirement: Fetch first weigh-in

The repository SHALL expose a function to return the user's earliest `weigh_ins` row by
`recorded_at` ascending (tie-break by lowest `id`), or `None` if no rows exist.

#### Scenario: First entry returned

- **WHEN** `get_first_weigh_in(user_id)` is called and the user has weigh-ins
- **THEN** the row with the earliest `recorded_at` is returned

#### Scenario: No entries

- **WHEN** `get_first_weigh_in(user_id)` is called and the user has no weigh-ins
- **THEN** the function returns `None`

### Requirement: Fetch recent weigh-ins in descending order

The repository SHALL expose a function to return up to `limit` weigh-in rows for a user ordered by
`recorded_at` descending (tie-break by highest `id`).

#### Scenario: Limited recent list

- **WHEN** `list_weigh_ins_desc(user_id, limit=2)` is called and the user has three or more entries
- **THEN** the two most recent rows are returned with the newest first

#### Scenario: Fewer rows than limit

- **WHEN** `list_weigh_ins_desc(user_id, limit=2)` is called and the user has one entry
- **THEN** a single-element list is returned
