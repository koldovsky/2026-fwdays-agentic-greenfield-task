## ADDED Requirements

### Requirement: User can send remote-control key presses

The back-end SHALL expose `POST /api/devices/:udn/key` accepting a body of the shape `{ key: SamsungKeyCode }`. On success it SHALL dispatch `remoteKeyControl` on the per-TV session queue and return `204 No Content`. Covers `FR-REMOTE-01`.

#### Scenario: Enter key succeeds on a connected TV

- **WHEN** a client `POST`s `{ "key": "KEY_ENTER" }` to `/api/devices/:udn/key` and the session state is `Connected`
- **THEN** the response is `204` and the TV received the corresponding `remoteKeyControl` JSON-RPC call

#### Scenario: JSON-RPC ordering preserved for rapid input

- **WHEN** a client sends `KEY_DOWN`, `KEY_DOWN`, `KEY_ENTER` in rapid succession
- **THEN** the three `remoteKeyControl` calls hit the wire in that order via the per-session FIFO

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

- **WHEN** the TV returns `-32000` while the SPA is pressing `KEY_HOME`
- **THEN** the endpoint responds `500` with an envelope whose `code` is `"TvFailed"`, and the SPA's `useSendKey` hook throws `ApiError`

### Requirement: Controls disabled while not Connected

Every remote-command button in the SPA SHALL be disabled unless the current session state is `Connected`. Covers `FR-REMOTE-04`.

#### Scenario: Buttons disabled during Connecting

- **WHEN** a user opens a TV whose session is currently `Connecting`
- **THEN** the D-pad, back/home/menu icons, and the power button are all rendered with `disabled` and do not fire a `POST /key` on click

#### Scenario: Disabled buttons ignored on the back-end

- **WHEN** a client `POST`s to `/api/devices/:udn/key` while that session's state is not `Connected`
- **THEN** the endpoint responds with an error envelope whose `code` is `"SessionNotConnected"` (HTTP 409) and does not enqueue any TV call

### Requirement: Key set backed by Samsung IP Control protocol

Every listed key value SHALL be a documented Samsung IP Control key code. The mapping between UI action and Samsung key SHALL live in a single file (`back-end/src/tv/keys.ts`) so it can be audited against the `samsung-ip-control-protocol` skill.

#### Scenario: All keys have a protocol reference

- **WHEN** an auditor lists the `SamsungKeyCode` union
- **THEN** every value appears in the `samsung-ip-control-protocol` skill's method catalogue or in the Postman collection at `docs/samsung-ip-control-protocol/IP CONTROL V2.postman_collection.json`
