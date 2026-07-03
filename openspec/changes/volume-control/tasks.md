## 1. Back-end

- [ ] 1.1 Create `back-end/src/tv/volume.ts` — `readVolume(session)` returning `{ level: number | null, muted: boolean }` and helper wrappers for absolute-set / delta / mute-toggle.
- [ ] 1.2 Create `back-end/src/routes/volume.ts` — `GET /volume`, `POST /volume`, `POST /volume/delta`, `POST /mute`. All UDN-scoped. Reject bad inputs with `400 validation` before touching the TV; reject non-Connected sessions with `409 SessionNotConnected`.
- [ ] 1.3 Extend `back-end/src/ws/broker.ts` — subscribe to the volume module's `changed` event; fan out `{ topic: "devices", event: "volume", udn, level, muted }`.
- [ ] 1.4 Volume module fires `changed` after any successful set/delta/mute call, and once when the session transitions to `Connected` (after the initial read).

## 2. Back-end — verification

- [ ] 2.1 Unit test: absolute-set clamps 0..100 and calls `directVolumeControl` with the right shape.
- [ ] 2.2 Unit test: delta of `+1` maps to `KEY_VOLUP`, `-1` to `KEY_VOLDOWN`, `0` rejected.
- [ ] 2.3 Integration test with stub: on session Connected, one `directVolumeControl` read is issued and a `volume` WebSocket event is pushed.
- [ ] 2.4 Integration test: `TvNotSupported` on `directVolumeControl` returns 501 for absolute-set but delta still works.

## 3. Front-end

- [ ] 3.1 Create `front-end/src/data/useVolume.ts` — subscribes to `devices` `volume` events for the UDN; initial `GET /api/devices/:udn/volume`; returns `{ level, muted, setLevel, delta, toggleMute }`. Debounces `setLevel` to trailing 150 ms + firing on drag commit.
- [ ] 3.2 Update `front-end/src/screens/RemoteScreen.tsx`:
      - Bind `Slider value={level ?? 0} onChange={setLevel} icon="volume_up"`.
      - Bind mute `IconButton icon={muted ? 'volume_off' : 'volume_up'} active={muted} onClick={toggleMute}`.
      - `disabled={state !== 'Connected'}` on both.
- [ ] 3.3 If the DS `Slider` primitive lacks an `onCommit` prop, follow the `frontend-design-check` skill process to extend the DS primitive — do not inline drag-end handling in the app.

## 4. Front-end — verification

- [ ] 4.1 Component test: `RemoteScreen` with `volume` state `{ level: 42, muted: false }` renders the slider at 42%.
- [ ] 4.2 Component test: setting `muted: true` in state renders the mute icon `volume_off` with `active` prop.
- [ ] 4.3 Component test: dragging the slider while `state='Connecting'` fires no HTTP request.

## 5. Verification & handoff

- [ ] 5.1 `npm run back:build` and `npm run front:build` pass.
- [ ] 5.2 With a real Samsung TV: connect, drag the slider — TV volume tracks; tap mute — TV mutes; press physical remote's volume button — SPA slider updates within 2 s (only if the TV emits an unsolicited push; otherwise the SPA reflects only its own actions, and that is documented behaviour).
- [ ] 5.3 Verify in both light and dark mode.
- [ ] 5.4 Prepend a new dated entry to `docs/current-state.md`.
