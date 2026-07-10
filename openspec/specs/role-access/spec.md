## Purpose

Provides a simple hardcoded-account login stub that gates which UI screens are available: manager sees the product configuration flow, admin sees the dictionary management screens. Not a production authentication system.

## Requirements

### Requirement: Hardcoded role login gates UI screens
The system SHALL provide a login screen with two fixed accounts (manager, admin) and SHALL restrict access to screens based on the logged-in role: the manager role SHALL access the product configuration flow, and the admin role SHALL access the dictionary management (CRUD) screens. This is a stub, not a production authentication system.

#### Scenario: Manager logs in and sees the configurator
- **WHEN** a user logs in with the manager account
- **THEN** the system shows the product configuration screen and does not show dictionary CRUD screens

#### Scenario: Admin logs in and sees dictionary management
- **WHEN** a user logs in with the admin account
- **THEN** the system shows the dictionary management (colors, materials, hardware, sizes, part-size rules) screens
