# DESIGN.md

Front-end design brief for **mytv**. Companion to `AGENTS.md` (project rules) and `docs/product-brief.md` (product vision).

The design language is provided by the **Orbit TV Remote design system**, shipped in-repo at `docs/orbit-tv-remote-design-system/`. This file explains how that system is wired into the app and the rules the front-end must follow. Full DS documentation lives in `docs/orbit-tv-remote-design-system/readme.md`.

## Style at a glance

- **Neumorphism (soft UI).** One flat surface color for background, cards, and buttons. Depth comes from paired raised/inset drop shadows, never from a different fill color, gradient, or border.
- **Two themes, one palette shape.** Light default (`--base-100: #e0e5ec`); dark via `[data-theme="dark"]` on `<html>` (`--base-100: #2b2f38`). Same token names in both.
- **Accent: warm orange.** `--accent: #ff8a3d`. Reserved for **one** primary action per screen and live/active states — nothing else.
- **Typography: Montserrat only.** Weight (400–800) and letter-spacing carry hierarchy more than dramatic size jumps. Overline labels uppercase with `--tracking-overline`. Numbers share the same family — no monospace secondary face.
- **Icons: Material Symbols Rounded only.** Self-hosted (see Wiring below, not loaded from Google Fonts at runtime). Rendered with `<span className="material-symbols-rounded">icon_name</span>`. No emoji, no custom SVGs, no logo.
- **Copy.** English, sentence case, second person ("Your TVs", "Add a TV", "Connect"). Button labels 1–3 words. Helper text one sentence. Overlines uppercase and wide-tracked ("LOCAL NETWORK").

## Wiring

- **Alias.** `@ds` → `docs/orbit-tv-remote-design-system/`, configured in `front-end/vite.config.ts` and `front-end/tsconfig.app.json`.
- **Skill symlink.** `.claude/skills/orbit-tv-remote-design` → the same directory, so agents can load the DS as a skill.
- **Global stylesheet.** `front-end/src/index.css` imports every DS token file (`colors`, `typography`, `spacing`, `shadows`, `base`) individually — **except** `@ds/tokens/fonts.css`, which `@import`s Montserrat and Material Symbols Rounded live from Google Fonts. That would require internet access at runtime, which violates this app's "no cloud, no internet required" rule (`AGENTS.md`, `docs/product-brief.md`). Instead, `front-end/src/fonts.css` declares the same two font families via `@font-face` pointing at woff2 files vendored into `front-end/public/fonts/` (Montserrat 400/500/600/700/800 latin subset, Material Symbols Rounded). The `body` uses `var(--base-100)`, `var(--fg-1)`, and `var(--font-sans)` — nothing hard-coded.
- **Type shims.** `front-end/src/ds.d.ts` declares the `@ds/components/**/*.jsx` module exports. Extend it when the app imports a new DS primitive.
- **Serving.** The Fastify back-end serves the compiled SPA (`front-end/dist/`) at `/` on the same origin as the API and WebSocket — the whole product lives at `http://mytv.local/`. Front-end HTTP calls use relative paths (`/api/…`, `/ws`); never hard-code a host or a separate port. In dev, `npm run front:dev` runs Vite with HMR and proxies `/api` + `/ws` to the back-end.

## Component surface

Import primitives directly by filename, always with an explicit `.jsx` extension:

```ts
import { Button } from '@ds/components/core/Button.jsx'
import { DeviceCard } from '@ds/components/core/DeviceCard.jsx'
import { IconButton } from '@ds/components/core/IconButton.jsx'
import { Badge } from '@ds/components/core/Badge.jsx'
import { Input } from '@ds/components/forms/Input.jsx'
import { Slider } from '@ds/components/forms/Slider.jsx'
import { DPad } from '@ds/components/controls/DPad.jsx'
import { AppShortcut } from '@ds/components/controls/AppShortcut.jsx'
import { Modal } from '@ds/components/feedback/Modal.jsx'
```

| Group    | Component      | Purpose                                                      |
| -------- | -------------- | ------------------------------------------------------------ |
| core     | `Button`       | Primary/secondary/ghost action button, 3 sizes               |
| core     | `IconButton`   | Circular icon-only button (D-pad, transport, power, volume)  |
| core     | `Card`         | Base neumorphic surface (raised or inset)                    |
| core     | `Badge`        | Status pill — `online` / `offline` / `connecting`            |
| core     | `DeviceCard`   | Device-list row (composes Card + Badge)                      |
| forms    | `Toggle`       | On/off switch                                                |
| forms    | `Input`        | Inset text field (IP address entry)                          |
| forms    | `Slider`       | Groove slider (volume/brightness)                            |
| controls | `DPad`         | Directional pad — 4 arrows + centre OK                       |
| controls | `AppShortcut`  | Square app-shortcut tile                                     |
| feedback | `Modal`        | Centered dialog on blurred scrim (Add-TV flow)               |

`docs/orbit-tv-remote-design-system/ui_kits/tv-remote/` ships a two-screen click-through demo (Device List ↔ Remote). The `.jsx` files there attach to `window.*` for the standalone HTML — read them for reference layouts, but **do not import them** in the app. Compose the screens from primitives instead (see `front-end/src/App.tsx`).

## Tokens you'll actually use

Full catalog in `docs/orbit-tv-remote-design-system/tokens/`.

- **Surfaces**: `--base-100` (resting), `--base-200` (recessed rows/tracks), `--base-300` (deep wells).
- **Text**: `--fg-1` (primary), `--fg-2` (secondary), `--fg-3` (tertiary / placeholder / overline).
- **Accent**: `--accent`, `--accent-strong`, `--accent-soft`, `--accent-wash`, `--fg-on-accent`.
- **Status**: `--online`, `--offline`, `--connecting` (plus `-wash` variants for tinted backgrounds).
- **Shadows**: `--nm-raised-sm | -md | -lg`, `--nm-inset-sm | -md`, `--nm-raised-accent` (for primary buttons only), `--nm-focus-ring`.
- **Radius**: `--radius-sm` (12) / `--radius-md` (18) / `--radius-lg` (26) / `--radius-xl` (32) / `--radius-full`.
- **Spacing**: `--space-1` … `--space-16` on a 4px grid.
- **Type**: `--font-sans`, `--text-caption` (11) → `--text-display` (40); weights `--weight-regular` … `--weight-extrabold`; `--tracking-overline` for uppercase labels.

## Rules the front-end must follow

1. **Prefer DS primitives.** If a needed primitive is missing, extend the DS (same shadow system, same token vocabulary), don't inline styles or reach for a UI library.
2. **Never hard-code palette or shadow strings.** Always go through tokens.
3. **One accent per screen.** Warm orange marks the single primary CTA (Add a TV / Connect / Power) plus live/active states. Everything else is neutral neumorphic.
4. **No borders, gradients on backgrounds, glass/blur, or images.** The `ghost` button hairline, the 2px error ring on inputs, and the Modal scrim's `backdrop-filter` are the only exceptions.
5. **Circular buttons for remote-like actions** (D-pad arrows, power, volume, transport). Rectangular pill for text CTAs.
6. **Icons via Material Symbols Rounded only.** No emoji, no ad-hoc SVGs. No logo — render the product name in Montserrat type.
7. **English copy, sentence case, second person, 1–3 word button labels.**
8. **Dark mode ships free** via `[data-theme="dark"]`. Do not fork or override it.

## Two-screen product

Per the product brief, the whole app is two screens:

1. **Device list** — `DeviceCard` per discovered TV (name, model, IP, `Badge` status). Primary CTA "Add a TV" opens a `Modal` with an `Input` for a manual IP entry.
2. **Remote** — header (`IconButton` back + name/IP + `Badge`), `AppShortcut` row, `DPad`, transport `IconButton` row, `Slider` for volume with a mute `IconButton`, accent `IconButton` power.

`front-end/src/App.tsx` is the current composition of both screens from DS primitives.

## Verification

Before claiming a UI task is done:

- `npm run front:build` from the repo root passes.
- `npm run front:dev` — open the app in a browser and eyeball the affected screen. Neumorphic surfaces regress silently in TS/lint; visuals must be checked by eye.
- Toggle dark mode (set `<html data-theme="dark">` in devtools) and confirm the affected screen still reads correctly.
