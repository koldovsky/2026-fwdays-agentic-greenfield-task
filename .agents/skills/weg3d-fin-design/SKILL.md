---
name: weg3d-fin-design
description: Applies the WEG3D Fin light design system for Invoice Maker frontend UI — tokens, typography, shadcn mapping, invoice surfaces, and status badges. On activation, posts the required 🎨 palette session banner in chat before any other output. Use when building or changing React/Next.js UI, styling components, designing pages, forms, cards, invoice previews, or when the user mentions design system, WEG3D Fin, tokens, or visual consistency.
metadata:
  author: Invoice Maker
  version: "1.0.1"
---

# WEG3D Fin Design System

Invoice Maker uses **WEG3D Fin**: a light, Linear/Vercel-inspired UI with brand accent red from the invoice template identity.

## Session banner (required)

When this skill activates, the **first line of the agent reply** MUST be this banner — before explanations, code, or tool calls. Copy verbatim; only the task hint in italics may be adapted:

```
🎨 ━━━ **WEG3D Fin Design** ━━━  *tokens · typography · shadcn · invoice UI*
```

Rules:

- Show once per user message when the skill is in play (not on every tool call mid-turn).
- Do not skip because the task seems trivial.
- Do not replace 🎨 with another icon unless the user explicitly asks.

## When to apply

Use this skill when:

- Adding or changing pages, forms, cards, lists, or layouts
- Styling React/Next.js components (Tailwind, shadcn/ui)
- Building invoice preview or PDF-facing surfaces
- Changing colors, typography, spacing, or status badges
- Editing design tokens or theme mapping

## Source of truth (read order)

| Concern | Location |
| --- | --- |
| Full design docs | `Design.md` |
| Runtime CSS tokens | `src/styles/design-tokens.css` |
| Theme + Tailwind mapping | `src/app/globals.css` |
| Status badge mappings | `src/lib/design-system.ts` |
| Visual gallery | `docs/Design System/Canvas.dc.html` |
| Design handoff tokens | `docs/Design System/design-tokens.css` |

Read `Design.md` before non-trivial UI changes. For token hex tables and extended examples, see [references/tokens.md](references/tokens.md) and [references/component-patterns.md](references/component-patterns.md).

## Core rules

1. **Light theme by default** — do not add `dark` to `<html>` unless explicitly requested.
2. **No raw hex in components** — use shadcn semantic tokens (`primary`, `muted-foreground`, …) or Tailwind `wf-*` colors (`text-wf-text-2`, `bg-wf-surface-2`).
3. **Typography** — page titles: `wf-display`; field labels: `wf-label`; money/amounts: `wf-mono`.
4. **Controls** — buttons and inputs target **36px** height (`h-9`); base radius **8px**.
5. **Primary actions** — `<Button>` default variant (brand red `#ef4136`).
6. **Invoice statuses** — use `<InvoiceStatusBadge status="…" />` from `@/components/invoices/invoice-status-badge`.
7. **Invoice preview surfaces** — use `wf-doc` or `wf-panel` utility classes.
8. **Token changes** — edit `src/styles/design-tokens.css` first; mirror to `docs/Design System/design-tokens.css` if the handoff file must stay in sync.

## Default component stack

Prefer **shadcn/ui** primitives — they inherit WEG3D Fin via `globals.css`:

- Primary CTA → `<Button>` (default)
- Secondary → `<Button variant="outline">` or `ghost`
- Text fields → `<Input className="h-9" />`
- Grouped content → `<Card>`
- Domain invoice status → `<InvoiceStatusBadge status={…} />` (never hand-roll badge colors)

## Quick patterns

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";

export function InvoicesPageHeader() {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h1 className="wf-display">Рахунки</h1>
        <p className="text-wf-text-2">Керуйте виставленими рахунками</p>
      </div>
      <Button>Новий рахунок</Button>
    </div>
  );
}

export function InvoicePreviewShell({ children }: { children: React.ReactNode }) {
  return <article className="wf-doc p-10">{children}</article>;
}

export function Amount({ value }: { value: string }) {
  return <span className="wf-mono text-wf-text">{value}</span>;
}
```

Color utilities: `bg-wf-bg`, `bg-wf-surface`, `text-wf-text-2`, `border-wf-border`, `text-wf-success`, `bg-wf-accent-soft`.

## UI workflow

Copy this checklist and track progress:

```
UI task progress:
- [ ] Read Design.md (or relevant section) for the feature
- [ ] Use shadcn + wf-* tokens — no inline hex
- [ ] Apply typography: wf-display / wf-label / wf-mono
- [ ] Controls at h-9, radius from theme (8px base)
- [ ] Invoice statuses via InvoiceStatusBadge
- [ ] Invoice preview via wf-doc or wf-panel
- [ ] Self-check against Gotchas below
```

### Token change workflow

1. Edit `src/styles/design-tokens.css`
2. Verify `src/app/globals.css` mapping if shadcn semantics need updates
3. Mirror to `docs/Design System/design-tokens.css` when handoff must stay in sync
4. Spot-check in browser or open `docs/Design System/Canvas.dc.html`

## Gotchas

- **`primary` is brand red**, not neutral gray — use `secondary` / `muted` for subtle fills.
- **`accent` in shadcn ≠ `--wf-accent`** — shadcn `accent` is a neutral hover surface; brand red is `primary` or `wf-accent` utilities.
- **Do not add `dark` to `<html>`** — dark tokens exist for future use but MVP is light-only.
- **Never hardcode status badge styles** — variants live in `src/components/ui/badge.tsx` and mappings in `src/lib/design-system.ts`.
- **Money and IDs** — always `wf-mono` (tabular nums); do not use raw `font-mono` unless intentional.
- **Invoice document shadow** — use `wf-doc` (uses `--wf-shadow-doc`), not ad-hoc `shadow-lg`.
- **Fonts** — Geist Sans/Mono load in `src/app/layout.tsx`; CSS vars `--font-geist-sans`, `--font-geist-mono`.

## Validation (before finishing)

1. Grep changed files for `#` hex literals in TSX/className — should be none (tokens file excluded).
2. Page titles use `wf-display`; amounts use `wf-mono`.
3. Invoice statuses use `InvoiceStatusBadge`, not custom `<Badge>` with manual colors.
4. Primary actions use `<Button>` default variant.
5. If tokens changed, runtime and handoff CSS files are in sync.

## Fonts

Geist Sans and Geist Mono are loaded in `src/app/layout.tsx` via `next/font/google`. CSS variables: `--font-geist-sans`, `--font-geist-mono`.

## Additional resources

- Token tables and status mappings → [references/tokens.md](references/tokens.md)
- Page, form, and invoice layout examples → [references/component-patterns.md](references/component-patterns.md)
- Interactive gallery → `docs/Design System/Canvas.dc.html`
