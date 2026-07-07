## Purpose

User-facing volume-control capability (C7): a memoryless rotary knob with a mute IconButton in its centre well on `RemoteScreen`, backed by three back-end endpoints (`GET /volume`, `POST /volume/delta`, `POST /mute`) that dispatch `KEY_VOLUP` / `KEY_VOLDOWN` / `KEY_MUTE` `ms.remote.control` frames through the per-TV Samsung Smart View WebSocket session queue from `tv-connection-lifecycle`. Because Smart View is remote-key-only (no absolute-set method, no way to read actual level or mute), the design descopes to a knob that emits one `POST /volume/delta { delta: ±1 }` per rotation detent (never tracking or displaying an absolute level), a `muted` tracker that flips optimistically server-side on every `POST /mute`, and a `level` that is always `null` on the wire.

## Requirements

### Requirement: Volume state exposed to clients

The back-end SHALL expose the current `{ level, muted }` state per TV over both `GET /api/devices/:udn/volume` and a WebSocket `volume` event under the `devices` topic. Because the Samsung Smart View WebSocket cannot report actual level or mute values, `level` SHALL always be `null` and `muted` SHALL be the server's optimistic tracker driven by successful `POST /mute` calls. Covers `FR-VOLUME-04` (write-only fallback branch).

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

### Requirement: Front-end rotary knob for relative volume control

The `RemoteScreen` volume block SHALL render a single Orbit `RotaryKnob` primitive with the mute `IconButton` composed into its centre well. The knob is a purely relative, memoryless input device: it holds no absolute level state, never reads `useVolume(udn).level`, and its visual indicator angle is a free-running scratch value with no meaning beyond the current pointer position. Each `DETENT_DEG = 15°` of accumulated clockwise rotation while the pointer is captured SHALL immediately call `useVolume(udn).delta(+1)` (one `POST /api/devices/:udn/volume/delta { delta: 1 }`), and each `15°` of counter-clockwise rotation SHALL immediately call `useVolume(udn).delta(-1)` (one `POST /api/devices/:udn/volume/delta { delta: -1 }`). The mute `IconButton` inside the centre well SHALL keep its existing `POST /mute` toggle behaviour, including the `active` inset shadow and `volume_off` / `volume_up` icon swap driven by `useVolume(udn).muted`. Neither the knob rotation nor the mute button SHALL fire an HTTP request while the session state is not `Connected`. Covers `FR-VOLUME-01`, `FR-VOLUME-02`, and `FR-VOLUME-03`; `FR-VOLUME-04` remains descoped for Samsung Smart View TVs and the knob's memoryless design makes this explicit rather than displaying a fake level.

#### Scenario: Clockwise detent immediately sends one KEY_VOLUP

- **WHEN** the user presses on the knob and rotates it `15°` clockwise while the session is `Connected`
- **THEN** the SPA has issued exactly one `POST /api/devices/:udn/volume/delta { delta: 1 }` before the pointer is released

#### Scenario: Counter-clockwise detent immediately sends one KEY_VOLDOWN

- **WHEN** the user presses on the knob and rotates it `15°` counter-clockwise while the session is `Connected`
- **THEN** the SPA has issued exactly one `POST /api/devices/:udn/volume/delta { delta: -1 }` before the pointer is released

#### Scenario: Multiple detents in one gesture emit multiple deltas

- **WHEN** the user rotates the knob `45°` clockwise in a single unbroken gesture while the session is `Connected`
- **THEN** the SPA has issued exactly three `POST /api/devices/:udn/volume/delta { delta: 1 }` calls in order

#### Scenario: Reversing direction mid-gesture resets the detent accumulator sign

- **WHEN** the user rotates the knob `20°` clockwise (crossing one detent, emitting `delta: 1`) and then, without releasing, rotates `20°` counter-clockwise
- **THEN** the second segment emits exactly one `POST /api/devices/:udn/volume/delta { delta: -1 }` (crossing back through the same detent boundary in the opposite direction)

#### Scenario: Sub-detent rotation emits nothing

- **WHEN** the user rotates the knob `10°` clockwise and releases the pointer while the session is `Connected`
- **THEN** no `POST /api/devices/:udn/volume/delta` request has been issued

#### Scenario: Detent accumulator resets on pointer release

- **WHEN** the user rotates the knob `10°` clockwise (no delta emitted), releases the pointer, and then presses again and rotates `10°` clockwise
- **THEN** no `POST /api/devices/:udn/volume/delta` request has been issued during either gesture

#### Scenario: Keyboard ArrowUp sends one KEY_VOLUP

- **WHEN** the knob has keyboard focus, the session is `Connected`, and the user presses `ArrowUp` (or `ArrowRight`)
- **THEN** the SPA has issued exactly one `POST /api/devices/:udn/volume/delta { delta: 1 }`

#### Scenario: Keyboard ArrowDown sends one KEY_VOLDOWN

- **WHEN** the knob has keyboard focus, the session is `Connected`, and the user presses `ArrowDown` (or `ArrowLeft`)
- **THEN** the SPA has issued exactly one `POST /api/devices/:udn/volume/delta { delta: -1 }`

#### Scenario: Keyboard PageUp emits a coarse triple step

- **WHEN** the knob has keyboard focus, the session is `Connected`, and the user presses `PageUp`
- **THEN** the SPA has issued exactly three `POST /api/devices/:udn/volume/delta { delta: 1 }` calls in order

#### Scenario: Muted state renders the centre mute icon in active shadow

- **WHEN** `useVolume` reports `muted: true`
- **THEN** the mute `IconButton` inside the knob's centre well renders with the DS `active` prop (inset shadow) and its icon is `volume_off`

#### Scenario: Knob rotation disabled while session is not Connected

- **WHEN** the session state is `Connecting`
- **THEN** rotating the knob has no effect and no `POST /api/devices/:udn/volume/delta` request is issued

#### Scenario: Mute button disabled while session is not Connected

- **WHEN** the session state is `Disconnected`
- **THEN** clicking the centre mute `IconButton` has no effect and no `POST /api/devices/:udn/mute` request is issued

#### Scenario: Knob never reads or displays the volume level

- **WHEN** the front-end receives a `volume` WebSocket event carrying `{ level: null, muted: false }`
- **THEN** no aspect of the `RotaryKnob`'s rendered angle, indicator position, or internal accumulator changes as a result of the event (the knob is bound to pointer and keyboard input only)
