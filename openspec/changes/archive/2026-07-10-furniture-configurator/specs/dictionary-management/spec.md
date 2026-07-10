## ADDED Requirements

### Requirement: Admin manages controlled attribute dictionaries
The system SHALL let an admin user create, edit, and deactivate entries in the color, material, and hardware item dictionaries. Each dictionary entry SHALL have a unique identifier and a name; the system SHALL NOT allow selecting an attribute value by free-text entry anywhere in the configurator.

#### Scenario: Admin adds a new color
- **WHEN** an admin creates a color dictionary entry with name "Кашемір"
- **THEN** the system stores it with a unique ID and it becomes selectable in the configurator's facade color dropdown

#### Scenario: Admin cannot create a duplicate-looking entry unnoticed
- **WHEN** an admin attempts to add a color whose name exactly matches an existing entry
- **THEN** the system rejects the duplicate and points to the existing entry instead of creating a second one

### Requirement: Admin manages standard sizes
The system SHALL let an admin define standard size values (e.g. 40cm, 60cm) for each dimension type (width/height/depth) used by top/bottom parts.

#### Scenario: Admin adds a new standard size
- **WHEN** an admin adds a standard width size of 50cm
- **THEN** 50cm becomes available as a standard (non-custom) size option in the configurator for parts whose dimension type is width

### Requirement: Admin manages part-size rules
The system SHALL let an admin configure, per part role (top/bottom/facade/corpus) within a product type, whether custom (non-standard) sizes are allowed and, if so, the minimum and maximum allowed size in centimeters.

#### Scenario: Admin allows custom sizing for a part role
- **WHEN** an admin sets the "top" part role to allow custom sizes with a range of 30-80cm
- **THEN** the configurator accepts any top size request between 30 and 80cm even if it isn't in the standard size list

#### Scenario: Admin disallows custom sizing for a part role
- **WHEN** an admin sets a part role's `allowsCustomSize` to false
- **THEN** the configurator only accepts standard size values for that part role and rejects any other requested size
