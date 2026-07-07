## Why

Capability **C8** (`docs/capabilities.md`) — with keys and volume covered, the last core control is source selection. Users routinely need to jump between HDMI 1 (console), HDMI 2 (streaming stick), TV tuner, or a smart-TV app. Doing this from the physical remote takes several menu presses; a one-tap picker in the SPA is a meaningful UX win. Inputs are also usefully small, rarely-changing data — so we can afford an on-demand refresh model without any push logic.

## What Changes

- Back-end HTTP surface:
  - `GET /api/devices/:udn/inputs` → `{ inputs: [{ id, label, active }], activeId }`. Server caches per session; refreshed on session Connected and on demand.
  - `POST /api/devices/:udn/inputs/refresh` → force re-read from the TV. Reply carries the fresh snapshot.
  - `POST /api/devices/:udn/input { id }` → switch. Reply is 204 on success.
- Uses `directSourceControl` per the `samsung-ip-control-protocol` skill (both to list inputs and to set active); mapping is documented in the skill / Postman collection.
- WebSocket topic gains an `input` event under `devices`: `{ topic, event: "input", udn, inputs, activeId }` pushed after a switch or a refresh.
- Front-end `RemoteScreen` gains an "Inputs" `IconButton` that opens an Orbit `Modal` listing available inputs as a vertical stack of DS elements; tapping one calls `POST /input { id }` and closes the modal. Refresh gesture: a small `IconButton` in the modal header.

## Capabilities

### New Capabilities

- `input-management`: list, switch, and refresh TV inputs via HTTP + WebSocket, plus a modal picker in the SPA.

### Modified Capabilities

<!-- None. Consumes tv-connection-lifecycle's session queue; independent of keys and volume. -->

## Impact

- **Requirements covered**: `FR-INPUT-01`, `FR-INPUT-02`, `FR-INPUT-03`.
- **Depends on**: `tv-connection-lifecycle`; `device-list-ui`. Parallel-safe with `remote-control-keys` and `volume-control`.
- **Code**: adds `back-end/src/tv/inputs.ts`, `back-end/src/routes/inputs.ts`; extends the WebSocket broker with the `input` event; adds `front-end/src/data/useInputs.ts`, `front-end/src/screens/InputsModal.tsx`, and wires an "Inputs" button into `RemoteScreen`.
- **Non-goals**: renaming inputs (some TVs allow this — the DS `Input` primitive could support it, but changing TV state beyond source switching is out of MVP scope); creating custom "recent inputs" shortcuts; per-input scene automation.
