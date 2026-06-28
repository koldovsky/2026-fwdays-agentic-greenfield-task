## ADDED Requirements

### Requirement: Deterministic Ukrainian weather jokes in footer

The footer SHALL display a Ukrainian weather-themed joke sourced from `lib/i18n/uk.ts`. The joke selection SHALL be deterministic: it is derived from the day-of-year so the same joke is shown all day and changes at midnight. No external API, network request, or random seed SHALL be used to select the joke. The component MUST NOT produce a React hydration mismatch. (FR-JOKES-01)

#### Scenario: Joke is visible on load

- **WHEN** a user opens or navigates to the app
- **THEN** the footer displays one Ukrainian weather-themed joke string

#### Scenario: Joke selection is day-seeded

- **WHEN** the component renders on a given calendar day
- **THEN** the same joke is shown for every render on that day, regardless of how many times the page is refreshed

#### Scenario: Joke changes on the next day

- **WHEN** the date advances to the following calendar day
- **THEN** a different joke (the next one in the rotation) is displayed

#### Scenario: No hydration mismatch on load

- **WHEN** the page is server-rendered and then hydrated on the client
- **THEN** no React hydration mismatch error or warning is produced in the browser console

#### Scenario: No external API calls

- **WHEN** the network tab is observed during page load
- **THEN** no outbound request is made to fetch joke content

### Requirement: Jokes use calm Ukrainian voice

All joke strings SHALL be stored in `lib/i18n/uk.ts` under a `jokes` key as an array of strings. Each joke string SHALL be in Ukrainian, SHALL NOT contain exclamation marks, and SHALL be weather-themed and gently humorous. The Strings interface in `lib/i18n/uk.ts` SHALL be extended with the `jokes` field, and `lib/i18n/en.ts` SHALL mirror the same key. (FR-JOKES-01, BC-BRAND-01, NFR-I18N-01)

#### Scenario: Strings sourced from i18n module

- **WHEN** the `BottomJokes` component file is reviewed
- **THEN** all user-facing joke text is imported from `lib/i18n/uk.ts`, not hard-coded in the component

#### Scenario: No exclamation marks in joke strings

- **WHEN** every joke string in `lib/i18n/uk.ts` is reviewed
- **THEN** none of the joke strings contain an exclamation mark character (`!`)

### Requirement: Footer attribution links present

The footer SHALL display attribution hyperlinks to Open-Meteo (`https://open-meteo.com`) and OpenStreetMap (`https://www.openstreetmap.org/copyright`) with labels sourced from `lib/i18n/uk.ts`. Links SHALL open in a new tab with `rel="noopener noreferrer"`. (BC-BRAND-02)

#### Scenario: Open-Meteo attribution link present

- **WHEN** the page footer is rendered
- **THEN** a link labelled "Open-Meteo" pointing to `https://open-meteo.com` is visible

#### Scenario: OpenStreetMap attribution link present

- **WHEN** the page footer is rendered
- **THEN** a link labelled "OpenStreetMap" pointing to `https://www.openstreetmap.org/copyright` is visible

#### Scenario: Links open in new tab

- **WHEN** an attribution link is clicked
- **THEN** the destination opens in a new browser tab
