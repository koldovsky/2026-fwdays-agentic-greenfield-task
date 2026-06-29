# C9 — Server Actions (Mutations)

**OpenSpec change:** `add-mutations`
**Owner:** `app/actions.ts`
**Depends on:** C4 (Book Store), C5 (Note Store), C6, C1
**Maps to:** requirements.md §3.3

## Purpose
The single write path from the UI: server actions that parse `FormData`, call the
stores, then revalidate and redirect. Pure form parsers are unit-testable.

## Requirements

### Requirement: Parse book form data
The system SHALL parse a book form into `BookMeta` — splitting tags (lowercased,
hashtag-style), validating status (default `toread`), rating (1–10), and `coverColor`.

#### Scenario: Bad status defaults
- **WHEN** the form status is unrecognized
- **THEN** the parsed status is `toread`

### Requirement: Parse note form data
The system SHALL parse a note form into `{ slug, Note }` — color (default `yellow`),
optional excerpt + page, and links split per line.

#### Scenario: Excerpt and page
- **WHEN** the form has excerpt and page
- **THEN** the parsed note carries them; absent values are omitted

### Requirement: Persist and navigate
Create/update book and save/delete note actions SHALL write via the stores, revalidate
the affected paths, and redirect to the book (notes anchor to `#<id>`).

#### Scenario: Save note redirects to its anchor
- **WHEN** a note is saved
- **THEN** the user lands on `/book/<slug>#<id>`
