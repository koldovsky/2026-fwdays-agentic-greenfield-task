## ADDED Requirements

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
