## ADDED Requirements

### Requirement: Visual regression against the maket

The visual-fidelity suite SHALL render each maket screen at the maket's viewport and assert the
rendered screenshot matches the corresponding `doc/web` (or `doc/mobile`) PNG within the agreed
per-screen tolerance. This comparison SHALL be the release acceptance gate: a difference beyond
tolerance fails the build. Volatile regions (the faux browser-frame controls, relative timestamps)
MUST be masked or frozen so the comparison is deterministic, and the suite SHALL run on a seeded
fixture that mirrors the content shown in each PNG.

#### Scenario: Library matches the maket

- **WHEN** the Library screen renders on the maket fixture (the seed mirroring
  `doc/web/01-library-desktop.png`: "Your library", "342 titles · 3 sources · 14 downloaded for
  offline", the "Keep reading" and "Recently added" rows)
- **THEN** its screenshot matches `doc/web/01-library-desktop.png` within the agreed tolerance

#### Scenario: Book detail matches the maket

- **WHEN** the Book detail screen renders for "Pride and Prejudice" (cover, the metadata chips
  "1813 / English / 432 pages / Fiction · Romance", the "YOUR PROGRESS" 38% card, the "SYNCED PER
  FORMAT" card, and the chapters list)
- **THEN** its screenshot matches `doc/web/02-book-detail-desktop.png` within the agreed tolerance

#### Scenario: Reader two-page spread matches the maket

- **WHEN** the desktop EPUB reader renders the parchment two-page spread of "Pride and Prejudice"
  (Chapter One, running heads, pager arrows, bottom scrubber "p. 1–2 / 432 · 6 min left in chapter")
- **THEN** its screenshot matches `doc/web/03-reader-desktop-epub-spread.png` within the agreed
  tolerance

#### Scenario: Reading themes and preferences match the maket

- **WHEN** the reading-preferences "Display" sheet and the four theme moods render
- **THEN** the screenshot matches `doc/mobile/04-reading-themes-and-preferences.png` within the
  agreed tolerance (THEME Light/Sepia/Dark/Parchment, TYPEFACE Newsreader/Literata/Sans, TEXT SIZE
  17pt, LAYOUT Paged/Scroll, SPACING)

#### Scenario: Add a source matches the maket

- **WHEN** the "Add a source" modal renders at the Detected step (stepper 1 Address ✓ / 2 Detected /
  3 Sign in, the detected "Komga server", capability chips, the Connect button)
- **THEN** its screenshot matches `doc/web/05-add-source-desktop.png` within the agreed tolerance

#### Scenario: Extensions match the maket

- **WHEN** the Extensions screen renders (INSTALLED · 3 with the OPDS/Komga/EPUB bundled toggles, and
  AVAILABLE with PDF/Kavita/Calibre/CBZ Install actions)
- **THEN** its screenshot matches `doc/web/06-extensions-desktop.png` within the agreed tolerance

#### Scenario: Capability-missing sheet matches the maket

- **WHEN** the "Install PDF support?" capability sheet renders over a dimmed library
- **THEN** its screenshot matches `doc/web/07-capability-missing-desktop.png` within the agreed
  tolerance

#### Scenario: Regression beyond tolerance fails the gate

- **WHEN** any screen drifts from its committed golden baseline beyond the agreed tolerance
- **THEN** the visual-regression check fails and blocks the build

### Requirement: Asynchronous and connectivity states

Every data-backed screen SHALL present styled loading, empty, error, and offline states drawn from
the design system — never a blank or unstyled page — and the visual-fidelity suite SHALL verify each.

#### Scenario: Loading state

- **WHEN** a screen's data is still resolving
- **THEN** a styled loading placeholder (skeleton or spinner in the parchment design system) is shown
  in place of the content

#### Scenario: Empty state

- **WHEN** a screen has no content (e.g., no sources connected, an empty library, or no search
  results)
- **THEN** a styled empty state with guidance (e.g., an invitation to add a source) is shown

#### Scenario: Error state

- **WHEN** a data load fails (e.g., a source is unreachable)
- **THEN** a styled error state with a retry affordance is shown
- **AND** activating retry re-attempts the load

#### Scenario: Offline state

- **WHEN** the network is unavailable
- **THEN** the app shows a styled offline indicator and still renders downloaded content, with
  online-only actions visibly disabled rather than broken

### Requirement: Pointer and focus interaction feedback

Interactive controls SHALL present visible hover, active/pressed, and keyboard-focus states. The
focus indicator MUST be visible (a focus-visible ring) on every focusable control.

#### Scenario: Hover feedback

- **WHEN** the pointer hovers a book card, a nav item, or a button
- **THEN** the control shows its hover treatment, matching the maket's interactive affordances

#### Scenario: Active/pressed feedback

- **WHEN** a button (e.g., "Continue reading", "Connect", "Install & open") is pressed
- **THEN** it shows a distinct active/pressed treatment

#### Scenario: Visible focus ring

- **WHEN** a control receives focus via the keyboard
- **THEN** a visible focus ring is rendered on that control

### Requirement: Library and reader view modes

The library SHALL offer a grid↔list toggle and the reader SHALL offer a paged↔scroll toggle.
Selecting a mode SHALL re-lay-out the content and persist the choice, and both controls SHALL match
the maket.

#### Scenario: Grid/list toggle

- **WHEN** the user toggles the "Recently added" segmented control from grid to list (the control at
  the top-right of the grid in `doc/web/01-library-desktop.png`)
- **THEN** the books re-render as a list
- **AND** toggling back restores the grid

#### Scenario: Paged/scroll toggle

- **WHEN** the user switches LAYOUT from Paged to Scroll in the reading preferences
  (`doc/mobile/04-reading-themes-and-preferences.png`)
- **THEN** the reader switches from paginated columns to continuous scroll, and back again on toggle

### Requirement: Reading theme switching

The reader SHALL apply each of the four reading themes — Light, Sepia, Dark, Parchment — to the book
content, and each rendered theme SHALL match its mood in
`doc/mobile/04-reading-themes-and-preferences.png`. Book typography is readium-css (owned by
`reading-preferences`); this requirement is the visual acceptance that all four themes render
correctly.

#### Scenario: Each theme renders its mood

- **WHEN** the user selects Light, then Sepia, then Dark, then Parchment in the Display sheet
- **THEN** the reading surface and text recolor to that theme, each matching the corresponding phone
  in `doc/mobile/04-reading-themes-and-preferences.png`

#### Scenario: Selected theme is indicated

- **WHEN** a theme is active
- **THEN** its swatch is shown selected in the Display sheet (as Dark is shown selected in the maket)

### Requirement: Add-source stepper states

The "Add a source" flow SHALL present its three stepper states — Address, Detected, Sign in — each
styled per `doc/web/05-add-source-desktop.png`, with address-reachability and detected-capability
feedback.

#### Scenario: Address step

- **WHEN** the flow opens at step 1
- **THEN** the SERVER ADDRESS field is shown with step 1 active
- **AND** entering a reachable URL shows a "Reachable" indicator

#### Scenario: Detected step shows capabilities

- **WHEN** a Komga server is detected (step 2)
- **THEN** the detected card shows "Komga server", the `connector.komga · bundled · opds v2 + rest`
  descriptor, an "Adapter ready" badge, and the capability chips (Progress sync, Search, Page
  streaming, Thumbnails), matching `doc/web/05-add-source-desktop.png`

#### Scenario: Sign-in step connects

- **WHEN** the user enters credentials at step 3 and activates Connect
- **THEN** the source is connected and the modal closes
- **AND** a failed connection surfaces an inline error instead of closing

### Requirement: Extensions and capability-install states

The Extensions screen SHALL render the installed list (bundled connectors and formats with enable
toggles) and the available list (installable extensions), and a capability-missing sheet SHALL appear
when opening a book whose format is not installed — matching `doc/web/06-extensions-desktop.png` and
`doc/web/07-capability-missing-desktop.png`. Installing the missing format SHALL retry opening the
book.

#### Scenario: Installed and available lists

- **WHEN** the Extensions screen renders
- **THEN** INSTALLED shows the bundled OPDS, Komga, and EPUB extensions (ids/versions in monospace,
  capability chips, enable toggles) and AVAILABLE shows PDF/Kavita/Calibre/CBZ with Install actions,
  matching `doc/web/06-extensions-desktop.png`

#### Scenario: Capability-missing sheet on an unsupported format

- **WHEN** the user opens a book whose format is not installed (e.g., the PDF "The Picture of Dorian
  Gray")
- **THEN** the "Install PDF support?" sheet appears with the extension card
  (`format.pdf · v1.0.3 · 1.2 MB`, "No network access", "Runs sandboxed") and an "Install & open"
  action, matching `doc/web/07-capability-missing-desktop.png`

#### Scenario: Install then retry open

- **WHEN** the user activates "Install & open"
- **THEN** the format extension installs via a dynamic `import()` of a lazy chunk (not a remote code
  download)
- **AND** the book opens automatically once the format is available

### Requirement: Keyboard navigation and accessibility

The application SHALL be operable by keyboard and SHALL pass automated accessibility checks
(axe-core) with no serious or critical violations on every screen. Focus order SHALL be logical, all
interactive controls SHALL have accessible names, modals and sheets SHALL trap focus and close on
Escape, and text and UI color contrast SHALL meet WCAG 2.1 AA across the parchment chrome and all
four reading themes.

#### Scenario: Axe passes on every screen

- **WHEN** axe-core runs against Library, Book detail, Reader, Reading preferences, Add source,
  Extensions, and the Capability-missing sheet
- **THEN** there are no serious or critical accessibility violations

#### Scenario: Keyboard-only operation

- **WHEN** a user navigates with Tab/Shift-Tab and activates controls with Enter/Space
- **THEN** focus moves in a logical order, every interactive control is reachable and operable, and
  the reader can be paged with the keyboard

#### Scenario: Modal focus trap and Escape

- **WHEN** the Add-source modal or the capability-missing sheet is open
- **THEN** focus is trapped within it
- **AND** Escape closes it and returns focus to the control that opened it

#### Scenario: Accessible names on icon-only controls

- **WHEN** an icon-only control renders (the grid/list toggle, share, bookmark, pager arrows, "Aa",
  close)
- **THEN** it exposes an accessible name to assistive technology

#### Scenario: Contrast meets WCAG AA

- **WHEN** contrast is measured on chrome text and on each of the four reading themes
- **THEN** text and UI contrast meet WCAG 2.1 AA

### Requirement: Responsive layout

Screens SHALL render without overlap, clipping, or horizontal overflow across common viewport widths
(phone, tablet, desktop), and the phone layouts SHALL match the `doc/mobile` baselines. The comic
reader SHALL lay out right-to-left for RTL comics.

#### Scenario: No breakage across widths

- **WHEN** each screen renders at representative phone, tablet, and desktop widths
- **THEN** content reflows without overlap, clipping, or horizontal scrollbars

#### Scenario: Phone layouts match the mobile maket

- **WHEN** the Library, Book detail, and EPUB reader render at phone width
- **THEN** they match `doc/mobile/01-library-mobile.png`, `doc/mobile/02-book-detail-mobile.png`, and
  `doc/mobile/03-reader-mobile-epub.png` within the agreed tolerance

#### Scenario: Comic reader is right-to-left

- **WHEN** a right-to-left comic renders in the reader
- **THEN** pages advance right-to-left, matching `doc/mobile/03-reader-comic-cbz-rtl.png`

### Requirement: End-to-end offline happy path against Komga

There SHALL be an automated end-to-end test, gated on a provisioned Docker Komga
(`pnpm komga:provision`), that exercises the full v1 journey and is the source of the PR video demo:
add the Komga source, browse the library, open a book, paginate, adjust reading preferences, go
offline and continue reading a downloaded book, then reconnect and observe reading progress reconcile
furthest-progression-wins. The test SHALL authenticate as the least-privilege reader account and
SHALL be skipped (not failed) when Komga is not provisioned.

#### Scenario: Full offline happy path

- **WHEN** the e2e test runs against a provisioned Komga (`pnpm komga:provision`, library seeded from
  `test-epubs/`) and adds the source `http://localhost:25600` as `reader@edda.test`
- **THEN** the source connects, the library lists the seeded books, a book opens and paginates, the
  reading preferences can be changed, and the flow completes — recorded as the demo video

#### Scenario: Offline read with the network cut

- **WHEN** a downloaded book is open and the network is set offline
- **THEN** the reader keeps working and the book's pages render from local storage (book bytes served
  from OPFS, bypassing the service worker)

#### Scenario: Furthest-wins reconcile on reconnect

- **WHEN** reading progress advanced while offline and the network is restored
- **THEN** the outbox flushes and progress reconciles furthest-progression-wins
- **AND** the reconciled position appears on the book detail and in the library

#### Scenario: Komga gating

- **WHEN** Komga is not provisioned or not reachable
- **THEN** the e2e test is skipped rather than failed, and the unit, visual, and accessibility suites
  still run
