## ADDED Requirements

### Requirement: Initial page load performance
The application SHALL load its initial view in under 2 seconds under normal conditions,
and the note editor route SHALL NOT load its Markdown-preview rendering dependencies until
the user switches into Preview mode.

#### Scenario: Note editor defers preview dependencies
- **WHEN** a user opens a note in the editor and never switches to Preview mode
- **THEN** the Markdown rendering and sanitization libraries used only for Preview are not
  loaded as part of that page's initial JavaScript

#### Scenario: Preview still renders correctly once requested
- **WHEN** a user switches a note editor into Preview mode
- **THEN** the note's content is rendered as sanitized HTML, matching what is shown when
  the same content is rendered on the server

### Requirement: Lighthouse Performance score
The application's production build SHALL score at least 95 on Lighthouse's Performance
category for representative routes.

#### Scenario: Representative routes meet the Performance bar
- **WHEN** a production build is audited with Lighthouse (Performance category) on the
  lightest route (login) and the heaviest route (note editor)
- **THEN** each route scores at least 95

### Requirement: Keyboard accessibility of interactive controls
Every interactive control that a mouse user can activate SHALL also be reachable and
activatable using only the keyboard.

#### Scenario: Clickable tag chips are keyboard-operable
- **WHEN** a keyboard user tabs to a clickable tag chip (e.g. a tag filter or an
  unassigned-tag chip in the tag picker)
- **THEN** the chip receives visible focus and activates on Enter or Space

#### Scenario: Sidebar row actions are reachable without a mouse
- **WHEN** a keyboard user tabs into a folder or tag row in the sidebar
- **THEN** that row's rename and delete actions become visible and reachable via Tab,
  without requiring a mouse hover

### Requirement: Bypass repeated navigation
The application SHALL provide a way for keyboard and screen-reader users to skip repeated
navigation blocks and go directly to the main content of a page.

#### Scenario: Skip link reaches main content
- **WHEN** a keyboard user presses Tab as the first action after a dashboard page loads
- **THEN** a "skip to content" link receives focus, and activating it moves focus to the
  page's main content, bypassing the sidebar navigation

### Requirement: Toggle controls expose their state
Toggle-style controls SHALL expose their current state to assistive technology.

#### Scenario: Write/Preview toggle announces the active mode
- **WHEN** a screen-reader user inspects the note editor's Write/Preview toggle buttons
- **THEN** the currently active mode is exposed as pressed/selected state, not conveyed by
  visual styling alone
