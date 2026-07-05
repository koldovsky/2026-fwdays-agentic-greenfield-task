## Purpose

User-facing input-management capability (C8): a picker Modal on `RemoteScreen` that lists Samsung TV inputs and switches the active one via a single `POST /api/devices/:udn/input { key }` that fires an `ms.remote.control` Smart View WebSocket frame carrying a `KEY_HDMI*` / `KEY_TV` / `KEY_SOURCE` / `KEY_AV1` / `KEY_COMPONENT1` code. Because Samsung Smart View WebSocket cannot enumerate the TV's actual inputs, read the currently-active input, or `SetInput`-by-name, this capability ships a curated static catalogue (identical across every TV of the target Tizen 2016+ family) and a write-only picker with no active-input marker. Reading/absolute switching would need a different transport (UPnP `AVTransport`, SmartThings) — out of scope for this change.

## Requirements

### Requirement: List available inputs

The back-end SHALL expose `GET /api/devices/:udn/inputs` returning `{ inputs: [{ id, label }] }`. Because Samsung Smart View WebSocket cannot read the TV's actual input catalogue, `inputs` SHALL be a curated static list of Samsung remote-key input keys shared across every UDN (Tizen 2016+ share the same key vocabulary). The list SHALL NOT include an `active` field per row and the response SHALL NOT include a top-level `activeId` — active input is unknowable over Smart View. Covers `FR-INPUT-01`.

#### Scenario: Static list returned

- **WHEN** a client calls `GET /api/devices/:udn/inputs` (regardless of session state)
- **THEN** the response is `200` with a JSON body `{ inputs: [{ id: <SamsungInputKey>, label: string }] }` matching the catalogue in `back-end/src/tv/inputs.ts`

#### Scenario: No activeId in the response

- **WHEN** a client calls `GET /api/devices/:udn/inputs`
- **THEN** the response body has no `activeId` field and no row has an `active` field — Smart View cannot report the currently-selected input

### Requirement: Switch active input

The back-end SHALL expose `POST /api/devices/:udn/input { key }` where `key` is a `SamsungInputKey` from the static catalogue. On success it SHALL enqueue one Smart View `ms.remote.control` frame carrying that key via `session.enqueue` and return `204`. Covers `FR-INPUT-02`.

#### Scenario: Switch to HDMI 2 succeeds

- **WHEN** a client `POST`s `{ "key": "KEY_HDMI2" }` and the session is `Connected`
- **THEN** the response is `204`, the TV received one `ms.remote.control` frame with `DataOfCmd: "KEY_HDMI2"`, and a subsequent `input` WebSocket event carries `{ key: "KEY_HDMI2" }`

#### Scenario: Unknown key rejected

- **WHEN** a client `POST`s `{ "key": "KEY_MADE_UP" }`
- **THEN** the response is `400` with envelope `code: "validation"` and no `ms.remote.control` frame is sent

#### Scenario: Session not Connected rejects the switch

- **WHEN** a client `POST`s to `/input` while the session state is not `Connected`
- **THEN** the response is `409` with envelope `code: "SessionNotConnected"` and no frame is sent

### Requirement: Live push of input switches over WebSocket

The back-end SHALL push `{ topic: "devices", event: "input", udn, key }` after any successful `POST /input`. The event SHALL NOT carry `inputs` (they are a static constant every client can already read from `GET /inputs`) and SHALL NOT carry `activeId` (unknowable). Covers `FR-INPUT-03`.

#### Scenario: Every WS client sees a switch

- **WHEN** any client succeeds at `POST /api/devices/:udn/input { key: "KEY_HDMI3" }`
- **THEN** every WebSocket client subscribed to `/ws` receives `{ topic: "devices", event: "input", udn: "<UDN>", key: "KEY_HDMI3" }`

### Requirement: SPA picker uses DS primitives

The `RemoteScreen` inputs button and the modal it opens SHALL be composed from Orbit DS primitives only (`Modal`, `IconButton`, and a new `ListRow` primitive extended into the DS since no existing DS primitive fits the picker's neomorphic row treatment). No ad-hoc CSS. Inputs SHALL be non-actionable while the session is NOT `Connected` (rows disabled) — the modal SHALL auto-close if the session transitions away from `Connected` while it is open.

#### Scenario: Modal closes on session drop

- **WHEN** the modal is open and the session state transitions away from `Connected`
- **THEN** the modal closes automatically

#### Scenario: No hard-coded palette in the inputs feature

- **WHEN** the change lands and `grep -rE '#([0-9a-fA-F]{3,8})' front-end/src/screens/InputsModal.tsx` is run
- **THEN** the result is empty
