---
name: frontend-design-check
description: Front-end design gate for mytv. Load BEFORE editing anything under `front-end/**` — any `.tsx`, `.jsx`, `.ts`, `.css`, or `.html` file in the SPA, including `App.tsx`, `index.css`, `index.html`, and Vite/tsconfig. Enforces the rule that all front-end work goes through the Orbit design system and `DESIGN.md`. Do NOT load for `back-end/**`, `docs/**`, `.claude/**`, root configs, or design-system source under `docs/orbit-tv-remote-design-system/**` (the DS itself does not need to check itself).
---

# Front-end design check

Your job before touching the front-end: **consult the design system first, then act**. This skill is a gate, not a cheat sheet — the substance lives in the Orbit DS and `DESIGN.md`.

## Before you edit any `front-end/**` file

1. **Load the `orbit-tv-remote-design` skill** (invoke it or read `docs/orbit-tv-remote-design-system/SKILL.md` + `readme.md`). Do this even for what looks like a small tweak — token names, accent policy, and component APIs are not memorable.
2. **Read `DESIGN.md`** at the repo root. It documents how the DS is wired into this app (alias, shim, imports) and the rules the front-end must follow. `AGENTS.md` has the shorthand.
3. **Locate the existing DS primitive** for what you're about to build. Check `docs/orbit-tv-remote-design-system/components/{core,forms,controls,feedback}/` and the demo screens in `ui_kits/tv-remote/*.jsx` for composition patterns. If a primitive is missing, extend the DS in the same shadow/token vocabulary — do not inline styles or reach for a UI library.

If you skip these steps, you will silently break the neumorphic surface (wrong shadow strings, wrong tokens, accent misused, wrong font, emoji leaked in). Neumorphism regressions do not surface in TS or lint.

## The rules (short form — canonical version is `DESIGN.md`)

- **DS primitives only.** Import with explicit `.jsx`: `import { Button } from '@ds/components/core/Button.jsx'`. Add the new module to `front-end/src/ds.d.ts` when you import a primitive that isn't shimmed yet.
- **Tokens only.** `var(--base-100)`, `var(--fg-1)`, `var(--accent)`, `var(--nm-raised-md)`, `var(--nm-inset-sm)`, `var(--radius-md)`, `var(--font-sans)`, `var(--space-*)`, etc. Never hard-code hex, shadow strings, or font names.
- **One accent per screen.** Warm orange = the single primary CTA plus live/active states. Nothing else.
- **No borders, no gradients on backgrounds, no glass/blur, no images.** Exceptions: `ghost` button hairline, 2px input error ring, Modal scrim `backdrop-filter`.
- **Circular buttons** for remote-like actions (D-pad, transport, power, volume). Pill for text CTAs.
- **Icons via Material Symbols Rounded only.** `<span className="material-symbols-rounded">icon_name</span>`. No emoji, no ad-hoc SVGs, no logo.
- **Type: Montserrat everywhere**, weight and tracking carry hierarchy. No monospace secondary face for numbers.
- **Copy: English, sentence case, second person, 1–3 word buttons.** Overlines uppercase with `--tracking-overline`.
- **Dark mode is free** via `[data-theme="dark"]` on `<html>`. Do not fork or override it.

## Do NOT import

- `@ds/ui_kits/tv-remote/*.jsx` — those attach to `window.OrbitTVRemoteDesignSystem_08e5b7` for the standalone HTML demo and are not consumable as ES modules. Read them for reference layouts, compose the app from `@ds/components/**` primitives instead.

## Verification before reporting done

- `npm run front:build` from the repo root passes (typecheck + Vite build).
- `npm run front:dev` — open in a browser and eyeball the affected screen. Neumorphic surfaces regress silently in TS and lint; a build alone does not prove UI correctness.
- Toggle dark mode in devtools (`document.documentElement.dataset.theme = 'dark'`) and confirm the screen still reads correctly.

## When this skill does NOT apply

- Back-end work under `back-end/**` — load `samsung-ip-control-protocol` instead.
- Editing DS source under `docs/orbit-tv-remote-design-system/**` — the DS defines the rules, it does not consume them.
- Docs, root configs, `.claude/**`, `package.json`, CI files.
