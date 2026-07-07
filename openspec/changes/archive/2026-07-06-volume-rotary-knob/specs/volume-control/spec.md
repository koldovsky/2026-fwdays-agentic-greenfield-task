## ADDED Requirements

### Requirement: Front-end rotary knob for relative volume control

The `RemoteScreen` volume block SHALL render a single Orbit `RotaryKnob` primitive with the mute `IconButton` composed into its centre well. The knob is a purely relative, memoryless input device: it holds no absolute level state, never reads `useVolume(udn).level`, and its visual indicator angle is a free-running scratch value with no meaning beyond the current pointer position. Each `DETENT_DEG = 15°` of accumulated clockwise rotation while the pointer is captured SHALL immediately call `useVolume(udn).delta(+1)` (one `POST /api/devices/:udn/volume/delta { delta: 1 }`), and each `15°` of counter-clockwise rotation SHALL immediately call `useVolume(udn).delta(-1)` (one `POST /api/devices/:udn/volume/delta { delta: -1 }`). The mute `IconButton` inside the centre well SHALL keep its existing `POST /mute` toggle behaviour, including the `active` inset shadow and `volume_off` / `volume_up` icon swap driven by `useVolume(udn).muted`. Neither the knob rotation nor the mute button SHALL fire an HTTP request while the session state is not `Connected`. Covers `FR-VOLUME-01`, `FR-VOLUME-02`, and `FR-VOLUME-03`; `FR-VOLUME-04` remains descoped for Samsung Smart View TVs and the knob's memoryless design makes this explicit rather than displaying a fake level.

#### Scenario: Clockwise detent immediately sends one KEY_VOLUP

- **WHEN** the user presses on the knob and rotates it `15°` clockwise while the session is `Connected`
- **THEN** the SPA has issued exactly one `POST /api/devices/:udn/volume/delta { delta: 1 }` before the pointer is released

#### Scenario: Counter-clockwise detent immediately sends one KEY_VOLDOWN

- **WHEN** the user presses on the knob and rotates it `15°` counter-clockwise while the session is `Connected`
- **THEN** the SPA has issued exactly one `POST /api/devices/:udn/volume/delta { delta: -1 }` before the pointer is released

#### Scenario: Multiple detents in one gesture emit multiple deltas

- **WHEN** the user rotates the knob `45°` clockwise in a single unbroken gesture while the session is `Connected`
- **THEN** the SPA has issued exactly three `POST /api/devices/:udn/volume/delta { delta: 1 }` calls in order

#### Scenario: Reversing direction mid-gesture resets the detent accumulator sign

- **WHEN** the user rotates the knob `20°` clockwise (crossing one detent, emitting `delta: 1`) and then, without releasing, rotates `20°` counter-clockwise
- **THEN** the second segment emits exactly one `POST /api/devices/:udn/volume/delta { delta: -1 }` (crossing back through the same detent boundary in the opposite direction)

#### Scenario: Sub-detent rotation emits nothing

- **WHEN** the user rotates the knob `10°` clockwise and releases the pointer while the session is `Connected`
- **THEN** no `POST /api/devices/:udn/volume/delta` request has been issued

#### Scenario: Detent accumulator resets on pointer release

- **WHEN** the user rotates the knob `10°` clockwise (no delta emitted), releases the pointer, and then presses again and rotates `10°` clockwise
- **THEN** no `POST /api/devices/:udn/volume/delta` request has been issued during either gesture

#### Scenario: Keyboard ArrowUp sends one KEY_VOLUP

- **WHEN** the knob has keyboard focus, the session is `Connected`, and the user presses `ArrowUp` (or `ArrowRight`)
- **THEN** the SPA has issued exactly one `POST /api/devices/:udn/volume/delta { delta: 1 }`

#### Scenario: Keyboard ArrowDown sends one KEY_VOLDOWN

- **WHEN** the knob has keyboard focus, the session is `Connected`, and the user presses `ArrowDown` (or `ArrowLeft`)
- **THEN** the SPA has issued exactly one `POST /api/devices/:udn/volume/delta { delta: -1 }`

#### Scenario: Keyboard PageUp emits a coarse triple step

- **WHEN** the knob has keyboard focus, the session is `Connected`, and the user presses `PageUp`
- **THEN** the SPA has issued exactly three `POST /api/devices/:udn/volume/delta { delta: 1 }` calls in order

#### Scenario: Muted state renders the centre mute icon in active shadow

- **WHEN** `useVolume` reports `muted: true`
- **THEN** the mute `IconButton` inside the knob's centre well renders with the DS `active` prop (inset shadow) and its icon is `volume_off`

#### Scenario: Knob rotation disabled while session is not Connected

- **WHEN** the session state is `Connecting`
- **THEN** rotating the knob has no effect and no `POST /api/devices/:udn/volume/delta` request is issued

#### Scenario: Mute button disabled while session is not Connected

- **WHEN** the session state is `Disconnected`
- **THEN** clicking the centre mute `IconButton` has no effect and no `POST /api/devices/:udn/mute` request is issued

#### Scenario: Knob never reads or displays the volume level

- **WHEN** the front-end receives a `volume` WebSocket event carrying `{ level: null, muted: false }`
- **THEN** no aspect of the `RotaryKnob`'s rendered angle, indicator position, or internal accumulator changes as a result of the event (the knob is bound to pointer and keyboard input only)

## REMOVED Requirements

### Requirement: Front-end slider bound to write-only volume control

**Reason**: The Orbit `Slider` gave the illusion of an absolute level control while Samsung Smart View is remote-key-only, so its thumb position was a fiction the SPA had to seed and reconcile. Replacing it with a `RotaryKnob` whose semantics are honestly relative removes the drag-to-delta translation layer, the `SLIDER_START` seed value, and the `lastCommittedRef` bookkeeping. See the new "Front-end rotary knob for relative volume control" requirement above.

**Migration**: The wire contract is unchanged. Any front-end code path that used to call `useVolume(udn).delta(steps)` from `handleSliderCommit` should now call `useVolume(udn).delta(±1)` from the `RotaryKnob`'s `onStep` handler; the same `POST /api/devices/:udn/volume/delta` HTTP surface accepts both. Consumers that read `useVolume(udn).level` should stop — it has always been `null` on the wire and is no longer displayed anywhere.
