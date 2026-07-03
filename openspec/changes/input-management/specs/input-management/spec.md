## ADDED Requirements

### Requirement: List available inputs

The back-end SHALL expose `GET /api/devices/:udn/inputs` returning `{ inputs: [{ id, label, active }], activeId }`. Covers `FR-INPUT-01`.

#### Scenario: Cached list served fast

- **WHEN** a session is `Connected` and a client calls `GET /inputs`
- **THEN** the response is `200` with the cached list, updated no later than the last `/inputs/refresh` or session-Connected transition

#### Scenario: Empty cache falls through to TV read

- **WHEN** no cache exists yet
- **THEN** `GET /inputs` triggers one `directSourceControl` read on the TV, populates the cache, and returns the fresh result

### Requirement: Switch active input

The back-end SHALL expose `POST /api/devices/:udn/input { id }` that dispatches `directSourceControl` to switch to `id`. Covers `FR-INPUT-02`.

#### Scenario: Switch to HDMI2 succeeds

- **WHEN** a client `POST`s `{ "id": "HDMI2" }` and the session is `Connected` and `HDMI2` is in the cached list
- **THEN** the response is `204`, the TV received `directSourceControl` set to `HDMI2`, and a `input` WebSocket event is pushed with `activeId: "HDMI2"`

#### Scenario: Unknown id rejected

- **WHEN** a client `POST`s an `id` that is not in the current list, even after a fresh refresh
- **THEN** the response is `400` with envelope `code: "validation"` and no `directSourceControl` set is sent

### Requirement: Refresh input list on demand

The back-end SHALL expose `POST /api/devices/:udn/inputs/refresh` that forces a fresh read from the TV and updates the cache. Covers `FR-INPUT-03`.

#### Scenario: New input appears after refresh

- **WHEN** the user plugs in a new HDMI device and then calls `POST /inputs/refresh`
- **THEN** the response includes the new input in the list, and a subsequent `input` WebSocket event carries the updated list

### Requirement: Live push of input changes over WebSocket

The back-end SHALL push `{ topic: "devices", event: "input", udn, inputs, activeId }` after any successful switch or refresh.

#### Scenario: WebSocket receives current state on connect

- **WHEN** a session becomes `Connected`
- **THEN** an initial `input` WebSocket event is pushed within 2 seconds with the fetched list

### Requirement: SPA picker uses DS primitives

The `RemoteScreen` inputs button and the modal it opens SHALL be composed from Orbit DS primitives only (`Modal`, `IconButton`, and either an existing DS list-row primitive or one extended in the DS itself). No ad-hoc CSS. Inputs SHALL be selectable only while the session is `Connected`.

#### Scenario: Modal closes on session drop

- **WHEN** the modal is open and the session state transitions away from `Connected`
- **THEN** the modal closes automatically

#### Scenario: No hard-coded palette in the inputs feature

- **WHEN** the change lands and `grep -rE '#([0-9a-fA-F]{3,8})' front-end/src/screens/InputsModal.tsx` is run
- **THEN** the result is empty
