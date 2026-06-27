# Design System — Pause / Break Reminder

The product's visual identity, codenamed **Still Water**. This file is the source
of truth for the look; `requirements.md` governs behavior and `AGENTS.md` governs
agent rules. Build from the tokens below — do not hardcode raw hex in components.

## Brand

- Product name: **Pause**.
- The emotional job is *relief, not pressure*. A break reminder is permission to
  stop, not a productivity tracker — no streaks, no guilt (BC-CALM-01).
- Lead with calm. The single warm moment in the whole app is the instant a break
  is due; everything else stays quiet.
- Copy is calm and plain, second person where natural, no exclamation marks.

## Foundations

Tokens are defined as Tailwind v4 theme variables in `app/globals.css` via the
`@theme` directive (TC-STACK-02), which also generates the matching utilities
(`bg-bg`, `text-ink`, `bg-accent`, `font-display`, …):

```css
@import "tailwindcss";

@theme {
  --color-bg:      #EEF1F0; /* app background — soft mist */
  --color-surface: #FFFFFF; /* cards, sheets */
  --color-ink:     #16201C; /* primary text — deep forest near-black */
  --color-muted:   #5E6E66; /* secondary text, labels */
  --color-accent:  #2F7A6B; /* primary — deep teal, used with restraint */
  --color-signal:  #E8915B; /* warm clay — ONLY the active "break is due" state */

  --font-display: var(--font-fraunces);
  --font-sans:    var(--font-inter);
}
```

- The palette is cool, low-saturation, deliberately not the warm-cream-and-serif
  default. `--color-signal` is forbidden anywhere except the due-break state (ring
  fill, notification card, the primary button in that moment).
- Light theme only in the MVP. Focus rings must stay visible and meet WCAG AA
  (NFR-A11Y-01/02).

## Typography

- Display: **Fraunces** via `next/font/google`, exposed as `--font-fraunces`
  (mapped to `--font-display`). Used with restraint for the big countdown and the
  few headlines.
- Body / UI: **Inter** via `next/font/google`, exposed as `--font-inter` (mapped
  to `--font-sans`). Everything else.
- The countdown uses `tabular-nums` so digits don't jitter as they tick.
- Do not scale font size with viewport width; use bounded type steps.

## Layout

- Single-focus, centered, one job per screen. The breathing ring owns the first
  screen; Settings and Stats are separate calm views in the same palette.
- Mobile-first (FR-SHELL-02); generous whitespace is the point — let the ring
  breathe.
- Cards use `rounded-2xl`; the ring and primary buttons are fully round. No hard
  newspaper edges.

## Motion & signature

- **Signature element — the breathing ring.** A large circular progress ring
  showing time until the next break. Idle: stroke in `accent`, progress arc shows
  the elapsed fraction, with a slow ~6 s scale "breathing" pulse and the countdown
  centered inside in the display face. Due: the ring fills with `signal` and the
  breathing slows to one long exhale — the one warm moment. Disabled: `muted`, no
  pulse.
- Implement the arc as an SVG `<circle>` with `stroke-dasharray`/`stroke-dashoffset`;
  put the breathing on a wrapper `transform: scale()` so the arc math stays clean.
- All motion respects `prefers-reduced-motion` (Tailwind `motion-reduce:`):
  pulse and grow-ins disabled, only instantaneous state changes remain
  (NFR-MOTION-01).

## Assets

- App icons and any brand SVGs live in `public/brand/` and feed the PWA manifest
  (FR-PWA-01).
- Stats chart: `accent` for "done", a muted tone for "snoozed" — never `signal`.
