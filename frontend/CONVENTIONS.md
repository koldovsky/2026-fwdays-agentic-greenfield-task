# Frontend conventions

Source: ADRs 0002/0004 + research. Read for any frontend code.

## Toolchain

- **Package manager: `yarn`** (ADR-0002, locked — do not re-litigate). **Do NOT use npm.** PnP is optional; if a dependency chokes on PnP, fall back to `nodeLinker: node-modules` in `.yarnrc.yml` rather than switching package managers.
- All commands run from `frontend/`.

## Framework (versions verified 2026-07-03)

| Concern | Library | Version |
|---|---|---|
| Framework | Next.js | 16.2.10 (`output: 'export'` — static SPA) |
| UI | React | 19.2.7 |
| Data fetching | react-query (TanStack Query) | 5.101.2 |
| HTTP | axios | 1.18.1 |
| Client state | Zustand | 5.0.14 |

## Static export constraints

- `next.config.ts` MUST set `output: 'export'`. No server runtime features (no SSR data fetching, no `getServerSideProps`, no middleware, no API routes) — the SPA is built to static files and served by the backend container.
- Any data fetching happens client-side via react-query against the backend API.

## API contract

This sprint the contract is **hand-written** (see [api-contract.md](../docs/agents/api-contract.md)) in a typed `api-contract.ts` shared module — there is no codegen step. Keep it in sync manually with backend endpoints; a codegen pipeline is a PRD Phase 4 candidate.

## Workflow chooser

The first-class three-peer chooser (Translation / Voice-Over / Both) spans F2/F4/F5 frontend. It only determines **which configuration panels render** — it does not gate backend workflow services (separation is structural on the backend; see [architecture.md](../docs/agents/architecture.md)).

- Translation-only chosen → render translation config panel (source/target language, provider/model), show voiceover fields would be hidden.
- Voice-Over-only chosen → NO translation fields rendered (matches `extra="forbid"` schema rejection on the backend).
- Both chosen → translation config + voiceover config; combined submission is scaffold-only this sprint.

## Conventions

- TypeScript strict. `yarn lint` should pass; `yarn tsc --noEmit` before commit.
- Co-locate hooks/components with the feature that owns them; Zustand stores are per-concern, not a single global blob.

## Styling conventions

This section captures the visual + layout contract for the two primary SPA entry surfaces so any new screen stays inside the same visual language. Source CSS lives in `frontend/src/styles/globals.css` (tokens + page shell) and per-component `*.css` files imported at the component level.

### Design tokens (`styles/globals.css`)

All visual properties are driven by CSS custom properties declared on `:root`. Reuse the tokens — never hardcode hex/numeric values in component CSS.

| Token group | Variables | Use |
|---|---|---|
| Spacing scale (multiples of 4) | `--space-xs` (4) → `--space-3xl` (64) | All padding, margin, gap. |
| Font family | `--font-family-base` (system stack) | All text. |
| Font size/weight/line | `--font-body-*`, `--font-label-*`, `--font-heading-*`, `--font-display-*` | Body, label, heading, display. |
| Colors | `--color-bg-dominant` (slate-50), `--color-surface` (white), `--color-accent` (indigo-600), `--color-accent-tint` (indigo-100), `--color-text` (slate-900), `--color-text-muted` (slate-500), `--color-text-on-accent` (white), `--color-destructive` (red-600), `--color-error-bg` (red-50), `--color-error-border` (red-200), `--color-dropzone-border` (slate-300), `--color-dropzone-border-active` (indigo-600) | Backgrounds, text, borders, focus. |
| Tap target | `--min-target` (44px) | Min height/width on all interactive controls (WCAG 2.5.5). |
| Focus ring | `--focus-ring` (2px solid `--color-accent`), `--focus-ring-offset` (2px) | Keyboard focus for buttons + `[role="button"]` + links. |

See `globals.css:13-66` for the full token block.

### Input element conventions

**Both screens hide native form controls visually and use a custom control on top.** The native `<input>` is `sr-only` (screen-reader-only) so keyboard + AT users still see the control, but the visible surface is a styled label/card.

- **Initial screen — file picker.** `<input type="file" accept=".epub" className="sr-only">` in `components/UploadCard.tsx:257-264`. The button that opens the picker (`Choose file`, `.btn--primary`) sits in `.card__actions` below the dropzone hint and calls `inputRef.current?.click()` programmatically.
- **Workflow selection — radio chooser.** Each card is a `<label class="chooser__card">` wrapping an `<input type="radio" name="workflow" class="chooser__radio sr-only">` in `components/ChooserStep.tsx:92-100`. Clicking the label flips the radio; the card's visual state (`.chooser__card--selected`) is derived from `value === workflow`.
- **No JS form library.** Confirmed in `ChooserStep.tsx:5-7` — the chooser is a plain `<fieldset>` + native radio for accessibility, no `@radix-ui/react-radio` or similar.

### Page layout (initial screen shell)

Defined by `.page` in `globals.css:107-115`:

- `min-height: 100vh`, `display: flex`, `flex-direction: column`.
- `align-items: center; justify-content: center;` — content is centered on the page (the upload card sits in the visual middle on desktop).
- `padding: var(--space-lg)` (24px); `gap: var(--space-xl)` (32px) between siblings.
- Page title uses `.page__title` — display font (28px / 600 / 1.2), centered (`globals.css:117-123`).
- Auxiliary muted copy uses `.page__hint` — label font (14px / 600), `--color-text-muted` (`globals.css:125-131`).

### Card surface

Used by both the upload card and the chooser fieldset (see `UploadCard.css:9-21` and `ChooserStep.css:3-14`):

- `background-color: var(--color-surface)` (white).
- `border: 1px solid #e2e8f0` (slate-200 — hardcoded literal in both files; if tokenizing later, add `--color-card-border`).
- `border-radius: 12px`.
- `padding: var(--space-lg)` (24px).
- `width: 100%; max-width: 560px` — both cards share the same horizontal cap.
- `display: flex; flex-direction: column; gap: var(--space-md)` (16px between sections).

### Initial screen — UploadCard states

`components/UploadCard.css`:

- **Dropzone default** (`.card__section--dropzone`): `border: 2px dashed var(--color-dropzone-border)` (slate-300), `border-radius: 8px`, `padding: var(--space-lg)`, `align-items: center; text-align: center;` (`UploadCard.css:42-49`).
- **Dropzone drag-over** (`.card--drag-over .card__section--dropzone`): border becomes `var(--color-dropzone-border-active)` (indigo-600) — still 2px dashed (`UploadCard.css:28-33`, `51-53`).
- **Metadata preview** (`.card__section--metadata`): left-aligned (`text-align: left; align-items: stretch`); renders a `<dl class="card__metadata">` with 100px label column + 1fr value column (`UploadCard.css:100-125`). Fallback values use `.card__metadata-fallback` to switch to `--color-text-muted` (`UploadCard.css:143-145`).
- **Card focus**: `.card:focus-visible` paints `--focus-ring` (2px indigo-600) with `--focus-ring-offset` (2px) (`UploadCard.css:23-26`). Applied to the card root (which has `tabIndex={-1}` in `UploadCard.tsx:184`) so screen readers can move focus to the new region on upload success.

### Button variants

Shared `.btn` base in `UploadCard.css:148-193`. All buttons:

- `min-height: var(--min-target)` (44px), `min-width: var(--min-target)`.
- `font-size: var(--font-label-size)` (14px), `font-weight: var(--font-label-weight)` (600), `line-height: var(--font-label-line)` (1.4).
- `border-radius: 8px`; `padding: 0 var(--space-md)` (0 16px); centered content with `gap: var(--space-sm)` (8px).
- `border: 1px solid transparent` baseline; `transition: background-color 150ms ease-out, color 150ms ease-out, border-color 150ms ease-out;`.

| Variant | Class | Visual | Used in |
|---|---|---|---|
| Primary CTA | `.btn--primary` | `background-color: var(--color-accent)` (indigo-600), `color: var(--color-text-on-accent)` (white). Hover → `#4338ca` (indigo-700). | `Choose file` on dropzone (`UploadCard.tsx:268`); `Continue` on metadata preview (`UploadCard.tsx:228`); `Start translation` on translation config (`TranslationConfigStep.tsx:314`); `Start voiceover` on voiceover config (`VoiceoverConfigStep.tsx:246`). |
| Secondary | `.btn--secondary` | `background-color: #3730a3` (indigo-800 — darker than primary), `color: var(--color-text-on-accent)` (white). Hover → `#312e81` (indigo-900). | `Load Model List` on provider/model select (`ProviderModelSelect.tsx:339`). |
| Tertiary | `.btn--tertiary` | `background-color: transparent`, `color: var(--color-accent)`, `border-color: var(--color-accent)`. Hover → `--color-accent-tint` (indigo-100) bg. | `Back to Workflow Choice` across all 4 terminal states (`JobStatusPanel.tsx:300,316,332,351`); `Upload another` on metadata preview (`UploadCard.tsx:241`); `Cancel job` (compounded with `btn--danger` for red colors — `JobStatusPanel.tsx:215`). |

### Workflow selection — ChooserStep states

`components/ChooserStep.css`:

- **Fieldset container** (`.chooser`): same 560px max-width + 12px radius + slate-200 1px border as the upload card (`ChooserStep.css:3-14`). `<legend class="chooser__legend">` renders the question at heading size (20px / 600 / 1.2) — `ChooserStep.css:16-22`.
- **Card grid** (`.chooser__cards`): `display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md);` (`ChooserStep.css:24-28`). Collapses to a single column at `max-width: 720px` (`.chooser__cards { grid-template-columns: 1fr; }` — `ChooserStep.css:82-85`).
- **Card default** (`.chooser__card`): `border: 1px solid #cbd5e1` (slate-300), `border-radius: 8px`, `padding: var(--space-md)`, white surface, `cursor: pointer;`, transitions `border-color` and `background-color` over 150ms ease-out (`ChooserStep.css:30-40`).
- **Card hover** (`.chooser__card:hover`): `border-color: var(--color-accent)` (indigo-600) — no background change (`ChooserStep.css:42-44`).
- **Card selected** (`.chooser__card--selected`): `border-color: var(--color-accent)`, `border-width: 2px`, `background-color: var(--color-accent-tint)` (indigo-100). `padding: calc(var(--space-md) - 1px)` to absorb the 1px border-width bump so the layout doesn't shift (`ChooserStep.css:46-52`).
- **Card title row** (`.chooser__card-title`): label font (14px / 600 / 1.4), `display: flex; align-items: center; gap: var(--space-sm);` — hosts the optional "Coming soon" badge (`ChooserStep.css:54-61`).
- **Card description** (`.chooser__card-desc`): label size (14px) but body weight (400) and body line-height (1.5), `color: var(--color-text-muted)` — visually de-emphasized helper text (`ChooserStep.css:63-68`).
- **"Coming soon" badge** (`.chooser__badge`): `font-size: 12px`, `font-weight: 600`, `padding: 2px var(--space-sm)`, `border-radius: 4px`, `background-color: #f1f5f9` (slate-100), `color: var(--color-text-muted)`, `border: 1px solid #cbd5e1` (slate-300) — neutral pill, no accent color (`ChooserStep.css:70-80`). Only attached to the `both` workflow per `COMING_SOON` in `ChooserStep.tsx:51`.

### Motion contract

- **Card state transitions** (`UploadCard.css:19`, `48`): `transition: opacity 150ms ease-out, transform 150ms ease-out;` on `.card`; `transition: border-color 150ms ease-out;` on the dropzone.
- **Chooser card transitions** (`ChooserStep.css:38`): `transition: border-color 150ms ease-out, background-color 150ms ease-out;`.
- **Button transitions** (`UploadCard.css:161`): `background-color`, `color`, `border-color` all 150ms ease-out.
- **Spinner** (`globals.css:134-148`): CSS-only `@keyframes spin`, 0.8s linear infinite, 32×32 circle, 4px ring with `border-top-color: var(--color-accent)` over `--color-accent-tint` track.

### Adding a new screen

Checklist for keeping new code on-brand:

- Use existing tokens (`--space-*`, `--font-*`, `--color-*`, `--min-target`, `--focus-ring`); never hardcode hex or px values outside the token block.
- Wrap the content in `.page` (or a section that already centers via `align-items: center`).
- Cap width at 560px to match the upload card + chooser; if a new surface needs more room, justify the override in a code comment.
- If you need a native control, keep it `sr-only` and bind it to a styled `<label>` (chooser pattern) or a programmatic `ref.click()` (file-input pattern).
- Reuse `.btn` + `.btn--{primary,outline,ghost}` for any action; add a new variant only when the action semantics differ.
- Add a new section to this file (or to the per-component `*.css`) only after the existing tokens are exhausted.
