## ADDED Requirements

### Requirement: Debounced city name search input

The system SHALL provide a single text input that triggers a debounced (≥ 300 ms) geocoding lookup as the user types. The lookup SHALL call the internal `/api/geocode` Route Handler, which proxies to the Open-Meteo geocoding API. No geocoding request SHALL be made on the client side directly.

#### Scenario: User types a city name

- **WHEN** the user types a city name into the search input
- **THEN** after a 300 ms debounce, the system sends a request to `/api/geocode?name=<query>` and displays the returned suggestions

#### Scenario: User stops typing

- **WHEN** the user pauses typing for 300 ms
- **THEN** exactly one geocoding request is in flight (no duplicate requests from rapid keystrokes)

---

### Requirement: Suggestion row display

Each geocoding result SHALL be rendered as a suggestion row displaying: city name, admin region, country name, and an optional flag emoji when a country code is available.

#### Scenario: Suggestions returned

- **WHEN** the geocoding API returns one or more results
- **THEN** each suggestion row shows the city name, admin region, country, and flag emoji (if available) in that order

#### Scenario: No flag available

- **WHEN** a result has no recognizable country code for a flag emoji
- **THEN** the row renders without a flag emoji and no placeholder character is shown

---

### Requirement: Location selection sets active location and URL

Selecting a suggestion (via click or keyboard) SHALL set the active location and update the URL to `?lat=<latitude>&lon=<longitude>&name=<city name>` using client-side navigation. No full page reload SHALL occur.

#### Scenario: User clicks a suggestion

- **WHEN** the user clicks on a suggestion row
- **THEN** the URL is updated to `?lat=…&lon=…&name=…` reflecting the selected city and the suggestion list is dismissed

#### Scenario: URL reflects selection

- **WHEN** a city is selected
- **THEN** the browser address bar shows `?lat=<lat>&lon=<lon>&name=<name>` and copying the URL reproduces the same selected location on reload

---

### Requirement: Enter key auto-selects single suggestion

When exactly one suggestion is visible, pressing Enter in the search input SHALL auto-select that suggestion as if the user had clicked it.

#### Scenario: Single suggestion and Enter pressed

- **WHEN** the geocoding lookup returns exactly one result and the user presses Enter
- **THEN** that suggestion is selected, the active location is set, and the URL is updated

#### Scenario: Multiple suggestions and Enter pressed

- **WHEN** the geocoding lookup returns more than one result and the user presses Enter
- **THEN** no auto-selection occurs; the suggestion list remains open for the user to choose

---

### Requirement: Empty-state inline message on zero results

When the geocoding API returns zero results (or any non-2xx response), the system SHALL display an inline "Nothing found" message in the language of the active locale. No error toast, modal, or alert SHALL be shown.

#### Scenario: No geocoding results

- **WHEN** the geocoding API returns zero results for the current query
- **THEN** an inline "Nothing found" (Ukrainian: "Нічого не знайдено") message appears below the input and no suggestion rows are rendered

#### Scenario: Geocoding API error

- **WHEN** the `/api/geocode` Route Handler returns a non-2xx status
- **THEN** the same inline "Nothing found" message is shown; no console error or toast is displayed

---

### Requirement: Keyboard navigation of suggestion list

The suggestion list SHALL support full keyboard navigation: arrow keys to move focus between suggestions, Enter to select the focused suggestion, Escape to dismiss the list.

#### Scenario: Arrow key navigation

- **WHEN** the suggestion list is open and the user presses ArrowDown / ArrowUp
- **THEN** focus moves to the next / previous suggestion row respectively, wrapping at the ends

#### Scenario: Escape dismisses list

- **WHEN** the suggestion list is open and the user presses Escape
- **THEN** the suggestion list is dismissed and focus returns to the search input

---

### Requirement: Accessible search combobox

The search input and suggestion list SHALL be fully accessible: the input has a visible label or `aria-label`, the list has `role="listbox"`, each option has `role="option"`, the active descendant is tracked via `aria-activedescendant`, and all interactive elements have always-visible focus rings meeting WCAG AA.

#### Scenario: Screen reader announces suggestions

- **WHEN** suggestions appear
- **THEN** the input has `aria-expanded="true"`, `aria-haspopup="listbox"`, and `aria-activedescendant` points to the focused option's `id`

#### Scenario: Focus ring visible

- **WHEN** a suggestion row or the search input receives keyboard focus
- **THEN** a visible focus ring is rendered that meets WCAG AA contrast requirements

---

### Requirement: Geocoding Route Handler

The system SHALL expose a `GET /api/geocode?name=<query>` Route Handler that forwards the query to the Open-Meteo geocoding API and returns the results as JSON. The handler SHALL never expose the upstream Open-Meteo URL in a way that implies API key usage.

#### Scenario: Successful geocoding lookup

- **WHEN** a GET request is made to `/api/geocode?name=Kyiv`
- **THEN** the handler returns a JSON array of result objects with `{ name, admin1, country, countryCode, latitude, longitude }`

#### Scenario: Empty query

- **WHEN** a GET request is made to `/api/geocode` with no `name` parameter or an empty string
- **THEN** the handler returns an empty JSON array without calling the upstream API

---

### Requirement: UI strings in i18n files

All user-facing strings introduced by city search SHALL be stored in `lib/i18n/uk.ts` (Ukrainian, primary) and `lib/i18n/en.ts` (English fallback). No hardcoded strings SHALL appear in component JSX.

#### Scenario: Ukrainian string used

- **WHEN** the app renders in the default locale
- **THEN** "Нічого не знайдено" and the search input placeholder are sourced from `lib/i18n/uk.ts`

#### Scenario: English fallback exists

- **WHEN** a string key is accessed for English locale
- **THEN** `lib/i18n/en.ts` exports a matching key with equivalent English text
