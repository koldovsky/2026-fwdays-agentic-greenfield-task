## Why

The app shell has a footer area that currently renders nothing. Delivering deterministic Ukrainian weather-themed jokes in that footer fulfills FR-JOKES-01 and BC-BRAND-02 — adding personality to the product while keeping the promise of zero external APIs, zero tracking, and a calm Ukrainian-first voice.

## What Changes

- Add a `FooterJokes` client component that cycles through a curated list of Ukrainian weather-themed jokes from `lib/i18n/uk.ts`.
- Jokes are deterministic (seeded by the day of year so the same joke shows all day, changes overnight) — no randomness on render, no external fetch.
- Footer also renders Open-Meteo and OpenStreetMap attribution hyperlinks per BC-BRAND-02.
- Component is mounted in the existing app-shell footer slot defined by `app-shell`.

## Capabilities

### New Capabilities

- `bottom-jokes`: Footer widget showing deterministic Ukrainian weather jokes and data-source attribution links (Open-Meteo, OpenStreetMap).

### Modified Capabilities

<!-- No existing specs require behavior changes for this capability. -->

## Impact

- **New files:** `components/BottomJokes.tsx`, strings added to `lib/i18n/uk.ts` (and `lib/i18n/en.ts`).
- **Modified files:** `app/layout.tsx` or footer slot component in the app shell — mounts `<BottomJokes />`.
- **No new dependencies:** purely static string data; no network calls.
- **Bundle impact:** negligible — small component with inline string array.
