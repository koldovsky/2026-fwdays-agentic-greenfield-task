## Why

The archived C7 volume control shipped a horizontal `Slider` whose thumb position is purely SPA-local — Samsung Smart View can't report the TV's actual level, so the slider's visible position is a fiction that only tracks the user's own last drag. That mismatch between what the control looks like ("here is your level, 0–100") and what it actually is (a relative +/- delta emitter) is confusing on first touch and unnecessarily complex (drag → snap → compute step delta → commit). This change replaces it with a rotary knob whose semantics match its wire behaviour exactly: turn it, send a step. No level, no reconciliation, no lie.

## What Changes

- **BREAKING (UI-only):** Remove the Orbit `Slider` + separate mute `IconButton` row from `RemoteScreen`. Replace with a single `RotaryKnob` component that has the mute `IconButton` in its centre.
- **Rotate clockwise → immediate `POST /volume/delta { delta: +1 }`** per detent (one Smart View `KEY_VOLUP`); rotate counter-clockwise → immediate `POST /volume/delta { delta: -1 }` (one `KEY_VOLDOWN`). Each detent fires exactly one delta while the pointer/finger is still down — no drag-commit, no aggregation.
- Knob is **purely relative**: no bound level state on the front-end, no thumb-position memory, no `SLIDER_START` seed, no `useVolume().level` read. The knob's visual angle is a free-running scratch value with no meaning beyond "which detent did you last cross."
- Mute button in the knob centre keeps its current behaviour: `POST /mute` toggle, `active` inset shadow when `muted: true`, `volume_off` / `volume_up` icon swap.
- Extend the Orbit design system with a `RotaryKnob` primitive (neumorphic raised base + inset centre well for the mute button, aligns with existing shadow tokens). Update `docs/orbit-tv-remote-design-system/` catalog and re-generate the UI-kit demo entry.
- Update the `volume-control` capability spec: retire the "Front-end slider bound to write-only volume control" requirement and its scenarios; replace with a "Front-end rotary knob for relative volume control" requirement. The three back-end requirements (`{ level, muted }` snapshot, `POST /volume/delta`, `POST /mute`) are unchanged — `level` remains `null` on the wire and simply isn't read.

## Capabilities

### New Capabilities

<!-- None — the change only reshapes the existing C7 front-end. -->

### Modified Capabilities

- `volume-control`: replace the front-end slider requirement with a rotary-knob requirement. Back-end HTTP / WebSocket contracts unchanged.

## Impact

- **Front-end (primary):**
  - `front-end/src/screens/RemoteScreen.tsx` — remove `Slider`, `sliderPosition` / `lastCommittedRef` state, and `handleSliderCommit`; add `RotaryKnob` with a per-detent `onStep(direction: 'up' | 'down')` handler that calls `sendDelta(±1)` directly.
  - `front-end/src/screens/RemoteScreen.test.tsx` — swap slider drag test coverage for rotation-step coverage.
  - `front-end/src/data/useVolume.ts` — no signature change; `level` field on the returned object is no longer consumed by `RemoteScreen`. (Field kept for now; a follow-up may drop it entirely once no other caller uses it.)
- **Design system:**
  - `docs/orbit-tv-remote-design-system/components/**` — new `RotaryKnob` component + tokens usage doc. UI kit demo page updated.
  - `docs/orbit-tv-remote-design-system/ui_kits/**` — add the knob to the click-through demo so future authors can eyeball it. (Reference-only; not imported by the app.)
  - `DESIGN.md` — mention the knob under Remote-screen composition; note mute lives in the knob centre.
- **Back-end:** none. `GET /api/devices/:udn/volume`, `POST /volume/delta`, `POST /mute` and the `volume` WebSocket event all remain as-is.
- **Requirements traceability:** FR-VOLUME-01 / FR-VOLUME-02 / FR-VOLUME-03 still covered (same wire commands, different UI). FR-VOLUME-04 remains descoped for Smart View TVs (unchanged from the archived C7 outcome) — the knob's rotation-only semantics make that explicit rather than papering over it with a fake slider position.

### Non-goals

- Not adding any absolute-set volume path (no `KEY_VOLDOWN`-loop-to-zero, no probe method) — Smart View has none.
- Not adding on-screen level indicators, ghost tick marks, or "you turned N times" counters. The knob is deliberately memoryless.
- Not touching the back-end `GET /volume`, `POST /volume/delta`, `POST /mute`, or the `volume` WebSocket event. Those stay stable for any future non-Samsung transport.
- Not restyling other neumorphic surfaces on `RemoteScreen` (D-pad, transport row, mute icon) — this is a targeted swap.

### Dependencies

- Requires archived changes: `smart-view-ws-transport`, `tv-connection-lifecycle`, `remote-control-keys`, and `2026-07-05-volume-control` (this change modifies specs the last one landed).