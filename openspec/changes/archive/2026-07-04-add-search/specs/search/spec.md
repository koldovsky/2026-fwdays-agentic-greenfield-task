## ADDED Requirements

### Requirement: Full-text search across title and content
The system SHALL provide full-text search over each user's own, non-deleted notes,
matching against both `title` and `content`.

#### Scenario: Query matches a note's title
- **WHEN** an authenticated user searches for a word that appears only in one of their
  note's titles
- **THEN** that note appears in the results

#### Scenario: Query matches a note's content
- **WHEN** an authenticated user searches for a word that appears only in one of their
  note's content
- **THEN** that note appears in the results

#### Scenario: Search never returns another user's notes
- **WHEN** an authenticated user searches for a term that matches another user's note
- **THEN** that other user's note is excluded from the results

#### Scenario: Search excludes trashed notes
- **WHEN** an authenticated user searches for a term that matches a note they previously
  soft-deleted
- **THEN** that note is excluded from the results

### Requirement: Filter search results by folder
Users SHALL be able to narrow search results to a single folder, combinable with the text
query and other filters.

#### Scenario: Folder filter narrows results
- **WHEN** a user applies a folder filter alongside a search query
- **THEN** only matching notes inside that folder are returned

### Requirement: Filter search results by tags
Users SHALL be able to narrow search results to one or more tags, combinable with the text
query and other filters.

#### Scenario: Tag filter narrows results
- **WHEN** a user selects one or more tags as a filter alongside a search query
- **THEN** only matching notes carrying at least one of the selected tags are returned

### Requirement: Filter search results by date range
Users SHALL be able to narrow search results to notes last updated within a date range,
combinable with the text query and other filters.

#### Scenario: Date range filter narrows results
- **WHEN** a user sets a from/to date range alongside a search query
- **THEN** only matching notes last updated within that range (inclusive) are returned

### Requirement: Live results while typing
Search results SHALL update automatically as the user types, without requiring a submit
action.

#### Scenario: Results update after typing pauses
- **WHEN** a user types a query into the search field
- **THEN** the result list updates to reflect the current query shortly after the user
  pauses typing, without a page reload

#### Scenario: Stale responses do not overwrite newer results
- **WHEN** a user types quickly enough that an earlier search request is still in flight
  when a newer one is issued
- **THEN** only the response for the most recent query is reflected in the displayed
  results
