# Delta: booking-wizard

## ADDED Requirements

### Requirement: Three-step booking flow (FR-WIZ-01)

The `/book` flow SHALL use separate screens for What (facility), Who (participants), and When (date + slots).

#### Scenario: Single participant

- **WHEN** one resident is selected
- **THEN** When step shows one slot picker

#### Scenario: Multiple participants

- **WHEN** Max and Nataliia are selected
- **THEN** When step shows sequential slot pickers (1 of 2, 2 of 2)

### Requirement: Independent MHOA requests (FR-WIZ-02)

Each participant slot SHALL be submitted as a separate MHOA form request.

#### Scenario: Two slots two people

- **WHEN** user confirms two assignments
- **THEN** system calls `/api/booking/submit` twice with respective resident profiles and slots
