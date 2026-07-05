## ADDED Requirements

### Requirement: Light and dark themes (UI-001)

The application SHALL support light and dark color themes using the Notely design system token sets. The active theme MUST apply to the entire application chrome and content areas.

#### Scenario: Default theme on first visit

- **WHEN** a user opens the application for the first time with no stored preference
- **THEN** the light theme is displayed

#### Scenario: Toggle theme

- **WHEN** the user activates the theme toggle control
- **THEN** the application switches between light and dark themes immediately

#### Scenario: Theme persists across sessions

- **WHEN** the user selects a theme and later returns or refreshes the page
- **THEN** the previously selected theme is restored

### Requirement: Collapsible sidebar (UI-003)

The dashboard SHALL include a left sidebar for navigation. The sidebar MUST be collapsible to an icon-only or hidden state and expandable to show full labels.

#### Scenario: Collapse sidebar

- **WHEN** the user activates the sidebar collapse control
- **THEN** the sidebar reduces to a compact state and the main content area expands

#### Scenario: Expand sidebar

- **WHEN** the user activates the sidebar expand control while collapsed
- **THEN** the sidebar returns to full width with navigation labels visible

#### Scenario: Sidebar state persists

- **WHEN** the user collapses or expands the sidebar and refreshes the page
- **THEN** the sidebar retains its last collapsed or expanded state

### Requirement: Responsive layout (UI-004)

The application layout SHALL adapt fluidly from 320px viewport width up to 4K (3840px) displays without horizontal overflow or unusable navigation.

#### Scenario: Mobile viewport

- **WHEN** the viewport width is 320px or greater and below the tablet breakpoint
- **THEN** the sidebar is hidden or presented as an overlay and the main content uses the full width

#### Scenario: Tablet viewport

- **WHEN** the viewport width is at or above the tablet breakpoint and below the desktop breakpoint
- **THEN** the layout shows sidebar and main content side by side with adjusted spacing

#### Scenario: Desktop and large displays

- **WHEN** the viewport width is at or above the desktop breakpoint up to 3840px
- **THEN** the sidebar and main content are displayed with a centered or max-width content area that scales appropriately

### Requirement: Multi-device support (NFR-005)

The application SHALL provide a usable experience on desktop, tablet, and mobile devices through the responsive dashboard shell.

#### Scenario: Touch-friendly navigation on mobile

- **WHEN** the user interacts with navigation on a touch device
- **THEN** navigation targets meet minimum touch size and remain operable without hover-only affordances

#### Scenario: Keyboard navigation on desktop

- **WHEN** the user navigates the shell using keyboard focus
- **THEN** sidebar links, collapse control, and theme toggle are reachable and activatable via keyboard

### Requirement: Dashboard navigation shell

The application SHALL provide a dashboard layout with static navigation routes matching the PRD information architecture. Routes MUST render placeholder content until feature changes add real data.

#### Scenario: Static nav routes

- **WHEN** the user selects a sidebar navigation item (All Notes, Favorites, Pinned, Archive, Trash, Settings)
- **THEN** the application navigates to the corresponding route and displays a placeholder view

#### Scenario: Root redirect

- **WHEN** the user visits the application root URL
- **THEN** the user is directed to the default dashboard view (All Notes)

#### Scenario: New note action placeholder

- **WHEN** the user clicks "New note" in the sidebar
- **THEN** the application navigates to a placeholder note editor route without requiring authentication or persistence
