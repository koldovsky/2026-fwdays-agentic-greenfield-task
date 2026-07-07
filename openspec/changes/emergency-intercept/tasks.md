## 1. Zustand State Slice

- [x] 1.1 Create `steppDraft` Zustand slice with fields: `currentPhase` (0–3), `phase1Answer`, `phase2Answers`, `phase3Answers`, `isDraft`
- [x] 1.2 Add `isEmergencyModalOpen` boolean to the slice (or a shared UI slice)
- [x] 1.3 Wire `zustand/middleware/persist` for the `steppDraft` slice targeting `localStorage` with SSR-safe deferred hydration
- [x] 1.4 Add a `resetDraft` action that clears all draft fields and sets `isDraft = false`

## 2. Hardcoded Copy Map

- [x] 2.1 Create `lib/emergency-intercept/copy.ts` with a `WizardCopy` type covering all text fields for all 3 phases + grounding summary
- [x] 2.2 Populate `calm` (Zen Sanctuary) copy — zero exclamation marks
- [x] 2.3 Populate `rational` (Blueprint) copy — analytical, data-driven tone
- [x] 2.4 Populate `auntie` (Indian Auntie) copy — exclamation marks permitted
- [x] 2.5 Create `useWizardCopy()` hook that returns the correct copy map for `activeToneMode`, defaulting to `calm`

## 3. STOP Button Component

- [x] 3.1 Create `components/emergency-intercept/StopButton.tsx` — high-contrast red button fixed to bottom of viewport
- [x] 3.2 On click, dispatch `isEmergencyModalOpen = true` to Zustand
- [x] 3.3 Mount `<StopButton>` in the root Next.js layout so it renders on every route
- [x] 3.4 Verify STOP button passes WCAG AA contrast ratio

## 4. Emergency Modal Shell

- [x] 4.1 Create `components/emergency-intercept/EmergencyModal.tsx` as a pre-mounted full-screen overlay
- [x] 4.2 Visibility driven by `isEmergencyModalOpen` Zustand value (CSS show/hide, not conditional render)
- [x] 4.3 Implement focus trap: when modal is open, Tab cycles only within modal interactive elements
- [x] 4.4 Mark all elements outside the modal as `inert` when modal is open
- [x] 4.5 Mount `<EmergencyModal>` in root layout alongside `<StopButton>`
- [x] 4.6 Implement close affordance (X button / overlay tap) that triggers safe-exit logic

## 5. Safe Exit Confirmation

- [x] 5.1 Create `useExitGuard()` hook that checks if `currentPhase > 0` and wizard is not yet complete
- [x] 5.2 When close is triggered mid-wizard, show an inline confirmation prompt inside the modal
- [x] 5.3 "Confirm exit" path: close modal and leave draft intact in localStorage
- [x] 5.4 "Cancel exit" path: dismiss confirmation, stay on current phase
- [x] 5.5 When close is triggered from the Grounding Summary, skip confirmation and close directly

## 6. STEPP Wizard — Phase 1 (Situation / Thought / Emotion)

- [x] 6.1 Create `components/emergency-intercept/SteppPhase1.tsx` with 4 emotion options: Sad, Anxious, Frustrated, Guilty
- [x] 6.2 Render option labels from `useWizardCopy()` Phase 1 copy
- [x] 6.3 Allow exactly one selection; persist selected value to `phase1Answer` in Zustand
- [x] 6.4 Disable / block the "Next" control until a selection is made
- [x] 6.5 Visually highlight the selected option

## 7. STEPP Wizard — Phase 2 (Physical Sensations)

- [x] 7.1 Create `components/emergency-intercept/SteppPhase2.tsx` as a checklist matrix
- [x] 7.2 Render checklist items from `useWizardCopy()` Phase 2 copy
- [x] 7.3 Allow zero or more selections; persist selected values to `phase2Answers` in Zustand
- [x] 7.4 "Next" control is always enabled (zero selections is valid)
- [x] 7.5 Render checked state indicator on selected items

## 8. STEPP Wizard — Phase 3 (Performance / Precautions)

- [x] 8.1 Create `components/emergency-intercept/SteppPhase3.tsx` with coping strategy / avoidance behaviour options
- [x] 8.2 Render option labels from `useWizardCopy()` Phase 3 copy
- [x] 8.3 Allow one or more selections (zero is also permitted); persist to `phase3Answers` in Zustand
- [x] 8.4 On submit, clear draft from localStorage (call `resetDraft`) and navigate to Grounding Summary

## 9. Grounding Summary

- [x] 9.1 Create `components/emergency-intercept/GroundingSummary.tsx`
- [x] 9.2 Render tone-appropriate summary copy from `useWizardCopy()` for the completed answers
- [x] 9.3 Read success stories from the progress-logging store; if none exist, use 3 universal fallback stories (reuse FR-DASH-04 fallback list)
- [x] 9.4 Render one success story alongside the summary
- [x] 9.5 Render a "Done" close control that dismisses the modal without a confirmation prompt

## 10. Wizard Orchestration

- [x] 10.1 Create `components/emergency-intercept/SteppWizard.tsx` that renders the correct phase component based on `currentPhase`
- [x] 10.2 "Next" / "Back" navigation updates `currentPhase` in Zustand
- [x] 10.3 On modal open, check for an existing draft in Zustand (hydrated from localStorage) and resume at `currentPhase` if present
- [x] 10.4 Back navigation on Phase 1 returns to the modal intro / prompts the safe-exit confirmation

## 11. Integration & Polish

- [x] 11.1 Code-split `SteppWizard` and `GroundingSummary` with `React.lazy` (modal shell stays synchronous)
- [x] 11.2 Add `height: 100dvh` with `-webkit-fill-available` fallback to the modal for iOS Safari compatibility
- [ ] 11.3 Verify zero-loading-screen modal mount on a throttled CPU profile (Chrome DevTools) — manual browser test
- [x] 11.4 Confirm exclamation mark rules: no `!` in any Calm-mode copy string, `!` appears in Auntie-mode copy strings
- [x] 11.5 Write unit tests for `useWizardCopy()` covering all three tone modes and the undefined-tone default
- [x] 11.6 Write unit tests for `useExitGuard()` covering mid-wizard and summary-screen scenarios
- [ ] 11.7 Manual smoke-test: open modal → complete all 3 phases → Grounding Summary renders → modal closes cleanly
- [ ] 11.8 Manual smoke-test: open modal → answer Phase 1 → reload page → reopen modal → wizard resumes at Phase 2 with Phase 1 answer intact
