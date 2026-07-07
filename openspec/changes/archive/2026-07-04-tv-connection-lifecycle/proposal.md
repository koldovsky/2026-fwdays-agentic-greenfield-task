## Why

Capability **C5** (`docs/capabilities.md`) — this is the pivot capability. Discovery gives us a UDN and an IP; commands (keys, volume, input) need a live IP Control session. This change owns the session state machine: pairing, `AccessToken` lifecycle, keep-alive HTTPS agent, serialization of state-changing commands, reconnect logic, and the domain error union that every downstream command capability maps into.

Nothing user-facing sends any TV command yet — this change stops at "Connected." Commands live in `remote-control-keys`, `volume-control`, and `input-management`, each of which becomes trivial once the session foundation is right.

## What Changes

- Introduce a per-TV session manager keyed by UDN. Each session owns exactly one keep-alive HTTPS agent (`AGENTS.md` house rule) and one FIFO queue that serializes state-changing JSON-RPC calls.
- State machine per TV: `Disconnected → Connecting → Connected`, with transitions `Connected → Reconnecting → Connected|Disconnected` on unexpected close, and `→ Offline` when the discovery registry marks it so.
- AccessToken handling: perform the Samsung IP Control pairing handshake, persist the token in a back-end config (encrypted at rest is out of MVP scope; local FS with 0600 mode is fine), rehydrate on process start, and **never** expose it to the front-end (`AGENTS.md`).
- Domain error union: `TvNotReachable | TvNotSupported | TvFailed | TvInvalidOp | TvUnknown`. Every raw JSON-RPC `-32xxx` code from the TV maps to one of these; the HTTP error envelope from `platform-foundation` carries the mapped code, never the raw one.
- HTTP surface: `POST /api/devices/:udn/connect`, `POST /api/devices/:udn/disconnect`, `GET /api/devices/:udn/session` (state snapshot). The `devices` WebSocket topic gains a new event `session` that pushes state transitions to all clients.
- Front-end: the `RemoteScreen` gains its `useDeviceSession(udn)` hook that surfaces state (`Connecting | Connected | Disconnected | Offline`) and drives the disabled-while-not-Connected policy needed by `remote-control-keys` (`FR-REMOTE-04`). Command dispatch itself is not implemented in this change.

## Capabilities

### New Capabilities

- `tv-connection-lifecycle`: per-TV IP Control session state machine, keep-alive agent, serialization, reconnect, `AccessToken` handling, domain error union, and the HTTP + WebSocket surface for it.

### Modified Capabilities

<!-- None. The `session` event is a new addition owned by `tv-connection-lifecycle`; discovery's existing `snapshot|added|updated|removed|offline` events are unchanged. -->


## Impact

- **Requirements covered**: `FR-CONNECTION-01`, `FR-CONNECTION-02`, `FR-CONNECTION-03`, `FR-CONNECTION-04`. Contributes to `FR-ERROR-01` (the error union is now real; user-facing surfacing still lives in `error-surfacing`).
- **Depends on**: `upnp-tv-discovery` (need a UDN, IP, port); `platform-foundation` (error envelope; logger with `AccessToken` redaction; HTTP + WebSocket transport). Refuses to start until both are archived.
- **Code**: adds `back-end/src/tv/session.ts`, `back-end/src/tv/manager.ts`, `back-end/src/tv/jsonrpc.ts`, `back-end/src/tv/errors.ts`, `back-end/src/tv/token-store.ts`, `back-end/src/routes/sessions.ts`; extends `back-end/src/ws/broker.ts` with the `session` event; adds `front-end/src/data/useDeviceSession.ts` and updates `RemoteScreen` header to consume it.
- **Dependencies added**: `undici` (already added by `upnp-tv-discovery`) — reused. No new native modules.
- **Non-goals**: any command implementation (keys, volume, input) — separate capabilities; UI for pairing (MVP prints the pairing token to the back-end log and expects the user to accept the on-TV prompt); manual add-by-IP; multi-user access control (`BC-04`).
