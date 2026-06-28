## Purpose

The app shell provides the persistent chrome that wraps every page of Pokédex Explorer: a sticky top bar with the app wordmark, a responsive main content area, and a footer crediting PokéAPI. All shell components are styled exclusively with design-system tokens and meet accessibility landmark requirements.

## Requirements

### Requirement: Top bar is present on every page
The app SHALL render a persistent top bar containing the app wordmark ("Pokédex Explorer") on every page. The wordmark SHALL link to the root path `/`.

#### Scenario: Top bar visible on list page
- **WHEN** a visitor loads any page
- **THEN** a top bar is visible at the top of the viewport containing the app wordmark

#### Scenario: Wordmark navigates to root
- **WHEN** a visitor clicks the wordmark in the top bar
- **THEN** the browser navigates to `/`

### Requirement: Top bar sticks to the viewport on scroll
The top bar SHALL use `position: sticky` (top: 0) with a translucent paper background and backdrop blur so content scrolls beneath it.

#### Scenario: Top bar remains visible while scrolling
- **WHEN** a visitor scrolls down a page longer than the viewport
- **THEN** the top bar remains fixed at the top of the viewport

### Requirement: Main content area renders page content
The app layout SHALL render a `<main>` element below the top bar that contains the current page's content.

#### Scenario: Page content appears in main area
- **WHEN** a page is rendered
- **THEN** its content appears inside the `<main>` element below the top bar

### Requirement: Footer credits PokéAPI
The app SHALL render a footer on every page containing the text "Data from PokéAPI" as a hyperlink to `https://pokeapi.co`.

#### Scenario: Footer link present
- **WHEN** a visitor views any page
- **THEN** a footer is visible containing a link labelled "Data from PokéAPI" pointing to `https://pokeapi.co`

#### Scenario: Footer link opens PokéAPI
- **WHEN** a visitor clicks the footer link
- **THEN** the browser navigates to `https://pokeapi.co`

### Requirement: Layout is responsive across breakpoints
The main content container SHALL adapt its column layout at defined breakpoints: single column below 768 px, two columns at ≥ 768 px, three columns at ≥ 1024 px, four columns at ≥ 1280 px. Maximum content width SHALL be `--container-max` (1240 px), centered.

#### Scenario: Single column on mobile
- **WHEN** viewport width is below 768 px
- **THEN** content renders in a single column

#### Scenario: Multi-column on desktop
- **WHEN** viewport width is 1280 px or wider
- **THEN** content area supports a four-column grid layout

### Requirement: Shell uses only DS tokens for styling
All colors, spacing, typography, and radius values in shell components SHALL use CSS custom properties from the design system. No raw hex values or px literals SHALL appear in shell component source.

#### Scenario: No raw hex in shell source
- **WHEN** shell component files are linted
- **THEN** no raw hex color literals are present

### Requirement: Top bar and footer are accessible
The top bar SHALL use a `<header>` element with `role="banner"`. The footer SHALL use a `<footer>` element. All interactive elements SHALL have accessible names and visible focus styles.

#### Scenario: Landmark elements present
- **WHEN** the page is parsed by an accessibility tree
- **THEN** `<header>`, `<main>`, and `<footer>` landmark elements are present
