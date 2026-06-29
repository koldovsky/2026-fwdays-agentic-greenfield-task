# Tasks: Design-System Integration (C10)

- [x] Copy DS `styles.css` + `tokens/` into `app/design-system/`
- [x] Copy DS components into `components/ds/` and prepend `'use client'` to each `.jsx`
- [x] Replace `app/layout.tsx` to load DS styles + globals with `<html lang="en">`
- [x] Reduce `app/globals.css` to app-specific layout helpers using DS tokens
- [x] Add `components/ds/ds-smoke.test.tsx`
- [x] Run smoke test (`npx vitest run components/ds/ds-smoke.test.tsx`) — PASS
