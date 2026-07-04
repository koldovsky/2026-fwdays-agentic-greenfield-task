## MODIFIED Requirements

### Requirement: Minimal planning summary

After a successful plan, the application SHALL display the full itinerary sidebar instead of the compact two-metric planning summary card.

#### Scenario: Sidebar replaces summary card

- **WHEN** route planning completes successfully and the itinerary sidebar is available
- **THEN** the compact planning summary card is not shown
- **THEN** total distance and travel day count appear in the sidebar overview
