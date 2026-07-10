# Design System — TinyStart

> Light theme · warm neutrals · calm by default  
> Companion to `docs/APP_SPEC.md` and `docs/product-brief.md`.  
> **Status:** Starter tokens — good enough to ship MVP, refine later.

---

## 1. Design intent

TinyStart should feel like a **quiet coworking cafe**: spacious, warm, and low-pressure. Visual design supports focus and starting — it never competes with the task.

| Goal | How design supports it |
|------|------------------------|
| Low activation energy | One clear primary action per screen; generous whitespace |
| Calm focus | Neutral surfaces, soft contrast, no alarm colors |
| Trust & privacy | Clean, understated UI — no gamification chrome |
| Accessibility | AA contrast, visible focus rings, not color-only states |

**Tone:** Warm, direct, non-patronizing. UI copy and visuals avoid guilt, hustle, and urgency.

---

## 2. Theme

**MVP default:** Light theme only.

Dark mode is out of scope for now. Do not follow `prefers-color-scheme` for MVP — ship a single, consistent light experience.

---

## 3. Color palette

Warm stone neutrals form the base. One muted sage accent handles primary actions and positive feedback. No bright reds, no neon greens, no overdue styling.

### Core tokens

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#FAFAF9` | Page background (stone-50) |
| `surface` | `#FFFFFF` | Cards, modals, inputs |
| `surface-muted` | `#F5F5F4` | Secondary panels, recap strip |
| `foreground` | `#1C1917` | Primary text (stone-900) |
| `foreground-muted` | `#78716C` | Secondary text, labels (stone-500) |
| `foreground-subtle` | `#A8A29E` | Placeholders, hints (stone-400) |
| `border` | `#E7E5E4` | Dividers, input borders (stone-200) |
| `border-strong` | `#D6D3D1` | Hover borders, emphasis (stone-300) |

### Accent (primary action)

| Token | Hex | Usage |
|-------|-----|-------|
| `accent` | `#5F7A65` | Primary buttons, links, active states |
| `accent-hover` | `#4D6552` | Button hover |
| `accent-subtle` | `#E8EFE9` | Soft highlight backgrounds |
| `accent-foreground` | `#FFFFFF` | Text on accent buttons |

Sage reads as calm and natural without feeling clinical or gamified.

### Semantic (non-punitive)

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#5F7A65` | Completion, session done — same as accent |
| `warning` | `#A16207` | Rare; never for overdue tasks |
| `info` | `#78716C` | Neutral informational states |

**Rules:**
- Timer never turns aggressive red near zero.
- Snoozed / paused states use muted neutrals, not error styling.
- Energy tags use neutral steps (see §8), not traffic-light red/yellow/green.

### CSS variables

Add to `app/globals.css` when implementing:

```css
:root {
  --background: #fafaf9;
  --surface: #ffffff;
  --surface-muted: #f5f5f4;
  --foreground: #1c1917;
  --foreground-muted: #78716c;
  --foreground-subtle: #a8a29e;
  --border: #e7e5e4;
  --border-strong: #d6d3d1;
  --accent: #5f7a65;
  --accent-hover: #4d6552;
  --accent-subtle: #e8efe9;
  --accent-foreground: #ffffff;
  --success: #5f7a65;
  --warning: #a16207;
  --info: #78716c;
  --ring: #5f7a65;
}
```

Map in Tailwind `@theme inline` as `--color-*` aliases for utility classes (`bg-background`, `text-foreground-muted`, etc.).

---

## 4. Typography

**Font:** [Geist Sans](https://vercel.com/font) (already in `app/layout.tsx`).  
**Monospace:** Geist Mono for timer digits and numeric recap stats.

### Scale

| Name | Size / line-height | Weight | Use |
|------|-------------------|--------|-----|
| `display` | 2.25rem / 2.5rem (36/40) | 600 | Focus timer, hero task title |
| `title` | 1.5rem / 2rem (24/32) | 600 | Page headings |
| `heading` | 1.125rem / 1.75rem (18/28) | 600 | Card titles, section labels |
| `body` | 1rem / 1.5rem (16/24) | 400 | Default UI text |
| `body-sm` | 0.875rem / 1.25rem (14/20) | 400 | Metadata, captions |
| `label` | 0.75rem / 1rem (12/16) | 500 | Uppercase sparingly; form labels |

### Rules

- Body text minimum **16px** on mobile.
- Focus session: current step uses `display` or `title`; timer uses `display` + `font-mono`.
- Limit to **two weights** in most views: 400 and 600.
- Sentence case for headings. No exclamation marks in UI copy.

---

## 5. Spacing & layout

Base unit: **4px**. Use Tailwind spacing scale (`1` = 4px).

| Context | Padding / gap |
|---------|----------------|
| Page horizontal | `px-4` mobile · `px-6` tablet+ |
| Page vertical | `py-6` · `py-8` on home |
| Card inner | `p-4` · `p-6` for hero card |
| Stack gap (sections) | `gap-6` · `gap-8` between major blocks |
| Inline controls | `gap-2` · `gap-3` |

**Max content width:** `max-w-lg` (32rem) for focus-friendly reading; `max-w-2xl` for task detail with breakdown list.

**Density:** Low. When in doubt, add space.

---

## 6. Radius, borders & elevation

| Token | Value | Use |
|-------|-------|-----|
| `radius-sm` | `6px` (`rounded-md`) | Chips, small buttons |
| `radius-md` | `10px` (`rounded-lg`) | Inputs, buttons |
| `radius-lg` | `14px` (`rounded-xl`) | Cards, modals |
| `radius-full` | `9999px` | Pills, energy tags |

**Borders:** 1px solid `border` by default. Avoid heavy outlines.

**Shadows** — use sparingly:

| Level | Tailwind | Use |
|-------|----------|-----|
| None | — | Flat lists, inline fields |
| Soft | `shadow-sm` | Hero card, floating completion modal |
| Lifted | `shadow-md` | Modals only |

Prefer surface contrast (`surface` on `background`) over shadow for hierarchy.

---

## 7. Components

### Buttons

| Variant | Style |
|---------|-------|
| **Primary** | `bg-accent text-accent-foreground` · one per screen |
| **Secondary** | `bg-surface border border-border text-foreground` |
| **Ghost** | `text-foreground-muted` · hover `bg-surface-muted` |
| **Destructive** | Avoid in MVP; use neutral “Remove” with confirmation |

- Min height **44px** (touch target).
- `rounded-lg`, `px-4 py-2.5`, `font-medium`.
- Visible focus: `ring-2 ring-ring ring-offset-2 ring-offset-background`.

### Cards

- `bg-surface border border-border rounded-xl p-4` or `p-6`.
- Hero card on Home: slightly more padding, optional `shadow-sm`.

### Inputs

- `bg-surface border border-border rounded-lg px-3 py-2.5`.
- Placeholder: `foreground-subtle`.
- Focus: `border-accent ring-2 ring-accent/20`.
- Quick-add on Home: single line, no heavy chrome.

### Chips / tags

- Energy: pill shape, neutral backgrounds (§8).
- Snoozed: `bg-surface-muted text-foreground-muted` — no red “overdue”.

### Timer (focus mode)

- Large monospace digits, `foreground` color throughout session.
- Near end: optional gentle opacity pulse — **not** red flash.
- Progress: “Step X of Y” in `body-sm` + `foreground-muted`.

### Modal / completion screen

- Centered, `rounded-xl`, `shadow-md`, `bg-surface`.
- Backdrop: `bg-foreground/20` (soft dim, not harsh black).

---

## 8. Energy tags

Neutral stepped palette — no red/yellow/green traffic lights.

| Level | Background | Text |
|-------|------------|------|
| Low | `#F5F5F4` | `#78716C` |
| Medium | `#E7E5E4` | `#57534E` |
| High | `#E8EFE9` | `#4D6552` |

---

## 9. Motion

Subtle only. Respect `prefers-reduced-motion: reduce`.

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Hover / focus color | 150ms | ease |
| Modal enter | 200ms | ease-out |
| Page transitions | 200–250ms | ease |
| Timer pulse (optional) | 2s loop | ease-in-out, low opacity |

No bounce, no confetti, no shake. Completion moment: soft fade + scale (0.98 → 1), not fireworks.

---

## 10. Screen patterns

### Today Home

- Time-aware greeting (`heading`, muted).
- One hero card: recommended task + single **Start focus** primary button.
- Quick-add below; recap strip at bottom (`surface-muted`, compact).

### Task detail

- Title + motivation note (collapsible if empty); both accept free-form multi-word text.
- Breakdown list: numbered steps, drag handle subtle (`foreground-subtle`).
- Autosave indicator: quiet "Saving…" / "Saved" text, no spinner unless slow; 1200ms debounce; title and motivation flush on blur.
- Actions row: **Start focus** (primary) · Mark complete (secondary) · Archive (ghost) · **Cancel** (ghost — reverts to page-open snapshot, returns Home).

### Focus session

- Full viewport, no nav chrome.
- Current step centered, timer dominant.
- Controls: pause · extend · end — secondary/ghost styling except one soft primary if needed.

### Daily recap

- Forgiving copy, neutral stats.
- No red metrics, no streak shame.

---

## 11. Accessibility checklist

- [ ] Text/background pairs meet **WCAG 2.1 AA** (4.5:1 body, 3:1 large text).
- [ ] Focus rings visible on all interactive elements.
- [ ] Timer and progress announced to screen readers.
- [ ] States use icon or label, not color alone.
- [ ] `prefers-reduced-motion` disables non-essential animation.

---

## 12. Implementation order

When design is not the main focus, apply in this order:

1. CSS variables in `globals.css` + Tailwind theme aliases.
2. Body defaults: `bg-background text-foreground font-sans antialiased`.
3. Primary button + card + input styles (copy-paste from §7).
4. Home hero card layout.
5. Focus timer typography.
6. Polish: motion, completion modal, energy chips.

---

## 13. Out of scope (for now)

- Dark theme
- Custom illustration system
- Brand logo / marketing site
- Sound or haptic design tokens
- Full component library documentation (Storybook)

Refine this document as screens ship. Link new UI decisions back here rather than inventing one-off styles in components.
