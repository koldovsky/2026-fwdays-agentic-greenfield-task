## Context

Samsung IP Control exposes `directVolumeControl` (absolute set + read) and honours `KEY_VOLUP` / `KEY_VOLDOWN` / `KEY_MUTE` via `remoteKeyControl`. Exact wire shapes are documented in the `samsung-ip-control-protocol` skill and the Postman collection at `docs/samsung-ip-control-protocol/IP CONTROL V2.postman_collection.json`. `tv-connection-lifecycle` gives us the per-TV queue and the error mapping. The DS `Slider` primitive at `docs/orbit-tv-remote-design-system/components/forms/Slider.jsx` already accepts `{ value, min, max, onChange, icon }`.

## Goals / Non-Goals

**Goals:**
- One place that owns "current volume + mute" for the UI to bind to.
- Absolute set via slider drag; relative via key press for people with muscle memory.
- WebSocket push so opening the remote does not require a REST call to feel alive.

**Non-Goals:**
- Debouncing slider drag on the front-end — do it back-end side if we ever need it.
- Persisting a per-user "preferred loud volume."
- Reasoning about A/V receiver / soundbar volumes.

## Decisions

### D1 — Endpoints

Split absolute vs relative deliberately:

- Absolute: `POST /volume { level }` uses `directVolumeControl`. Deterministic and idempotent.
- Relative: `POST /volume/delta { delta }` uses `remoteKeyControl KEY_VOLUP/KEY_VOLDOWN`. Cheap and reliable across firmware.
- Mute toggle: `POST /mute` uses `KEY_MUTE`. Toggle-only in MVP — the current mute state is refreshed from the read below, not passed as an argument.

Rejected alternative: a single `POST /volume` that accepts either `{ level }` or `{ delta }`. Rejected because it invites polymorphism bugs and hides the two very different semantics.

### D2 — State read + push contract

On session `Connected`, the session hook (from `tv-connection-lifecycle`) triggers a `directVolumeControl` read. Its result seeds the volume state (`level: number | null`, `muted: boolean`). The WebSocket broker pushes `{ topic: "devices", event: "volume", udn, level, muted }` when:

- Session becomes `Connected` (initial state)
- Any successful `POST /volume`, `/volume/delta`, or `/mute`
- Optionally: an unsolicited push if the TV reports volume changes (some Samsung models emit; MVP does not subscribe).

If the TV does not report a level (`directVolumeControl` returns `null` or errors with a specific "not supported" code), the state carries `level: null`. The UI treats the slider as write-only. Documented `FR-VOLUME-04`.

### D3 — Front-end binding

`useVolume(udn)` returns `{ level, muted, setLevel(n), delta(±1), toggleMute() }`. Subscribes to the `volume` WebSocket events; also does an initial `GET /api/devices/:udn/volume` on mount.

- `Slider` `value={level ?? 0}` `onChange={setLevel}` — `setLevel` fires `POST /volume { level }` but only on drag end (`Slider` primitive should expose an `onCommit`; if not, add via `onChange` with a 200 ms debounce inside the hook). No hard-coded delay values sprinkled across components.
- Mute `IconButton icon={muted ? 'volume_off' : 'volume_up'} active={muted}` uses the DS `active` prop (inset shadow when muted, per DESIGN.md).
- All controls disabled while `state !== 'Connected'` (`FR-REMOTE-04` continues to apply here since the UI class of controls is the same).

### D4 — Debouncing drag traffic

If the DS `Slider` fires `onChange` for every drag pixel, unthrottled we would enqueue thousands of `directVolumeControl` calls in a single drag. Solve inside `useVolume`:

- `setLevel` updates local state immediately (visual responsiveness).
- Actual `POST /volume` fires on trailing 150 ms silence AND on `onCommit` / release.
- If `onCommit` is not available on the DS primitive, extend the DS via the `frontend-design-check` skill process — do not fork the primitive.

Rejected: back-end-side rate limit. It would silently drop intermediate values and produce a jumpy final position.

## Risks / Trade-offs

- [Some TVs refuse `directVolumeControl` (older firmware)] → Endpoint returns `TvNotSupported` (501); front-end falls back to `POST /volume/delta` — the slider commit fires two `KEY_VOLUP`s for +2. Documented; UX is OK for MVP.
- [Mute reflected slowly] → We toggle mute optimistically in the UI, then correct if the TV disagrees. If disagreement is common, roll back to non-optimistic. Ship optimistic; watch feedback.
- [Volume WebSocket event flood if we ever add unsolicited push] → Not enabled in MVP. Rate-limit at the broker if we ever turn it on.

## Migration Plan

None. Rollback: revert; slider becomes non-functional again (as it was before this change), mute button greys out.

## Open Questions

- Should the max be a firmware-reported value (some TVs report `maxLevel: 30`)? MVP treats 0..100 as the contract on the wire and lets the TV clamp. Revisit if users report the slider "reaches 100 way before max."
