# Delta: court-availability-preview

## MODIFIED Requirements

### Requirement: Tennis availability on book page (FR-AVAIL-02)

The `/book` page SHALL show available tennis slots for East and West courts for selectable dates within the MHOA booking window, before the user reaches the confirm step.

#### Scenario: Pick slot on book page

- **WHEN** user selects a date and clicks an available slot on `/book`
- **THEN** that court and slot are carried to confirm/submit without re-picking

#### Scenario: NL path

- **WHEN** user writes a natural-language request instead of picking a slot
- **THEN** availability is shown on the confirm step (existing FR-AVAIL-01)
