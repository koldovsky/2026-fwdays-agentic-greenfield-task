## 1. Back-end

- [x] 1.1 Create `back-end/src/tv/volume.ts` — per-UDN optimistic tracker (`{level: null, muted: boolean}`), event emitter for `changed`, and helper wrappers that build `ms.remote.control` frames for `KEY_VOLUP` / `KEY_VOLDOWN` / `KEY_MUTE`. Reuse `back-end/src/tv/keys.ts::keyControlParams(key)` from the archived `remote-control-keys` change so the on-wire envelope stays canonical (do **not** derive from `docs/samsung-ip-control-protocol/`; per AGENTS.md that Postman collection is the unrelated hotel-TV protocol). Wire the module to the session manager so `Connected` transitions emit an initial `changed` snapshot and `Disconnected`/`Offline` transitions clear the tracker.
- [x] 1.2 Create `back-end/src/routes/volume.ts` — `GET /volume` (always 200; body `{level: null, muted}`), `POST /volume/delta { delta }` (Fastify schema: integer, non-zero, `[-25, 25]`; else `400 validation`), `POST /mute`. All UDN-scoped. Reject non-Connected sessions on both POSTs with `409 SessionNotConnected` (same code shape as C6). Delta enqueues `abs(delta)` `KEY_VOLUP`/`KEY_VOLDOWN` frames in order via `session.enqueue`; mute enqueues one `KEY_MUTE`, flips the tracker, emits `changed`.
- [x] 1.3 Extend `back-end/src/ws/broker.ts` — subscribe to the volume module's `changed` event; fan out `{ topic: "devices", event: "volume", udn, level, muted }`. Include an initial `volume` snapshot per known UDN on `subscribe` (matches the `session` snapshot pattern C5 established).
- [x] 1.4 Register `POST/GET /volume`, `POST /volume/delta`, `POST /mute` under `/api` in `back-end/src/app.ts` and inject the volume module alongside the existing session manager decorator.

## 2. Back-end — verification

- [x] 2.1 Unit test: `delta(+1)` produces one `KEY_VOLUP` `ms.remote.control` frame; `delta(-1)` one `KEY_VOLDOWN`; `delta(3)` three `KEY_VOLUP` in order; `delta(0)` is rejected before any frame; `delta(26)` is rejected.
- [x] 2.2 Unit test: `toggleMute` enqueues one `KEY_MUTE` frame and flips the tracker; two toggles restore the original state.
- [x] 2.3 Integration test with stub session: on `POST /mute`, the stub records one `ms.remote.control` call with `DataOfCmd: "KEY_MUTE"`, the route returns `204`, and a WebSocket client receives a `volume` event carrying the new `muted` value.
- [x] 2.4 Integration test: `GET /volume` returns `{level: null, muted: false}` before any mute action, and `{level: null, muted: true}` after a successful `POST /mute`. `POST /volume/delta` while `Disconnected` returns `409 SessionNotConnected`.

## 3. Front-end

- [x] 3.1 Create `front-end/src/data/useVolume.ts` — subscribes to `devices` `volume` events for the UDN, does an initial `GET /api/devices/:udn/volume` on mount, returns `{ level: null, muted, delta(steps), toggleMute() }`. `delta` POSTs `{delta: steps}`; `toggleMute` POSTs `/mute` and optimistically inverts local `muted` (matches the server's own optimistic flip). No `setLevel` — there is no absolute-set endpoint.
- [x] 3.2 Update `front-end/src/screens/RemoteScreen.tsx`:
      - Local slider position state (default 38, purely SPA-local — the back-end can't report actual level).
      - `Slider value={sliderPosition} onChange={setSliderPosition} icon="volume_up"` for immediate visual response.
      - On drag commit (see 3.3), compute `steps = commitValue - lastCommittedValue` and call `useVolume(...).delta(steps)`; update `lastCommittedValue`.
      - Bind mute `IconButton icon={muted ? 'volume_off' : 'volume_up'} active={muted} onClick={toggleMute}`.
      - Both slider and mute button `disabled` while `state !== 'Connected'`.
- [x] 3.3 If the DS `Slider` primitive lacks an `onCommit` (drag-end / keyup) prop, extend it per `frontend-design-check` — do not inline drag-end handling in the app.

## 4. Front-end — verification

- [x] 4.1 Component test: `RemoteScreen` with mock `useVolume` returning `{level: null, muted: false}` renders the Slider without erroring and defaults to the local starting position.
- [x] 4.2 Component test: `useVolume` returns `{muted: true}` → the mute `IconButton` renders `volume_off` with `active` prop (inset shadow).
- [x] 4.3 Component test: dragging + committing the slider while `state='Connecting'` fires no HTTP request.

## 5. Verification & handoff

- [x] 5.1 `npm run back:build` and `npm run front:build` pass.
- [ ] 5.2 With a real Samsung TV: connect; drag the slider — TV volume moves in the drag direction (absolute position is not tracked, but the *change* is); tap mute — TV mutes/unmutes. **Level display** is null by design because Smart View can't report it; document this in the session log entry. *(Deferred — no LAN/TV; session log flags the follow-up.)*
- [ ] 5.3 Verify in both light and dark mode. *(Deferred alongside 5.2 — the change adds no new color usage; DS Slider extension follows existing tokens.)*
- [x] 5.4 Prepend a new dated entry to `docs/current-state.md` capturing that this cycle both (a) rewrote the pre-pivot design/spec/tasks for Smart View reality (descoped absolute-set and level read) and (b) implemented the descoped surface.
