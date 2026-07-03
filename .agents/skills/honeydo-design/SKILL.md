---
name: honeydo-design
description: Use this skill to generate well-branded interfaces and assets for Honeydo, a warm honey-themed iOS personal time tracker, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files
(`tokens/`, `components/`, `ui_kits/honeydo/`, `guidelines/`).

Honeydo is a cozy, golden, hexagon-motif iOS time tracker — warm and encouraging,
never corporate. Default theme is Dark (warm dark gray, not black); Light is an
orange-on-cream token swap. All color comes from named tokens in `styles.css` so
theming is a swap, not a redesign. Type is SF Pro Rounded (headings/numbers) + SF Pro
Text (body), with Nunito / Nunito Sans webfont fallbacks. Icons are Lucide.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc.), copy assets
out and create static HTML files for the user to view — link `styles.css`, load the
component bundle (`_ds_bundle.js`) and mount via `window.HoneydoDesignSystem_cfe9be`,
or just lean on the tokens directly. If working on production code, copy the tokens
and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to
build or design, ask a few questions, and act as an expert designer who outputs HTML
artifacts _or_ production code, depending on the need.
