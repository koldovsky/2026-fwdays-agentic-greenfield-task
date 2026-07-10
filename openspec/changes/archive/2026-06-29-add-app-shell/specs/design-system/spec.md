## ADDED Requirements

### Requirement: Parchment color tokens

The system SHALL expose a named set of color tokens reproducing the maket's warm "parchment" palette,
and all app chrome SHALL use these tokens rather than ad-hoc colors. The canvas background SHALL be
approximately `#F0EEE9`; raised surfaces SHALL be lighter than the canvas; a single primary-action
color (a muted forest/olive green) SHALL be used for primary buttons; text SHALL be a warm near-black
with a distinct muted secondary tone. `doc/web/` is the authority for final values.

#### Scenario: Canvas and primary action match the maket

- **WHEN** any screen built on the shell renders
- **THEN** the page canvas uses the parchment background token (≈ `#F0EEE9`)
- **AND** primary actions (e.g. "Continue reading", "Connect", "Install & open") use the single
  forest/olive primary-action token, visually matching `doc/web/02-book-detail-desktop.png` and
  `doc/web/05-add-source-desktop.png`

#### Scenario: No ad-hoc chrome colors

- **WHEN** the app-chrome styles are inspected
- **THEN** chrome elements reference design-system color tokens (no hard-coded hex outside the token
  definitions)

### Requirement: Typographic system

The system SHALL use a serif display face (Newsreader) for headings/titles, a serif reading face
(Literata) where long-form prose appears in chrome, and a **monospace** face for technical metadata.
Fonts SHALL be self-hosted (no external CDN) so the PWA renders offline.

#### Scenario: Serif display for titles

- **WHEN** a screen heading renders (e.g. "Your library", a book title)
- **THEN** it uses the serif display face, matching the headings in `doc/web/01-library-desktop.png`
  and `doc/web/02-book-detail-desktop.png`

#### Scenario: Monospace for technical metadata

- **WHEN** technical metadata renders — breadcrumb paths (`edda.local / library`), plugin ids
  (`connector.komga`), versions (`v2.1.0`), or byte sizes (`1.2 MB`)
- **THEN** that text uses the monospace face, matching `doc/web/06-extensions-desktop.png`

#### Scenario: Fonts available offline

- **WHEN** the app loads with no network
- **THEN** the self-hosted Newsreader and Literata faces still render (no fallback-only text)

### Requirement: Reusable UI primitives

The system SHALL provide reusable chrome primitives that the screens compose: chip/pill, card,
primary and secondary button, toggle switch, progress bar, segmented control, stepper, and status dot.
Each primitive's appearance SHALL match its depiction in `doc/web/`.

#### Scenario: Chip primitive matches metadata and capability chips

- **WHEN** a chip renders
- **THEN** it matches the metadata pills in `doc/web/02-book-detail-desktop.png` (e.g. "432 pages")
  and the capability chips in `doc/web/05-add-source-desktop.png` (e.g. "Progress sync")

#### Scenario: Progress bar primitive matches the maket

- **WHEN** a progress bar renders at a given percentage
- **THEN** it visually matches the progress indicators in `doc/web/01-library-desktop.png` (the
  "Keep reading" cards) and `doc/web/02-book-detail-desktop.png` (the "Your progress" card)

#### Scenario: Segmented control matches grid/list and paged/scroll

- **WHEN** a segmented control renders
- **THEN** it matches the grid/list toggle in `doc/web/01-library-desktop.png` and the
  Paged/Scroll control in `doc/mobile/04-reading-themes-and-preferences.png`
