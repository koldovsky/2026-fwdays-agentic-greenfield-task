## MODIFIED Requirements

### Requirement: SPA provides ticket form and card

The SPA SHALL provide guarded Ukrainian mobile-first screens
(NFR-COMPAT-01, from this slice on): a ticket create/edit form — house
select fed from the user's directory, fixed category and priority
selects, date picker for the due date, text inputs for the rest — and a
ticket card showing the number #N, status and every FR-TICKET-01
attribute. Ticket creation SHALL be reachable from the app's main
navigation; after create or edit the user lands on the card. The card
SHALL show no transition, feed or attachment UI in this capability. An
overdue ticket (server-computed flag, PRD §5.4) SHALL be visually
highlighted on the card (FR-DUE-02) — the highlight is purely visual,
with no auto-actions.

#### Scenario: Create from UI lands on the card

- **WHEN** a logged-in user with a house opens «Нова заявка», fills title, house and category and submits
- **THEN** they land on the ticket card showing number #N, status «Нова» and the entered attributes

#### Scenario: Edit from the card

- **WHEN** the owner opens editing from the ticket card, changes the executor and due date and saves
- **THEN** the card shows the updated values

#### Scenario: Validation errors are understandable

- **WHEN** a user submits the form without a title, house or category
- **THEN** the form shows understandable Ukrainian validation messages and nothing is submitted

#### Scenario: No house yet is not a dead end

- **WHEN** a user with an empty house directory opens the ticket form
- **THEN** they see an understandable Ukrainian hint leading them to create a house first

#### Scenario: Overdue ticket is highlighted on the card

- **WHEN** the owner opens the card of a ticket with a past due date in an active status, and the card of a ticket in `Закрита` with the same due date
- **THEN** the first card shows the overdue highlight and the second does not
