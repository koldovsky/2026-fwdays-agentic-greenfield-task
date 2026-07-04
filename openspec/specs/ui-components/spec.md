# ui-components

## Purpose

shadcn/ui primitives, footer attribution links, and shell accessibility baseline for MotoRoute.

## Requirements

### Requirement: shadcn/ui component library wiring

The application SHALL initialize shadcn/ui with Tailwind CSS 4 and class-variance-authority. Base primitives Button, Input, Label, and Card MUST be available and styled using project theme tokens.

#### Scenario: shadcn components render with theme tokens

- **WHEN** a Button or Card component is rendered
- **THEN** it uses CSS variable tokens for colors, borders, and focus rings defined in globals.css

#### Scenario: Utility class merging

- **WHEN** components compose Tailwind classes
- **THEN** the `cn()` utility correctly merges class names without conflicts

### Requirement: Footer attribution links

The footer SHALL credit OpenStreetMap and the open routing provider (OSRM) with clear external hyperlinks. Links MUST open in a new tab with `rel="noopener noreferrer"`.

#### Scenario: Footer links present

- **WHEN** the page renders
- **THEN** the footer displays a link to OpenStreetMap copyright information
- **THEN** the footer displays a link to the OSRM project site

#### Scenario: Footer link security

- **WHEN** the user activates a footer external link
- **THEN** the link opens in a new browsing context with `noopener noreferrer` attributes

### Requirement: Empty state uses Card primitive

The centered configuration panel on initial load MUST use the Card shadcn primitive with appropriate padding and border radius per design tokens.

#### Scenario: Config panel appearance

- **WHEN** the empty state renders
- **THEN** the configuration panel is wrapped in a Card component with `rounded-lg` styling and card background token

### Requirement: Focus ring accessibility baseline

Interactive shell controls MUST display a visible focus ring using the accent token, consistent with `ring-2 ring-accent ring-offset-2 ring-offset-background`.

#### Scenario: Theme toggle keyboard focus

- **WHEN** the user tabs to the theme toggle button
- **THEN** a visible focus ring appears around the control
