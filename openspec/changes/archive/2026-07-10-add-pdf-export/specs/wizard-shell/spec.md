## MODIFIED Requirements

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
