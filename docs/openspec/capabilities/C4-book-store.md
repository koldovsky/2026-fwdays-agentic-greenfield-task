# C4 — Book Store

**OpenSpec change:** `add-book-store`
**Owner:** `lib/content/books.ts`
**Depends on:** C1 (Storage I/O), C2 (Domain Model), C3 (Slug)
**Maps to:** requirements.md §2.2, §4 (malformed handling, data integrity)

## Purpose
CRUD over books as `book.md` files: parse/serialize frontmatter to/from typed `Book`
objects, create with a unique slug, list, and update.

## Requirements

### Requirement: Frontmatter round-trip
The system SHALL serialize a `Book` to `book.md` and parse it back to an equal object.

#### Scenario: Round-trip preserves fields
- **WHEN** a book is serialized then parsed
- **THEN** the parsed object equals the original (title, author, status, rating, tags, summary, body)

### Requirement: Tolerant parsing of malformed metadata
When required fields (title, author) are missing or mistyped, the system SHALL still
return a `Book` flagged `malformed: true` with safe defaults, never throwing.

#### Scenario: Missing title/author
- **WHEN** parsing a `book.md` with no title
- **THEN** `malformed` is true, title falls back to the slug, status defaults to `toread`

### Requirement: Create with a unique slug
The system SHALL create a book from a desired slug (or the title), suffixing `-2`,
`-3`, … on collision, and return the final slug.

#### Scenario: Slug collision
- **WHEN** creating two books that resolve to the same base slug
- **THEN** the second gets a `-2` suffix

### Requirement: List and update
The system SHALL list all books sorted by title and overwrite a book's metadata + body on update.

#### Scenario: Listing is sorted
- **WHEN** listing books
- **THEN** they are ordered by title
