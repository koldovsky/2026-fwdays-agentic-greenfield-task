# WEG3D Fin — Design System

Invoice Maker 2026 uses the **WEG3D Fin** design system: a light, Linear/Vercel-inspired UI with brand accent red (`#ef4136`) from the invoice template identity.

## Source files

| File | Purpose |
| --- | --- |
| `docs/Design System/design-tokens.css` | Original token reference (design handoff) |
| `docs/Design System/Canvas.dc.html` | Interactive component gallery (buttons, fields, invoice doc) |
| `src/styles/design-tokens.css` | **Runtime tokens** imported by the app |
| `src/app/globals.css` | shadcn/Tailwind v4 theme mapping + utility classes |

## Principles

1. **Light-first** — default app theme is light (`--wf-bg: #fbfbfc`). Dark mode tokens exist for future use but are not enabled in the root layout.
2. **Restrained contrast** — surfaces stack from `--wf-bg` → `--wf-surface` → `--wf-surface-2/3` with hairline borders (`--wf-border`).
3. **Brand red for actions** — primary buttons, focus rings, and sent-invoice states use `--wf-accent`.
4. **Geist typography** — UI text via Geist Sans; amounts and tabular numbers via Geist Mono with `tnum`.
5. **shadcn compatibility** — semantic tokens (`primary`, `muted`, `border`, …) map to WEG3D Fin values so existing shadcn/ui components work without forks.

## Color tokens

### Surfaces

| Token | Hex | Usage |
| --- | --- | --- |
| `--wf-bg` | `#fbfbfc` | App background |
| `--wf-surface` | `#ffffff` | Cards, inputs, invoice document |
| `--wf-surface-2` | `#f7f7f8` | Subtle fills, bank details band |
| `--wf-surface-3` | `#f1f1f3` | Segmented controls, chips, draft badges |

### Text

| Token | Hex | Usage |
| --- | --- | --- |
| `--wf-text` | `#161619` | Primary ink |
| `--wf-text-2` | `#6c6c76` | Labels, secondary copy |
| `--wf-text-3` | `#9c9ca5` | Captions, placeholders |

### Brand & status

| Token | Hex | Usage |
| --- | --- | --- |
| `--wf-accent` | `#ef4136` | Primary CTA, focus ring, sent status |
| `--wf-accent-hover` | `#d5392f` | Button hover |
| `--wf-accent-soft` | `#fdecea` | Tinted backgrounds |
| `--wf-ink` | `#111b37` | Deep navy (invoice template) |
| `--wf-success` | `#12855a` | Paid status |
| `--wf-warning` | `#a86a12` | Warnings |
| `--wf-danger` | `#d23f38` | Overdue, destructive |

## Typography scale

| Class / token | Size | Weight | Notes |
| --- | --- | --- | --- |
| `.wf-display` / `--wf-fs-display` | 24px | 600 | Page titles, `-0.03em` tracking |
| `.wf-h1` / `--wf-fs-h1` | 20px | 600 | Section headings |
| `.wf-h2` / `--wf-fs-h2` | 16px | 600 | Subsections |
| `.wf-body` / `--wf-fs-body` | 13.5px | 400 | Body, form fields |
| `.wf-label` / `--wf-fs-label` | 12px | 500 | Field labels |
| `.wf-caption` / `--wf-fs-caption` | 11px | 600 | Eyebrows, uppercase caps |
| `.wf-mono` | inherit | — | Geist Mono + tabular nums |

## Radius & elevation

| Token | Value | Usage |
| --- | --- | --- |
| `--wf-radius` | 8px | Inputs, buttons |
| `--wf-radius-lg` | 14px | Cards |
| `--wf-radius-xl` | 16px | Panels, invoice document |
| `--wf-shadow-sm` | hairline + 1px border | Active nav, tabs |
| `--wf-shadow-doc` | layered soft shadow | Invoice preview/PDF |

## Layout

- Control height: `--wf-control-h` = **36px** (`h-9` in Tailwind)
- Default gap: `--wf-gap` = **12px**

## Tailwind usage

Brand tokens are exposed in `@theme` as `wf-*` colors:

```tsx
<div className="bg-wf-bg text-wf-text border-wf-border" />
<button className="bg-primary hover:bg-wf-accent-hover" />
<span className="wf-mono text-wf-success">12 450,00</span>
```

Utility classes for typography and surfaces:

```tsx
<h1 className="wf-display">Invoices</h1>
<p className="wf-label">Client name</p>
<section className="wf-panel p-6">…</section>
<article className="wf-doc p-10">…invoice preview…</article>
```

## shadcn mapping

`globals.css` maps WEG3D Fin to shadcn semantic variables:

- `primary` → brand red (`#ef4136`)
- `ring` → brand red focus ring
- `background` → `#fbfbfc`
- `muted-foreground` → `#6c6c76`
- `radius` → `8px` base

Use shadcn components (`Button`, `Input`, `Card`, `Badge`) — they inherit the theme automatically.

## Invoice status badges

Domain statuses map to badge variants in `src/lib/design-system.ts`:

| Status | Badge variant | Colors |
| --- | --- | --- |
| `draft` | `draft` | surface-3 / text-2 |
| `sent` | `sent` | accent-soft / accent |
| `paid` | `paid` | success-soft / success |
| `overdue` | `overdue` | danger-soft / danger |
| `cancelled` | `destructive` | danger-soft / danger |

Component: `InvoiceStatusBadge` in `src/components/invoices/invoice-status-badge.tsx`.

## Component conventions

When building new UI:

1. Page titles → `wf-display`
2. Secondary descriptions → `text-wf-text-2`
3. Primary actions → `<Button>` default variant (brand red)
4. Secondary actions → `outline` or `ghost`
5. Monetary values → `wf-mono` class
6. Cards → shadcn `Card` (14px radius, wf border)
7. Invoice document preview → `wf-doc` utility

## Visual reference

Open `docs/Design System/Canvas.dc.html` in a browser for the full component gallery (buttons, fields, segmented controls, invoice document layout).

## Agent checklist

When adding or changing UI:

- [ ] Use semantic shadcn tokens or `wf-*` Tailwind colors — no hardcoded hex in components
- [ ] Page titles use `wf-display`; amounts use `wf-mono`
- [ ] Primary CTAs use `Button` default variant
- [ ] Invoice statuses use `InvoiceStatusBadge`
- [ ] Update `src/styles/design-tokens.css` if tokens change; keep `docs/Design System/design-tokens.css` in sync
