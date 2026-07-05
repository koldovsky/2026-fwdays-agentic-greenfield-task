## Why

Capability **C7** (`docs/capabilities.md`) — volume is the second-most-touched control on a remote and the only one in the MVP that is meaningfully stateful. The DS ships a `Slider` primitive; hooking it up to `directVolumeControl` gives the user a real, satisfying volume behaviour instead of only "+1 / -1" key presses. Mute state must also be reflected so the mute button is not a lie.

## What Changes

- Back-end HTTP surface:
  - `GET /api/devices/:udn/volume` → `{ level: number, muted: boolean }` (or `{ level: null, muted }` when the TV does not report a level — some Samsung models refuse to report).
  - `POST /api/devices/:udn/volume` with `{ level: 0..100 }` — absolute set via `directVolumeControl`.
  - `POST /api/devices/:udn/volume/delta` with `{ delta: -1 | +1 }` — relative up/down via `remoteKeyControl` `KEY_VOLUP` / `KEY_VOLDOWN`.
  - `POST /api/devices/:udn/mute` — toggles via `remoteKeyControl` `KEY_MUTE`.
- WebSocket topic gains a `volume` event under `devices`: `{ topic: "devices", event: "volume", udn, level, muted }`. Pushed after any successful volume/mute change, and on session `Connected` transitions once the initial state is read.
- Front-end `RemoteScreen` volume block gets wired: `Slider` bound to `level`, mute `IconButton` bound to `muted` (uses the DS `active` prop when muted). Both disabled while `state !== 'Connected'`.
- Volume-level display when supported: if the TV never reports a `level`, the slider becomes write-only (its position tracks the last user action, no reported value).

## Capabilities

### New Capabilities

- `volume-control`: absolute + relative volume, mute toggle, live state over WebSocket, front-end slider wiring.

### Modified Capabilities

<!-- None. Uses the same jsonrpc / session queue plumbing as remote-control-keys but does not change its requirements. -->

## Impact

- **Requirements covered**: `FR-VOLUME-01`, `FR-VOLUME-02`, `FR-VOLUME-03`, `FR-VOLUME-04`.
- **Depends on**: `tv-connection-lifecycle` (session queue, error mapping); `device-list-ui` (the RemoteScreen needs to be reachable). Parallel-safe with `remote-control-keys` and `input-management`.
- **Code**: adds `back-end/src/tv/volume.ts`, `back-end/src/routes/volume.ts`; extends the WebSocket broker to fan out `volume` events; adds `front-end/src/data/useVolume.ts` and wires the RemoteScreen's `Slider` + mute button.
- **Non-goals**: per-app volume; audio delay compensation; A/V receiver control; independent zone control (`BC-02` — Samsung only).
