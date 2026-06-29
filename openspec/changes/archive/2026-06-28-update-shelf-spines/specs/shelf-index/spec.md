## MODIFIED Requirements

### Requirement: Shelves grouped by tag
The system SHALL render one shelf per tag (via the C8 grouping), with a book
appearing under each of its tags.

#### Scenario: Empty library
- **WHEN** there are no books
- **THEN** an empty state invites adding the first book

#### Scenario: Multi-tag book on multiple shelves
- **WHEN** a book has more than one tag
- **THEN** it appears as a spine under each of its tag shelves

## REMOVED Requirements

### Requirement: Book card with navigation
**Reason**: Replaced by a vertical book-spine view with a summary popup.
**Migration**: Books now render as a `BookSpine` standing on a shelf; clicking opens a
popup that contains an "Open book" link to `/book/<slug>` instead of navigating directly.

## ADDED Requirements

### Requirement: Book spine
Each book SHALL render as a vertical spine: a tile colored by the book's `coverColor`
(default `ink`) showing the title and author as vertical text. Spines MAY vary in height
deterministically so the shelf reads like real books.

#### Scenario: Spine shows title and author
- **WHEN** a book is rendered on a shelf
- **THEN** its spine shows the book title and author in the book's cover color

#### Scenario: Hover highlights the spine
- **WHEN** the pointer hovers a spine
- **THEN** the spine is visually highlighted (raised/brightened)

### Requirement: Book summary popup
Clicking a spine SHALL open a popup showing the book's cover (the cover image, or a
generated color block when there is no image), title, author, rating, status, tags, and
summary, plus an "Open book" link to `/book/<slug>`. The popup SHALL be dismissable.

#### Scenario: Click opens the popup
- **WHEN** the user clicks a book spine
- **THEN** a popup opens showing that book's summary and cover

#### Scenario: Popup links to the full page
- **WHEN** the popup is open
- **THEN** it offers an "Open book" link to `/book/<slug>`

#### Scenario: Dismiss the popup
- **WHEN** the user clicks the scrim, the close control, or presses Escape
- **THEN** the popup closes
