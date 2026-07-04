# DESIGN — MotoRoute Agent (lab)

Last updated: 2026-07-01

Minimal visual guide for the laboratory MVP. Implements **BC-BRAND-01** and **BC-BRAND-02**. For product scope see [docs/requirements.md](docs/requirements.md).

This is intentionally simple — enough for consistent UI during OpenSpec implementation, not a full design system.

---

## Principles

| Principle        | Rule |
| ---------------- | ---- |
| Language         | Ukrainian-first UI copy |
| Tone             | Calm, practical, informative — **no exclamation marks** |
| Privacy          | No decorative third-party widgets, trackers, or cookie banners |
| Density          | Readable on mobile; avoid clutter |
| Lab scope        | Prefer CSS variables + Tailwind over custom design tooling |

---

## Layout

Single-page app with three zones:

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER (h-14)     logo · clock · theme toggle               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  MAIN — empty state: centered config card (max-w-lg)         │
│         results state: map (flex-1) + sidebar (320–380px)  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  FOOTER (compact)  OSM / routing credits · links             │
└──────────────────────────────────────────────────────────────┘
```

### Breakpoints (FR-SHELL-02)

| Token   | Width   | Behavior |
| ------- | ------- | -------- |
| `sm`    | ≥ 768px | Sidebar beside map; header items in one row |
| `xl`    | ≥ 1280px| Wider sidebar; map gets remaining width |

Below 768px: stack sidebar **below** map; config card uses full width with `px-4`.

---

## Color

Use CSS variables in `app/globals.css`. Map to Tailwind via `@theme inline`.

### Light

| Token              | Hex       | Usage |
| ------------------ | --------- | ----- |
| `--background`     | `#f8f7f4` | Page background (warm off-white) |
| `--foreground`     | `#1c1917` | Primary text |
| `--muted`          | `#78716c` | Secondary text, labels |
| `--card`           | `#ffffff` | Panels, config card |
| `--border`         | `#e7e5e4` | Dividers, input borders |
| `--primary`        | `#b45309` | Primary actions (amber — road / sun) |
| `--primary-fg`     | `#ffffff` | Text on primary buttons |
| `--accent`         | `#0d9488` | Links, focus ring (teal) |
| `--destructive`    | `#b91c1c` | Validation errors (text only, no loud banners) |

### Dark

| Token              | Hex       | Usage |
| ------------------ | --------- | ----- |
| `--background`     | `#0c0a09` | Page background |
| `--foreground`     | `#fafaf9` | Primary text |
| `--muted`          | `#a8a29e` | Secondary text |
| `--card`           | `#1c1917` | Panels |
| `--border`         | `#292524` | Dividers |
| `--primary`        | `#f59e0b` | Primary actions |
| `--primary-fg`     | `#1c1917` | Text on primary buttons |
| `--accent`         | `#2dd4bf` | Links, focus ring |
| `--destructive`    | `#f87171` | Validation errors |

Theme follows user choice (header toggle). Respect `prefers-color-scheme` as default before first toggle.

---

## Typography

| Role        | Font              | Size / weight |
| ----------- | ----------------- | ------------- |
| Body        | Geist Sans        | `text-base` (16px), `font-normal` |
| Headings    | Geist Sans        | `text-lg`–`text-xl`, `font-semibold` |
| Labels      | Geist Sans        | `text-sm`, `text-muted` |
| Clock       | Geist Mono        | `text-sm`, `tabular-nums` |
| Metrics     | Geist Mono        | `text-sm`, distances/durations |

Line height: `leading-relaxed` for body, `leading-tight` for headings.

---

## Spacing and shape

| Element        | Value |
| -------------- | ----- |
| Page padding   | `p-4` mobile, `p-6` desktop |
| Card padding   | `p-6` |
| Card radius    | `rounded-lg` (8px) |
| Button radius  | `rounded-md` (6px) |
| Input height   | `h-10` |
| Section gap    | `gap-4` mobile, `gap-6` desktop |
| Focus ring     | `ring-2 ring-accent ring-offset-2 ring-offset-background` |

---

## Components (shadcn/ui)

Use shadcn primitives with the tokens above:

- **Button** — primary for “Побудувати маршрут”; outline for secondary
- **Input / Label** — route search and numeric fields
- **Card** — empty-state config panel and day groups in sidebar
- **Skeleton** — map placeholder (FR-MAP-03)

No custom icon library required for MVP. If icons are needed, use inline SVG or a single icon from lucide with `optimizePackageImports`.

---

## Map markers (FR-MAP-02)

Distinct, color-blind-friendly hues on both themes:

| Stop type   | Color     | Shape |
| ----------- | --------- | ----- |
| Start       | `#16a34a` | Circle |
| End         | `#dc2626` | Circle |
| Rest stop   | `#2563eb` | Small circle |
| Overnight   | `#9333ea` | Diamond (rotated square) |

Route polyline: `--primary` at 4px weight, 0.85 opacity.

OSM attribution: `text-xs text-muted`, bottom-right overlay on map — exact string per FR-MAP-04.

---

## Copy and voice (Ukrainian)

Examples — keep the same calm register:

| Context        | Copy |
| -------------- | ---- |
| App title      | MotoRoute |
| Empty heading  | Планування мото-маршруту |
| Start field    | Початок |
| End field      | Кінець |
| Rest interval  | Відстань між зупинками, км |
| Daily limit    | Максимум за день, км |
| Submit         | Побудувати маршрут |
| Loading        | Обчислення маршруту… |
| Error (API)    | Не вдалося отримати маршрут. Перевірте з’єднання та спробуйте ще раз. |
| No route yet   | Вкажіть початок і кінець поїздки |

Avoid hype (“Чудово!”, “Супер!”). State facts.

---

## Footer (BC-BRAND-02)

Single line, muted text, external links open in new tab with `rel="noopener noreferrer"`:

- [OpenStreetMap](https://www.openstreetmap.org/copyright)
- [OSRM](http://project-osrm.org/) (or the instance used)

---

## Accessibility (NFR-A11Y-01)

- All form controls reachable by Tab
- Visible focus ring (see above)
- `label` associated with every input
- Autocomplete list: arrow keys + Enter; `role="listbox"` on suggestions
- Map is supplementary — itinerary data duplicated in sidebar for screen-reader users

---

## Out of scope for this document

- Marketing pages, logos beyond wordmark text “MotoRoute”
- Custom illustration set
- Figma / design tokens pipeline

When in doubt, match existing Tailwind + shadcn patterns and this token table.
