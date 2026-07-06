## ADDED Requirements

### Requirement: Top repositories aggregation
`UserStats` SHALL include a `topRepos` list produced by a pure function that ranks
the fetched repositories by star count descending, breaking ties by most-recent
activity (newest first), and keeps at most ten. Each entry SHALL carry the repo
name, GitHub URL, description, primary language (with its GitHub color), star
count, and last-activity timestamp. The function SHALL be framework-free
(TC-PURE-01) and safe when there are no repositories.

#### Scenario: Ranking and cap
- **WHEN** the aggregation runs over a user's repositories
- **THEN** `topRepos` holds at most ten entries ordered by descending stars, ties broken by newer activity

#### Scenario: Empty repositories
- **WHEN** the user has no repositories
- **THEN** `topRepos` is an empty list
