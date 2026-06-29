# shelf-index Specification

## Purpose
The home shelf: books grouped into per-tag shelves, rendered as a wooden bookcase.
## Requirements
### Requirement: Shelves grouped by tag
The system SHALL render one shelf per tag (via the C8 grouping), with a book
appearing under each of its tags.

#### Scenario: Empty library
- **WHEN** there are no books
- **THEN** an empty state invites adding the first book

#### Scenario: Multi-tag book on multiple shelves
- **WHEN** a book has more than one tag
- **THEN** it appears as a spine under each of its tag shelves

### Requirement: Add book entry point
The screen SHALL offer an "Add book" action linking to `/book/new`.

#### Scenario: Add book action
- **WHEN** the user activates the "Add book" action
- **THEN** the user navigates to `/book/new`

### Requirement: Book spine
Each book SHALL render as a vertical spine that reads like a real book: a tile colored by
the book's `coverColor` (default `ink`) with a binding highlight, head/tail bands, and a
page-edge shadow, showing the title and author as vertical text, varying in height and
thickness deterministically. The spine SHALL be a link to `/book/<slug>` so that clicking
a book navigates to its page without depending on client-side JavaScript.

#### Scenario: Spine shows title and author
- **WHEN** a book is rendered on a shelf
- **THEN** its spine shows the book title and author in the book's cover color

#### Scenario: Clicking a spine opens the book page
- **WHEN** the user clicks a book spine
- **THEN** the browser navigates to `/book/<slug>` (a plain link; works without JS)

#### Scenario: Hover highlights the spine
- **WHEN** the pointer hovers a spine
- **THEN** the spine is visually highlighted (raised/brightened)

### Requirement: Hover preview
Hovering a spine SHALL show a lightweight preview card — the book's cover (image or
generated color block), title, author, and a short summary — without a modal scrim. The
preview SHALL include "Open book" (→ `/book/<slug>`) and "Add note"
(→ `/book/<slug>/notes/new`) links.

#### Scenario: Hover shows the preview with actions
- **WHEN** the pointer hovers a spine
- **THEN** a preview card appears (no scrim) with the book's cover, title, author, summary, and "Open book" / "Add note" links

#### Scenario: Preview hidden by default
- **WHEN** the pointer is not over a spine or its preview
- **THEN** no preview card is shown

