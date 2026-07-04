## ADDED Requirements

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
