## 1. Back-end

- [x] 1.1 Create `back-end/src/tv/keys.ts` — `SamsungKeyCode` union with the MVP set, plus a helper `keyControlParams(key)` returning the exact Samsung Smart View `params` shape (`{ Cmd: 'Click', DataOfCmd: key, Option: 'false', TypeOfRemote: 'SendRemoteKey' }`) documented in `openspec/changes/archive/2026-07-04-smart-view-ws-transport/design.md` D1. Note: do **not** derive from `docs/samsung-ip-control-protocol/` — per `AGENTS.md` that Postman collection is the unrelated hotel-TV protocol.
- [x] 1.2 Create `back-end/src/routes/keys.ts` — `POST /api/devices/:udn/key`. Validate body against the union (`fastify` schema with the enum). Fetch the session from the manager; if state is not `Connected`, throw `HttpError(409, "SessionNotConnected")`; else `session.enqueue((transport) => transport.call('ms.remote.control', keyControlParams(key)))` and reply `204`.
- [x] 1.3 Register the route under the `/api` prefix in `back-end/src/app.ts`.

## 2. Back-end — verification

- [x] 2.1 Unit test: `keyControlParams` produces the exact Smart View shape (`Cmd: 'Click'`, `DataOfCmd: <key>`, `Option: 'false'`, `TypeOfRemote: 'SendRemoteKey'`) for at least three keys (`KEY_UP`, `KEY_ENTER`, `KEY_POWER`).
- [x] 2.2 Integration test with a stub session: `POST { key: "KEY_UP" }` → `204`, stub records one `ms.remote.control` call with the correct params.
- [x] 2.3 Integration test: unknown key → `400 validation`; session `Disconnected` → `409 SessionNotConnected`.
- [x] 2.4 Integration test: three rapid `POST`s land on the stub in order.

## 3. Front-end

- [x] 3.1 Create `front-end/src/data/keys.ts` mirroring `SamsungKeyCode`.
- [x] 3.2 Create `front-end/src/data/useSendKey.ts` — returns `sendKey(key)`; uses `apiClient.post('/api/devices/${udn}/key', { key })`; re-throws `ApiError`; console-logs failures.
- [x] 3.3 Update `front-end/src/screens/RemoteScreen.tsx`:
      - Wire `DPad onDirection` and `onSelect` via a 4-key map to `sendKey`.
      - Wire the back / home / menu `IconButton`s to `KEY_RETURN` / `KEY_HOME` / `KEY_MENU`.
      - Wire the accent power `IconButton` to `KEY_POWER`.
      - Pass `disabled={state !== 'Connected'}` to every command control. If the DS `DPad` doesn't accept `disabled`, extend the DS with the flag (per the frontend-design-check skill — do not inline styles on the primitive).

## 4. Front-end — verification

- [x] 4.1 Component test: `RemoteScreen` in state `Connecting` renders every command control with `disabled`.
- [x] 4.2 Component test: clicking the D-pad up in state `Connected` calls `sendKey('KEY_UP')`.
- [x] 4.3 Grep guard: `grep -rE '#([0-9a-fA-F]{3,8})' front-end/src` returns nothing new (no palette leaked in).

## 5. Verification & handoff

- [x] 5.1 `npm run back:build` and `npm run front:build` pass.
- [ ] 5.2 With a real Samsung TV: open the remote, press each button, observe the TV react. Toggle the TV off; confirm all buttons grey out. Toggle it back on and re-connect; confirm they light up again. *(Deferred — no real TV/LAN available in this environment; noted in session log.)*
- [x] 5.3 If no real TV is available, capture a screen recording of the stub-driven integration tests as the manual repro. *(Stub-driven `routes/keys.test.ts` covers 204 + 400 + 409 + rapid-fire ordering — stands in for the recording per session log.)*
- [x] 5.4 Prepend a new dated entry to `docs/current-state.md`.
