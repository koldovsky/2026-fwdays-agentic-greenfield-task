## Purpose

App shell, navigation, and deployment health for the browser-first invoice generator.

## Requirements

### Requirement: FR-SHELL-01 Landing and dashboard navigation
The system SHALL provide a landing page and a dashboard area with navigation to invoice creation, invoice list, clients, and settings.

#### Scenario: User opens the app
- **WHEN** the user visits the root URL
- **THEN** they see a landing page with a path into the dashboard

#### Scenario: User navigates the dashboard
- **WHEN** the user is in the dashboard shell
- **THEN** they can reach invoice creation, invoices list, clients, and settings without authentication

### Requirement: FR-SHELL-02 Responsive layout
The system SHALL adapt the shell layout at a 768 px breakpoint so navigation remains reachable and content surfaces — including the invoice preview area that later capabilities render inside the shell — remain readable on mobile without horizontal overflow.

#### Scenario: Desktop viewport
- **WHEN** the viewport width is 768 px or wider
- **THEN** the dashboard shell shows a persistent sidebar with navigation to invoice creation, invoices list, clients, and settings alongside the content area

#### Scenario: Mobile viewport
- **WHEN** the viewport width is below 768 px
- **THEN** the persistent sidebar is hidden, the main content area spans the full viewport width, and navigation and preview layout reflow without horizontal overflow on the preview surface

#### Scenario: Mobile navigation access
- **WHEN** the viewport width is below 768 px and the user opens the mobile navigation
- **THEN** they can reach invoice creation, invoices list, clients, and settings without authentication

#### Scenario: No horizontal overflow at 375 px
- **WHEN** the landing page or any dashboard shell route is rendered at a 375 px viewport width
- **THEN** the shell renders without horizontal scrolling of the page body

### Requirement: FR-SHELL-03 Health endpoint
The system SHALL expose `GET /api/health` returning `{ status: "ok", service: "invoice-maker" }`.

#### Scenario: Health check
- **WHEN** a client requests `GET /api/health`
- **THEN** the response status is 200 and the JSON body includes `status: "ok"` and `service: "invoice-maker"`
