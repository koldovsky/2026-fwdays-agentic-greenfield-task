## 1. Layout components

- [x] 1.1 Create `src/components/layout/TopBar.tsx` — Server Component with `<header role="banner">`, wordmark link to `/`, sticky + backdrop-blur styling using DS tokens
- [x] 1.2 Create `src/components/layout/Footer.tsx` — Server Component with `<footer>` and "Data from PokéAPI" hyperlink to `https://pokeapi.co`

## 2. Root layout wiring

- [x] 2.1 Update `app/layout.tsx` to render `<TopBar />` above `<main>` and `<Footer />` below, wrapping `{children}` in the responsive content container
- [x] 2.2 Add the responsive grid container `<div>` with `max-w-[var(--container-max)]`, `mx-auto`, `px-[var(--gutter)]` breakpoint classes inside `<main>`

## 3. Placeholder page

- [x] 3.1 Replace `app/page.tsx` placeholder content with a minimal stub (e.g. empty `<div>` or "coming soon" text) so the shell renders without errors — will be fully replaced by the pokemon-list capability

## 4. Verification

- [x] 4.1 Run `tsc --noEmit` — no type errors
- [x] 4.2 Run `npm run build` — compiles clean
- [x] 4.3 Start dev server and confirm: top bar visible, footer visible, wordmark links to `/`, PokéAPI link present
- [x] 4.4 Resize viewport — confirm single column below 768 px, multi-column at 1280 px+
- [x] 4.5 Tab through the page — confirm focus styles visible on wordmark and footer link (NFR-A11Y-01)
