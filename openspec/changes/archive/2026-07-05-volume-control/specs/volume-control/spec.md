## ADDED Requirements

### Requirement: Volume state exposed to clients

The back-end SHALL expose the current `{ level, muted }` state per TV over both `GET /api/devices/:udn/volume` and a WebSocket `volume` event under the `devices` topic. Because the Samsung Smart View WebSocket cannot report actual level or mute values (see design.md Context + D1), `level` SHALL always be `null` and `muted` SHALL be the server's optimistic tracker driven by successful `POST /mute` calls. Covers `FR-VOLUME-04` (write-only fallback branch).

#### Scenario: HTTP snapshot

- **WHEN** a client calls `GET /api/devices/:udn/volume`
- **THEN** the response is `200` with a JSON body `{ level: null, muted: boolean }`

#### Scenario: WebSocket push on connect

- **WHEN** a session transitions to `Connected`
- **THEN** within 2 seconds every WebSocket client receives `{ topic: "devices", event: "volume", udn, level: null, muted }` reflecting the current tracker state

#### Scenario: WebSocket push on mute toggle

- **WHEN** a `POST /mute` succeeds
- **THEN** every WebSocket client receives `{ topic: "devices", event: "volume", udn, level: null, muted: <new value> }`

### Requirement: Relative volume up/down

The back-end SHALL accept `POST /api/devices/:udn/volume/delta { delta: number }` where `delta` is a non-zero integer in `[-25, +25]`. For a positive `delta`, the endpoint SHALL enqueue `delta` Smart View `KEY_VOLUP` frames via `ms.remote.control`; for a negative `delta`, `abs(delta)` `KEY_VOLDOWN` frames. Covers `FR-VOLUME-01` and `FR-VOLUME-02`.

#### Scenario: Delta up sends one KEY_VOLUP

- **WHEN** a client `POST`s `{ "delta": 1 }` and the session is `Connected`
- **THEN** the response is `204` and the TV received one `ms.remote.control` frame carrying `DataOfCmd: "KEY_VOLUP"`

#### Scenario: Delta of 3 sends three KEY_VOLUP in order

- **WHEN** a client `POST`s `{ "delta": 3 }` and the session is `Connected`
- **THEN** the TV received three `ms.remote.control` frames with `DataOfCmd: "KEY_VOLUP"` in order (per-TV FIFO)

#### Scenario: Delta of 0 rejected

- **WHEN** a client `POST`s `{ "delta": 0 }`
- **THEN** the response is `400` with envelope `code: "validation"`

#### Scenario: Out-of-range delta rejected

- **WHEN** a client `POST`s `{ "delta": 100 }`
- **THEN** the response is `400` with envelope `code: "validation"` and the TV received no frame

### Requirement: Mute toggle

The back-end SHALL accept `POST /api/devices/:udn/mute` and dispatch a single Smart View `KEY_MUTE` frame via `ms.remote.control`. On success it SHALL flip the server-side optimistic `muted` tracker and push a `volume` WebSocket event. Covers `FR-VOLUME-03`.

#### Scenario: Toggle mute from unmuted to muted

- **WHEN** a client `POST`s to `/mute` while the server tracker reports `muted: false` and the session is `Connected`
- **THEN** the response is `204`, the TV received `ms.remote.control` with `DataOfCmd: "KEY_MUTE"`, and a subsequent `volume` WebSocket push carries `muted: true`

#### Scenario: Session not Connected rejects the mute toggle

- **WHEN** a client `POST`s to `/mute` while the session state is not `Connected`
- **THEN** the response is `409` with envelope `code: "SessionNotConnected"` and no frame is sent

### Requirement: Front-end slider bound to write-only volume control

The `RemoteScreen` volume block SHALL use the Orbit `Slider` primitive as a write-only control (level is always `null` from the back-end) and an Orbit `IconButton` for mute, both bound to `useVolume(udn)`. Neither SHALL fire an HTTP request while the session is not `Connected`. On drag commit, the SPA SHALL compute the step delta from the previous committed position and call `POST /volume/delta`; slider position tracks the SPA's own last-write locally with no server reconciliation.

#### Scenario: Slider position tracks the user's own drag locally

- **WHEN** the user drags the slider from 20 to 35 and releases
- **THEN** the on-screen slider thumb sits at 35% of its track and the SPA `POST`s `{ "delta": 15 }` once

#### Scenario: Muted state renders the mute icon in active shadow

- **WHEN** `useVolume` reports `muted: true`
- **THEN** the mute `IconButton` renders with the DS `active` prop (inset shadow) and its icon is `volume_off`

#### Scenario: Slider disabled during Connecting

- **WHEN** the session state is `Connecting`
- **THEN** the slider drag has no effect and no `POST /volume/delta` request is issued
