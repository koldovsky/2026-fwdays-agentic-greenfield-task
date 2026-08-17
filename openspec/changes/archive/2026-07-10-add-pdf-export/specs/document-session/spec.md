## ADDED Requirements

### Requirement: Reaching final step marks session completed
The system SHALL set `completed` to true when the user advances from step 6 to step 7 (final view), persisting that flag with `current-step` of 7 so a later open of the same `guid` presents final review (TC-03). Document field values SHALL remain unchanged by this transition.

#### Scenario: Next from step 6 completes the session
- **WHEN** a user on step 6 successfully activates «Далі»
- **THEN** the persisted session has `current-step` 7 and `completed` true

#### Scenario: Reopen completed guid shows final review
- **WHEN** a user opens `/docs/{guid}` for a session with `completed` true
- **THEN** the system presents final review (step 7 semantics) (TC-03)

### Requirement: Edit or Back clears completed and restores wizard step
The system SHALL allow clearing completion when the user chooses «Редагувати» or «Назад» from final review: persist `completed` false and `current-step` 6 without clearing contacts, numbers, services, or other document fields.

#### Scenario: Edit clears completed flag
- **WHEN** a client updates a completed session to set `completed` false and `current-step` 6
- **THEN** the file on disk reflects those values and prior document fields remain present

#### Scenario: Reload after Edit resumes step 6
- **WHEN** a user activates «Редагувати» (or «Назад» from final review) and then reloads `/docs/{guid}`
- **THEN** the session opens unfinished on step 6 with the same `guid` and saved data
