## ADDED Requirements

### Requirement: Volume level and mute state exposed to clients

The back-end SHALL expose the current `{ level, muted }` state per TV over both `GET /api/devices/:udn/volume` and a WebSocket `volume` event under the `devices` topic. Covers `FR-VOLUME-04`.

#### Scenario: HTTP snapshot

- **WHEN** a client calls `GET /api/devices/:udn/volume` after the session is `Connected`
- **THEN** the response is `200` with a JSON body containing numeric or null `level` and boolean `muted`

#### Scenario: WebSocket push on connect

- **WHEN** a session transitions to `Connected`
- **THEN** within 2 seconds every WebSocket client receives `{ topic: "devices", event: "volume", udn, level, muted }` with the initial state

#### Scenario: Level null on unsupported TVs

- **WHEN** the TV does not support reading a numeric level
- **THEN** `level` is reported as `null` in both HTTP and WebSocket, and `muted` is still reported correctly

### Requirement: Absolute volume set

The back-end SHALL accept `POST /api/devices/:udn/volume { level: number }` and dispatch `directVolumeControl` with `level` clamped to 0..100. Covers `FR-VOLUME-01` and `FR-VOLUME-02` (absolute-mode half).

#### Scenario: Set to 25

- **WHEN** a client `POST`s `{ "level": 25 }` and the session is `Connected`
- **THEN** the response is `204` and the TV received `directVolumeControl` with `level: 25`

#### Scenario: Out-of-range value rejected

- **WHEN** a client `POST`s `{ "level": 150 }`
- **THEN** the response is `400` with envelope `code: "validation"` and the TV received no call

### Requirement: Relative volume up/down

The back-end SHALL accept `POST /api/devices/:udn/volume/delta { delta: -1 | +1 }` and dispatch `remoteKeyControl` with `KEY_VOLDOWN` or `KEY_VOLUP` respectively. Covers `FR-VOLUME-01`, `FR-VOLUME-02` (relative-mode half).

#### Scenario: Delta up sends KEY_VOLUP

- **WHEN** a client `POST`s `{ "delta": 1 }`
- **THEN** the TV received `remoteKeyControl` with `KEY_VOLUP`

#### Scenario: Delta of 0 rejected

- **WHEN** a client `POST`s `{ "delta": 0 }`
- **THEN** the response is `400` with envelope `code: "validation"`

### Requirement: Mute toggle

The back-end SHALL accept `POST /api/devices/:udn/mute` and dispatch `remoteKeyControl` with `KEY_MUTE`. Covers `FR-VOLUME-03`.

#### Scenario: Toggle mute

- **WHEN** a client `POST`s to `/mute` while the TV is unmuted
- **THEN** the TV received `remoteKeyControl` with `KEY_MUTE`, and a subsequent `volume` WebSocket push carries `muted: true`

### Requirement: Front-end slider bound to live volume state

The `RemoteScreen` volume block SHALL use the Orbit `Slider` primitive for level and an Orbit `IconButton` for mute, both bound to `useVolume(udn)`. Neither SHALL be enabled while the session is not `Connected`.

#### Scenario: Slider position matches server-reported level

- **WHEN** the WebSocket delivers `volume` event with `level: 42`
- **THEN** the on-screen slider thumb sits at 42% of its track

#### Scenario: Muted state renders the mute icon in active shadow

- **WHEN** `useVolume` reports `muted: true`
- **THEN** the mute `IconButton` renders with the DS `active` prop (inset shadow) and its icon is `volume_off`

#### Scenario: Slider disabled during Connecting

- **WHEN** the session state is `Connecting`
- **THEN** the slider drag has no effect and no `POST /volume` request is issued
