# Add Shell

## Why

The repository still renders the default create-next-app page. The Weather
Explorer MVP needs a visible Ukrainian-first shell before search, forecast, map,
or comfort badges can be integrated (`FR-SHELL-01` … `FR-SHELL-03`).

## What Changes

- Replace the starter home page with a Weather Explorer top bar, main region,
  empty-state hero, and placeholder panels.
- Add shell copy as framework-free data under `lib/shell/`, backed by unit tests.
- Apply Sky Calm visual tokens and responsive layout breakpoints from `DESIGN.md`.

## Impact

- Affected specs: `shell`
- Affected code: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`,
  `lib/shell/`
- Dependencies: none
- Explicit non-goals: geocoding, forecast fetch, map rendering, comfort badge UI
