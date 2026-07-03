## 1. Back-end — session core

- [ ] 1.1 Create `back-end/src/tv/types.ts` — `SessionState` union (internal, includes `Reconnecting`); `ClientSessionState` (external, collapses to 4 states).
- [ ] 1.2 Create `back-end/src/tv/errors.ts` — the `TvError` union, mapping table from `-32xxx` and socket errors, `toHttpEnvelope(err)` helper.
- [ ] 1.3 Create `back-end/src/tv/token-store.ts` — `loadTokens()`, `saveToken(udn, token)`; enforces `0600` on write; XDG-aware path.
- [ ] 1.4 Create `back-end/src/tv/jsonrpc.ts` — thin JSON-RPC 2.0 client on top of `undici.Pool`: `call(method, params)` returns a decoded result or throws mapped `TvError`. Logs the JSON-RPC `id` at request and response through the redacting logger.

## 2. Back-end — session manager

- [ ] 2.1 Create `back-end/src/tv/session.ts` — per-TV actor: owns pool + queue + state + event emitter. `connect()`, `disconnect()`, `enqueue(fn)`.
- [ ] 2.2 Create `back-end/src/tv/manager.ts` — `Map<UDN, Session>`; subscribes to registry events from `upnp-tv-discovery` to enforce the `offline → Offline` and `online → Disconnected` transitions.
- [ ] 2.3 Implement reconnect: 200/500/1000/2000/5000 ms backoff, cap 5; on cap, transition to `Disconnected`.
- [ ] 2.4 Implement pairing: on `connect()` with no token in the store, call `getAccessToken` per the samsung-ip-control-protocol skill; log a one-line prompt directing the user to confirm on the TV; persist the token on success.
- [ ] 2.5 Wire heartbeat: while `Connected`, issue a lightweight read-only method (e.g. `getSystemInfo`) every 15 s; on error, transition to `Reconnecting`.

## 3. Back-end — HTTP + WebSocket surface

- [ ] 3.1 Create `back-end/src/routes/sessions.ts` — `POST /api/devices/:udn/connect`, `POST /api/devices/:udn/disconnect`, `GET /api/devices/:udn/session`. Return client-visible state.
- [ ] 3.2 Extend `back-end/src/ws/broker.ts` — subscribe to session-manager state events; push `{ topic: "devices", event: "session", udn, state }` messages. Include the current session state per device in the `snapshot` payload.

## 4. Back-end — verification

- [ ] 4.1 Unit test `errors.ts` — every listed raw code maps to the expected domain code and HTTP status.
- [ ] 4.2 Unit test `token-store.ts` — write, re-read; assert file mode `0600` after write.
- [ ] 4.3 Unit test `session.ts` with a stub JSON-RPC transport — state transitions per D1's diagram, including reconnect cap.
- [ ] 4.4 Unit test that a token in a params object does not appear in the logs (extend the existing redactor test with a session-specific payload).
- [ ] 4.5 Integration test: connect to a stub TV that accepts pairing, hit `GET /api/devices/:udn/session`, assert `Connected`; kill the stub mid-heartbeat, assert transition to `Connecting` (client-visible) then `Connected` when the stub returns; kill it permanently, assert `Disconnected` after retry cap.
- [ ] 4.6 Integration test: WebSocket client receives `session` events for every transition.

## 5. Front-end — session hook

- [ ] 5.1 Create `front-end/src/data/useDeviceSession.ts` — subscribes to the `devices` `session` events for a given UDN, plus one-off `GET /api/devices/:udn/session` on mount; returns `{ state, connect(), disconnect() }`.
- [ ] 5.2 Wire `RemoteScreen` header to the hook — the `Badge` reflects the session state; the back button also calls `disconnect()` before navigating. All command controls (D-pad, transport, volume, power, app shortcuts) get `disabled={state !== 'Connected'}` — those controls stay non-functional stubs until `remote-control-keys`.
- [ ] 5.3 On opening a device from the list, call `connect()` immediately; the screen shows `Connecting` while the session comes up.

## 6. Verification & handoff

- [ ] 6.1 `npm run back:build` and `npm run front:build` pass.
- [ ] 6.2 With a real Samsung TV on the LAN: open the list, click a TV, watch the log for a pairing prompt line, accept on the TV, confirm the screen transitions `Connecting → Connected`.
- [ ] 6.3 Power-cycle the TV mid-session; confirm the badge goes `Connecting`, back to `Connected` when it returns.
- [ ] 6.4 If no real TV is available: use the stub integration tests as the manual repro; document that in `back-end/README.md`.
- [ ] 6.5 Prepend a new dated entry to `docs/current-state.md`.
