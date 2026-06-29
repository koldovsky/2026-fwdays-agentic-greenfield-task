## MODIFIED Requirements

### Requirement: Book summary popup
Clicking a spine SHALL open a popup showing the book's cover (the cover image, or a
generated color block when there is no image), title, author, rating, status, tags, and
summary. The popup SHALL offer an "Add note" action linking to `/book/<slug>/notes/new`
and an "Open book" link to `/book/<slug>` (the title also links to the book page). The
popup SHALL be dismissable.

#### Scenario: Click opens the popup
- **WHEN** the user clicks a book spine
- **THEN** a popup opens showing that book's summary and cover

#### Scenario: Add note from the popup
- **WHEN** the popup is open and the user activates "Add note"
- **THEN** the user navigates to `/book/<slug>/notes/new`

#### Scenario: Popup links to the full page
- **WHEN** the popup is open
- **THEN** it offers an "Open book" link (and a clickable title) to `/book/<slug>`

#### Scenario: Dismiss the popup
- **WHEN** the user clicks the scrim, the close control, or presses Escape
- **THEN** the popup closes
