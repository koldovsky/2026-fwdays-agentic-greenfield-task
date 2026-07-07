## 1. Design system: add `RotaryKnob` primitive

- [x] 1.1 Create `docs/orbit-tv-remote-design-system/components/controls/RotaryKnob.jsx` implementing the anatomy from design.md D5 (raised outer housing via `--nm-raised-lg`, inset centre well via `--nm-inset-md`, `--accent` rim indicator dot, focus ring via `outline: 2px solid var(--accent)` with `outline-offset: 4px`, disabled pattern of `opacity: 0.55; pointer-events: none`). Props: `{ size = 200, disabled = false, center, onStep }` where `onStep(direction: 'up' | 'down')` fires per detent crossing. Use only Orbit tokens — no hard-coded colours, shadows, or radii.
- [x] 1.2 Implement pointer-driven rotation with `setPointerCapture` per design.md D6: capture the first pointer on `pointerdown`, track `atan2(dy, dx)` on `pointermove`, accumulate signed angular delta and fire `onStep` once for every 15° crossed (design.md D1/D2), release capture on `pointerup` / `pointercancel` and zero the accumulator. Multi-touch: ignore secondary `pointerdown` while a rotation pointer is active.
- [x] 1.3 Implement keyboard support per design.md D3: `ArrowUp` / `ArrowRight` → `onStep('up')`, `ArrowDown` / `ArrowLeft` → `onStep('down')`, `PageUp` → three `onStep('up')` calls, `PageDown` → three `onStep('down')` calls. Set `tabIndex={disabled ? -1 : 0}`, `role="slider"`, `aria-orientation="vertical"`, `aria-valuetext="Relative volume control"` (no `aria-valuenow` — the control is memoryless).
- [x] 1.4 Add `docs/orbit-tv-remote-design-system/components/controls/RotaryKnob.d.ts` mirroring the prop signature (`size?: number; disabled?: boolean; center?: React.ReactNode; onStep?: (direction: 'up' | 'down') => void`).
- [x] 1.5 Add `docs/orbit-tv-remote-design-system/components/controls/RotaryKnob.prompt.md` in the same shape as `DPad.prompt.md`: one-sentence description, a JSX snippet composing a mute `IconButton` into the `center` slot, a note that the knob emits per-detent `onStep` calls and holds no absolute state.
- [x] 1.6 Register `RotaryKnob` in `docs/orbit-tv-remote-design-system/_ds_manifest.json` under `components` (path `components/controls/RotaryKnob.jsx`) and re-run whatever bundler produces `_ds_bundle.js` so the DS SPA sees the new component. If no build step exists, patch `_ds_bundle.js` by hand and note the manual edit in the commit message.
- [x] 1.7 Update `docs/orbit-tv-remote-design-system/components/controls/controls.card.html` to include a live `<RotaryKnob>` demo alongside `DPad` so the DS card grid shows it.
- [x] 1.8 Update `docs/orbit-tv-remote-design-system/ui_kits/tv-remote/RemoteScreen.jsx` to render `RotaryKnob` (with a demo mute `IconButton` in the `center` slot) instead of the separate `Slider` + mute row, so the UI kit demo mirrors the real screen.

## 2. Front-end: wire `RotaryKnob` into `RemoteScreen`

- [x] 2.1 In `front-end/src/screens/RemoteScreen.tsx`, remove the `Slider` import, the `SLIDER_START` constant, the `sliderPosition` / `lastCommittedRef` state, and the `handleSliderCommit` handler.
- [x] 2.2 Import `RotaryKnob` with the explicit `.jsx` extension: `import { RotaryKnob } from '@ds/components/controls/RotaryKnob.jsx'`. Add the type shim to `front-end/src/ds.d.ts` matching the DS `.d.ts` prop signature.
- [x] 2.3 Replace the existing volume row (`<IconButton ...mute... />` + `<Slider ... />`) with a centred `<RotaryKnob>` whose `center` prop is the existing mute `IconButton` (`icon={muted ? 'volume_off' : 'volume_up'}`, `active={muted}`, `size="md"`, `aria-label="Mute"`, `disabled={!isConnected}`, `onClick={handleMuteClick}`). Pass `disabled={!isConnected}` and `onStep={(dir) => void sendDelta(dir === 'up' ? 1 : -1).catch(noop)}` (inline the `noop` catch to preserve the existing "hook already logged" behaviour).
- [x] 2.4 Drop `useVolume(udn).level` from the destructure in `RemoteScreen.tsx` — the knob never reads it. Do not remove the field from `useVolume.ts` itself (design.md open question — deferred to a follow-up).
- [x] 2.5 Verify no CSS regressions in the surrounding layout: the knob container is centred like the D-pad, the transport `IconButton` row above it keeps its spacing, and the Power `IconButton` still sits below with `paddingTop: 4`. Adjust the wrapping `<div>` gap only if needed to keep vertical rhythm.

## 3. Front-end tests

- [x] 3.1 Update `front-end/src/screens/RemoteScreen.test.tsx`: delete slider-drag test cases, add cases for (a) one `sendDelta(+1)` per 15° CW detent crossed via synthesised `PointerEvent`s, (b) one `sendDelta(-1)` per 15° CCW detent crossed, (c) sub-detent rotation emits nothing, (d) `ArrowUp` fires `sendDelta(+1)` once, (e) `PageUp` fires `sendDelta(+1)` three times in order, (f) `sendDelta` is never called while `state !== 'Connected'`. Cover the mute passthrough by asserting the centre `IconButton`'s `onClick` still calls `toggleMute` (spec scenario "Muted state renders the centre mute icon in active shadow").
- [x] 3.2 Ensure `npm run front:test` (or the front-end test script referenced in `AGENTS.md` verification section) passes — if the front-end `package.json` still has no `test` script, wire one up (`vitest run` or the harness already in use for the archived C7 tests) as part of this change per the AGENTS gate.

## 4. Doc updates

- [x] 4.1 Update `DESIGN.md` (front-end design brief): under the RemoteScreen composition section, replace the "volume slider + mute button" description with "RotaryKnob with mute IconButton in the centre well," and note the memoryless semantics.
- [x] 4.2 Add a paragraph to `docs/orbit-tv-remote-design-system/readme.md` listing `RotaryKnob` in the `controls` component family so DS consumers can find it.

## 5. Verification

- [x] 5.1 Run `npm run front:build` from the repo root — must pass.
- [x] 5.2 Run `npm run back:build` from the repo root — must pass (no back-end changes, but the build catches spec-referenced types that the front-end shares).
- [x] 5.3 Run `npm run front:test` from the repo root — must pass (per task 3.1). Also ran `npm run back:test` — 98/98 green (no back-end changes but the AGENTS gate calls for a green cross-package test run whenever the change touches shared types).
- [ ] 5.4 Run `npm run front:dev` and manually verify on `RemoteScreen`: (a) touch-rotate the knob CW and the on-screen volume bar on the TV steps up; (b) touch-rotate CCW steps it down; (c) a quick 45° flick fires three deltas in order; (d) tapping the centre mute button toggles the icon; (e) knob and mute both go non-interactive while the badge shows `Connecting`; (f) keyboard-focus the knob, `ArrowUp` steps volume up, `PageUp` triple-steps. Eyeball dark-mode via `[data-theme="dark"]` on `<html>` — no palette regressions. **DEFERRED to a human session** — requires a real Samsung TV on the LAN and eyes-on interaction; agent cannot honestly self-verify per AGENTS.md ("Never claim UI works from a build alone").
- [ ] 5.5 Manually verify the DS SPA still renders: open `docs/orbit-tv-remote-design-system/ui_kits/tv-remote/index.html` (or the DS SPA harness) and confirm the RotaryKnob appears both in the controls card and the RemoteScreen UI-kit page. **DEFERRED to a human session** — same reasoning; JSX syntax + bundle validity are covered by `node --check`.

## 6. Housekeeping

- [x] 6.1 Prepend a new session-log entry to `docs/current-state.md` (per AGENTS.md house rule): ISO-8601 UTC timestamp, summary of the knob swap, touched files (`RemoteScreen.tsx`, DS controls dir, DS manifest, `DESIGN.md`, `docs/current-state.md`), and any follow-ups (drop `level` from `useVolume`, DS component-name bikeshed noted in design.md open questions).
