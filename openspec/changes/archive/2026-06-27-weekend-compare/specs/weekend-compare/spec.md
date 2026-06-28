## ADDED Requirements

### Requirement: Pin cities (up to 3)

The system SHALL allow the user to pin up to 3 cities. A pinned city is represented as `{ lat: number; lon: number; name: string }` stored in ephemeral React state (no cookies, no localStorage, no URL params). When the user attempts to pin a 4th city, the action SHALL be ignored and no error SHALL be thrown. Pinning the same `lat+lon` pair a second time SHALL be a no-op. The user SHALL be able to unpin any city at any time, which removes it from the pinned list immediately.

#### Scenario: User pins a city

- **WHEN** the user clicks the pin button for a city in the search suggestions or active location chip
- **THEN** that city is added to the pinned list and appears in the chip row; the pin button for that city reflects the pinned state

#### Scenario: Maximum 3 cities enforced

- **WHEN** the user attempts to pin a 4th city while 3 are already pinned
- **THEN** the pin action is ignored; the chip row still shows exactly 3 cities; no error message is shown

#### Scenario: Duplicate pin is a no-op

- **WHEN** the user clicks pin for a city whose lat+lon is already in the pinned list
- **THEN** the pinned list is unchanged and no duplicate chip appears

#### Scenario: User unpins a city

- **WHEN** the user clicks the dismiss (×) button on a city chip
- **THEN** that city is immediately removed from the pinned list and the chip disappears

---

### Requirement: Pinned city chip row

The system SHALL render a horizontal chip row above the forecast panel whenever at least one city is pinned. Each chip SHALL display the city name, a dismiss button (×) with `aria-label` in Ukrainian (e.g. "Відкріпити Київ"), and a visual "pinned" indicator. The chip row SHALL be hidden when no cities are pinned. The chip row SHALL remain visible whether the user is viewing the normal forecast or the weekend compare table.

#### Scenario: At least one city pinned

- **WHEN** one or more cities are in the pinned list
- **THEN** the chip row is visible above the forecast area; each chip shows the city name and a dismiss button

#### Scenario: No cities pinned

- **WHEN** the pinned list is empty
- **THEN** the chip row is not rendered (no empty row placeholder)

#### Scenario: Chip dismiss button is accessible

- **WHEN** a screen reader navigates to a city chip's dismiss button
- **THEN** the button has `aria-label="Відкріпити <CityName>"` in Ukrainian

---

### Requirement: "Порівняти вихідні" toggle

The system SHALL render a "Порівняти вихідні" toggle button in the forecast area header whenever at least one city is pinned. Activating the toggle SHALL switch the forecast area to the weekend compare table. Deactivating it SHALL restore the standard forecast view for the active location. The toggle SHALL have a pressed/unpressed visual state and an `aria-pressed` attribute. The toggle label SHALL come from `lib/i18n/uk.ts`.

#### Scenario: Toggle appears when cities are pinned

- **WHEN** one or more cities are pinned
- **THEN** the "Порівняти вихідні" toggle button is visible in the forecast header

#### Scenario: Toggle hidden when no cities pinned

- **WHEN** the pinned list is empty
- **THEN** the toggle is not rendered

#### Scenario: Activating toggle switches to compare view

- **WHEN** the user clicks the toggle and it becomes active (`aria-pressed="true"`)
- **THEN** the standard forecast panel is replaced by the weekend compare table

#### Scenario: Deactivating toggle restores forecast

- **WHEN** the user clicks the active toggle (`aria-pressed="true"`) a second time
- **THEN** the weekend compare table is replaced by the standard forecast panel for the active location

---

### Requirement: Weekend compare table

The system SHALL render a weekend compare table when the toggle is active. The table SHALL have one column per pinned city (up to 3). Each column SHALL show forecast data for the upcoming Saturday and Sunday: high temperature (°C), low temperature (°C), precipitation probability (%), and the comfort score badge (value + color per `comfort-score` spec thresholds). If either Saturday or Sunday falls outside the 7-day forecast window for a city, that day's cell SHALL display "—" instead of data. While a column's forecast is loading, the cell area SHALL show a skeleton placeholder.

#### Scenario: All pinned cities have weekend data

- **WHEN** the compare toggle is active and all pinned cities have Saturday and Sunday within their 7-day forecast
- **THEN** the table renders one column per city; each column shows hi/lo °C, precip %, and comfort score for Saturday and for Sunday

#### Scenario: Weekend day outside forecast window

- **WHEN** the 7-day forecast for a pinned city does not include Saturday or Sunday (e.g. today is Saturday)
- **THEN** the missing day's cell displays "—" and no error is thrown

#### Scenario: Column loading state

- **WHEN** the forecast fetch for a pinned city has not yet resolved
- **THEN** that column's data cells show a skeleton placeholder of the same height as the data cells

#### Scenario: Comfort score badge in compare table

- **WHEN** a day's comfort score value is available for a column
- **THEN** the badge is rendered with the same green/yellow/red token logic as the `comfort-score` spec (≥ 70 green, 40–69 yellow, < 40 red) and has `aria-label="Комфорт: <value>"`

#### Scenario: Table scrolls horizontally on mobile

- **WHEN** the viewport is < 768 px wide and 2 or 3 cities are pinned
- **THEN** the table container scrolls horizontally; column headers remain visible via sticky positioning

---

### Requirement: Sticky column headers with "Зробити активним"

Each column in the weekend compare table SHALL have a sticky header (remains visible when the table scrolls vertically) containing the city name and a "Зробити активним" button. Clicking "Зробити активним" SHALL set that city as the active location (updating the `?lat=&lon=&name=` URL params) and deactivate the compare toggle, returning the view to the standard forecast for that city. The "Зробити активним" button SHALL have an accessible `aria-label` in Ukrainian, e.g. "Зробити Київ активним".

#### Scenario: User clicks "Зробити активним"

- **WHEN** the user clicks "Зробити активним" in a column header
- **THEN** the URL updates to `?lat=<lat>&lon=<lon>&name=<name>` for that city, the compare toggle deactivates, and the standard forecast panel for that city is shown

#### Scenario: Sticky header visibility

- **WHEN** the user scrolls the compare table vertically
- **THEN** each column header (city name + "Зробити активним") remains visible at the top of its column

#### Scenario: "Зробити активним" button is accessible

- **WHEN** a screen reader navigates to the "Зробити активним" button in a column
- **THEN** the button has `aria-label="Зробити <CityName> активним"` in Ukrainian

---

### Requirement: i18n strings for weekend-compare

All user-facing strings introduced by this capability SHALL be stored in `lib/i18n/uk.ts` (Ukrainian, primary) and `lib/i18n/en.ts` (English fallback). No hardcoded display strings SHALL appear in component JSX.

#### Scenario: Ukrainian strings rendered in compare UI

- **WHEN** the app renders the pinned chip row, toggle, or compare table
- **THEN** all labels ("Порівняти вихідні", "Відкріпити", "Зробити активним", "Субота", "Неділя", day-data labels) are sourced from `lib/i18n/uk.ts`

#### Scenario: English fallback exists

- **WHEN** a string key from the weekend-compare section is accessed for the English locale
- **THEN** `lib/i18n/en.ts` exports a matching key with equivalent English text
