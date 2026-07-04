## Why

Capability **C6** (`docs/capabilities.md`) — this is the first user-visible command capability. With `tv-connection-lifecycle` landed, the front-end can now say "the session is Connected"; this change lets the user actually press buttons and see the TV respond. Remote keys are the smallest and most demoable slice of TV control — D-pad, transport row, power — and they exercise the same JSON-RPC path that volume and input will later reuse.

## What Changes

- Back-end command endpoint `POST /api/devices/:udn/key` accepting `{ key: SamsungKeyCode }`. Dispatches `remoteKeyControl` per the `samsung-ip-control-protocol` skill through the session queue owned by `tv-connection-lifecycle`. Response is 204 on success or a domain-error envelope.
- The set of supported keys is enumerated in a single TypeScript union (`SamsungKeyCode`) — no free-text keys accepted. Enum includes at minimum: `KEY_UP`, `KEY_DOWN`, `KEY_LEFT`, `KEY_RIGHT`, `KEY_ENTER`, `KEY_HOME`, `KEY_MENU`, `KEY_RETURN`, `KEY_POWER`.
- Front-end `RemoteScreen` gains its real click handlers on Orbit `DPad`, `IconButton` transport row (back/home/menu), and the accent power `IconButton`. Every button is `disabled` unless the session state is `Connected` (`FR-REMOTE-04`).
- Success/failure feedback: the button flashes an active state on success; on failure the front-end throws through `apiClient`'s `ApiError` and (for now) logs to console. Full user-facing surfacing lives in `error-surfacing`.
- Optimistic UI: no. Commands are cheap but not idempotent; the button "commits" only when the back-end returns 204. Latency is well under 100 ms on a healthy LAN.

## Capabilities

### New Capabilities

- `remote-control-keys`: HTTP endpoint + enumerated key set + front-end D-pad / transport / power wiring.

### Modified Capabilities

<!-- None. Consumes `tv-connection-lifecycle`'s session queue but does not change any of its requirements. -->

## Impact

- **Requirements covered**: `FR-REMOTE-01`, `FR-REMOTE-02`, `FR-REMOTE-03`, `FR-REMOTE-04`.
- **Depends on**: `tv-connection-lifecycle` (needs the session queue and the error mapping); `device-list-ui` (needs the RemoteScreen route to be reachable from a real device). Refuses to start until both are archived.
- **Code**: adds `back-end/src/tv/keys.ts` (the enum + `remoteKeyControl` shape), `back-end/src/routes/keys.ts`; adds `front-end/src/data/useSendKey.ts` and updates `RemoteScreen.tsx` handlers.
- **Non-goals**: volume keys (`volume-control` owns them for slider integration and mute state); input switching (`input-management`); recording key streams or macros (product brief "Future scope"); app launching (product brief "Future scope"); haptic/audio feedback.
