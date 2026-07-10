## ADDED Requirements

### Requirement: Analysis pauses before generation
The system SHALL, after a CV and job description are submitted, run only the
analysis portion of the tailoring pipeline (parse, extract requirements,
score) and present the match score and checklist, then pause. Bullet
generation SHALL NOT start until the user explicitly confirms. Implements
FR-WIZARD-01.

#### Scenario: Checklist shown, generation not started
- **WHEN** a user submits a CV and a job description
- **THEN** the match score and checklist are shown and no bullets are generated yet

#### Scenario: No generation skill runs before confirmation
- **WHEN** the user has not yet confirmed past the checklist
- **THEN** neither `generate-bullet` nor `ground-bullet` has run for this tailoring

### Requirement: Bounded clarifying questions from requirement keywords
The system SHALL, before generating bullets, derive up to a bounded number of
clarifying questions from the keywords of checklist rows scored `partial` or
`gap`, using a deterministic template with no LLM call. Implements
FR-WIZARD-02.

#### Scenario: Questions derived from weak requirements
- **WHEN** the checklist contains rows scored `partial` or `gap`
- **THEN** the system shows clarifying questions derived from those rows' requirement keywords, and no other requirement's data

#### Scenario: Question count stays within the bound
- **WHEN** the number of `partial`/`gap` rows exceeds the configured bound
- **THEN** only the bound number of questions are shown, prioritized by `must-have` gaps first

#### Scenario: No weak requirements, no questions
- **WHEN** every checklist row is scored `met`
- **THEN** no clarifying questions are shown and the flow proceeds directly to generation

### Requirement: Answering, skipping, or declining never blocks progress
The system SHALL allow each clarifying question to be answered, skipped, or
declined, and SHALL allow the user to proceed to generation regardless of how
many questions remain unanswered. Implements FR-WIZARD-03.

#### Scenario: Mixed answered and skipped questions proceed
- **WHEN** a user answers some clarifying questions and skips or declines the rest
- **THEN** proceeding to generation is not blocked by the unanswered questions

#### Scenario: All questions skipped still proceeds
- **WHEN** a user skips or declines every clarifying question
- **THEN** generation proceeds using only CV-sourced evidence, unchanged from the non-wizard flow

### Requirement: Confirmed answers become tagged grounding evidence
The system SHALL treat a confirmed answer to a clarifying question as
grounding evidence for bullet generation, available to both the generation
and grounding passes alongside CV-sourced evidence. The UI SHALL always
visibly distinguish a user-confirmed source from a CV-sourced source on any
bullet it grounds; the two SHALL NOT be presented as indistinguishable.
Implements FR-WIZARD-04, BC-HONESTY-03.

#### Scenario: Bullet grounded in a confirmed answer is tagged
- **WHEN** a rewritten bullet is grounded using a user-confirmed answer rather than a CV sentence
- **THEN** the bullet shows a grounding label that visibly identifies the evidence as user-confirmed, distinct from a CV-sourced label

#### Scenario: No confirmed answers leaves grounding unchanged
- **WHEN** a tailoring run has no confirmed clarifying answers
- **THEN** grounding evidence is drawn only from the CV, identical to the pre-wizard behavior

#### Scenario: Grounding still independently verifies confirmed-answer claims
- **WHEN** the generation pass produces a bullet claiming to draw on a confirmed answer
- **THEN** the grounding pass independently checks that claim against the raw confirmed-answers pool and the CV, the same way it checks CV-sourced claims, and flags the bullet `overclaim-risk` if neither pool supports it

### Requirement: Visible linear step sequence
The system SHALL present the wizard as a visible, ordered sequence — Analyze,
Confirm, Clarify, Generate, Export — with the user's current step always
indicated. Implements FR-WIZARD-05.

#### Scenario: Current step is always visible
- **WHEN** a user is anywhere in the wizard flow
- **THEN** a step indicator shows all five steps in order with the current one highlighted

#### Scenario: A failed step does not silently advance
- **WHEN** a step in the wizard fails
- **THEN** the step indicator reflects the failure at that step rather than advancing to the next one

### Requirement: Copy tailored résumé to clipboard
The system SHALL let the user copy the full tailored résumé, built from the
same export document model used by other export formats, to the clipboard as
plain text. Excluded (non-included) bullets SHALL NOT appear in the copied
text. Implements FR-EXPORT-01.

#### Scenario: Copy includes only exportable bullets
- **WHEN** a user copies the tailored résumé to clipboard
- **THEN** the copied text contains every bullet flagged `includedInExport` and omits every bullet that is not

### Requirement: Download a PDF résumé
The system SHALL let the user download the tailored résumé as a PDF,
generated server-side from the shared export document model, rendering
Ukrainian (Cyrillic) text correctly regardless of the web UI's display font.
Implements FR-EXPORT-02.

#### Scenario: PDF download renders Ukrainian text
- **WHEN** a user downloads the PDF export of a Ukrainian-language tailored résumé
- **THEN** the downloaded PDF renders all Cyrillic characters correctly

### Requirement: Download a DOCX résumé
The system SHALL let the user download the tailored résumé as a DOCX file,
built from the same shared export document model as the other export
formats. Implements FR-EXPORT-03.

#### Scenario: DOCX download matches the same content as other formats
- **WHEN** a user downloads both the PDF and DOCX export of the same tailoring
- **THEN** both contain the same set of exportable bullets and the same footer state

### Requirement: Free-tier export footer
The system SHALL append a footer line ("Адаптовано за допомогою CV-Agent") to
every export produced by a free-tier or anonymous user, across all export
formats; paid-user exports SHALL be clean. Entitlement is resolved
server-side (never client-derived); the PDF and DOCX routes SHALL reject a
non-paid caller outright (`FR-PAYWALL-01`) rather than rely on the client to
withhold the request. When entitlement cannot be determined, the system
SHALL default to the stricter free-tier behavior — footer shown, export
gated. Implements FR-EXPORT-04.

#### Scenario: Free or anonymous export carries the footer
- **WHEN** a free-tier or anonymous user exports the tailored résumé in any format
- **THEN** the exported document includes the footer line

#### Scenario: Entitlement unknown defaults to the footer
- **WHEN** the user's plan entitlement cannot be determined
- **THEN** the export includes the footer line rather than assuming a paid, clean export
