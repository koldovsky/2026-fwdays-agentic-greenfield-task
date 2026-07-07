## Purpose

User-facing remote-control-keys capability (C6): D-pad + transport buttons + power, exposed as `POST /api/devices/:udn/key` and wired into the SPA's `RemoteScreen`. Consumes the per-TV Samsung Smart View WebSocket session from `tv-connection-lifecycle` — the same on-wire envelope every downstream command capability (volume, input) will build on. Owns the enumerated `SamsungKeyCode` union and enforces "controls disabled while not `Connected`" per `FR-REMOTE-04`.

## Requirements

### Requirement: User can send remote-control key presses

The back-end SHALL expose `POST /api/devices/:udn/key` accepting a body of the shape `{ key: SamsungKeyCode }`. On success it SHALL dispatch the key on the per-TV session queue as an `ms.remote.control` Smart View WebSocket frame and return `204 No Content`. Covers `FR-REMOTE-01`.

#### Scenario: Enter key succeeds on a connected TV

- **WHEN** a client `POST`s `{ "key": "KEY_ENTER" }` to `/api/devices/:udn/key` and the session state is `Connected`
- **THEN** the response is `204` and the TV received the corresponding `ms.remote.control` Smart View WebSocket frame

#### Scenario: Command ordering preserved for rapid input

- **WHEN** a client sends `KEY_DOWN`, `KEY_DOWN`, `KEY_ENTER` in rapid succession
- **THEN** the three `ms.remote.control` frames hit the wire in that order via the per-session FIFO

### Requirement: Enumerated set of supported keys

The back-end SHALL accept only keys listed in a fixed enumeration. Unknown keys SHALL be rejected with a 400 error envelope before touching the TV. Covers `FR-REMOTE-02`.

Supported keys (MVP):

- `KEY_UP`, `KEY_DOWN`, `KEY_LEFT`, `KEY_RIGHT`, `KEY_ENTER`
- `KEY_RETURN`, `KEY_HOME`, `KEY_MENU`
- `KEY_POWER`

#### Scenario: Unknown key rejected with 400

- **WHEN** a client `POST`s `{ "key": "KEY_MAKE_ME_A_SANDWICH" }`
- **THEN** the response is `400` with an error envelope whose `code` is `"validation"` and the body does not reach the TV

### Requirement: Command result surfaced to the UI

Every command dispatched by the front-end SHALL result in either a success (204) or a mapped domain error, and the UI SHALL know which. No fire-and-forget. Covers `FR-REMOTE-03`.

#### Scenario: TV failure surfaces to caller

- **WHEN** the Smart View WebSocket to the TV drops (e.g. `TvError('TvNotReachable', …)` thrown from `session.enqueue`) while the SPA is pressing `KEY_HOME`
- **THEN** the endpoint responds with the mapped domain envelope (`code: "TvNotReachable"`, HTTP `502`) — NOT the generic `code: "internal"` — and the SPA's `useSendKey` hook throws `ApiError` with the same code

### Requirement: Controls disabled while not Connected

Every remote-command button in the SPA SHALL be disabled unless the current session state is `Connected`. Covers `FR-REMOTE-04`.

#### Scenario: Buttons disabled during Connecting

- **WHEN** a user opens a TV whose session is currently `Connecting`
- **THEN** the D-pad, back/home/menu icons, and the power button are all rendered with `disabled` and do not fire a `POST /key` on click

#### Scenario: Disabled buttons ignored on the back-end

- **WHEN** a client `POST`s to `/api/devices/:udn/key` while that session's state is not `Connected`
- **THEN** the endpoint responds with an error envelope whose `code` is `"SessionNotConnected"` (HTTP 409) and does not enqueue any TV call

### Requirement: Key set backed by Samsung Smart View WebSocket protocol

Every listed key value SHALL be a documented Samsung Smart View `KEY_*` code sent under the `ms.remote.control` envelope. The mapping between UI action and Samsung key SHALL live in a single file (`back-end/src/tv/keys.ts`) so it can be audited against the archived Smart View transport design (`openspec/changes/archive/2026-07-04-smart-view-ws-transport/design.md` D1). The hotel-TV `samsung-ip-control-protocol` skill / Postman collection is explicitly NOT the authoritative source here (per `AGENTS.md` that protocol is unrelated to the consumer Tizen TVs this repo targets).

#### Scenario: All keys have a protocol reference

- **WHEN** an auditor lists the `SamsungKeyCode` union
- **THEN** every value is a Samsung Smart View `KEY_*` code, and the `keyControlParams` helper wraps it in the exact `{ Cmd: 'Click', DataOfCmd: <key>, Option: 'false', TypeOfRemote: 'SendRemoteKey' }` envelope documented in `openspec/changes/archive/2026-07-04-smart-view-ws-transport/design.md` D1
