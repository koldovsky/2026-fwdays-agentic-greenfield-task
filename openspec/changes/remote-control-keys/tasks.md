## 1. Back-end

- [ ] 1.1 Create `back-end/src/tv/keys.ts` — `SamsungKeyCode` union with the MVP set, plus a helper `keyControlParams(key)` returning the exact `params` shape from the samsung-ip-control-protocol skill / Postman collection.
- [ ] 1.2 Create `back-end/src/routes/keys.ts` — `POST /api/devices/:udn/key`. Validate body against the union (`fastify` schema with the enum). Fetch the session from the manager; if state is not `Connected`, throw `HttpError(409, "SessionNotConnected")`; else `session.enqueue(() => jsonrpc.call('remoteKeyControl', keyControlParams(key)))` and reply `204`.
- [ ] 1.3 Register the route under the `/api` prefix in `back-end/src/app.ts`.

## 2. Back-end — verification

- [ ] 2.1 Unit test: `keyControlParams` produces the exact shape from the Postman collection for at least three keys (`KEY_UP`, `KEY_ENTER`, `KEY_POWER`).
- [ ] 2.2 Integration test with a stub session: `POST { key: "KEY_UP" }` → `204`, stub records one `remoteKeyControl` call with the correct params.
- [ ] 2.3 Integration test: unknown key → `400 validation`; session `Disconnected` → `409 SessionNotConnected`.
- [ ] 2.4 Integration test: three rapid `POST`s land on the stub in order.

## 3. Front-end

- [ ] 3.1 Create `front-end/src/data/keys.ts` mirroring `SamsungKeyCode`.
- [ ] 3.2 Create `front-end/src/data/useSendKey.ts` — returns `sendKey(key)`; uses `apiClient.post('/api/devices/${udn}/key', { key })`; re-throws `ApiError`; console-logs failures.
- [ ] 3.3 Update `front-end/src/screens/RemoteScreen.tsx`:
      - Wire `DPad onDirection` and `onSelect` via a 4-key map to `sendKey`.
      - Wire the back / home / menu `IconButton`s to `KEY_RETURN` / `KEY_HOME` / `KEY_MENU`.
      - Wire the accent power `IconButton` to `KEY_POWER`.
      - Pass `disabled={state !== 'Connected'}` to every command control. If the DS `DPad` doesn't accept `disabled`, extend the DS with the flag (per the frontend-design-check skill — do not inline styles on the primitive).

## 4. Front-end — verification

- [ ] 4.1 Component test: `RemoteScreen` in state `Connecting` renders every command control with `disabled`.
- [ ] 4.2 Component test: clicking the D-pad up in state `Connected` calls `sendKey('KEY_UP')`.
- [ ] 4.3 Grep guard: `grep -rE '#([0-9a-fA-F]{3,8})' front-end/src` returns nothing new (no palette leaked in).

## 5. Verification & handoff

- [ ] 5.1 `npm run back:build` and `npm run front:build` pass.
- [ ] 5.2 With a real Samsung TV: open the remote, press each button, observe the TV react. Toggle the TV off; confirm all buttons grey out. Toggle it back on and re-connect; confirm they light up again.
- [ ] 5.3 If no real TV is available, capture a screen recording of the stub-driven integration tests as the manual repro.
- [ ] 5.4 Prepend a new dated entry to `docs/current-state.md`.
