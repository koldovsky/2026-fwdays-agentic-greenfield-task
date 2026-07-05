## 1. Back-end

- [x] 1.1 Create `back-end/src/tv/inputs.ts` — `SamsungInputKey` union + `INPUT_CATALOGUE: readonly { id: SamsungInputKey; label: string }[]` static constant (KEY_SOURCE, KEY_HDMI, KEY_HDMI1..4, KEY_TV, KEY_AV1, KEY_COMPONENT1). Extend the shared `SamsungKeyCode` union in `back-end/src/tv/keys.ts` with these keys so `keyControlParams(key)` handles them. Do **not** derive input params from `docs/samsung-ip-control-protocol/` — per AGENTS.md that Postman collection is the unrelated hotel-TV protocol.
- [x] 1.2 Create `back-end/src/routes/inputs.ts` — `GET /inputs` returning `{ inputs: INPUT_CATALOGUE }` (no session needed; always 200). `POST /input { key }` Fastify schema validates `key` against `SamsungInputKey` enum → `400 validation` on unknown; reject non-Connected sessions with `409 SessionNotConnected`. On valid+Connected, `session.enqueue((transport) => transport.call('ms.remote.control', keyControlParams(key)))`; emit an `input` event with `{ udn, key }`; reply `204`.
- [x] 1.3 Extend `back-end/src/ws/broker.ts` — new `input` DevicesTopicEvent; fan out `{ topic: 'devices', event: 'input', udn, key }` after successful switch. No `initial-on-Connected` push (static list + no active-input = nothing to snapshot).
- [x] 1.4 Register the routes under `/api` in `back-end/src/app.ts`. Inject the inputs module into `createDevicesBroker` alongside the existing session/volume modules.

## 2. Back-end — verification

- [x] 2.1 Unit test: `INPUT_CATALOGUE` includes at minimum KEY_SOURCE, KEY_HDMI1, KEY_TV; every entry's `id` is a valid Samsung `KEY_*` string; `label` is non-empty.
- [x] 2.2 Integration test with stub session: `GET /inputs` returns the catalogue (regardless of session state); `POST /input { key: "KEY_HDMI1" }` while Connected returns 204, the stub records one `ms.remote.control` frame with `DataOfCmd: "KEY_HDMI1"`, and a WebSocket client receives `{ topic: "devices", event: "input", udn, key: "KEY_HDMI1" }`.
- [x] 2.3 Integration test: `POST /input { key: "KEY_MADE_UP" }` → `400 validation` (no frame sent). `POST /input { key: "KEY_HDMI1" }` while `Disconnected` → `409 SessionNotConnected` (no frame sent).

## 3. Front-end

- [x] 3.1 Create `front-end/src/data/inputs.ts` — mirror `SamsungInputKey` union + `INPUT_CATALOGUE` (kept in sync with the back-end manually, same as `data/keys.ts` mirrors `back-end/src/tv/keys.ts`).
- [x] 3.2 Create `front-end/src/data/useInputs.ts` — subscribes to `devices`/`input` WebSocket events for the UDN (currently just a log-observation hook — no state to update since we don't track activeId). Initial `GET /api/devices/:udn/inputs` on mount populates the local `inputs` array (which is a constant, but the round-trip catches a back-end/front-end catalogue drift). Returns `{ inputs, setInput }`.
- [x] 3.3 Create `front-end/src/screens/InputsModal.tsx` composed from DS `Modal` + the new DS `ListRow` primitive (see 3.5) per input. Tapping a row calls `setInput(row.id)` then closes the modal. Every row `disabled={state !== 'Connected'}`.
- [x] 3.4 Update `RemoteScreen`: add an `IconButton icon="input"` on the transport row (next to Menu). Tapping toggles a local `isInputsModalOpen` boolean. `useEffect` closes the modal if `state !== 'Connected'` while open.
- [x] 3.5 Extend the DS with a `ListRow` primitive per `frontend-design-check`: `docs/orbit-tv-remote-design-system/components/core/ListRow.{jsx,d.ts}`. Props `{ label, onClick, disabled }`. Raised default, inset shadow on press, `--base-100` surface, tokens throughout. Also added a `ListRow` entry to `front-end/src/ds.d.ts` — this project ships shim declarations because the DS's own `.d.ts` files only export props interfaces, not the component itself.

## 4. Front-end — verification

- [x] 4.1 Component test: `InputsModal` renders one row per entry in `INPUT_CATALOGUE` (at least three rows), each with the entry's `label`.
- [x] 4.2 Component test: tapping a row while `state='Connected'` calls the injected `setInput(key)` with that row's `id` and calls the injected `onClose`.
- [x] 4.3 Component test: rows are `disabled` while `state='Connecting'` — tapping them fires no `setInput` call.
- [x] 4.4 Integration test at `RemoteScreen.test.tsx`: opening the modal then flipping `state` to `Connecting` calls `onClose`.

## 5. Verification & handoff

- [x] 5.1 `npm run back:build` and `npm run front:build` pass.
- [ ] 5.2 With a real Samsung TV: connect, open the inputs modal, tap `KEY_HDMI1` — the TV switches to HDMI 1 (or opens the source picker if the TV ignores direct-input keys). Tap `KEY_SOURCE` — the TV's own source picker opens. **No active-input marker** in the SPA because Smart View can't report it — this is expected per the descoped design. *(Deferred — no LAN/TV.)*
- [ ] 5.3 Verify in dark mode. *(Deferred alongside 5.2 — DS `ListRow` follows existing tokens.)*
- [x] 5.4 Prepend a new dated entry to `docs/current-state.md` capturing that this cycle both (a) rewrote the pre-pivot design/spec/tasks for Smart View reality (descoped input listing/active read/refresh) and (b) implemented the descoped surface.
