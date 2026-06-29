# C15 — Cover Images

**OpenSpec change:** `add-cover-images`
**Owner:** `app/book/[slug]/[...cover]/route.ts`, `saveCover` (in `app/actions.ts`)
**Depends on:** C1 (Storage I/O)
**Maps to:** requirements.md §3.3 (cover upload), §3.2 (display)

## Purpose
Store an uploaded cover image in the book folder and serve it back over HTTP, with a
path-traversal guard.

## Requirements

### Requirement: Save an uploaded cover
The system SHALL write an uploaded image atomically into the book folder and record its
filename on the book.

#### Scenario: Upload stored
- **WHEN** a cover image is uploaded with a book
- **THEN** the file is saved beside `book.md` and `cover` points to it

### Requirement: Serve covers
The system SHALL serve files from a book folder with the correct content type.

#### Scenario: Image request
- **WHEN** requesting `/book/<slug>/cover.jpg`
- **THEN** the image bytes are returned with an `image/*` content type

### Requirement: Reject path traversal
The system SHALL reject requests whose path contains `..`.

#### Scenario: Traversal attempt
- **WHEN** a cover request path contains `..`
- **THEN** the response is `400 Bad request`
