## ADDED Requirements

### Requirement: A multi-item plate offers to save the dish
The multi-item plate confirmation SHALL offer a **"save as dish"** affordance (an inline button) that
starts the composite-dish save flow (composite-dish capability), carrying the just-written `food_log`
row ids so the saved product's macros can be re-read and summed from those rows. The affordance SHALL
appear **only** when more than one item was logged, and SHALL be omitted (with a logged note, never a
truncated payload) when the row-id payload would exceed the callback size limit. Tapping it SHALL ask
the user for a name (free text) via the existing one-pending-per-chat question mechanic (ADR-0019),
and the user's next message SHALL be taken as the dish name. Declining (ignoring the button) SHALL
leave the already-logged rows untouched.

#### Scenario: A multi-item plate shows the save-as-dish button
- **WHEN** a plate logs more than one item
- **THEN** the confirmation includes a "save as dish" button carrying the written row ids

#### Scenario: Tapping asks for a name and the next message names the dish
- **WHEN** the user taps "save as dish"
- **THEN** the bot asks for a name and treats the next text message as the dish name, then saves the
  composite (composite-dish capability)

#### Scenario: A single-item plate shows no save button
- **WHEN** only one item was logged
- **THEN** no "save as dish" button is shown
