## ADDED Requirements

### Requirement: MUI Theme Provider
The application SHALL wrap all pages in a single Material UI `ThemeProvider` supplying one shared theme, initialized in the root layout so every route (login, manager, admin) renders with consistent typography, palette, and spacing.

#### Scenario: Theme applies across routes
- **WHEN** a user navigates between the login, manager, and admin pages
- **THEN** all pages render using the same MUI theme (same palette and typography), with no page falling back to unstyled default browser styles

### Requirement: Server-Side Rendered MUI Styles
The application SHALL inject Material UI's (Emotion) styles during server rendering so that pages display fully styled on first paint, without a flash of unstyled content or a client/server hydration mismatch.

#### Scenario: First page load is fully styled
- **WHEN** a user requests any page (e.g., `/login`) directly from the server (hard navigation, JavaScript not yet executed)
- **THEN** the HTML response includes the MUI component styles inline, so the rendered page already looks styled before client-side hydration completes

#### Scenario: No hydration mismatch
- **WHEN** the client-side React app hydrates the server-rendered MUI markup
- **THEN** no hydration warnings or visual style flicker occur in the browser console

### Requirement: MUI Components Replace Raw HTML on Existing Pages
The login, manager, and admin pages SHALL use Material UI components (e.g., `TextField`, `Button`, `Table`, `Paper`, `Dialog`, `Alert`) in place of unstyled native HTML elements (`<input>`, `<button>`, `<table>`, `<div>`) for form fields, buttons, tables, and error/status messaging, while preserving all existing behavior (validation, submission, data displayed).

#### Scenario: Login form uses MUI inputs
- **WHEN** a user visits the login page
- **THEN** the username/password fields and submit button render as MUI `TextField`/`Button` components, and submitting valid or invalid credentials behaves exactly as before the restyle

#### Scenario: Admin CRUD tables use MUI Table
- **WHEN** an admin views a dictionary/catalog management section (e.g., hardware, standard sizes)
- **THEN** the list of entries renders in an MUI `Table`, and create/edit/delete actions continue to perform the same underlying operations as before the restyle

#### Scenario: Configurator form uses MUI form controls
- **WHEN** a manager fills out the product configurator form
- **THEN** all dictionary-backed selection fields render as MUI `Select`/`TextField` components, still populated by and submitting to the existing dictionary-ID-based data (no free-text attribute inputs are introduced)
