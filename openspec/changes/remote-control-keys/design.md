## Context

Samsung IP Control ships a `remoteKeyControl` JSON-RPC method whose exact param shape is documented in the `samsung-ip-control-protocol` skill and in `docs/samsung-ip-control-protocol/IP CONTROL V2.postman_collection.json`. Do not re-derive from the PDF. `tv-connection-lifecycle` supplies the per-TV serialized queue and the domain error mapping. `device-list-ui` supplies the route from a `DeviceCard` click into `RemoteScreen`. The Orbit DS supplies `DPad`, `IconButton` — this change is almost entirely wiring.

## Goals / Non-Goals

**Goals:**
- One canonical HTTP endpoint for keys with a strongly-typed set of allowed values.
- Every remote-like button in the SPA fires a real command.
- Disabled state honoured while the session is not `Connected`.
- No untyped strings on either end of the wire.

**Non-Goals:**
- Multi-key macros / key sequences with delays.
- Long-press semantics (Samsung protocol has separate `KEY_PRESS`/`KEY_RELEASE`; MVP uses a single `KEY_CLICK` per press).
- Volume, mute, or input keys — those live in `volume-control` and `input-management` so those capabilities can compose stateful UI (slider position, current input display).
- Toast / banner surfacing of failures — `error-surfacing`.

## Decisions

### D1 — Endpoint shape

`POST /api/devices/:udn/key` with body `{ key: SamsungKeyCode }`. 204 on success, JSON error envelope on failure. The path is UDN-scoped so we never accidentally send a key to the wrong TV.

`SamsungKeyCode` is a TS union that lives in `back-end/src/tv/keys.ts` and is exported for the front-end to mirror. Explicit list:

```
"KEY_UP" | "KEY_DOWN" | "KEY_LEFT" | "KEY_RIGHT" | "KEY_ENTER" |
"KEY_RETURN" | "KEY_HOME" | "KEY_MENU" | "KEY_POWER"
```

**Alternative considered:** allow any string and let the TV reject it. Rejected — `AGENTS.md` says never leak raw `-32xxx` codes; validating early gives a clean 400.

### D2 — Serialization via `tv-connection-lifecycle` queue

The route handler resolves the `Session` for the UDN and calls `session.enqueue(() => jsonrpc.call('remoteKeyControl', { KeyCode: key }))`. If the session is not `Connected`, the endpoint responds `409 Conflict` with `{ code: "SessionNotConnected", message, correlationId }` — this is a new front-end-facing code, not part of the `TvError` union (that union is for TV-side errors). Documented in the spec below.

### D3 — Front-end wiring

- `useSendKey(udn)` hook returns `sendKey(key: SamsungKeyCode)` and re-throws `ApiError` on failure. Console-logs on failure (temporary; toast comes with `error-surfacing`).
- `RemoteScreen` header + button props: pass `state` from `useDeviceSession` alongside `sendKey`. Every command control:
  - `DPad onDirection={(d) => sendKey({ up: 'KEY_UP', down: 'KEY_DOWN', left: 'KEY_LEFT', right: 'KEY_RIGHT' }[d])}`
  - `DPad onSelect={() => sendKey('KEY_ENTER')}`
  - Back / Home / Menu `IconButton`s → `KEY_RETURN` / `KEY_HOME` / `KEY_MENU`.
  - Power `IconButton` (tone="accent") → `KEY_POWER`.
- **All** command controls: `disabled={state !== 'Connected'}` (`FR-REMOTE-04`). Orbit `IconButton` and `DPad` accept `disabled`; if `DPad` does not, `pointer-events: none` + reduced opacity via a token wrapper is the escape hatch (still no ad-hoc CSS on the primitive itself).

### D4 — Latency & rapid-fire

TV commands are cheap. On a healthy LAN, a keypress-to-response round-trip is <100 ms. If the user mashes the D-pad, the per-TV FIFO queue serializes automatically — order is preserved and no bursts hit the TV. No debounce needed on the front-end.

## Risks / Trade-offs

- [Some Samsung firmwares reject `KEY_HOME` or `KEY_MENU` on certain series] → Maps to `TvNotSupported` (501) — the button flashes disabled for a moment, no user-facing crash. Documented; future firmware feature detection is out of scope.
- [Power on an off TV requires Wake-on-LAN and cannot be sent over IP Control] → `KEY_POWER` toggles when the TV is on; from `Offline` it silently fails. Deferred to a follow-up capability; product brief lists WoL as future scope.
- [Front-end button spam produces log churn] → The per-TV queue caps concurrency at 1. If load ever justifies it, add a 50-ms rolling debounce at the hook level — not now.

## Migration Plan

No migration. Rollback: revert the two new files; `tv-connection-lifecycle` remains intact.

## Open Questions

- Should we expose repeat/hold semantics (`KEY_PRESS` + `KEY_RELEASE`) for scroll-through menu use cases? Defer until someone actually needs it — MVP D-pad clicks are enough for the demo.
