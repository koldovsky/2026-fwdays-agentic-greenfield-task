## MODIFIED Requirements

### Requirement: Profile rendering
`/stats/[username]` SHALL fetch the user's data and render profile info: avatar,
name, login, bio, and a meta line with location, joined year, and follower /
following counts, plus links. (FR-STATS-01)

#### Scenario: Profile shown
- **WHEN** the stats page loads for an existing user
- **THEN** the avatar, name, login, bio, and a meta line with location, joined year, and follower/following counts are rendered

## ADDED Requirements

### Requirement: Recent activity chart
The stats view SHALL render a bar chart of the four 90-day activity metrics —
commits, pull requests, issues, and releases — with each bar's height scaled to
the largest value and its count labelled. Bars SHALL use the design-system accent
on the track token (TC-STACK-05) and respect `prefers-reduced-motion`.

#### Scenario: Activity bars
- **WHEN** the stats page loads
- **THEN** a bar chart shows commits, pull requests, issues, and releases with their 90-day counts

### Requirement: Reach and influence chart
The stats view SHALL render horizontal bars for stars, forks, watchers, and
followers, each bar scaled relative to the largest of the four values, with the
value shown alongside.

#### Scenario: Reach bars
- **WHEN** the stats page loads
- **THEN** horizontal bars for stars, forks, watchers, and followers are shown, scaled to the largest value

### Requirement: Repository composition chart
The stats view SHALL render a single stacked bar splitting original vs forked
repositories, using the two brand accents, with a legend and the total public
repo count.

#### Scenario: Repo split
- **WHEN** the stats page loads
- **THEN** a stacked bar shows the original-vs-forked share with a legend and the total repo count

#### Scenario: No repositories
- **WHEN** the user has no public repositories
- **THEN** the composition bar renders without error (empty/zero state)
