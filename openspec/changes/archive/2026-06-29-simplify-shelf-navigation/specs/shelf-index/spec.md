## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Book summary popup
**Reason**: The click-to-open modal depended on client hydration; when JS didn't hydrate,
clicking a book did nothing and the only visible element (the CSS hover preview) was a
dead end. It also duplicated the hover preview.
**Migration**: Clicking a spine now navigates directly to `/book/<slug>`. The quick
summary and the "Open book" / "Add note" actions live in the hover preview; the full book
page provides notes and editing.
