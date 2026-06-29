# navigation Specification

## Purpose
Breadcrumb navigation from the shelf down to the current inner page.
## Requirements
### Requirement: Breadcrumb navigation
Inner pages SHALL show a breadcrumb trail from the shelf down to the current page, where
every crumb except the current one is a link.

#### Scenario: Book page breadcrumb
- **WHEN** viewing `/book/<slug>`
- **THEN** the breadcrumb shows "The shelf" (link to `/`) and the book title (current)

#### Scenario: Add-note breadcrumb
- **WHEN** viewing `/book/<slug>/notes/new`
- **THEN** the breadcrumb shows "The shelf" → the book title (link to `/book/<slug>`) → "Add note" (current)

#### Scenario: Current crumb is not a link
- **WHEN** a breadcrumb trail is shown
- **THEN** the last crumb is marked as the current page and is not a link

