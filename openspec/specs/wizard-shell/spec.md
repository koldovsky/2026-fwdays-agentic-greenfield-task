## Purpose

Wizard chrome for unfinished document sessions: seven-step progress circles, «Назад» / «Далі» with edge limits, stub step panels, and `current-step` persistence via the document-session API (FR-17, FR-18, NFR-01, NFR-02, NFR-03, NFR-04, NFR-09, NFR-10).

## Requirements

### Requirement: Progress circles show wizard steps
The system SHALL display flow progress as numbered circles for steps 1 through 7 on the document session page for an unfinished session (FR-18). The current step SHALL be visually highlighted; completed (prior) steps and future steps SHALL be distinguishable so progress is always visible (NFR-02). The UI SHALL use a neutral financial palette appropriate for documents (NFR-01).

#### Scenario: Progress shows current step
- **WHEN** a user views `/docs/{guid}` for an unfinished session at a given `current-step`
- **THEN** seven numbered progress circles are shown and the circle for that `current-step` is highlighted as current (TC-20)

#### Scenario: Prior and future steps are distinct
- **WHEN** a user is on step 4 of an unfinished session
- **THEN** circles 1–3 appear as completed/past, circle 4 as current, and circles 5–7 as upcoming/outline

### Requirement: Back and Next navigation with edge limits
The system SHALL provide «Назад» and «Далі» navigation on each unfinished wizard step, except at the edges of the flow (FR-17). On step 1, «Назад» SHALL be unavailable. On step 7 (unfinished), «Далі» SHALL be unavailable. Intermediate steps SHALL allow both directions.

#### Scenario: Next advances from step 1
- **WHEN** a user on step 1 activates «Далі»
- **THEN** the wizard moves to step 2 and «Назад» becomes available (TC-20)

#### Scenario: Back is blocked on first step
- **WHEN** a user is on step 1
- **THEN** «Назад» is disabled or hidden

#### Scenario: Next is blocked on last unfinished step
- **WHEN** a user is on step 7 of an unfinished session
- **THEN** «Далі» is disabled or hidden and «Назад» moves to step 6

#### Scenario: Back and Next work on intermediate steps
- **WHEN** a user is on step 3 and uses «Назад» then «Далі»
- **THEN** the wizard moves to step 2 and then back to step 3 (TC-20)

### Requirement: Current step persists with the session
The system SHALL keep the wizard’s visible step synchronized with the session’s `current-step` field. Successful «Назад» / «Далі» navigation SHALL persist the new `current-step` through the existing document-session update API so a reload restores the same step without creating a new `guid` (NFR-03, NFR-04). Save failures SHALL be shown to the user and MUST NOT leave the UI claiming a successful step change (NFR-10).

#### Scenario: Reload restores navigated step
- **WHEN** a user navigates to step 4 and reloads `/docs/{guid}`
- **THEN** the session resumes on step 4 with the same `guid` (TC-21)

#### Scenario: Save failure keeps previous step
- **WHEN** persisting a step change fails
- **THEN** the user sees an error and the wizard remains on the previous step

### Requirement: Stub step content inside the shell
The system SHALL render real step-1 content for document type selection (see `document-type` capability), real step-2 content for date and document numbering (see `document-numbering` capability), real step-3 and step-4 content for customer and contractor contacts (see `contacts` capability), real step-5 content for services catalog and document lines (see `services-catalog` capability), real step-6 content for filled template HTML preview (see `template-fill` capability), and real step-7 content for read-only final view with PDF download (see `pdf-export` capability) inside the wizard shell. There SHALL be no remaining stub step panels for unfinished sessions. Completed sessions SHALL present the same pdf-export final-review UI (step 7 semantics) without unfinished-flow «Далі».

#### Scenario: Unfinished session shows document type UI on step 1
- **WHEN** a user opens an unfinished session on step 1
- **THEN** the shell shows progress, navigation, and the document-type step UI (not a generic stub placeholder)

#### Scenario: Unfinished session shows numbering UI on step 2
- **WHEN** a user opens an unfinished session on step 2
- **THEN** the shell shows progress, navigation, and the document-numbering step UI (not a generic stub placeholder)

#### Scenario: Unfinished session shows contacts UI on step 3
- **WHEN** a user opens an unfinished session on step 3
- **THEN** the shell shows progress, navigation, and the customer contacts step UI (not a generic stub placeholder)

#### Scenario: Unfinished session shows contacts UI on step 4
- **WHEN** a user opens an unfinished session on step 4
- **THEN** the shell shows progress, navigation, and the contractor contacts step UI (not a generic stub placeholder)

#### Scenario: Unfinished session shows services UI on step 5
- **WHEN** a user opens an unfinished session on step 5
- **THEN** the shell shows progress, navigation, and the services-catalog step UI (not a generic stub placeholder)

#### Scenario: Unfinished session shows template preview on step 6
- **WHEN** a user opens an unfinished session on step 6
- **THEN** the shell shows progress, navigation, and the template-fill preview UI (not a generic stub placeholder)

#### Scenario: Unfinished session shows PDF export UI on step 7
- **WHEN** a user opens an unfinished session on step 7
- **THEN** the shell shows progress, navigation, and the pdf-export final-view UI (not a generic stub placeholder)

#### Scenario: Completed session shows final review
- **WHEN** a user opens a session with `completed` true
- **THEN** the system presents the pdf-export final-review UI (step 7 semantics) without treating the session as an editable mid-flow stub navigation target for this capability

### Requirement: Responsive step transition performance target
On local data with an already-loaded session, advancing or going back a step SHOULD complete within 300 ms excluding unrelated network latency (NFR-09). The implementation SHALL avoid unnecessary full-page remounts that would make local transitions feel slow.

#### Scenario: Local next does not remint session
- **WHEN** a user activates «Далі» on a valid unfinished session with local persistence
- **THEN** the same `guid` is kept and only `current-step` (and `updated-at`) change on success
