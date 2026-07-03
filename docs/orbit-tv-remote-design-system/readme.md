# Orbit TV Remote — Design System

## Overview

A design system for a **local-network TV remote control UI** — a lightweight service that discovers smart TVs on the same network and lets a user browse to a full remote control for any of them. Two screens define the whole product:

1. **Device list** — TVs found on the local network, shown as a list; each row shows a TV icon and metadata (name, model, IP, online/offline status). Users can also add a TV manually by entering its IP address.
2. **Remote control** — the control surface for one paired TV: directional pad, volume, power, home/menu, and a row of app shortcuts.

Visual language: **Neumorphism (soft UI)** — a single flat background color, with all depth expressed through paired light/dark drop shadows (raised = extruded, inset = recessed). Typeface: **Montserrat** throughout.

**Sources.** This design system was built from scratch, from a text brief only — no Figma file, codebase, or existing brand assets were attached. There is no existing logo or brand mark; none has been invented (see Iconography). If a codebase, Figma link, or brand kit becomes available, re-run this process against it and it should supersede the choices below.

## Content fundamentals

- **Tone**: plain, utilitarian, calm. This is a control surface, not a marketing surface — copy stays out of the way of the task.
- **Address**: second person ("Your TVs", "Add a TV") — never first person ("My TVs").
- **Casing**: sentence case for all UI copy and buttons ("Add a TV", not "Add A TV" or "ADD A TV"). Section labels/overlines are the one exception — uppercase with wide letter-spacing (e.g. "LOCAL NETWORK", "NEARBY DEVICES") to read as quiet metadata, not shouting.
- **Length**: short. Button labels are 1-3 words ("Add a TV", "Connect", "Cancel"). Helper text is one sentence.
- **Emoji**: none. Status and actions are communicated with color + Material Symbols icons, never emoji.
- **Numbers/technical values** (IP addresses, model names) are shown verbatim in a slightly muted, smaller weight — they're metadata, not headline content.

## Visual foundations

- **Color**: one neumorphic base surface (`--base-100`, `#e0e5ec` light / `#2b2f38` dark) that background, cards, and buttons all share — there is no separate "card color". Depth comes entirely from shadow, not from a different fill. Warm orange (`--accent`, `#ff8a3d`) is the single accent, reserved for the primary action per screen (Add a TV, Connect, Power) and live/active states. Semantic status colors (online green, offline gray, connecting amber) are desaturated and used only as small dots/pills, never as large fills.
- **Type**: Montserrat only, one family for everything. Hierarchy comes from weight (400→800) and letter-spacing more than dramatic size jumps — sizes step gently from 11px captions to a rare 40px display size. Overline labels are uppercase with wide tracking (0.12em).
- **Spacing**: 4px base unit, scale at 4/8/12/16/20/24/32/40/48/64. Generous padding throughout — neumorphic shadows need room to resolve, so nothing sits tight against an edge.
- **Backgrounds**: flat color only. No images, gradients, patterns, or textures on backgrounds — the entire depth system is shadow-based, and any texture would visually compete with it. The one gradient in the system is inside the accent button/thumb fill (a subtle 145° two-stop orange gradient), never on backgrounds.
- **Shadows (the core system)**: every raised surface uses a paired shadow — a dark shadow (`#a3b1c6` light / near-black dark) offset down-right, and a light highlight (`#ffffff` light / lighter gray dark) offset up-left, same blur/offset, on the *same* background color as its surroundings. Inset variant reverses both to `inset`, used for wells (search fields, sliders, toggle tracks) and the pressed/active state of any button. Three raised sizes (sm/md/lg) scale offset+blur together; there's no "shadow color scale" — only two shadow colors total, reused everywhere including dark mode (which gets its own dark-mode pair).
- **Radius**: soft and generous — 12/18/26/32px, plus full-round for circular icon buttons, the theme toggle, and the D-pad housing. Nothing in the system uses a hard 0 or 4px corner.
- **Borders**: essentially unused. Neumorphism communicates edges via shadow, not stroke — the one exception is the `ghost` button variant (a thin 1px hairline, for a rare low-emphasis action) and a 2px solid ring on input error state.
- **Animation**: minimal and physical, not decorative. Buttons/icon-buttons scale down slightly (0.96–0.98) and flip from raised to inset shadow on press — mimicking a physical button being pushed into a soft surface. Toggle thumbs and slider fills transition over 150–200ms ease. No entrance animations, no bounces, no looping motion — a static control surface earns trust by being predictable.
- **Hover states**: subtle. DeviceCard rows lift 2px and deepen their shadow on hover (translateY + larger raised shadow) to read as "liftable/tappable" — no color change. Most controls have no distinct hover state beyond a pointer cursor; the meaningful state transition is press (raised→inset), since this is primarily a touch/click-and-release interaction model.
- **Press states**: shadow inversion (raised → inset) is the primary feedback, plus a slight scale-down. This is the signature neumorphic interaction and is used consistently across Button, IconButton, and AppShortcut.
- **Transparency/blur**: used exactly once — the Modal scrim (`rgba(30,34,40,0.35)` + `backdrop-filter: blur(3px)`) to focus attention on the Add-TV dialog without fully hiding the list behind it.
- **Imagery**: none in this system (no product photography, illustration, or brand imagery was supplied — see Iconography for what stands in for it).
- **Cards**: the `Card`/`DeviceCard` primitive is always same-color-as-background, raised shadow, generous radius (18–26px), no border. There is no bordered/outlined card variant — a "card" in this system is purely a shadow effect on a flat plane.

## Iconography

- **System**: [Material Symbols Rounded](https://fonts.google.com/icons) (variable icon font), loaded via Google Fonts CDN and declared in `tokens/fonts.css`. Rounded terminal style matches the soft, pillowy neumorphic shapes better than sharp/outlined icon sets.
- **Usage**: icons render via the `.material-symbols-rounded` class (24px/400/fill-0 by default) inside `IconButton`, `AppShortcut`, `Badge` dots, `Input` leading glyphs, and TV glyphs on `DeviceCard`.
- **No SVG icon set or custom icon font** was authored — everything routes through the one Material Symbols font for consistency.
- **Emoji**: not used anywhere (see Content fundamentals).
- **App shortcut icons** (Live TV, Movies, Games, Apps on the remote screen) are generic Material Symbols glyphs, not real streaming-service logos — no real app branding was supplied, so nothing brand-specific was invented.
- **No logo**: no company/product logo or wordmark was provided. Nowhere in this system is a logo drawn or approximated — the product name renders as plain Montserrat type wherever a mark might otherwise go (e.g. this readme, the SKILL.md). If a real logo exists, attach it and this system should be updated to use it.

## Intentional additions

No component library, codebase, or Figma file was attached — this is a from-scratch build, so the full standard primitive set was authored (per the "no source" path), sized down to what a two-screen remote-control app actually needs. Two components go beyond a generic UI-kit checklist and are domain-specific to this product:

- **DPad** — the directional pad housing (a circular inset dish + 4 arrow `IconButton`s + center accent Select button). Reasoning: no generic design system ships a D-pad; it's the signature control of a TV remote and deserved a first-class, reusable primitive rather than being hand-assembled inside the UI kit.
- **DeviceCard** — the composed device-list row (icon tile + name/model/IP + status Badge + chevron). Reasoning: this exact row shape recurs as the core unit of the whole first screen; making it a real component (composing `Card` + `Badge`) keeps the UI kit thin and keeps that row consistent everywhere it's reused.

## Index

```
styles.css              → entry point, @imports every token/font file below
tokens/
  fonts.css              Montserrat + Material Symbols Rounded (@font-face / @import)
  colors.css             base surfaces, accent, semantic status, light+dark theme
  typography.css         type scale, weights, tracking
  spacing.css             spacing scale, radius scale, shadow offset/blur primitives
  shadows.css             the raised/inset neumorphic box-shadow tokens
  base.css               minimal reset + body defaults

components/
  core/        Button, IconButton, Card, Badge, DeviceCard
  forms/       Toggle, Input, Slider
  controls/    DPad, AppShortcut
  feedback/    Modal

guidelines/    foundation specimen cards (Colors, Type, Spacing, Shadows, Iconography, theme comparison)

ui_kits/
  tv-remote/   index.html — interactive 2-screen click-through (Device List ↔ Remote Control)
               DeviceListScreen.jsx, RemoteScreen.jsx

SKILL.md       portable skill definition for use in Claude Code / other agent contexts
```

### Components

| Component | Group | What it is |
|---|---|---|
| Button | core | Primary/secondary/ghost action button, 3 sizes |
| IconButton | core | Circular icon-only button (D-pad arrows, power, volume, home) |
| Card | core | Base neumorphic surface, raised or inset |
| Badge | core | Status pill (online/offline/connecting) |
| DeviceCard | core | Full device-list row (composes Card + Badge) |
| Toggle | forms | On/off switch (theme toggle, settings) |
| Input | forms | Inset text field (IP address entry) |
| Slider | forms | Groove slider (volume/brightness) |
| DPad | controls | Directional pad housing |
| AppShortcut | controls | Square app-shortcut tile |
| Modal | feedback | Centered dialog on blurred scrim (Add-TV flow) |

## Caveats

- No brand name, logo, codebase, or Figma file was provided — every visual decision above (exact accent hue, corner radii, shadow values, D-pad layout) is this system's own interpretation of "Neumorphism + Montserrat," not extracted from an existing source. Attach real brand assets to replace any of it.
- Montserrat and Material Symbols Rounded are both loaded live from Google Fonts CDN rather than as local files, since no font files were supplied and both are genuinely Google Fonts (not substitutions).
