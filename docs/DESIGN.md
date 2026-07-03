# Vouch — Design

Vouch is a Ukrainian-first **Honest Resume Tailor**: it rewrites CV bullets to
fit a job description while grounding every claim in the candidate's real
experience. The design language is restrained and editorial — navy ink + one
brand blue, two grotesque typefaces, no emoji, no icon libraries.

The full design system lives in [`docs/vouch-design-system/`](vouch-design-system/)
(tokens, component specs, UI kit, guidelines). **Read
`docs/vouch-design-system/readme.md` before designing any new surface.**

## How the system is wired into the app

| Layer | Where | Notes |
|-------|-------|-------|
| Tokens | `src/app/globals.css` | Brand tokens live in `@theme` (Tailwind v4) so utilities are generated; spacing scale + semantic aliases in `:root`. |
| Fonts | `src/app/layout.tsx` | `next/font/google` loads Bricolage Grotesque + Hanken Grotesk, exposed as `--font-bricolage` / `--font-hanken`, mapped to `--font-display` / `--font-body`. |
| Source of truth | `docs/vouch-design-system/tokens/*.css` | Mirror token values here when they change; keep the two in sync. |

Because tokens sit in `@theme`, you style with Tailwind utilities directly:

```tsx
<h1 className="font-display text-5xl tracking-tight text-ink">…</h1>
<button className="rounded-md bg-brand text-white shadow-brand hover:opacity-[0.88]">…</button>
```

Available namespaces: `*-ink*` / `*-brand*` / `*-surface-*` / status colors
(`met` `partial` `gap` `overclaim`); `font-display|body|mono`; `text-xs…display`;
`leading-*`; `tracking-*` (incl. `tracking-eyebrow`); `rounded-xs…3xl|pill`;
`shadow-card|lifted|float|ink|brand|…`.

## Non-negotiable brand rules

- **Colors:** navy ink `#16243d`, brand blue `#3257c5`, warm paper `#faf7f2`.
  Never add new brand hues. Status colors are fixed: met `#2f8f5b`,
  partial `#c79a1e`, gap `#d05151`, overclaim-risk `#e08a3c`.
- **Type:** Bricolage Grotesque for display/headlines, Hanken Grotesk for
  body/UI. Display = tight tracking (`-0.02em`) + tight leading.
- **Voice:** direct, calm, honest. No hype, **no exclamation points, no emoji**,
  no invented claims. Second person ("you/your"). Headings sentence case, no
  trailing period.
- **Cards:** white bg, hairline border, 14–20px radius, minimal shadow. No
  colored left-border accents.
- **Icons:** colored dot indicators + arrow characters (`↑` `→`) only. No icon
  libraries, no SVG icon paths.
- **Casing:** status/requirement tokens all-lowercase; section eyebrows
  UPPERCASE · MONOSPACE · TRACKED.

See `docs/vouch-design-system/readme.md` for the complete reference (hover/press
states, borders, animations, component specs).