## ADDED Requirements

### Requirement: Top repositories section
The stats view SHALL render a collapsible **Top repositories** section whose title
toggles the list open and closed. Expanded, it SHALL list up to ten repositories
ranked by star count descending, ties broken by most-recent activity (newest
first). Each row SHALL show the rank, the repository name linking to its GitHub
page, the primary language with its color dot, the description, the star count,
and the month/year of last activity. Below the list a **"View all repositories on
GitHub"** link SHALL point to the user's repositories tab.

#### Scenario: Ranked most-starred list
- **WHEN** the section is expanded for a user with public repositories
- **THEN** up to ten repositories are listed by descending star count, each linking to its GitHub page

#### Scenario: Tie-break by recency
- **WHEN** two repositories have the same star count
- **THEN** the more recently active one is listed first

#### Scenario: Collapsible title
- **WHEN** the visitor clicks the section title
- **THEN** the repository list toggles between expanded and collapsed

#### Scenario: View all link
- **WHEN** the section is expanded
- **THEN** a "View all repositories on GitHub" link points to the user's repositories tab

#### Scenario: No repositories
- **WHEN** the user has no public repositories
- **THEN** the section renders an empty state without error
