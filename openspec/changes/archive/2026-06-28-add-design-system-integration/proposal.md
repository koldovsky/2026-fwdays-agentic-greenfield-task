# Proposal: Integrate the design system (C10)

## Why
Every screen of Bookshelf depends on the design system for its look. The DS source
lives in `docs/design-system/` but the Next app cannot consume it from there: it would
couple the build to `docs/`, and the components attach event handlers and so need Next's
`'use client'` boundary. We vendor (copy) the DS into the app and load its tokens, fonts,
and base resets globally.

## What changes
- Vendor DS components into `components/ds/<group>/<Name>`, prepending `'use client'`
  to each `.jsx` (they use `onClick`/`onChange`).
- Copy DS `styles.css` and `tokens/` into `app/design-system/`.
- Load `app/design-system/styles.css` (tokens + fonts + base resets) in the root layout,
  with `<html lang="en">`.
- Reduce `app/globals.css` to app-specific layout helpers (DS provides resets).
- Add a smoke test verifying a vendored DS `Button` renders with its `bs-button` class.

## Decision
Vendor (copy) the DS source rather than import from `docs/`. `docs/design-system/`
remains the source of truth; re-run the copy when it changes. The running app SHALL NOT
import from `docs/`.

## Impact
- Affected capabilities: `design-system-integration` (C10).
- Affected code: `components/ds/**`, `app/design-system/**`, `app/layout.tsx`,
  `app/globals.css`.
- Downstream capabilities (shelf, book page, forms, note editor) import DS components
  from `@/components/ds/<group>/<Name>`.
