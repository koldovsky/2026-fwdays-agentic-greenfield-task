## MODIFIED Requirements

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
