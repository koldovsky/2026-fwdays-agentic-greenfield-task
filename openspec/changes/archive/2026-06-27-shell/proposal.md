## Why

The app currently has no UI — `app/page.tsx` is the default Next.js placeholder. Before any product screen can be built, the app-wide layout foundation (topbar, content area, footer, responsive grid) must exist. This is the prerequisite for every subsequent capability.

## What Changes

- Replace `app/page.tsx` placeholder with the real shell layout
- Add a persistent top bar with the app wordmark
- Add a footer crediting PokéAPI
- Wire up responsive grid breakpoints (1 → 2 → 3 → 4 columns at 768 / 1024 / 1280 px)
- Apply DS global typography and background via the already-integrated token layer

## Capabilities

### New Capabilities

- `app-shell`: Top bar, main content area, footer, responsive grid container — satisfies FR-SHELL-01, FR-SHELL-02, BC-BRAND-01, BC-BRAND-02

### Modified Capabilities

_(none — first implementation, no existing specs)_

## Impact

- `app/page.tsx` — replaced (currently the CRA placeholder)
- `app/layout.tsx` — may receive minor updates (already has fonts wired)
- New shared layout components under `src/components/` (topbar, footer)
- No API changes, no new dependencies
