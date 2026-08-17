## MODIFIED Requirements

### Requirement: Stub step content inside the shell
The system SHALL render real step-1 content for document type selection (see `document-type` capability) inside the wizard shell. For steps 2 through 7 on unfinished sessions, the system SHALL continue to render placeholder content so the chrome can be verified without those step forms. Completed sessions SHALL continue to present final-review semantics (step 7) without requiring unfinished-flow «Далі» to mark the session completed.

#### Scenario: Unfinished session shows document type UI on step 1
- **WHEN** a user opens an unfinished session on step 1
- **THEN** the shell shows progress, navigation, and the document-type step UI (not a generic stub placeholder)

#### Scenario: Unfinished session shows stub for later steps
- **WHEN** a user opens an unfinished session on step 2
- **THEN** the shell shows progress, navigation, and stub content for step 2

#### Scenario: Completed session shows final review
- **WHEN** a user opens a session with `completed` true
- **THEN** the system presents final-review content (step 7 semantics) without treating the session as an editable mid-flow stub navigation target for this capability
