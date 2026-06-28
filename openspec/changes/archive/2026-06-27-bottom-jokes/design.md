## Context

The app shell (`app-shell`) already renders `<Footer />` at `app/components/Footer.tsx`. That component includes a `<div data-slot="footer" />` placeholder and the Open-Meteo / OpenStreetMap attribution links. The attribution links already satisfy BC-BRAND-02; they were added as part of the shell.

The `bottom-jokes` capability must fill the `data-slot="footer"` placeholder with a joke widget without restructuring the footer layout or duplicating the attribution.

`lib/i18n/uk.ts` already exports a `Strings` interface and the `uk` object. The `jokes` key must be added to both.

## Goals / Non-Goals

**Goals:**

- Add a `BottomJokes` client component that renders a day-seeded joke from `lib/i18n/uk.ts`.
- Extend `lib/i18n/uk.ts` (and `en.ts`) with at least 10 Ukrainian weather jokes.
- Mount `<BottomJokes />` inside the existing `data-slot="footer"` div in `Footer.tsx`.
- Zero hydration mismatch; zero new npm dependencies; zero external network calls.

**Non-Goals:**

- Changing the footer layout or attribution links (already done).
- Storing jokes in a database or fetching them remotely.
- Per-user joke preferences or history.
- Animations or transitions on the joke text (see `prefers-reduced-motion` constraint — keep it static text).

## Decisions

**Day-of-year seed, client component, `useEffect` hydration pattern**

The joke must be deterministic by calendar day and must not cause a hydration mismatch. Using `new Date()` in a server component would pick the server's current time, which would differ from the client's timezone or the time at the instant of hydration — causing a mismatch.

The `top-clock` capability solved the same problem by rendering an empty placeholder on first render, then filling it via `useEffect`. `BottomJokes` SHALL use the same pattern: render an empty `<span>` on first render, then set the joke in a `useEffect` after hydration.

The seed formula: `Math.floor((dayOfYear) % jokes.length)` where `dayOfYear` is derived from `new Date()` inside `useEffect`.

Alternative considered: a Server Component receiving a `joke` prop computed at request time. Rejected because it requires prop drilling through layout or context, complicates the shell, and still requires a `suppressHydrationWarning` workaround for timezone differences.

**Jokes stored as an array in `lib/i18n/uk.ts`**

Keeping jokes co-located with all other UI strings satisfies NFR-I18N-01 and TC-PURE-01. The `Strings` interface gains a `jokes: string[]` field. `en.ts` provides English equivalents so the Strings contract does not break.

**Mount point: replace the empty `<div data-slot="footer">` in `Footer.tsx`**

`Footer.tsx` already has the correct slot. `BottomJokes` replaces the empty `<div>` — it becomes the rendered child of that slot. No layout change needed.

## Risks / Trade-offs

- **Day boundary flicker**: if the user keeps the page open past midnight the joke does not refresh until the next page load. This is acceptable — the requirement is deterministic display, not live updates.
- **Rotation exhaustion**: with fewer jokes than days in a year, jokes repeat. Minimum 10 jokes keeps repetition low for casual use; the array can be extended at any time.

## Open Questions

None — implementation is fully specified.
