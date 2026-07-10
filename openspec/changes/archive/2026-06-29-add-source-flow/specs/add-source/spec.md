## ADDED Requirements

### Requirement: Add-a-source modal presentation

The app SHALL present an "Add a source" modal with the title "Add a source", the subtitle "Connect a
server or paste an OPDS feed — we detect the rest.", a close control, and a 3-step stepper labelled
"1 Address", "2 Detected", and "3 Sign in". The modal's layout, copy, and stepper SHALL match
`doc/web/05-add-source-desktop.png`. The modal SHALL be dismissible by its close control and by the
platform Esc key.

#### Scenario: Modal matches the maket

- **WHEN** the user opens "Add a source" from the sidebar Sources region (cross-ref `app-shell`)
- **THEN** the modal renders the title "Add a source", the subtitle "Connect a server or paste an OPDS
  feed — we detect the rest.", a close control, and the 3-step stepper (1 Address · 2 Detected ·
  3 Sign in), matching `doc/web/05-add-source-desktop.png`

#### Scenario: Modal is dismissible

- **WHEN** the user activates the close control or presses Esc
- **THEN** the modal closes without persisting a source

### Requirement: Server address field with reachability check

The modal SHALL provide a SERVER ADDRESS field that accepts a server URL or a pasted OPDS feed URL.
After a URL is entered, the app SHALL probe its reachability via the `server-prober` capability and
display the result; when the server is reachable the field SHALL show a "Reachable" indicator as in the
maket.

#### Scenario: Reachable address shows the Reachable indicator

- **WHEN** the user enters a reachable server address (e.g. `https://komga.myhome.net`)
- **THEN** the SERVER ADDRESS field shows a "Reachable" status indicator, matching
  `doc/web/05-add-source-desktop.png`

### Requirement: Detected-server card

Once a reachable URL is probed, the modal SHALL advance the stepper to "Detected" and render a
detected-server card showing the server's display name, its connector id in monospace, whether the
adapter is bundled or installable, and a protocol summary, plus an "Adapter ready" badge when the
resolving connector is installed. For a Komga server the card SHALL show "Komga server", the monospace
id `connector.komga`, "bundled", "opds v2 + rest", and an "Adapter ready" badge.

#### Scenario: Komga detected card matches the maket

- **WHEN** the prober detects a Komga server
- **THEN** the modal shows a detected card reading "Komga server", monospace `connector.komga`,
  "bundled", "opds v2 + rest", with an "Adapter ready" badge, matching
  `doc/web/05-add-source-desktop.png`
- **AND** the stepper advances to step 2 "Detected"

#### Scenario: Installable connector shows an install affordance

- **WHEN** the prober resolves to an `installable` outcome (a cataloged-but-not-installed connector)
- **THEN** the card identifies the suggested connector and offers to install it instead of an "Adapter
  ready" badge (the install-on-demand sheet is owned by `add-extensions-and-capability-install`)

### Requirement: Capabilities chip row

The modal SHALL render a CAPABILITIES row of chips reflecting the advertised capabilities returned by
the prober. The chips SHALL be derived from the detected connector's capabilities, not hard-coded. For a
Komga server the chips SHALL be "OPDS v2", "Progress sync", "Search", "Page streaming", and
"Thumbnails".

#### Scenario: Komga capability chips match the maket

- **WHEN** a Komga server is detected
- **THEN** the CAPABILITIES row shows chips "OPDS v2", "Progress sync", "Search", "Page streaming", and
  "Thumbnails", matching `doc/web/05-add-source-desktop.png`

#### Scenario: Chips reflect the actual advertised capabilities

- **WHEN** a detected source advertises fewer capabilities (e.g. a bare OPDS feed without page streaming
  or progress sync)
- **THEN** the CAPABILITIES row shows only the chips that source actually advertises

### Requirement: Credential fields and on-device-only storage

The modal SHALL provide a USERNAME field and a masked PASSWORD field for the sign-in step, and SHALL
display the footer text "Credentials stored on this device only". Credentials SHALL be stored on the
device only: they SHALL NOT be transmitted to Edda or any third party, and SHALL only ever be attached
as authentication on requests to the user's own configured server.

#### Scenario: Credential fields and footer match the maket

- **WHEN** the sign-in step renders
- **THEN** a USERNAME field and a masked PASSWORD field are shown, and the footer reads "Credentials
  stored on this device only", matching `doc/web/05-add-source-desktop.png`

#### Scenario: Credentials are persisted on-device only

- **WHEN** the user enters credentials and connects a source
- **THEN** the credentials are written only to on-device storage and are excluded from any syncable
  source metadata
- **AND** they are never sent to Edda or a third party — only to the user's own server to authenticate

### Requirement: Connect persists the source and surfaces it in the sidebar

On Connect, the app SHALL build the connector configuration from the entered address and credentials,
establish the session via the resolving connector, persist the source on-device (its address, connector
id, and a reference to its on-device credentials), close the modal, and show the new source in the
sidebar Sources region (cross-ref `app-shell`). Cancel SHALL close the modal without persisting.

#### Scenario: Connecting a Komga source adds it to the sidebar

- **WHEN** the user connects a reachable Komga server (integration-tested against the Docker Komga in
  `test/komga`, reader account `reader@edda.test`)
- **THEN** the source is persisted on-device and the modal closes
- **AND** the new source appears in the sidebar Sources region, matching the Sources region in
  `doc/web/01-library-desktop.png` (cross-ref `app-shell`)

#### Scenario: Cancel discards the in-progress source

- **WHEN** the user activates Cancel
- **THEN** the modal closes and no source or credentials are persisted, and the sidebar is unchanged

### Requirement: Bare-OPDS fallback path

When the entered address is a bare OPDS feed that no specialized connector claims, the modal SHALL
detect it via the generic OPDS connector (the `server-prober` always-available fallback), present a
detected card for the OPDS source with its OPDS-advertised capability chips, and allow Connect to
persist it like any other source.

#### Scenario: A bare OPDS feed is added via the generic connector

- **WHEN** the user pastes a bare OPDS feed URL that no specialized connector claims
- **THEN** the modal shows a detected card for the generic OPDS connector with OPDS-advertised
  capability chips (fewer than a Komga server)
- **AND** on Connect the OPDS source is persisted and appears in the sidebar Sources region

### Requirement: Unreachable path

When the entered address is unreachable, the modal SHALL surface a not-reachable state on the SERVER
ADDRESS field, SHALL NOT show a detected card or capability chips, and SHALL keep the Connect action
disabled.

#### Scenario: An unreachable address blocks Connect

- **WHEN** the user enters an address the prober reports as `unreachable`
- **THEN** the SERVER ADDRESS field shows a not-reachable state (not "Reachable")
- **AND** no detected card or capability chips are shown and the Connect action is disabled
