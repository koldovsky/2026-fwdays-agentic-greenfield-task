# Manual Test Plan — Weather Explorer MVP

Environment: Chrome (latest), `http://localhost:3000`, network available for Open-Meteo/Nominatim/OSM.

| ID | Requirement focus | Steps | Expected result |
|---|---|---|---|
| TC-01 | FR-SHELL-03 | Open home page with empty URL | Hero + search visible; no city pre-selected; footer joke + credits |
| TC-02 | FR-SHELL-02 | Resize to 375 px width | Single-column layout; content readable without horizontal scroll |
| TC-03 | FR-CLOCK-01 | Observe header for one minute | Local time visible with accessible name; minute tick updates |
| TC-04 | FR-SEARCH-01/02 | Type `Львів` in search | Debounced suggestions with city, region, country |
| TC-05 | FR-SEARCH-03 | Select a suggestion | URL shows `?lat=&lon=&name=`; active city shown under search |
| TC-06 | FR-SEARCH-04 | Type unique query with one result; press Enter | City auto-selected |
| TC-07 | FR-SEARCH-05 | Type `zzzznotacity` | Inline «Нічого не знайдено»; no toast |
| TC-08 | FR-FORECAST/COMFORT | With city selected, wait for forecast | 7 day cards, comfort badges, weekend strip, 48h chart, sun times |
| TC-09 | FR-FORECAST-05 | Switch to another city | Forecast refreshes; prior panel not blanked entirely on error |
| TC-10 | FR-SHELL-02 | At 1280 px width | Three-column layout regions visible |
| TC-11 | FR-MAP-01/04/05 | With city selected | Map tiles load; OSM attribution bottom-right; skeleton gone |
| TC-12 | FR-MAP-03 | Click map away from marker | Location updates; forecast refetches |
| TC-13 | FR-ANIM-01/04 | With city selected | Sky background visible; search/map remain clickable |
| TC-14 | FR-ANIM-03 | Enable «Emulate CSS prefers-reduced-motion: reduce» in DevTools; reload | Gradient only; no obvious particle motion |
| TC-15 | FR-COMPARE | Pin city; enable «Порівняти вихідні» | Compare table with Sat/Sun rows; make active works |
| TC-16 | FR-JOKES-01 | Read footer | Ukrainian weather joke; Open-Meteo and OSM links open in new tab |

Pass criteria: all steps match expected results; console shows no errors on happy path.
