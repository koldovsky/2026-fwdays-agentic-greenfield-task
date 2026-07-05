## Context

This change was originally drafted against Samsung's hotel-TV IP Control (JSON-RPC 2.0), which exposes `directVolumeControl` for absolute set + read *and* honours `KEY_VOLUP` / `KEY_VOLDOWN` / `KEY_MUTE` via `remoteKeyControl`. `smart-view-ws-transport` (archived 2026-07-04) pivoted the transport to Samsung's consumer **Smart View WebSocket** on port 8001 — and Smart View is **remote-key-only**. There is no absolute-set method; there is no way to *read* current level or current mute state over the WS. Only three keys are usable here: `KEY_VOLUP`, `KEY_VOLDOWN`, `KEY_MUTE`, all sent as `ms.remote.control` frames of the exact shape documented in `openspec/changes/archive/2026-07-04-smart-view-ws-transport/design.md` D1.

Everything else (absolute-set, level display, mute-state read) needs a *different* transport (UPnP `RenderingControl`, SmartThings, or the second REST API on 8001). Adding one of those is out of scope for this change; `docs/capabilities.md` C7 explicitly says "volume-level display only when the TV reports it — otherwise the slider is a write-only control", so we take that fallback as the MVP contract.

`tv-connection-lifecycle` gives us the per-TV Smart View session queue and the domain error mapping. `remote-control-keys` (C6, archived) supplies `back-end/src/tv/keys.ts::keyControlParams(key)` — the same helper is reused here for the three volume keys so the wire format stays canonical. The DS `Slider` primitive at `docs/orbit-tv-remote-design-system/components/forms/Slider.jsx` accepts `{ value, min, max, onChange, icon }` today.

## Goals / Non-Goals

**Goals:**
- Slider dragging fires TV volume changes.
- Mute button toggles the TV and reflects the toggle state locally.
- WebSocket push whenever we make a change so multiple SPA clients stay in sync with each other.
- No untyped strings on the wire; reuse the C6 `SamsungKeyCode` enum.

**Non-Goals:**
- Absolute volume set (Smart View can't).
- Reading the TV's current level or current mute state (Smart View can't).
- UPnP `RenderingControl` / SmartThings integration — separate future capability if the above are ever needed.
- Debouncing multiple concurrent drags on one TV. The per-TV FIFO queue owned by `tv-connection-lifecycle` already serializes.
- Persistent per-user volume preferences.

## Decisions

### D1 — Endpoints (Smart View WS reality)

- `POST /api/devices/:udn/volume/delta` with `{ delta: number }`, `delta` an integer in `[-25, +25]` (small guard against a runaway drag). The route computes `abs(delta)` `KEY_VOLUP` or `KEY_VOLDOWN` frames enqueued in order through `session.enqueue`. `delta === 0` rejected with `400 validation`.
- `POST /api/devices/:udn/mute` — enqueues one `KEY_MUTE` frame. Flips the server's tracked `muted` state and pushes a `volume` WebSocket event. This is optimistic: the TV cannot tell us the real mute state, so we assume the toggle worked.
- `GET /api/devices/:udn/volume` returns `{ level: null, muted }` where `muted` is the server's optimistic tracker (defaults `false` on session `Disconnected`, preserved across state transitions).

Non-Connected sessions get `409 SessionNotConnected` on `POST` (same code as C6). `GET` always succeeds and returns the current tracker state (Disconnected sessions report `{level:null, muted:false}`).

**Rejected alternative:** keep `POST /volume {level}` as a stub that walks toward the target via multiple `KEY_VOLUP/DOWN` frames. Rejected — the TV can't tell us where the volume actually is, so "walk toward" has no ground truth to walk against. Would produce silent misbehaviour.

### D2 — State push contract

The volume module owns a per-UDN `{ level: null, muted: boolean }` tracker with these events:

- Session becomes `Connected` → emit `{level: null, muted}` snapshot event (initial state — muted defaults to the last known value, or `false` if never observed).
- Successful `POST /volume/delta` → emit `{level: null, muted}` event (level is always null; delta is fire-and-forget so we can't confirm).
- Successful `POST /mute` → flip `muted`, emit `{level: null, muted}` event.
- Session becomes `Disconnected` or `Offline` → clear the tracker for that UDN.

The broker fans out `{ topic: "devices", event: "volume", udn, level, muted }` verbatim.

### D3 — Front-end binding

`useVolume(udn)` returns `{ level, muted, delta(steps), toggleMute() }`:

- Initial `GET /api/devices/:udn/volume` on mount hydrates local state; subsequent `volume` WebSocket events overwrite it.
- `delta(steps: number)` fires `POST /volume/delta { delta: steps }`.
- `toggleMute()` fires `POST /mute` and (optimistically, matching the server-side flip) inverts local `muted`.
- No `setLevel`. `level` is always `null` on Smart View — see D1.

`RemoteScreen`:

- Slider stays visible but becomes write-only: user drags → the SPA computes `steps = newValue - oldValue` and calls `delta(steps)` on drag commit. Slider position tracks the user's action locally (last-write-wins); no server-reported level to reconcile against.
- Mute `IconButton icon={muted ? 'volume_off' : 'volume_up'} active={muted}` — DS `active` prop drives the inset shadow.
- Both disabled when `state !== 'Connected'`.

### D4 — Drag semantics on a level-less slider

- `Slider onChange` fires per movement, updating local slider position immediately (no HTTP).
- On drag **commit** (drag end / keyboard release), the hook computes `steps = commitValue - lastCommittedValue` and sends `POST /volume/delta { delta: steps }`. `lastCommittedValue` updates to `commitValue`.
- The per-TV FIFO queue owned by C5 serializes the resulting KEY_VOL frames, so bursts stay ordered.
- If the DS `Slider` primitive lacks an `onCommit` callback, extend it per `frontend-design-check` — do not inline mouseup/keyup handling in `RemoteScreen`. See D4 Task 3.3.

## Risks / Trade-offs

- **[No ground truth for `muted`]** → We track optimistically. If the user hits the physical remote mute button, our tracker drifts. Documented; MVP UX. A future UPnP or SmartThings integration can reconcile.
- **[No ground truth for `level`]** → Slider is write-only; its position is what the SPA last set locally, not what the TV is doing. If the user turns down the TV with the physical remote, dragging the slider "up" would fire `KEY_VOLUP` frames that walk from wherever the TV actually is, not from the slider position. Acceptable for MVP.
- **[Delta cap of ±25]** → A single fast drag from 0 → 100 would fire 100 `KEY_VOLUP` frames. Capping the wire delta at 25 prevents a runaway; SPA `Slider` typically fires 0-1 commits per drag anyway. If the user needs a bigger jump, they can drag again.
- **[Optimistic mute toggle can lie]** → If the KEY_MUTE frame fails to reach the TV, the tracker still flips locally. Since Smart View calls are fire-and-forget (per `smart-view-ws-transport` D1), we cannot detect this. Documented; acceptable for MVP.

## Migration Plan

None. Rollback: revert; slider becomes non-functional again, mute button greys out.

## Open Questions

- **Should the SPA render a "level unknown" placeholder on the slider so the user knows they're driving blind?** MVP: no — the slider looks the same either way; the UX signal "your drag is a request, not a display of truth" is subtle but acceptable. Revisit if user feedback complains.
- **When we eventually add UPnP `RenderingControl`, do we keep the `POST /volume/delta` endpoint or fold it into a unified `POST /volume {level}` + `POST /volume/delta`?** Deferred — depends on what UPnP timing looks like on real hardware.
