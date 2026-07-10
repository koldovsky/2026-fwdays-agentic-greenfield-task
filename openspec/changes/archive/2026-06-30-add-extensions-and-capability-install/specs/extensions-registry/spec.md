## ADDED Requirements

### Requirement: Extensions screen composition

The app SHALL provide an Extensions settings screen matching `doc/web/06-extensions-desktop.png`. It
SHALL show the serif heading "Extensions"; the subtitle "Connectors talk to your servers; formats open
your books. Bundled ones ship in the app — install the rest on demand."; a monospace "Host API v1.2"
pill reflecting the current host API version; an INSTALLED section; an AVAILABLE section; and the
assurance footer. The breadcrumb SHALL read `edda.local / settings / extensions`.

#### Scenario: Screen matches the maket

- **WHEN** the user navigates to the Extensions settings screen
- **THEN** the rendered screen matches `doc/web/06-extensions-desktop.png`: the "Extensions" heading,
  the connectors/formats subtitle, the "Host API v1.2" pill, an "INSTALLED · 3" section, an "AVAILABLE"
  section, and the "First-party & sandboxed" footer

### Requirement: Installed extensions list

The INSTALLED section SHALL list every installed plugin from the registry with its display name, its
monospace `id · version`, its capability chips, a "BUNDLED" tag for bundled plugins, and an enable
toggle. It SHALL render the three bundled plugins exactly as in the maket: OPDS
(`connector.opds · v1.4.0`, chips "OPDS 1/2" and "Always-on fallback"); Komga (`connector.komga ·
v2.1.0`, chips "Search", "Progress sync", "Page streaming", "Thumbnails"); EPUB (`format.epub ·
v3.0.1`, chips "Reflowable", "Search", "TTS", "CFI locators"). The section header SHALL show the count
(e.g. "INSTALLED · 3").

#### Scenario: Bundled plugins render with their identities and chips

- **WHEN** the Extensions screen renders with OPDS, Komga, and EPUB installed
- **THEN** the INSTALLED section shows, matching `doc/web/06-extensions-desktop.png`: OPDS
  (`connector.opds · v1.4.0`, "OPDS 1/2", "Always-on fallback"), Komga (`connector.komga · v2.1.0`,
  "Search"/"Progress sync"/"Page streaming"/"Thumbnails"), and EPUB (`format.epub · v3.0.1`,
  "Reflowable"/"Search"/"TTS"/"CFI locators"), each tagged "BUNDLED" with an enable toggle

### Requirement: Available extensions catalog

The AVAILABLE section SHALL list each installable plugin from the registry catalog with its display
name, its monospace `id · size`, any advisory note, and an Install action. It SHALL render the four
catalog entries from the maket: PDF support (`format.pdf · 1.2 MB`, a "NEXT UP" tag, a primary Install
button); Kavita (`connector.kavita · 0.9 MB`); Calibre (`connector.calibre · 0.6 MB`, a "no progress
API" note); CBZ comics (`format.cbz · 0.4 MB`). Only `format.pdf` has a working install in this change;
the other three render from catalog manifests as available.

#### Scenario: Available catalog renders with sizes and notes

- **WHEN** the Extensions screen renders
- **THEN** the AVAILABLE section shows, matching `doc/web/06-extensions-desktop.png`: PDF support
  (`format.pdf · 1.2 MB`, "NEXT UP", a prominent Install button), Kavita (`connector.kavita · 0.9 MB`),
  Calibre (`connector.calibre · 0.6 MB`, "no progress API"), and CBZ comics (`format.cbz · 0.4 MB`),
  each with an Install action

### Requirement: Install an available extension on demand

Activating Install on an available plugin SHALL install it via the registry — a first-party dynamic
`import()` of the plugin's lazy chunk plus persisting the enabled id — and SHALL NOT download code from
a remote server. After a successful install the plugin SHALL move from the AVAILABLE section to the
INSTALLED section (enabled), and the choice SHALL persist across reloads.

#### Scenario: Installing PDF moves it to INSTALLED and persists

- **WHEN** the user clicks Install on "PDF support" in the AVAILABLE section
- **THEN** the registry dynamic-imports the first-party `format.pdf` chunk and persists it as enabled
  (no remote network fetch of code)
- **AND** "PDF support" now appears in the INSTALLED section with an enable toggle, and remains
  installed after a reload

### Requirement: Enable and disable installed extensions

Each installed plugin SHALL expose an enable toggle. Toggling it off SHALL disable the plugin so that
capability dispatch no longer resolves to it; toggling it on SHALL re-enable it. Disabling SHALL be
reversible and SHALL NOT delete the plugin or its data.

#### Scenario: Disabling an extension removes it from resolution

- **WHEN** the user toggles an installed format off
- **THEN** the registry marks it disabled and the capability dispatcher no longer resolves resources to
  it (re-enabling restores resolution), and no plugin data is deleted

### Requirement: First-party and sandboxed assurance

The screen SHALL display the assurance footer from the maket: the heading "First-party & sandboxed" and
the text "Every extension talks only to the host bridge — no page, no other plugin's data.", reflecting
that every plugin receives only the `HostBridge` (`DESIGN.md` §11).

#### Scenario: Assurance footer is shown

- **WHEN** the Extensions screen renders
- **THEN** the footer shows "First-party & sandboxed" and "Every extension talks only to the host
  bridge — no page, no other plugin's data.", matching `doc/web/06-extensions-desktop.png`
