## ADDED Requirements

### Requirement: Detail page shows artwork, dex number, name, and genus
The detail page at `/pokemon/[id]` SHALL display the official artwork, the zero-padded dex number (`#NNNN`), the Pokémon name (capitalized), and its genus string from the species endpoint.

#### Scenario: Header section renders correctly
- **WHEN** a visitor navigates to `/pokemon/25`
- **THEN** the page shows the official artwork image, the dex number `#0025`, the name "pikachu", and the genus (e.g. "Mouse Pokémon")

### Requirement: Types displayed as large colored badges
The detail page SHALL display each type using `TypeBadge` with `size="lg"`.

#### Scenario: Type badges are present and sized correctly
- **WHEN** a Pokémon with two types is displayed
- **THEN** both types are rendered as large `TypeBadge` components

### Requirement: Pokédex flavor text shown
The detail page SHALL display the most recent English flavor text entry from the species endpoint, with `\n` and `\f` control characters replaced by spaces.

#### Scenario: Flavor text is readable
- **WHEN** the detail page renders
- **THEN** a paragraph of Pokédex description text is shown with no raw control characters

### Requirement: Base stats displayed as stat bars
The detail page SHALL render HP, Attack, Defense, Sp. Atk, Sp. Def, and Speed using the `StatBar` DS component (max = 255).

#### Scenario: All six stats rendered
- **WHEN** the detail page renders
- **THEN** six `StatBar` components are visible, labelled HP, Attack, Defense, Sp. Atk, Sp. Def, and Speed

#### Scenario: Stat value is accurate
- **WHEN** a Pokémon with HP = 45 is displayed
- **THEN** the HP stat bar shows the value 45

### Requirement: Abilities listed with hidden ability marked
The detail page SHALL list all abilities. Any ability flagged `is_hidden` in the API SHALL display a "Hidden" label alongside the name.

#### Scenario: Hidden ability is marked
- **WHEN** a Pokémon with a hidden ability is displayed
- **THEN** the hidden ability shows a "Hidden" marker next to its name

#### Scenario: Non-hidden abilities have no marker
- **WHEN** a Pokémon with only regular abilities is displayed
- **THEN** no ability shows a "Hidden" marker

### Requirement: Height and weight shown in metric units
The detail page SHALL display height in metres (API value ÷ 10, one decimal place) and weight in kilograms (API value ÷ 10, one decimal place).

#### Scenario: Height and weight are correctly converted
- **WHEN** a Pokémon with API height = 4 and weight = 60 is displayed
- **THEN** height reads "0.4 m" and weight reads "6.0 kg"

### Requirement: Generation introduced is shown
The detail page SHALL display the generation in which the Pokémon was introduced (e.g. "Gen 1 — Kanto").

#### Scenario: Generation label is present
- **WHEN** a Generation 1 Pokémon is displayed
- **THEN** the generation field reads "Gen 1 — Kanto"

### Requirement: Legendary or Mythical badge shown when applicable
If a Pokémon is legendary or mythical, the detail page SHALL render a `Badge` with `variant="legendary"` showing "Legendary" or "Mythical" respectively. The badge SHALL NOT be shown for ordinary Pokémon.

#### Scenario: Legendary badge shown for legendary Pokémon
- **WHEN** a legendary Pokémon (e.g. Mewtwo) is displayed
- **THEN** a "Legendary" badge is visible alongside the type badges

#### Scenario: No badge for ordinary Pokémon
- **WHEN** an ordinary Pokémon (e.g. Pikachu) is displayed
- **THEN** no Legendary or Mythical badge is shown

### Requirement: Back link returns to the list page
The detail page SHALL include a back link that navigates to `/pokemon`.

#### Scenario: Back link is present and correct
- **WHEN** the detail page renders
- **THEN** a back link labelled "Back to results" (or equivalent) is present and points to `/pokemon`
