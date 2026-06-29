# mutations Specification

## Purpose
Server actions that persist book and note edits submitted from forms.
## Requirements
### Requirement: Parse book form data
The system SHALL parse a book form into `BookMeta` — splitting tags (lowercased,
hashtag-style), validating status (default `toread`), rating (1–10), and `coverColor`.

#### Scenario: Bad status defaults
- **WHEN** the form status is unrecognized
- **THEN** the parsed status is `toread`

#### Scenario: Empty optionals omitted
- **WHEN** rating, coverColor, and tags are empty
- **THEN** rating and coverColor are undefined and tags is an empty array

### Requirement: Parse note form data
The system SHALL parse a note form into `{ slug, Note }` — color (default `yellow`),
optional excerpt + page, and links split per line.

#### Scenario: Excerpt and page
- **WHEN** the form has excerpt and page
- **THEN** the parsed note carries them; absent values are omitted

#### Scenario: Invalid color defaults
- **WHEN** the form color is not a known highlighter
- **THEN** the parsed note color is `yellow`

### Requirement: Persist and navigate
Create/update book and save/delete note actions SHALL write via the stores, revalidate
the affected paths, and redirect to the book (notes anchor to `#<id>`).

#### Scenario: Save note redirects to its anchor
- **WHEN** a note is saved
- **THEN** the user lands on `/book/<slug>#<id>`

