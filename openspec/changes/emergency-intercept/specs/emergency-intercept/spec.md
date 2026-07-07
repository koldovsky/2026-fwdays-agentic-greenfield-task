## ADDED Requirements

### Requirement: Persistent STOP button
A high-contrast, red interactive element labeled **"STOP"** SHALL be fixed to the bottom of the viewport and visible across all application views at all times, including while the STEPP wizard is not active.

#### Scenario: STOP button visible on dashboard
- **WHEN** the authenticated user is on any application route
- **THEN** the STOP button is rendered at the bottom of the viewport with sufficient contrast to meet WCAG AA standards

#### Scenario: STOP button not obscured by content
- **WHEN** the page content is scrollable
- **THEN** the STOP button remains fixed and is not scrolled out of view

---

### Requirement: Full-screen modal on STOP activation
Activating the STOP button SHALL immediately launch a full-screen modal overlay that freezes all background application interactivity and captures absolute user focus without any loading screens or navigation transitions.

#### Scenario: Modal mounts instantly
- **WHEN** the user activates the STOP button
- **THEN** the full-screen modal is visible within the same frame — no spinner, skeleton, or navigation event occurs

#### Scenario: Background content is inert
- **WHEN** the emergency modal is open
- **THEN** all elements outside the modal are inert (non-focusable, non-scrollable, non-interactive)

#### Scenario: Focus is trapped inside modal
- **WHEN** the emergency modal is open and the user presses Tab
- **THEN** keyboard focus cycles only within the modal's interactive elements

---

### Requirement: Safe exit confirmation
Closing the emergency modal while the STEPP wizard is in progress SHALL require an explicit user confirmation step to prevent accidental dismissal.

#### Scenario: Confirmation required on mid-wizard close
- **WHEN** the user attempts to close the modal while at least one STEPP phase has been started but the wizard is not yet complete
- **THEN** a confirmation prompt is shown asking the user to confirm they want to exit

#### Scenario: Confirmed exit dismisses modal
- **WHEN** the user confirms the exit prompt
- **THEN** the modal closes and the user is returned to the view they were on before activating STOP

#### Scenario: Cancelled exit resumes wizard
- **WHEN** the user cancels the exit prompt
- **THEN** the modal remains open on the same phase the user was on

#### Scenario: No confirmation needed on summary screen
- **WHEN** the user closes the modal from the Grounding Summary screen (wizard complete)
- **THEN** the modal closes without requiring a confirmation prompt

---

### Requirement: Local draft persistence
Any in-progress STEPP wizard state SHALL be saved to local storage as a persistent draft so that the user can resume from the same phase and answers after a crash, accidental close, or page reload.

#### Scenario: Draft saved on phase completion
- **WHEN** the user completes a STEPP phase and advances to the next
- **THEN** the completed phase answers and current phase index are written to local storage immediately

#### Scenario: Draft restored on modal open
- **WHEN** the user opens the emergency modal and a saved draft exists in local storage
- **THEN** the wizard resumes at the phase and with the answers from the saved draft

#### Scenario: Draft cleared on wizard completion
- **WHEN** the user reaches the Grounding Summary (wizard complete)
- **THEN** the local storage draft is cleared

#### Scenario: Draft persists across page reload
- **WHEN** the user is mid-wizard and reloads the page, then opens the modal again
- **THEN** the wizard restores to the phase and answers present before the reload

#### Scenario: Graceful degradation when storage unavailable
- **WHEN** local storage is unavailable (e.g., private browsing with storage blocked)
- **THEN** the wizard operates in-memory and functions correctly; the user is not shown an error

---

### Requirement: Tone-driven STEPP wizard
The emergency modal SHALL initiate a structured 3-phase STEPP reflection wizard where all copy (prompts, labels, button text, instructional text) is determined by the active Tone Mode (`calm`, `rational`, or `auntie`).

#### Scenario: Wizard copy matches active tone
- **WHEN** the user opens the emergency modal with `activeToneMode = 'auntie'`
- **THEN** all wizard prompts and labels render using the High-Impact (Indian Auntie) copy variant

#### Scenario: Calm mode exclamation rule enforced
- **WHEN** `activeToneMode = 'calm'`
- **THEN** no exclamation marks (`!`) appear anywhere in the wizard copy

#### Scenario: Auntie mode exclamation rule permitted
- **WHEN** `activeToneMode = 'auntie'`
- **THEN** exclamation marks may appear in wizard copy per the High-Impact copy variant

#### Scenario: Default tone when tone-engine not yet initialised
- **WHEN** `activeToneMode` is undefined or null
- **THEN** the wizard renders using the `calm` copy variant as a safe default

---

### Requirement: STEPP Phase 1 — Situation / Thought / Emotion
Phase 1 of the wizard SHALL present the user with multiple-choice categorisation options mapping their core emotional trigger, covering at minimum: Sad, Anxious, Frustrated, Guilty.

#### Scenario: Exactly one emotion selected
- **WHEN** the user is on Phase 1
- **THEN** they can select exactly one emotional trigger category

#### Scenario: Advance blocked until selection made
- **WHEN** the user is on Phase 1 and has not selected any option
- **THEN** the "Next" / advance control is disabled or shows a validation message

#### Scenario: Selected option is visually distinguished
- **WHEN** the user selects an emotional trigger
- **THEN** the selected option is visually highlighted and distinguishable from unselected options

---

### Requirement: STEPP Phase 2 — Physical Sensations
Phase 2 of the wizard SHALL present the user with a checklist matrix to evaluate active bodily states and somatic urges.

#### Scenario: Multiple sensations selectable
- **WHEN** the user is on Phase 2
- **THEN** they can select zero or more physical sensation options from the checklist

#### Scenario: Advance permitted with no selection
- **WHEN** the user is on Phase 2 and has selected no options
- **THEN** they can still advance to Phase 3 (zero selections is a valid response)

#### Scenario: Selected items visually checked
- **WHEN** the user checks a physical sensation option
- **THEN** the item renders with a checked state indicator

---

### Requirement: STEPP Phase 3 — Performance / Precautions
Phase 3 of the wizard SHALL present the user with options to identify specific active coping strategies or negative avoidance behaviours they are currently experiencing.

#### Scenario: One or more strategies selectable
- **WHEN** the user is on Phase 3
- **THEN** they can select one or more coping strategy / avoidance behaviour options

#### Scenario: Advance permitted with no selection
- **WHEN** the user is on Phase 3 and has selected no options
- **THEN** they can still submit and proceed to the Grounding Summary

#### Scenario: Phase 3 submission completes the wizard
- **WHEN** the user submits Phase 3
- **THEN** the wizard transitions to the Grounding Summary screen

---

### Requirement: Grounding Summary
After completing all three STEPP phases, the system SHALL display an immediate, digestible post-reflection summary screen styled according to the active Tone Mode, paired with one success story.

#### Scenario: Summary rendered after Phase 3 submission
- **WHEN** the user submits Phase 3
- **THEN** the Grounding Summary screen is shown without any loading delay

#### Scenario: Summary copy matches active tone
- **WHEN** the Grounding Summary renders
- **THEN** all summary copy uses the active Tone Mode variant

#### Scenario: Success story shown — user has stories
- **WHEN** the user has at least one logged success story and the Grounding Summary renders
- **THEN** one of the user's success stories is displayed alongside the summary

#### Scenario: Success story shown — no user stories (fallback)
- **WHEN** the user has no logged success stories and the Grounding Summary renders
- **THEN** one of the 3 universal fallback recovery stories is displayed

#### Scenario: User can close modal from summary
- **WHEN** the user is on the Grounding Summary screen
- **THEN** a close / "Done" control is available and closes the modal without a confirmation prompt
