# WEG3D Fin — Token reference

Runtime source: `src/styles/design-tokens.css`. Handoff mirror: `docs/Design System/design-tokens.css`.

## Surfaces

| Token | Hex | Tailwind | Usage |
| --- | --- | --- | --- |
| `--wf-bg` | `#fbfbfc` | `bg-wf-bg` | App background |
| `--wf-surface` | `#ffffff` | `bg-wf-surface` | Cards, inputs, invoice document |
| `--wf-surface-2` | `#f7f7f8` | `bg-wf-surface-2` | Subtle fills, bank details band |
| `--wf-surface-3` | `#f1f1f3` | `bg-wf-surface-3` | Segmented controls, chips, draft badges |

## Text

| Token | Hex | Tailwind | Usage |
| --- | --- | --- | --- |
| `--wf-text` | `#161619` | `text-wf-text` | Primary ink |
| `--wf-text-2` | `#6c6c76` | `text-wf-text-2` | Labels, secondary copy |
| `--wf-text-3` | `#9c9ca5` | `text-wf-text-3` | Captions, placeholders |

## Brand & status

| Token | Hex | Tailwind | Usage |
| --- | --- | --- | --- |
| `--wf-accent` | `#ef4136` | `text-wf-accent`, `bg-wf-accent` | Primary CTA, focus ring, sent |
| `--wf-accent-hover` | `#d5392f` | `hover:bg-wf-accent-hover` | Button hover |
| `--wf-accent-soft` | `#fdecea` | `bg-wf-accent-soft` | Tinted backgrounds |
| `--wf-ink` | `#111b37` | `text-wf-ink` | Deep navy (invoice template) |
| `--wf-success` | `#12855a` | `text-wf-success` | Paid status |
| `--wf-warning` | `#a86a12` | `text-wf-warning` | Warnings |
| `--wf-danger` | `#d23f38` | `text-wf-danger` | Overdue, destructive |

## Typography scale

| Class | Size | Weight | Notes |
| --- | --- | --- | --- |
| `.wf-display` | 24px | 600 | Page titles, `-0.03em` tracking |
| `.wf-h1` | 20px | 600 | Section headings |
| `.wf-h2` | 16px | 600 | Subsections |
| `.wf-body` | 13.5px | 400 | Body, form fields (default on `body`) |
| `.wf-label` | 12px | 500 | Field labels (includes `text-wf-text-2`) |
| `.wf-caption` | 11px | 600 | Eyebrows, uppercase caps |
| `.wf-mono` | inherit | — | Geist Mono + `tnum` |

## Radius & elevation

| Token | Value | Usage |
| --- | --- | --- |
| `--wf-radius` | 8px | Inputs, buttons (`--radius` in shadcn) |
| `--wf-radius-lg` | 14px | Cards |
| `--wf-radius-xl` | 16px | Panels, invoice document |
| `--wf-shadow-sm` | hairline + border | Active nav, tabs |
| `--wf-shadow-doc` | layered soft | Invoice preview/PDF (`wf-doc`) |

## Layout

- Control height: `--wf-control-h` = **36px** → Tailwind `h-9`
- Default gap: `--wf-gap` = **12px** → `gap-3`

## shadcn semantic mapping

`globals.css` maps WEG3D Fin to shadcn variables:

| shadcn token | Maps to |
| --- | --- |
| `primary` | Brand red (`#ef4136`) |
| `ring` | Brand red focus ring |
| `background` | `#fbfbfc` |
| `muted-foreground` | `#6c6c76` |
| `radius` | `8px` base |

Prefer semantic tokens in shadcn components; use `wf-*` when no shadcn equivalent exists.

## Invoice status badges

Mappings in `src/lib/design-system.ts`. Component: `InvoiceStatusBadge`.

| Status | Badge variant | Visual |
| --- | --- | --- |
| `draft` | `draft` | surface-3 / text-2 |
| `sent` | `sent` | accent-soft / accent |
| `paid` | `paid` | success-soft / success |
| `overdue` | `overdue` | danger-soft / danger |
| `cancelled` | `destructive` | danger-soft / danger |

Labels (UA): Чернетка, Надіслано, Оплачено, Прострочено, Скасовано.
