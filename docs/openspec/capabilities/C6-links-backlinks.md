# C6 — Links & Backlinks

**OpenSpec change:** `add-links-backlinks`
**Owner:** `lib/content/links.ts`
**Depends on:** C2 (Domain Model)
**Maps to:** requirements.md §3.4, §4 (broken links)

## Purpose
Pure logic for the link graph: parse `book:`/`note:` link strings, produce canonical
keys and hrefs, build the backlink index from books + notes, and detect broken links.

## Requirements

### Requirement: Parse link strings
The system SHALL parse `book:<slug>` and `note:<slug>/<id>` into typed links and return
null for anything malformed.

#### Scenario: Valid and invalid links
- **WHEN** parsing `book:deep-work`, `note:deep-work/n-9`, and `nonsense`
- **THEN** the first two parse to typed links and `nonsense` returns null

### Requirement: Canonical key and href
The system SHALL produce a canonical key (`book:slug` / `note:slug/id`) and a route
href (`/book/slug` / `/book/slug#id`).

#### Scenario: Note href anchors the note
- **WHEN** building the href for a note link
- **THEN** it is `/book/<slug>#<id>`

### Requirement: Backlink index
The system SHALL build a map from each link target to the list of sources (which
book/note links to it).

#### Scenario: Source is recorded
- **WHEN** note A in book X links to book Y
- **THEN** the index for `book:Y` includes `{ fromBook: X, fromNote: A }`

### Requirement: Broken-link detection
The system SHALL report a link as broken when its target book/note does not exist.

#### Scenario: Dangling target
- **WHEN** a link points to a slug that is not in the known set
- **THEN** it is flagged broken
