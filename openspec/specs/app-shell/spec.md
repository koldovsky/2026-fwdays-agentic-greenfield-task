# Spec: App Shell

## Purpose

The app shell is the persistent browser-frame chrome that wraps every non-reader screen in Edda.
It provides a left sidebar with primary navigation, a routing skeleton for all major routes, and
an installable PWA shell with offline precaching. The reader route opts out of the sidebar and
renders full-bleed. Sourced from change `add-app-shell`.

## Requirements

### Requirement: Persistent sidebar navigation

The app SHALL present a persistent left sidebar containing, in order: the Edda wordmark; primary nav
items Home, Library, Search, and Downloads (Downloads showing a count badge); a "Sources" region
listing connected sources; and a footer with Extensions and Settings. The sidebar SHALL match
`doc/web/01-library-desktop.png` and `doc/web/06-extensions-desktop.png`.

#### Scenario: Sidebar renders the maket's navigation

- **WHEN** the app loads on a non-reader route
- **THEN** the left sidebar shows the wordmark, the Home/Library/Search/Downloads items (Downloads
  with a numeric badge), a Sources region, and an Extensions/Settings footer, matching
  `doc/web/01-library-desktop.png`

#### Scenario: Active nav item is indicated

- **WHEN** the user is on a given route (e.g. Library)
- **THEN** the corresponding sidebar item is shown as active, as in `doc/web/01-library-desktop.png`

#### Scenario: Sources region lists connected sources

- **WHEN** sources are connected
- **THEN** the Sources region lists each with a status dot and a monospace descriptor line
  (e.g. `komga · 12 libraries`, `opds v2 · classics`, `opds · local only`), matching the sidebar in
  `doc/web/01-library-desktop.png`
- **AND** an "Add source" affordance is present at the end of the region

### Requirement: Browser-frame content layout

The app SHALL render screen content in the main region beside the sidebar, with the warm parchment
canvas and generous spacing of the maket. The layout SHALL be responsive enough that the sidebar and
content do not overlap or clip at common desktop widths.

#### Scenario: Content sits beside the sidebar

- **WHEN** a content screen renders
- **THEN** its content occupies the main region to the right of the sidebar on the parchment canvas,
  matching the composition of `doc/web/01-library-desktop.png`

### Requirement: Routing skeleton

The app SHALL define routes for the library home, a book detail view, the reader, and settings
(extensions / reading / general). The reader route SHALL render full-bleed without the sidebar. The
reader route SHALL be keyed by `(sourceId, bookId, mediaType)`.

#### Scenario: Sidebar routes resolve

- **WHEN** the user activates Home, Library, Search, Downloads, Extensions, or Settings
- **THEN** the router navigates to the corresponding route and the shell shows that screen's region
  (placeholder content is acceptable for screens not yet implemented)

#### Scenario: Reader route is full-bleed and format-keyed

- **WHEN** the app navigates to `/reader/:sourceId/:bookId/:mediaType`
- **THEN** the view renders full-bleed without the sidebar
- **AND** the three identifiers are available to the view (honoring per-format progress keying)

### Requirement: Global loading and empty states

The app SHALL provide consistent loading and empty states styled in the design system, used by screens
while data resolves or when no content exists.

#### Scenario: Empty library state

- **WHEN** no sources are connected and the library has no content
- **THEN** the main region shows a styled empty state inviting the user to add a source (not a blank
  or unstyled page)

### Requirement: Installable PWA with shell precache

The app SHALL be installable as a PWA with a web manifest, and its service worker SHALL precache the
app shell. The service worker SHALL NOT intercept book-byte range requests; such requests bypass the
service worker so range (`206`) reads are served directly from storage.

#### Scenario: App is installable and shell is precached

- **WHEN** the built app is served and loaded once
- **THEN** a valid web manifest is present and the service worker precaches the app-shell assets
- **AND** on a subsequent load with no network, the app shell renders from the precache

#### Scenario: Book bytes bypass the service worker

- **WHEN** a book-byte range request (a `206` partial read from storage) is made
- **THEN** the service worker does not intercept it (the request is served directly, not via Workbox)
