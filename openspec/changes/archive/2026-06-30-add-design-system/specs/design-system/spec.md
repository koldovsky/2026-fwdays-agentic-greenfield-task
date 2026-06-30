## ADDED Requirements

### Requirement: «Поливайко» design tokens as single theme source
The system SHALL adopt the «Поливайко» design tokens defined in `docs/design.md` as its single theme source (FR-DS-01). The theme SHALL expose the color palette — greens forest `#2F6B3F`, pine `#213D2A`, sage `#7E9B6E`, moss `#A7BE92`, mist `#DDE7CF`; earth bark `#5A4232`, clay `#A9744E`, sand `#E6D7BE`; neutrals paper `#F4F1E8`, cloud `#FBFAF5`, ink `#1B1E18`, stone `#6E7268`, border `#E2DDCF`; and status colors (healthy dot `#2F6B3F` on chip `#DDE7CF`, soon dot `#A9744E` on chip `#F6E7D6`, overdue dot `#B5462E` on chip `#F3DAD0`, danger `#B5462E`). The theme SHALL declare the typography families Quicksand (display/headings), Mulish (body/inputs), and Spline Sans Mono (meta labels/numbers), and the radii tokens inputs/segments 13px, soft buttons 14px, cards 18–22px, pills/toggles 999px, plus the spacing scale per `docs/design.md`. These tokens SHALL be the source consumed by all components and screens; no component SHALL hard-code an alternate palette.

#### Scenario: Palette tokens present in the theme
- **WHEN** the application theme source is inspected
- **THEN** it defines the named color tokens forest `#2F6B3F`, pine `#213D2A`, sage `#7E9B6E`, moss `#A7BE92`, mist `#DDE7CF`, bark `#5A4232`, clay `#A9744E`, sand `#E6D7BE`, paper `#F4F1E8`, cloud `#FBFAF5`, ink `#1B1E18`, stone `#6E7268`, and border `#E2DDCF` with exactly those hex values (FR-DS-01)

#### Scenario: Status colors present in the theme
- **WHEN** the application theme source is inspected
- **THEN** it defines the healthy (dot `#2F6B3F` / chip `#DDE7CF`), soon (dot `#A9744E` / chip `#F6E7D6`), overdue (dot `#B5462E` / chip `#F3DAD0`), and danger (`#B5462E`) status tokens with exactly those hex values (FR-DS-01)

#### Scenario: Typography families declared
- **WHEN** the application theme source is inspected
- **THEN** it declares Quicksand for display/headings, Mulish for body/inputs, and Spline Sans Mono for meta labels and numeric badges (FR-DS-01)

#### Scenario: Radii tokens declared
- **WHEN** the application theme source is inspected
- **THEN** it defines radii tokens of 13px for inputs/segments, 14px for soft buttons, a card radius in the 18–22px range, and 999px for pills/toggles (FR-DS-01)

#### Scenario: Single theme source, no alternate palette
- **WHEN** the styled components and screens are inspected for color usage
- **THEN** every applied color resolves to a token from the «Поливайко» theme source and no component hard-codes an alternate palette outside these tokens (FR-DS-01)

### Requirement: Restyled shared interactive components
The system SHALL restyle the shared interactive components the app actually uses to the «Поливайко» design (FR-DS-02), with the specified hover and focus states. Buttons SHALL provide the variants primary (forest bg, paper text, radius 14, hover `#275834`), secondary/outline (1.5px forest border, forest text, hover bg mist), soft (mist bg, pine text, hover `#CBDCB8`), ghost (transparent, stone text, hover bg `#EEE9DC`), danger (bg `#B5462E`, paper text, hover `#9D3B25`), and icon (48×48, radius 14, filled clay or outline cloud with hover border forest). Text and search inputs SHALL use bg paper, 1.5px border, radius 13, with focus state border forest + bg cloud (search adds a leading magnifier icon). The segmented control SHALL render the selected segment as forest bg + paper text and idle segments as muted `#9A9588` text. The switch SHALL render on = forest / off = `#D8D2C2`. The checkbox SHALL render checked = forest bg + paper check / unchecked = 2px `#D8D2C2` border. The progress meter SHALL render a 999-radius track with a forest fill for positive (soil moisture) and a clay fill for countdown (time-until-next-watering). Only the components the app uses are required; components specified in `docs/design.md` that no current screen uses (e.g. search input, segmented control, switch, checkbox, progress meter) are intentionally not built in this MVP and SHALL NOT be reported as missing.

#### Scenario: Button variant renders with its specified style
- **WHEN** each used button variant (primary, secondary, soft, ghost, danger, icon) is rendered
- **THEN** it applies that variant's specified background, text color, border, and radius from `docs/design.md` (FR-DS-02)

#### Scenario: Button hover state
- **WHEN** the pointer hovers a rendered button variant
- **THEN** the background changes to the variant's specified hover value (primary `#275834`, soft `#CBDCB8`, ghost `#EEE9DC`, danger `#9D3B25`, secondary mist, outline icon border forest) (FR-DS-02)

#### Scenario: Text input focus state
- **WHEN** a text input receives focus
- **THEN** its border changes to forest and its background changes to cloud, while the resting state is bg paper with a 1.5px border and radius 13 (FR-DS-02)

#### Scenario: Form-error components keep the inline-error contract
- **WHEN** a field error and a form-level error are rendered after a restyle
- **THEN** each still uses `role="alert"`, the field error remains programmatically associated with its field, and the visual treatment uses the danger/overdue color token rather than an unthemed red (FR-DS-02, FR-SHELL-03)

### Requirement: Plant card per design
The system SHALL render plant cards per the «Поливайко» design (FR-DS-03): card radius 22 with a cloud background and a 1px border, overflow hidden. The card SHALL have an image area approximately 150px tall containing a striped placeholder (since photos are Future), a bottom-left monospace filename chip on a translucent cloud background, and a top-right status pill (dot + label, radius 999). The card body SHALL show a Quicksand 700 title, a Mulish-italic latin/species name, a status line (droplet icon + due text), and a full-width action button. The watering-status value that drives the pill color and the action-button variant is wired in slice 7 (FR-REM-*); in this slice the pill and action ship as a static placeholder pattern (healthy by default) and SHALL NOT be reported as un-bound.

#### Scenario: Card frame styling
- **WHEN** a plant card is rendered
- **THEN** it shows radius 22, a cloud background, a 1px border, and clips its content (overflow hidden) (FR-DS-03)

#### Scenario: Image area with striped placeholder and filename chip
- **WHEN** a plant card with no photo is rendered
- **THEN** the image area shows the diagonal striped placeholder with a bottom-left monospace filename chip on a translucent cloud background (FR-DS-03)

#### Scenario: Status pill placeholder present
- **WHEN** a plant card is rendered in this slice
- **THEN** the top-right status pill (dot + label, radius 999) is present using the placeholder status colors, ready for slice 7 to bind the derived watering status (FR-DS-03)

#### Scenario: Card body content and styling
- **WHEN** a plant card body is rendered
- **THEN** it shows the title in Quicksand 700, the latin/species name in Mulish italic, a status line with a droplet icon and due text, and a full-width action button (FR-DS-03)

### Requirement: Botanical line-icon set
The system SHALL provide the «Поливайко» botanical line icons as inline SVG components using the codebase icon approach (FR-DS-04). Each icon SHALL be drawn with stroke width 1.8, round line caps and joins, and no fill (single-color stroke via `currentColor`). The set SHALL include the water-drop brand glyph (also used for the water action), leaf, sprout, sun, pot, and bell. Decorative icons SHALL be hidden from assistive tech (`aria-hidden`); an icon given a title SHALL expose it as an accessible name (`role="img"` + `<title>`).

#### Scenario: Icon stroke style
- **WHEN** any icon in the set is rendered
- **THEN** it is drawn with stroke-width 1.8, round caps and joins, and no fill (FR-DS-04)

#### Scenario: Required icons present
- **WHEN** the icon set is enumerated
- **THEN** it includes the water-drop, leaf, sprout, sun, pot, and bell icons (FR-DS-04)

#### Scenario: Water-drop is the brand glyph and water action
- **WHEN** the water action control and the brand glyph are rendered
- **THEN** both use the same water-drop icon, kept visually consistent (FR-DS-04)

#### Scenario: Decorative vs labelled icon accessibility
- **WHEN** an icon is rendered decoratively and again with a title
- **THEN** the decorative one is `aria-hidden` and the titled one exposes its title as an accessible name (FR-DS-04, NFR-A11Y-04)

### Requirement: «Поливайко» brand wordmark
The system SHALL brand the application «Поливайко» (FR-DS-05) by displaying the «Поливайко» wordmark in the application shell/header.

#### Scenario: Wordmark shown in the shell
- **WHEN** the application shell/header is rendered
- **THEN** the «Поливайко» wordmark text is visible (FR-DS-05)

### Requirement: Existing screens restyled with the design system
The system SHALL restyle the existing screens — the plant list/home view, the plant detail view, and the growth and watering sections — using the «Поливайко» tokens and components (FR-DS-06). Charts SHALL use the forest `#2F6B3F` color for the positive/growth series and the clay `#A9744E` color for the countdown/watering series, and SHALL remain legible. Behavior of the growth/watering history and charts is unchanged by this restyle. Text and interactive elements on these screens SHALL meet WCAG 2.1 AA contrast in the paper theme (NFR-A11Y-02), verified by the Phase 6 vision pass and automated axe checks (NFR-A11Y-01); notably forest `#2F6B3F` foreground on paper `#F4F1E8` background meets AA for normal-size text.

#### Scenario: List/home and detail screens use the theme
- **WHEN** the plant list/home and plant detail screens are rendered
- **THEN** their backgrounds, surfaces, typography, and controls resolve to «Поливайко» tokens and restyled components rather than default/unthemed styles (FR-DS-06)

#### Scenario: Growth and watering sections restyled, behavior unchanged
- **WHEN** the growth and watering sections on the plant detail view are rendered
- **THEN** they use the «Поливайко» tokens and components while their list ordering, validation, and CRUD behavior are unchanged from the existing capabilities (FR-DS-06)

#### Scenario: Charts use the forest/clay palette
- **WHEN** the growth and watering charts are rendered
- **THEN** the growth series line uses the forest `#2F6B3F` color and the watering series line uses the clay `#A9744E` color, replacing the previous unthemed stroke colors (FR-DS-06)

#### Scenario: No dark-mode variants remain after the restyle
- **WHEN** the restyled screens and components are inspected
- **THEN** no dark-theme variant styling remains, consistent with the single paper theme (FR-DS-06, FR-SHELL-02a)

#### Scenario: Forest-on-paper text meets AA contrast
- **WHEN** forest `#2F6B3F` foreground text is shown on the paper `#F4F1E8` background and measured
- **THEN** the contrast ratio meets WCAG 2.1 AA for normal-size text (>= 4.5:1) (NFR-A11Y-02)

#### Scenario: Settled screens pass axe and the vision pass
- **WHEN** the settled plant list/home and plant detail screens in the single paper theme are checked by automated axe and the Phase 6 vision-verify pass
- **THEN** axe reports no contrast violations and the screens are judged legible (NFR-A11Y-01, NFR-A11Y-02)
