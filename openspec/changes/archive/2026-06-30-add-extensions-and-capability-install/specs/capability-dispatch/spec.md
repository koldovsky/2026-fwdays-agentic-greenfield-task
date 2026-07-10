## ADDED Requirements

### Requirement: Resolve an open request to a capability status

The capability dispatcher SHALL resolve an attempt to open a resource into exactly one of three
statuses — `ready`, `installable`, or `unsupported` — by sniffing the resource's media type and asking
the plugin registry to resolve a matching format (and, for a probed server, a matching connector). The
dispatcher SHALL detect the media type from the highest-confidence available source in priority order
(connector-supplied metadata, then HTTP `Content-Type`, then file extension, then magic bytes) and
SHALL select the highest-confidence **installed and enabled** handler. The dispatcher SHALL contain no
DOM, `fetch`, or `window` usage so the native client can re-express it.

#### Scenario: An installed format opens directly

- **WHEN** the user opens a book whose media type resolves to an installed, enabled format (e.g. an
  EPUB with `format.epub` installed)
- **THEN** the dispatcher returns `ready` and the open proceeds to produce a `Publication` and
  `Navigator` without any install prompt

#### Scenario: A known-but-not-installed format is installable

- **WHEN** the user opens a book sniffed as `application/pdf` while `format.pdf` is in the catalog but
  not installed
- **THEN** the dispatcher returns `installable` with the suggested `format.pdf` manifest (id, version,
  size, capabilities, permissions)

#### Scenario: An unknown format is unsupported

- **WHEN** the user opens a resource whose media type matches no installed format and no catalog entry
- **THEN** the dispatcher returns `unsupported`

#### Scenario: Sniffer prefers reliable metadata over extension

- **WHEN** a resource arrives with connector metadata `application/pdf` but a misleading `.bin`
  extension
- **THEN** the dispatcher detects PDF from the higher-priority connector metadata, not the extension

### Requirement: Emit CapabilityMissing as an Observer event

On an `installable` result the dispatcher SHALL emit a `CapabilityMissing` event over the host event
bus carrying the suggested plugin manifest (id, name, version, approximate size, capability list, and
declared permissions). The dispatcher SHALL NOT itself render UI; one or more subscribers drive the
prompt. The same Observer mechanism SHALL apply to a probed server whose connector is installable.

#### Scenario: Subscribers receive the suggestion

- **WHEN** the dispatcher resolves an open to `installable`
- **THEN** a `CapabilityMissing` event is published whose payload exposes the suggested manifest's id,
  version, approximate size, capabilities, and permissions
- **AND** a subscriber that is registered receives it (an unsubscribed listener receives nothing)

### Requirement: Capability-missing install prompt

The UI SHALL render a capability-missing prompt from the `CapabilityMissing` event, matching
`doc/web/07-capability-missing-desktop.png`. The prompt SHALL show the format glyph with an extension
badge, the title "Install PDF support?", the body "'The Picture of Dorian Gray' is a PDF, and that
format isn't installed yet. Add it and Edda will open the book right away — and use it automatically
from now on.", a plugin card reading `format.pdf · v1.0.3 · 1.2 MB` with capability chips
"Fixed layout", "Search", "Text selection", the assurances "No network access" and "Runs sandboxed", a
primary "Install & open" action, a secondary "Not now — download the file instead" action, and the
caption "first-party extension · installs in ~2s, then retries open".

#### Scenario: Prompt matches the maket

- **WHEN** a `CapabilityMissing` event for `format.pdf` is shown for the book "The Picture of Dorian
  Gray"
- **THEN** the rendered modal matches `doc/web/07-capability-missing-desktop.png`: the title "Install
  PDF support?", the quoted body text, the `format.pdf · v1.0.3 · 1.2 MB` card, the chips "Fixed
  layout"/"Search"/"Text selection", the "No network access" and "Runs sandboxed" badges, the primary
  "Install & open", the secondary "Not now — download the file instead", and the caption
  "first-party extension · installs in ~2s, then retries open"

### Requirement: Install and retry the open automatically

When the user accepts the prompt ("Install & open"), the UI SHALL install the suggested plugin via the
registry — a first-party dynamic `import()` of the lazy chunk plus persisting the enabled id, never a
remote code download — and then SHALL re-issue the original open. After install the dispatcher SHALL
resolve the same resource to `ready` and the book SHALL open, and the now-installed format SHALL be used
automatically for subsequent opens of that type.

#### Scenario: Install then open succeeds

- **WHEN** the user clicks "Install & open" on the PDF prompt
- **THEN** the registry dynamic-imports and registers `format.pdf` and persists it as enabled
- **AND** the dispatcher re-resolves the PDF to `ready` and the book opens (`DESIGN.md` §8.1 sequence)

#### Scenario: Subsequent PDFs open without a prompt

- **WHEN** the user opens another PDF after `format.pdf` has been installed
- **THEN** the dispatcher resolves it to `ready` directly and no capability-missing prompt is shown

### Requirement: Graceful degradation to raw download

When resolution is `unsupported`, the dispatcher-driven UI SHALL NOT offer an install; it SHALL present
a clear "format not supported" message and offer the **raw file download** instead. When the user
declines an `installable` prompt via "Not now — download the file instead", the UI SHALL likewise offer
the raw file download rather than opening the book.

#### Scenario: Unsupported offers the raw file

- **WHEN** an open resolves to `unsupported`
- **THEN** no install prompt is shown
- **AND** the UI shows a "format not supported" message and offers to download the raw file

#### Scenario: Declining the install downloads the file

- **WHEN** the user chooses "Not now — download the file instead" on the PDF prompt
- **THEN** `format.pdf` is not installed and the book is not opened
- **AND** the raw file is offered for download instead
