---
name: notely-design
description: Use this skill to generate well-branded interfaces and assets for Notely, a clean, minimal, calm note-taking app, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick map
- `styles.css` — link this one file; it imports all tokens (`tokens/`) and webfonts (Inter + JetBrains Mono via Google Fonts).
- `tokens/` — color (light + `[data-theme="dark"]`), typography, spacing (8px), radius, shadow (0–5), motion, base element styles + type classes.
- `components/` — React primitives (`core/`, `forms/`, `feedback/`, `layout/`, `notes/`). Each `<Name>.jsx` exports `function <Name>`; `<Name>.prompt.md` shows usage.
- `ui_kits/notely-app/` — interactive app recreation (sidebar, notes list/grid, editor, settings).
- `guidelines/` — foundation specimen cards.

## House rules (essentials)
- Sentence case everywhere; warm, brief, plain copy; address the user as "you"; no emoji in chrome; no exclamation marks.
- One indigo accent (`#4F46E5`); cool-gray neutrals; flat backgrounds (no gradients/textures).
- Soft low-spread shadows; 8/12/16px radii; 1px hairline borders; visible 3px indigo focus ring.
- Outline Lucide icons, 1.5px stroke; filled only for active state (pinned/favorited).
- Short, snappy motion (140–200ms), standard easing `cubic-bezier(0.2,0,0,1)`; respect reduced motion.
- WCAG 2.2 AA: body ≥ 7:1, secondary ≥ 4.5:1, 44px touch targets on mobile.
