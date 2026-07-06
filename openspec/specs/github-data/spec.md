# github-data Specification

## Purpose
TBD - created by archiving change github-battle-mvp. Update Purpose after archive.
## Requirements
### Requirement: Fetch profile, repos, and events
For a username the data layer SHALL fetch the profile from `GET /users/{u}`, repos
from `GET /users/{u}/repos?per_page=100` (paginated), and `GET /users/{u}/events`.
(FR-DATA-01)

#### Scenario: All three sources fetched
- **WHEN** data is loaded for a username
- **THEN** the profile, the full repos list, and the events list are retrieved from the GitHub REST API

### Requirement: Unauthenticated requests with headers
All GitHub calls SHALL be unauthenticated (no token) and SHALL set a descriptive
`User-Agent` and `Accept: application/vnd.github+json`. (FR-DATA-02, TC-STACK-03,
NFR-COST-01)

#### Scenario: Request headers present
- **WHEN** any GitHub request is made
- **THEN** it carries no Authorization token and includes a descriptive User-Agent and the GitHub JSON Accept header

### Requirement: Bounded repo pagination
Repo pagination SHALL follow until all public repos are retrieved or a documented
safety cap (5 pages / 500 repos) is reached. (FR-DATA-03)

#### Scenario: Multi-page user
- **WHEN** a user has more than 100 public repos
- **THEN** subsequent pages are fetched until exhausted or the 5-page / 500-repo cap is reached

### Requirement: Pure aggregation into UserStats
Aggregation into the fifteen metrics SHALL be performed by pure functions in `lib/`
that take raw API payloads and return a typed `UserStats`, with no framework imports.
(FR-DATA-04, TC-PURE-01)

#### Scenario: Deterministic aggregation
- **WHEN** the aggregation functions receive fixed raw payloads
- **THEN** they return the same typed `UserStats` with no dependency on `next/*`, `react`, or DOM globals

### Requirement: Rate-limit handling
On HTTP 403 with rate-limit exhaustion, the data layer SHALL surface a calm explicit
message ("GitHub rate limit reached, try again later") and never crash or blank.
(FR-DATA-05, NFR-OBS-01)

#### Scenario: Rate limit hit
- **WHEN** a GitHub call returns 403 due to rate-limit exhaustion
- **THEN** a calm "GitHub rate limit reached, try again later" message is surfaced without a crash

### Requirement: Not-found during fetch
On HTTP 404 during a data fetch, the page SHALL show a "User not found" state rather
than an error boundary. (FR-DATA-06)

#### Scenario: User removed after validation
- **WHEN** a data fetch returns 404 for a previously-valid username
- **THEN** the page renders a "User not found" state, not a crash or error boundary

### Requirement: Session cache
The last successful `UserStats` per username SHALL be cached in memory for the
session to avoid refetching on re-navigation. (FR-DATA-07, NFR-RATE-01)

#### Scenario: Re-navigation served from cache
- **WHEN** a username's stats are loaded again within the session
- **THEN** the cached `UserStats` is used with no additional GitHub calls

### Requirement: Metric — total stars
`UserStats` SHALL include total stars as the sum of `stargazers_count` across all
repos. (FR-METRIC-01)

#### Scenario: Sum stars
- **WHEN** aggregating repos with star counts 3, 0, and 5
- **THEN** total stars is 8

### Requirement: Metric — total forks received
`UserStats` SHALL include total forks received as the sum of `forks_count` across all
repos. (FR-METRIC-02)

#### Scenario: Sum forks
- **WHEN** aggregating repos with fork counts 1 and 2
- **THEN** total forks received is 3

### Requirement: Metric — followers
`UserStats` SHALL include followers from the profile `followers` field. (FR-METRIC-03)

#### Scenario: Followers from profile
- **WHEN** the profile reports 42 followers
- **THEN** the followers metric is 42

### Requirement: Metric — original repos
`UserStats` SHALL include original repos as the count of repos where `fork == false`.
(FR-METRIC-04)

#### Scenario: Count non-forks
- **WHEN** aggregating repos where two are forks and three are not
- **THEN** original repos is 3

### Requirement: Metric — language diversity
`UserStats` SHALL include language diversity as the count of distinct non-null
`language` values across repos. (FR-METRIC-05)

#### Scenario: Count distinct languages
- **WHEN** repo languages are TypeScript, TypeScript, Go, and null
- **THEN** language diversity is 2

### Requirement: Metric — account age
`UserStats` SHALL include account age as the whole years between profile `created_at`
and today. (FR-METRIC-06)

#### Scenario: Whole years
- **WHEN** the account was created 3 years and 2 months ago
- **THEN** account age is 3

### Requirement: Metric — commit activity (90d)
`UserStats` SHALL include commit activity as the count of `PushEvent` in the trailing
90-day events window. (FR-METRIC-07)

#### Scenario: Count push events
- **WHEN** the events window contains 4 `PushEvent` entries
- **THEN** commit activity is 4

### Requirement: Metric — PR activity (90d)
`UserStats` SHALL include PR activity as the count of `PullRequestEvent` in the
90-day events window. (FR-METRIC-08)

#### Scenario: Count PR events
- **WHEN** the events window contains 2 `PullRequestEvent` entries
- **THEN** PR activity is 2

### Requirement: Metric — issue activity (90d)
`UserStats` SHALL include issue activity as the count of `IssuesEvent` in the 90-day
events window. (FR-METRIC-09)

#### Scenario: Count issue events
- **WHEN** the events window contains 1 `IssuesEvent`
- **THEN** issue activity is 1

### Requirement: Metric — releases (90d)
`UserStats` SHALL include releases as the count of `ReleaseEvent` in the 90-day
events window. (FR-METRIC-10)

#### Scenario: Count release events
- **WHEN** the events window contains 0 `ReleaseEvent` entries
- **THEN** releases is 0

### Requirement: Metric — public gists
`UserStats` SHALL include public gists from the profile `public_gists` field.
(FR-METRIC-11)

#### Scenario: Gists from profile
- **WHEN** the profile reports 7 public gists
- **THEN** the public gists metric is 7

### Requirement: Metric — total watchers
`UserStats` SHALL include total watchers as the sum of `watchers_count` across all
repos. (FR-METRIC-12)

#### Scenario: Sum watchers
- **WHEN** aggregating repos with watcher counts 10 and 5
- **THEN** total watchers is 15

### Requirement: Metric — code volume
`UserStats` SHALL include code volume (KB) as the sum of repo `size` across all repos.
(FR-METRIC-13)

#### Scenario: Sum sizes
- **WHEN** aggregating repos with sizes 100 and 250
- **THEN** code volume is 350

### Requirement: Metric — following
`UserStats` SHALL include following from the profile `following` field. (FR-METRIC-14)

#### Scenario: Following from profile
- **WHEN** the profile reports 30 following
- **THEN** the following metric is 30

### Requirement: Metric — forked repos count
`UserStats` SHALL include forked repos count as the count of repos where
`fork == true`. (FR-METRIC-15)

#### Scenario: Count forks
- **WHEN** aggregating repos where two are forks
- **THEN** forked repos count is 2

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

