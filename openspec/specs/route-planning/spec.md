# route-planning

## Purpose

Submit-triggered orchestration from route configuration through OSRM and the segmentation engine to a client-held itinerary, with loading, error, and minimal success UI. Implements NFR-OBS-01 and BC-PRIVACY-02 (explicit submit only).

## Requirements

### Requirement: Submit-triggered route planning

The application SHALL initiate OSRM fetch and route segmentation only when the visitor explicitly submits a valid route configuration form, not on initial page load or passive URL hydration.

#### Scenario: Successful plan on submit

- **WHEN** the visitor submits a valid configuration with start, end, rest interval, and daily limit
- **THEN** the application fetches OSRM geometry and passes it to `segmentRoute`
- **THEN** a structured itinerary is stored in client state

#### Scenario: No automatic planning on load

- **WHEN** the visitor loads the page with URL query parameters but does not submit the form
- **THEN** no OSRM request is made
- **THEN** no itinerary is computed until explicit submit

### Requirement: Planning status and loading UI

The application SHALL expose planning status to the UI and prevent duplicate concurrent submissions while a plan is in progress.

#### Scenario: Loading state

- **WHEN** route planning is in progress after submit
- **THEN** the submit control indicates loading state using Ukrainian copy
- **THEN** the submit control is disabled until planning completes or fails

### Requirement: Routing failure degradation

When OSRM fetch or segmentation fails, the application SHALL show a calm Ukrainian error message without breaking the shell layout.

#### Scenario: OSRM unavailable

- **WHEN** OSRM fetch fails or returns no usable route
- **THEN** a calm Ukrainian error message is displayed near the configuration form
- **THEN** the configuration panel remains usable for retry
- **THEN** the browser console remains silent in the normal error path

### Requirement: Minimal planning summary

After a successful plan, the application SHALL display the full itinerary sidebar instead of the compact two-metric planning summary card.

#### Scenario: Sidebar replaces summary card

- **WHEN** route planning completes successfully and the itinerary sidebar is available
- **THEN** the compact planning summary card is not shown
- **THEN** total distance and travel day count appear in the sidebar overview

### Requirement: Shared itinerary client state

The application SHALL hold the latest successful itinerary in client state accessible to downstream map and sidebar consumers in later phases.

#### Scenario: Itinerary available after success

- **WHEN** planning succeeds
- **THEN** client state contains the full itinerary object including stops, days, and polylines
- **THEN** the itinerary persists in memory for the current session until replaced by a new successful plan or cleared on failure

### Requirement: Orchestration unit tests

Route planning orchestration SHALL include Vitest tests with mocked network responses that verify decode, segmentation wiring, and error mapping without live OSRM calls.

#### Scenario: Mocked success path

- **WHEN** tests run with a mocked successful OSRM response
- **THEN** `planRoute` returns a successful itinerary result without network access

#### Scenario: Mocked failure path

- **WHEN** tests run with a mocked failed OSRM response
- **THEN** `planRoute` returns a structured error result without throwing
