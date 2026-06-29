# Design: Design-System Integration (C10)

## Approach
Vendor the DS into the app instead of importing from `docs/`. This decouples the build
from `docs/` and lets us add Next-specific adaptations.

## Layout
- `components/ds/<group>/<Name>.jsx` — copied from `docs/design-system/components/`.
  Each `.jsx` gets a `'use client'` directive prepended because the components attach
  event handlers (`onClick`/`onChange`), which require a client boundary in Next.
- `app/design-system/styles.css` + `app/design-system/tokens/**` — copied DS styling.
- `app/layout.tsx` imports `./design-system/styles.css` then `./globals.css`, and sets
  `<html lang="en">`.
- `app/globals.css` keeps only app-specific layout helpers (`main`, `.grid`,
  `.reading-column`) using DS tokens; DS `base.css` supplies the resets.

## Import surface
App code imports `@/components/ds/<group>/<Name>` (e.g. `@/components/ds/book/BookCard`).

## Re-vendoring
When `docs/design-system/` changes, re-run the copy + `'use client'` prepend loop.

## Testing
A jsdom smoke test renders the vendored `Button` and asserts the `bs-button` class,
confirming the vendored component resolves and renders.
