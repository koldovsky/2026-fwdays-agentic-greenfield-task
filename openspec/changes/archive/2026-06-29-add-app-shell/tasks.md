## 1. Design tokens & fonts

- [x] 1.1 Define Tailwind 4 `@theme` color tokens for the parchment palette (canvas ≈ `#F0EEE9`,
      raised surface, primary forest/olive action, warm near-black text, muted secondary, status green),
      validating final hex against `doc/web/01` and `doc/web/02`
- [x] 1.2 Self-host Newsreader (display) and Literata (reading) woff2 with `font-display: swap`; wire
      a serif-display, serif-reading, and monospace font token; subset to used weights
- [x] 1.3 Define spacing/radius/elevation tokens matching the maket's calm, generous spacing

## 2. UI primitives

- [x] 2.1 Build chip/pill, card, primary/secondary button, toggle, progress bar, segmented control,
      stepper, and status-dot components in `src/app/components/`, each matched to its `doc/web/` use
- [x] 2.2 Vitest component tests asserting each primitive renders its variants/states

## 3. App shell & routing

- [x] 3.1 Build the sidebar layout (wordmark, Home/Library/Search/Downloads-with-badge, Sources region
      with status dots + monospace descriptors + "Add source", Extensions/Settings footer) per
      `doc/web/01` and `doc/web/06`
- [x] 3.2 Wrap `<RouterView>` in the sidebar layout; render the reader route full-bleed (no sidebar)
- [x] 3.3 Extend the router with library, book detail, reader (`/reader/:sourceId/:bookId/:mediaType`),
      and settings (extensions/reading/general) routes; placeholder views are acceptable
- [x] 3.4 Add global loading and empty-state components, including the empty-library state

## 4. PWA shell

- [x] 4.1 Add the web manifest (name, icons, theme/background colors from tokens) and wire
      `vite-plugin-pwa` `injectManifest`
- [x] 4.2 Implement `sw.ts` to precache the app shell and **denylist** book-byte/range routes so `206`
      reads bypass the SW (ADR-005)
- [x] 4.3 Test: app-shell renders from precache offline; a `206` range request bypasses the SW

## 5. Verification (maker ≠ checker)

- [x] 5.1 `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` all green
- [x] 5.2 Playwright visual smoke: capture the shell + Library route and compare composition against
      `doc/web/01-library-desktop.png` and the chrome in `doc/web/06-extensions-desktop.png`
- [x] 5.3 Independent review pass (`/code-review` or a separate agent) on the diff; address findings
- [x] 5.4 `openspec validate add-app-shell --strict` passes
