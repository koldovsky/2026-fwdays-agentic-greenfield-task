// English fallback strings (NFR-I18N-01). English appears only as small system
// labels in the product; this file exists for parity and future fallback use.
// Typed against `Strings` so it stays in lock-step with `uk.ts`.
// Plain object only — `lib/` stays framework-free (TC-PURE-01).

import type { Strings } from "./uk";

export const en: Strings = {
  app: {
    name: "Надворі",
    tagline: "Weather Explorer",
  },
  theme: {
    light: "Light theme",
    dark: "Dark theme",
    toggle: "Toggle theme",
  },
  hero: {
    heading: "Where to go this weekend",
    subcopy:
      "Find a city and see whether it will be pleasant outside. One comfort index instead of five numbers.",
  },
  regions: {
    clock: "Local time",
    search: "City search",
    forecast: "Weather forecast",
    footer: "Footer",
    map: "Interactive map",
  },
  search: {
    placeholder: "Find a city",
    label: "City search",
    nothingFound: "Nothing found",
  },
  footer: {
    dataPrefix: "Data",
    mapPrefix: "Map",
    openMeteo: "Open-Meteo",
    osm: "OpenStreetMap",
  },
  forecast: {
    sunrise: "Sunrise",
    sunset: "Sunset",
    hourlyChartLabel: "Temperature over the next 48 hours",
    precipLabel: "Precip",
    windLabel: "Wind",
    loadingError: "Could not load forecast",
    highLabel: "high",
    lowLabel: "low",
  },
  comfort: {
    good: "Conditions are pleasant — a fine day to be outside.",
    cold: "Feels cold — dress warmly.",
    hot: "Very hot — stay in the shade.",
    rainy: "High chance of rain — bring an umbrella.",
    windy: "Strong wind — hold onto your hat.",
    badgeLabel: "Comfort",
    weekendLabel: "Weekend",
  },
  map: {
    ariaLabel: "Interactive map — click to select a location",
    reverseError: "Could not identify that location — please try again",
  },
  compare: {
    toggle: "Compare weekend",
    pin: "Pin",
    unpin: "Unpin",
    saturday: "Saturday",
    sunday: "Sunday",
    makeActive: "Make active",
    noData: "—",
    pinnedListLabel: "Pinned cities",
  },
  jokes: [
    "Forecasters promised sun again — bring an umbrella.",
    "If clouds gathered over the city, they are probably looking for wifi too.",
    "The wind changed direction — apparently it does not know where it is going either.",
    "Snow in April — nature is testing your resilience.",
    "It has been raining for three days, but the forecast says 'variable'.",
    "Fog so thick even the compass had second thoughts.",
    "The frost nips your cheeks — you left without a hat again.",
    "Heat plus humidity — this is not summer, this is a steam room.",
    "The storm arrived at exactly 18:00, same as every day this month.",
    "Overcast but no precipitation — classic Ukrainian suburbs.",
    "Morning frost turned the grass into a silver carpet.",
    "A rainbow after the rain — nature apologising for yesterday.",
  ],
};
