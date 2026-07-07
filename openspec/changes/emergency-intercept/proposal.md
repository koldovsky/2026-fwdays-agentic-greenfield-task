## Why

Users experiencing a binge urge need an always-available, zero-latency panic button that immediately pulls them into a structured reflection loop. Without it, the app has no mechanism to intercept the critical moment of impulse — the core value proposition of Bye Binge goes undelivered.

## What Changes

- Add a high-contrast red **STOP** button fixed to the bottom of the viewport on every screen.
- Implement a full-screen modal that mounts instantly (zero loading screens) and locks focus away from the app beneath.
- Implement a 3-phase STEPP reflection wizard inside the modal, with copy driven by the active `ToneMode`.
- Render a **Grounding Summary** after the user completes all three STEPP phases, paired with a success story.
- Implement **safe exit**: mid-wizard modal close requires explicit confirmation before dismissing.
- Implement **local draft persistence**: any in-progress wizard state is saved to `localStorage` so users can resume after a crash or accidental close.

## Capabilities

### New Capabilities

- `emergency-intercept`: Persistent STOP button, full-screen reflection modal, STEPP 3-phase wizard (Situation/Thought/Emotion → Physical Sensations → Performance/Precautions), Grounding Summary, safe-exit confirmation, local draft persistence, tone-engine-driven copy.

### Modified Capabilities

<!-- None — no existing spec-level requirements are changing. -->

## Impact

- **Components**: New `StopButton`, `EmergencyModal`, `SteppWizard` (phases 1–3), `GroundingSummary` components.
- **State**: New Zustand slice for wizard draft state (`steppDraft`); reads `activeToneMode` from existing tone-engine slice.
- **Storage**: `localStorage` key for draft persistence; must survive page reload and offline usage.
- **Tone engine dependency**: All wizard copy depends on `tone-engine` being implemented first; placeholder copy acceptable during parallel development.
- **Performance**: Modal must mount synchronously — no async data fetching on the critical STOP path.
- **Accessibility**: High-contrast STOP button; modal traps focus (NFR-A11Y-01 context).
