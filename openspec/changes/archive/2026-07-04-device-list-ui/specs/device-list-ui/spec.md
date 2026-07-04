## ADDED Requirements

### Requirement: Device list renders discovered TVs

The SPA SHALL render every device in the registry as an Orbit `DeviceCard`. Each card SHALL show the TV's `name`, `model`, `ip`, and `status`. Covers `FR-UI-01`, `FR-UI-03`, `FR-UI-04`, `FR-UI-05`.

#### Scenario: Two TVs render as two cards

- **WHEN** the registry contains two online TVs
- **THEN** the device list screen renders exactly two `DeviceCard` elements in the order they arrived, each showing its name, model, IP address, and an `online` status badge

#### Scenario: Missing model handled gracefully

- **WHEN** a TV in the registry has `model: null`
- **THEN** the corresponding card renders without a "model" line — no "null" or "undefined" appears in the DOM

### Requirement: Status badge reflects connection status

Each `DeviceCard` SHALL show a status badge whose state matches the registry entry's status. `online`, `offline`, and `connecting` states MUST be represented distinctly. Covers `FR-UI-02`.

#### Scenario: Offline TV renders offline badge

- **WHEN** a TV in the list has `status: "offline"`
- **THEN** its badge visibly reads "Offline" and uses the DS `offline` styling (no accent orange, muted colour)

### Requirement: Live updates over WebSocket

The device list SHALL update in real time from the `/ws` `devices` topic. Full re-renders MUST NOT be triggered by polling `/api/devices` when a WebSocket connection is healthy.

#### Scenario: New TV appears without page reload

- **WHEN** a TV joins the LAN and `upnp-tv-discovery` emits `{ topic: "devices", event: "added", device }`
- **THEN** the SPA renders a new `DeviceCard` for that TV within 1 second of the message arriving, and no HTTP request to `/api/devices` was made in response

#### Scenario: TV going offline updates in place

- **WHEN** the SPA receives `{ topic: "devices", event: "offline", device }` for a TV already in the list
- **THEN** that TV's card badge switches to "Offline"; the card does not disappear

### Requirement: REST snapshot fallback

If the WebSocket has not delivered a `snapshot` event within 500 ms of the page loading, the SPA SHALL fall back to `GET /api/devices` to hydrate the initial list. A late WebSocket `snapshot` SHALL still take precedence over the REST result.

#### Scenario: Slow WebSocket → REST hydrates

- **WHEN** the WebSocket has not yet emitted `snapshot` after 500 ms
- **THEN** the SPA calls `GET /api/devices` and renders whatever it returns

#### Scenario: WebSocket snapshot arrives late

- **WHEN** REST has hydrated the list and then the WebSocket delivers a `snapshot` with a different set of devices
- **THEN** the list re-syncs to the WebSocket snapshot

### Requirement: Empty state

When the registry is empty, the SPA SHALL render an empty-state message using Orbit primitives. No devices SHALL be silently hidden — an empty list means "no TVs found."

#### Scenario: Empty registry shows empty state

- **WHEN** the registry has zero devices and the initial snapshot has been received
- **THEN** the screen shows a `Card` with a `tv_off` Material Symbols icon and the text "No TVs found. Make sure your TV is on the same Wi-Fi network."

### Requirement: SPA uses only Orbit DS primitives + tokens

The device list screen SHALL be built entirely from primitives imported via `@ds/components/**` and from CSS variables defined by the DS tokens (`--base-100`, `--fg-1`, `--font-sans`, `--space-*`, `--nm-raised-*`, etc.). No hex codes, shadow strings, or font names SHALL appear literally in the source. No `@ds/ui_kits/**` file SHALL be imported. Covers the front-end house rules in `AGENTS.md` and `DESIGN.md`.

#### Scenario: No hard-coded palette

- **WHEN** the change lands and `grep -rE '#([0-9a-fA-F]{3,8})' front-end/src` is run
- **THEN** the result is empty (or contains only comments and doc examples)

#### Scenario: No ui_kits imports

- **WHEN** the change lands and `grep -r 'ui_kits' front-end/src` is run
- **THEN** the result is empty

### Requirement: AccessToken absent from SPA payloads

Every payload the SPA reads (`/api/devices`, WebSocket `devices` messages) SHALL be free of any `AccessToken` field. The SPA MUST NOT attempt to read one.

#### Scenario: Contract test rejects tokens on the wire

- **WHEN** the WebSocket message-handling code processes a `devices` message
- **THEN** it does not read a property named `accessToken` or `AccessToken` on any device object — the type declared for `Device` does not have such a field
