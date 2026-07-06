## 1. Copy

- [x] 1.1 Add `landing.eyebrow/headline/sub` to `lib/strings.ts`; re-word
  `modeStats`→"Explore", `modeBattle`→"Compare", `fightAction`→"Compare"

## 2. Layout

- [x] 2.1 Center the hero in `app/page.tsx`: eyebrow (italic serif) + display
  headline + standfirst, all centered
- [x] 2.2 Rework `LandingForm`: centered mode toggle; inline input + primary "→"
  submit (Explore row; Compare = two inputs over a full-width submit); drop visible
  labels for `sr-only`/`aria-label`; active tab text = `text-bg`
- [x] 2.3 Fix latent type-scale wiring: map `--text-*` sizes into `@theme inline`
  in `globals.css` so `text-display`/`text-h1/h2`/`text-stat`/`text-caption`
  actually emit font-size utilities (headings were reset to body size by preflight)

## 3. Verify

- [x] 3.1 Run the gate: `npm run lint && tsc --noEmit && npm test && npm run build`
- [x] 3.2 Confirm visually: centered hero, inline Explore row, Explore/Compare
  tabs, validation/navigation still work
