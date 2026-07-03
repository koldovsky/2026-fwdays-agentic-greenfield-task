## 1. Back-end

- [ ] 1.1 Create `back-end/src/tv/inputs.ts` — `readInputs(session)`, `setInput(session, id)` using `directSourceControl` per the samsung-ip-control-protocol skill. Owns the per-session cache.
- [ ] 1.2 Create `back-end/src/routes/inputs.ts` — `GET /inputs`, `POST /inputs/refresh`, `POST /input`. Validates unknown id, returns `409` when session is not `Connected`.
- [ ] 1.3 Extend `back-end/src/ws/broker.ts` — `input` event under `devices` topic; fires after switch, refresh, and initial-Connected read.

## 2. Back-end — verification

- [ ] 2.1 Unit test: `readInputs` marshalling one TV response into the `{ inputs, activeId }` shape.
- [ ] 2.2 Integration test with stub: `GET /inputs` returns cached list after first read; `POST /inputs/refresh` hits the TV again; `POST /input { id: "HDMI1" }` switches and emits an `input` event.
- [ ] 2.3 Integration test: switching to an unknown id after one refresh returns `400 validation`.

## 3. Front-end

- [ ] 3.1 Create `front-end/src/data/useInputs.ts` — subscribes to WebSocket `input` events for the UDN; initial `GET /inputs`; returns `{ inputs, activeId, setInput, refresh }`.
- [ ] 3.2 Create `front-end/src/screens/InputsModal.tsx` composed from `Modal` + `IconButton` (header refresh) + a DS row primitive per input. `disabled` on selection when `state !== 'Connected'`.
- [ ] 3.3 Update `RemoteScreen`: add an `IconButton icon="input"` next to the transport row; opens the modal. Auto-close if session state leaves `Connected`.
- [ ] 3.4 If the DS lacks a suitable list-row primitive with the right hover/press treatment, extend the DS via the `frontend-design-check` skill process; do not inline styles.

## 4. Front-end — verification

- [ ] 4.1 Component test: `InputsModal` with three inputs renders three rows; the row whose `id` matches `activeId` shows the active check icon.
- [ ] 4.2 Component test: tapping a non-active row calls `setInput(id)` and closes the modal.
- [ ] 4.3 Component test: session state flipping to `Connecting` while the modal is open closes it.

## 5. Verification & handoff

- [ ] 5.1 `npm run back:build` and `npm run front:build` pass.
- [ ] 5.2 With a real Samsung TV: connect, open the inputs modal, verify at minimum HDMI 1 and TV appear; switch; confirm the TV changes source and the picker's active checkmark moves; hit refresh; confirm the list re-fetches.
- [ ] 5.3 Verify in dark mode.
- [ ] 5.4 Prepend a new dated entry to `docs/current-state.md`.
