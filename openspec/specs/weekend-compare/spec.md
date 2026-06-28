# Spec: weekend-compare

## Purpose

Allows users to pin up to 5 cities and compare their upcoming weekend (Saturday + Sunday) forecast data side-by-side in a toggle-driven comparison table.

## Requirements

### Requirement: Pin cities (up to 5, FIFO queue)

The system SHALL allow the user to pin up to 5 cities. A pinned city is represented as `{ lat: number; lon: number; name: string }` stored in ephemeral React state (no cookies, no localStorage, no URL params). When the user pins a city while 5 are already pinned, the **oldest** pinned city SHALL be evicted (removed from the front of the list) and the new city SHALL be appended to the end — forming a FIFO queue. Pinning the same `lat+lon` pair a second time SHALL remove its existing entry and re-append it at the end (move-to-back, no duplicate). The user SHALL be able to unpin any city at any time when more than one city is pinned.

#### Scenario: User pins a city when list is not full

- **WHEN** the user triggers a pin action (via search selection or map click) and fewer than 5 cities are currently pinned
- **THEN** that city is added to the end of the pinned list and appears as the rightmost chip in the chip row

#### Scenario: Maximum 5 cities — FIFO eviction

- **WHEN** the user triggers a pin action while exactly 5 cities are already pinned
- **THEN** the oldest city (the leftmost chip) is removed from the list and the new city is appended; the chip row shows exactly 5 cities

#### Scenario: Duplicate pin moves city to end

- **WHEN** the user pins a city whose `lat+lon` is already in the pinned list
- **THEN** that city's existing entry is removed and re-appended at the end; total count stays the same; no duplicate chip appears

#### Scenario: User unpins a city (list has 2+ cities)

- **WHEN** the user clicks the dismiss (×) button on a city chip while 2 or more cities are pinned
- **THEN** that city is immediately removed from the pinned list and its chip disappears

---

### Requirement: Active fallback on unpin

When the user unpins the currently active city, the system SHALL automatically activate the previous city in the pinned list. If the removed city was the first (leftmost) pin, the new first pin SHALL become active. Activating a city means updating the URL to `?lat=<lat>&lon=<lon>&name=<name>` via client-side navigation, triggering a forecast re-fetch.

#### Scenario: User unpins the active city (not the first)

- **WHEN** the user dismisses the chip of the currently active city and that city is not at index 0
- **THEN** the city immediately before it in the list becomes active and the URL updates to reflect it

#### Scenario: User unpins the active city (first in list)

- **WHEN** the user dismisses the chip of the currently active city and it was the first pin
- **THEN** the new first pin (previously second) becomes active and the URL updates to reflect it

#### Scenario: User unpins a non-active city

- **WHEN** the user dismisses the chip of a city that is not currently active
- **THEN** the active location and URL are unchanged; only the pinned list shrinks

---

### Requirement: Pinned city chip row

The system SHALL render a horizontal chip row above the forecast panel whenever at least one city is pinned. Each chip SHALL display the city name, a visual "pinned" indicator, and — **only when two or more cities are pinned** — a dismiss button (×) with `aria-label` in Ukrainian (e.g. "Відкріпити Київ"). The chip row SHALL be hidden when no cities are pinned. The chip row SHALL remain visible whether the user is viewing the normal forecast or the weekend compare table.

#### Scenario: At least two cities pinned

- **WHEN** two or more cities are in the pinned list
- **THEN** the chip row is visible; each chip shows the city name, the pinned indicator, and a dismiss (×) button

#### Scenario: Exactly one city pinned

- **WHEN** exactly one city is in the pinned list
- **THEN** the chip row is visible and shows that city, but the dismiss (×) button is NOT rendered on the chip

#### Scenario: No cities pinned

- **WHEN** the pinned list is empty
- **THEN** the chip row is not rendered (no empty row placeholder)

#### Scenario: Chip dismiss button is accessible

- **WHEN** a screen reader navigates to a city chip's dismiss button (visible only when 2+ cities pinned)
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

The system SHALL render a weekend compare table when the toggle is active. The table SHALL have one column per pinned city (up to 5). Each column SHALL show forecast data for the upcoming Saturday and Sunday: high temperature (°C), low temperature (°C), precipitation probability (%), and the comfort score badge (value + color per `comfort-score` spec thresholds). If either Saturday or Sunday falls outside the 7-day forecast window for a city, that day's cell SHALL display "—" instead of data. While a column's forecast is loading, the cell area SHALL show a skeleton placeholder.

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

- **WHEN** the viewport is < 768 px wide and 2 or more cities are pinned
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
