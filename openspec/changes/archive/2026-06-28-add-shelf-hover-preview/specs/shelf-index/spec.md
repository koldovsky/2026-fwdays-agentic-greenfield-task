## MODIFIED Requirements

### Requirement: Book spine
Each book SHALL render as a vertical spine that reads like a real book: a tile colored
by the book's `coverColor` (default `ink`) with a binding highlight, head/tail bands, and
a page-edge shadow, showing the title and author as vertical text. Spines MAY vary in
height and thickness deterministically so the shelf reads like real books.

#### Scenario: Spine shows title and author
- **WHEN** a book is rendered on a shelf
- **THEN** its spine shows the book title and author in the book's cover color

#### Scenario: Hover highlights the spine
- **WHEN** the pointer hovers a spine
- **THEN** the spine is visually highlighted (raised/brightened)

## ADDED Requirements

### Requirement: Hover preview
Hovering a spine SHALL show a lightweight preview card — the book's cover (image or
generated color block), title, author, and a short summary — without a modal scrim. The
full summary popup remains a click action.

#### Scenario: Hover shows the preview
- **WHEN** the pointer hovers a spine
- **THEN** a preview card with the book's cover, title, author, and summary appears, with no scrim

#### Scenario: Preview hidden by default
- **WHEN** the pointer is not over any spine
- **THEN** no preview card is shown
