## MODIFIED Requirements

### Requirement: Localized financial visibility

Dashboard, inventory, and procurement SHALL display monetary values as Ukrainian гривня amounts with two decimal places and the visible suffix `грн`, without `$` or `USD` (FR-8, FR-9, FR-10, FR-16, FR-20).

#### Scenario: UAH amount

- **WHEN** the interface displays an amount of 300
- **THEN** the user sees `300,00 грн`

### Requirement: Persistent current navigation

The authenticated navigation SHALL visually distinguish the current route after navigation and expose exactly one `aria-current="page"` item (FR-13).

#### Scenario: Procurement selected

- **WHEN** the user opens `/procurement`
- **THEN** `Закупівлі` remains highlighted until another destination is selected
