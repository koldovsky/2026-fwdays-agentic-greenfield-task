## Context

This capability turns the pure core and settings into something a person sees. It owns
the Next.js App Router layout, the navigation, and the signature breathing ring described
in DESIGN.md. The repo runs a modified Next.js — the App Router guide in
`node_modules/next/dist/docs/` must be read before writing route/layout code (AGENTS.md).

## Goals / Non-Goals

**Goals:**
- One calm shell hosting three views (main / Settings / Stats) with quiet nav.
- A reusable `BreathingRing` component: SVG `<circle>` arc via `stroke-dasharray`/`offset`,
  breathing as a wrapper `transform: scale()`.
- Tokens wired through `@theme` in `globals.css`; Fraunces + Inter via `next/font/google`.
- Accessibility and reduced-motion built in from the start.

**Non-Goals:**
- No new scheduling logic (consumes `reminder-engine`).
- No notification firing (that's `notify`) and no Stats chart internals (that's `stats`).

## Decisions

- **Ring math in a tiny pure helper.** Compute the elapsed fraction from the engine's next-reminder
  time and the interval; keep the SVG dumb. Rationale: testability and TC-PURE-01. Alternative
  (fraction computed inside the component) rejected.
- **Breathing on a wrapper transform**, arc on the inner `<circle>`, so the dash math stays clean
  (DESIGN.md). `motion-reduce:` Tailwind variants gate the pulse (NFR-MOTION-01).
- **Client component for the live countdown** (a single interval tick re-renders the ring); the
  tick supplies `from` to the engine — `lib/` never reads the clock.
- **Nav is "quiet":** minimal, low-contrast-until-focus controls; visible focus rings meet WCAG AA
  (NFR-A11Y-01/02). No `signal` color anywhere except the due state.

## Risks / Trade-offs

- [Interval ticking causes excess re-renders] → tick at a coarse cadence (e.g. 1s) and memoize the arc.
- [SSR/hydration mismatch from time] → render the countdown client-side after mount.
- [Type scale jitter] → `tabular-nums` on the countdown; bounded type steps, no viewport scaling (DESIGN.md).

## Open Questions

- Confirm whether nav is a bottom bar or a header on mobile — either satisfies "quiet"; default to
  a minimal bottom nav for thumb reach.
