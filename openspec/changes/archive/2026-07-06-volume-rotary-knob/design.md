## Context

The archived `2026-07-05-volume-control` (C7) shipped a horizontal Orbit `Slider` bound to a local `sliderPosition` state (seeded at `SLIDER_START = 38`) plus a `lastCommittedRef` that let `handleSliderCommit` translate drag endpoints into a `delta` for `POST /api/devices/:udn/volume/delta`. That indirection exists purely because a slider *looks* like an absolute control: its thumb has a fixed position, so the SPA has to invent one and translate drag-to-delta on release. Samsung Smart View can't report or set an absolute level (design decision D1 in the archived `smart-view-ws-transport`), so this control was already write-only fiction — see the current `openspec/specs/volume-control/spec.md` "Requirement: Front-end slider bound to write-only volume control".

Wire surface today (unchanged by this change):
- `POST /api/devices/:udn/volume/delta { delta: number }` — non-zero integer in `[-25, +25]`; back-end enqueues `abs(delta)` `KEY_VOLUP` or `KEY_VOLDOWN` frames on the per-TV Smart View WebSocket FIFO.
- `POST /api/devices/:udn/mute` — one `KEY_MUTE` frame; server flips its optimistic `muted` tracker.
- `GET /api/devices/:udn/volume` → `{ level: null, muted: boolean }` and the `volume` WebSocket event carrying the same shape.

Front-end data-layer today (unchanged by this change): `useVolume(udn)` from `front-end/src/data/useVolume.ts` returns `{ level, muted, delta(steps), toggleMute() }`. This change stops consuming `level` on `RemoteScreen` but does not remove the field from the hook (the hook can be pruned in a follow-up once no other caller is added).

Ground truth for behaviour and copy: `AGENTS.md` house rules (front-end may only touch the back-end, Orbit DS is mandatory, tokens only, Montserrat + Material Symbols Rounded), `DESIGN.md` (front-end DS wiring), `docs/orbit-tv-remote-design-system/**` (tokens + component patterns; consult per the `frontend-design-check` skill before editing any `front-end/**` file).

## Goals / Non-Goals

**Goals:**

1. Replace the volume `Slider` on `RemoteScreen` with a rotary knob whose semantics match Smart View's actual capability: a memoryless relative step emitter.
2. Every detent crossed while the user is turning fires exactly one `sendDelta(+1)` (CW) or `sendDelta(-1)` (CCW), immediately, without waiting for pointer release.
3. Put the mute `IconButton` inside the knob's centre well so the volume + mute cluster becomes a single tactile object rather than a two-widget row.
4. Support pointer (mouse + touch) rotation and keyboard-driven stepping so the knob is usable on both a phone and a laptop.
5. Introduce `RotaryKnob` as a first-class Orbit DS primitive under `components/controls/`, styled from existing tokens only, so future screens can reuse it.

**Non-Goals:**

1. No absolute-level state or display of any kind — no ghost tick marks, no "you turned N times" counter, no persistence across mounts.
2. No changes to the back-end HTTP or WebSocket contract. `GET /volume`, `POST /volume/delta`, `POST /mute`, and the `volume` WS event stay bit-for-bit compatible.
3. No batching beyond what the back-end already accepts on a single `POST` — each detent posts on its own, so the per-TV FIFO on the back-end still serialises frames in causal order.
4. No new dependency (no `react-use-gesture`, no `framer-motion`). Native `PointerEvent` handling only, so the DS stays dependency-light.
5. No cross-screen restyle: only the volume row of `RemoteScreen` changes.

## Decisions

### D1 — Detent-based step emission (fixed angular threshold), not time-based polling

**Choice.** The knob accumulates the pointer's angular delta relative to the centre. Every full `DETENT_DEG = 15°` of accumulated CW rotation emits one `onStep('up')` call and subtracts `15°` from the accumulator; every `15°` of CCW rotation emits one `onStep('down')` and adds `15°`. Cross two detents in one frame → fire twice in that frame. Release the pointer → the accumulator resets to `0`.

**Rationale.** The user's brief is "every rotation generates the corresponding volume command immediately." A time-based emitter (e.g., "while turning CW, fire every 60 ms") divorces the number of frames from the number of steps, which makes fine control impossible and mismatches the natural physical model of a click-detent knob. A detent model is:
- **Predictable**: the user sees a 1:1 mapping between how far they turned and how many steps they sent.
- **Rate-safe**: a 360° full-turn emits 24 steps, well inside `POST /volume/delta`'s `[-25, +25]` clamp per single request and comfortably under the per-TV FIFO's practical throughput. Even a fast wrist-flick (say 720°/s) produces `~48` steps/s, spread across ~48 separate `POST`s that the back-end queues.
- **Cache-independent**: no `requestAnimationFrame` polling loop leaking state across pointer sessions.

**Alternatives considered.**
- *Time-based*: `setInterval(150 ms)` while any rotation is active. Rejected — divorces steps from rotation and needs an arbitrary rate constant that no one can tune without a TV in hand.
- *Batch on release*: accumulate rotation while pointer is down, fire one `sendDelta(steps)` on `pointerup`. Rejected — violates the "immediate" requirement in the brief; user gets no feedback until they let go.
- *Coarser detent (30° / 45°)*: rejected as too sluggish; 15° gives 24 detents per revolution, which matches the tactile feel of a typical stereo knob.

### D2 — Emit **one** `sendDelta(±1)` per detent, not `sendDelta(±N)` batched per frame

**Choice.** Each detent crossing → one `sendDelta(sign)` call. If the pointer crossed 3 detents between two `pointermove` events, we call `sendDelta(1)` three times in a row (or `sendDelta(-1)` three times), not `sendDelta(3)` once.

**Rationale.** `sendDelta` is idempotent per call and the back-end already serialises per-TV, so the network cost of three POSTs is small on a LAN. Keeping the granularity at `±1` means the `RotaryKnob` component stays decoupled from `sendDelta`'s clamp range (`[-25, +25]`) and from any future rate-limit knob added upstream. It also makes the callback contract dead-simple: `onStep(direction: 'up' | 'down')` — no counter parameter to reason about.

**Alternatives considered.**
- *Coalesce per frame*: `onStep('up', n)`. Rejected — pushes the clamp logic and the "how many detents did I cross" bookkeeping into every consumer. The knob is the only place that owns detent bookkeeping.

### D3 — Keyboard stepping via `ArrowUp` / `ArrowDown` / `ArrowRight` / `ArrowLeft`

**Choice.** When the knob has focus:
- `ArrowUp` and `ArrowRight` → `onStep('up')`.
- `ArrowDown` and `ArrowLeft` → `onStep('down')`.
- `PageUp` → three consecutive `onStep('up')` (coarse step, matches many hardware knobs).
- `PageDown` → three consecutive `onStep('down')`.
- `Home` and `End` are ignored (there is no min / max because the knob is memoryless).

**Rationale.** Matches the WAI-ARIA `role="spinbutton"`-ish keyboard model without needing a `valuenow`. Users on a laptop still have a fast path.

**Alternatives considered.**
- Skipping keyboard support entirely. Rejected — the app runs at `mytv.local` on any local device, including a laptop where keyboard is the natural input.

### D4 — Mute button lives inside the knob via composition, not as a hard-coded child

**Choice.** `RotaryKnob` accepts a `center` prop (React node) that renders in a neumorphic inset well at the knob's geometric centre. `RemoteScreen` passes the existing mute `IconButton` (`icon={muted ? 'volume_off' : 'volume_up'}`, `active={muted}`, `size="md"`, `aria-label="Mute"`) into that slot.

**Rationale.** Keeps `RotaryKnob` reusable — future screens could put any icon action in the centre. Keeps the DS ignorant of the app's volume-specific icon set. The mute button remains an independently focusable button, so keyboard users can Tab from knob → mute without inheriting the knob's arrow-key handlers.

**Alternatives considered.**
- Bake the mute button into the knob (`RotaryKnob` owns `muted` / `onMuteToggle` props). Rejected — welds the DS component to the volume use case and makes the "swap the centre for a different action" test require code changes to the DS.

### D5 — Neumorphic visual: raised outer ring, inset centre well, indicator dot on rim

**Visual anatomy (all tokens from the existing Orbit palette):**

| Element                        | Token / value                                       | Notes |
| ------------------------------ | --------------------------------------------------- | ----- |
| Outer housing (fills the knob) | `background: var(--base-100)`; `box-shadow: var(--nm-raised-lg)`; `border-radius: 50%` | Raised disc, no border. |
| Inset centre well              | `background: var(--base-100)`; `box-shadow: var(--nm-inset-md)`; `border-radius: 50%` | Sized ~40% of the housing diameter; hosts `center` slot. |
| Rim indicator dot              | `background: var(--accent)`; small `border-radius: 50%` circle absolutely positioned on the rim at the current pointer/last-touched angle | Reserved accent use — the "one primary action per screen" (mute / power) still holds; the dot is a live-state cue, permitted by the DS accent rules for "live/active states." |
| Focus ring                     | `outline: 2px solid var(--accent); outline-offset: 4px` on the outer housing when the knob is `:focus-visible` | Matches Orbit's `--focus-ring` style. |
| Disabled state                 | `opacity: 0.55; pointer-events: none;` on the outer housing (matches the pattern used by `RemoteScreen`'s `disabledStyle` for the AppShortcut row) | Pointer-events off; keyboard handlers also short-circuit when `disabled`. |

**Diameter.** Default `size = 200` (px). `RemoteScreen` renders it at the default; the value is exposed as a prop so future screens can scale it.

**Angle → indicator position.** The knob's *internal* rotation angle is a scratch value (radians, mod 2π). On every `pointermove`, we compute `nextAngle = atan2(pointerY - centreY, pointerX - centreX)`. The indicator dot rotates to that angle. On `pointerdown` we start tracking; on `pointerup` / `pointercancel` we release capture and freeze the dot at wherever it was last. On mount, the dot starts at `-π/2` (12 o'clock).

**Rationale.** Uses only `--base-100`, `--accent`, `--nm-raised-lg`, `--nm-inset-md`, and `--radius-*` tokens. No new tokens, no new palette entries, no gradients, no glass — passes the DS rules from `AGENTS.md`.

### D6 — Pointer capture & multi-touch discipline

**Choice.** Use `PointerEvent` with `element.setPointerCapture(e.pointerId)` on `pointerdown`. Only the *first* active pointer drives rotation; subsequent `pointerdown` events on the knob while a rotation is in progress are ignored. Release on `pointerup` and `pointercancel`.

**Rationale.** Prevents the "two fingers slide off in opposite directions and the knob stutters" failure mode on touch devices. Pointer capture also means `pointermove` continues to fire even if the finger leaves the knob's bounding box mid-gesture, which is essential — a small knob is easy to overshoot with a thumb.

### D7 — Wire path unchanged: reuse `useVolume(udn).delta(±1)` and `useVolume(udn).toggleMute()`

**Choice.** `RemoteScreen`:
- `onStep = (direction) => sendDelta(direction === 'up' ? 1 : -1).catch(noop)` — direct passthrough to the existing hook, which already handles the `POST /api/devices/:udn/volume/delta` call, connection-state gating, and logging.
- Mute inside the centre slot keeps the current `handleMuteClick` handler — no change.

**Rationale.** All the plumbing (connection-state check, error surfacing hook-up, logging) already lives in `useVolume`. Reusing it means this change is genuinely UI-only — zero data-layer diff.

## Risks / Trade-offs

- **[Risk] Fast rotation floods the per-TV Smart View FIFO.** A very fast wrist-flick could emit tens of `POST /volume/delta` calls per second. The back-end serialises per TV, but the browser network layer will still open concurrent HTTP requests to the same origin. **Mitigation:** natural throttle from the `15°/detent` threshold caps at ~48 detents/second even in adversarial input. Empirically that's inside what a healthy LAN + Fastify can serve; if it turns out to matter, a lightweight `debounce-collapse` inside `useVolume.delta` can coalesce contiguous same-sign calls into one `POST { delta: n }` up to `±25`. Not doing that now — over-engineering ahead of a real problem.

- **[Risk] Users expect the knob to *show* current volume.** The whole point of the change is that it deliberately doesn't. **Mitigation:** the indicator dot moves with the finger, so the knob still feels alive; the mute-state visual in the centre is the only bit of "current" state visible, which is honest since it's the only bit Smart View can actually report.

- **[Risk] Accent overuse.** DS rules reserve `--accent` for one primary action per screen. Using accent for the rim indicator dot is a small live-state usage (permitted by the DS "live/active states" carve-out), but it does add a second on-screen accent element alongside the Power button. **Mitigation:** the dot is small (~6 px), only visible while the knob is being interacted with in a meaningful way, and reads as "cursor" not "primary action". If reviewers flag it, fall back to `--fg-1` for the dot and drop the accent entirely — no rework needed.

- **[Trade-off] Keyboard-only users lose the ability to hold-repeat.** No `keyrepeat` acceleration on `ArrowUp` in this iteration — one keypress = one step. `PageUp` / `PageDown` give a coarse `×3` step to compensate. Acceptable for MVP; can add an OS-key-repeat-aware handler later.

- **[Trade-off] No visual confirmation the step was received.** The `mute` icon has its `active` inset shadow for muted state, but the up/down direction has no equivalent flash. Users rely on the TV's own on-screen level indicator (which every Samsung TV has) or on the volume audibly changing. This is consistent with the write-only reality — showing a fake "sent!" pulse would mislead in the exact way the old slider did.

## Migration Plan

Front-end-only, no data migration, no versioned wire change.

1. Ship the new `RotaryKnob` DS component alongside the existing `Slider` (both remain in the DS).
2. Swap `RemoteScreen` from `Slider` + separate mute row to `RotaryKnob` with `center={muteButton}`.
3. `Slider` in the DS is *not* deleted by this change (still referenced by the UI kit demo pages and available for any future screen). The archived spec's slider requirement is replaced in the delta.
4. No back-end deploy required. Because the wire contract is unchanged, staged rollout across mixed FE/BE versions is trivial: any FE build (new or old) speaks the same API.

**Rollback strategy.** Revert the two file diffs (`RemoteScreen.tsx` swap + spec delta). No data or state has been re-shaped; the removed local state (`sliderPosition`, `lastCommittedRef`) held no persisted value.

## Open Questions

- **Should the DS component name be `RotaryKnob` or the more generic `Dial`?** Going with `RotaryKnob` in this proposal because it is unambiguous about the physical metaphor (rotational, hand-operated) and reads well next to `DPad`. Happy to rename during review if the DS maintainer prefers `Dial`.
- **Should `useVolume`'s `level` field be dropped as part of this change?** Proposal keeps it for now — the field is unused after this change but removing it changes a data-layer surface, which is outside "front-end swap" scope. Flag as a follow-up cleanup.