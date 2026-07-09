# Fix checklist pill i18n on the landing

## Why

The landing page has a full UA/EN locale mechanism (from `add-language-toggle`) and
fully extracted i18n strings (from `extract-landing-i18n`). Despite this, the
checklist demo status pills on the landing always render Ukrainian labels, even when
a visitor has selected English. An EN visitor sees "Підтверджено", "Можна підсилити",
"Прогалина" — raw Ukrainian text that was never intended to be visible in the English
locale.

The root cause is a single hard-import in `StatusPill`. Line 32 of
`src/shared/ui/status-pill/ui/StatusPill.tsx` reads:

```
const text = label ?? ua.checklist.statusLabel[status];
```

It unconditionally imports the `ua` dictionary and ignores any locale context. The
label resolution chain is: `ChecklistPreview` (receives `locale`) calls `ChecklistRow`
(drops `locale`, never forwards it) calls `StatusPill` (reads `ua` directly). The
locale never reaches the component that needs it.

The English labels already exist in `en.checklist.statusLabel` (Met / Partial /
Coverable / Gap / Overclaim risk) and are covered by existing i18n tests. No new
copy is required. Implements NFR-I18N-01, FR-SALES-02, FR-CHECKLIST-02.

## What Changes

- **`StatusPill`** gains an optional `locale?: Locale` prop. When present, the label
  is resolved via `t(locale).checklist.statusLabel[status]` instead of the hard-coded
  `ua` import. When omitted, the component defaults to `"ua"` (Ukrainian-first, no
  breaking change for non-landing callers that do not pass a locale).
- **`ChecklistRow`** gains an optional `locale?: Locale` prop and forwards it to the
  `StatusPill` it renders. When omitted, it defaults to `"ua"`.
- **`ChecklistPreview`** (landing) passes its resolved `locale` to each `ChecklistRow`.
  The prop already exists on `ChecklistPreview`; only the forwarding call site changes.

## Capabilities

### Modified Capabilities

- `marketing-landing`: the checklist demo status pills render in the resolved visitor
  locale (English labels for EN visitors, Ukrainian for UA visitors) rather than
  always in Ukrainian.

## Impact

- `src/shared/ui/status-pill/ui/StatusPill.tsx` — add `locale` prop; resolve label via
  `t(locale)` instead of `ua`.
- `src/shared/ui/checklist-row/ui/ChecklistRow.tsx` — add `locale` prop; forward to
  `StatusPill`.
- `src/views/landing/ui/ChecklistPreview.tsx` — forward `locale` to each `ChecklistRow`.
- Tests: existing `StatusPill` + `ChecklistRow` tests need a locale-forwarding assertion;
  a new scenario confirms EN renders English labels.
- **NFR-I18N-01:** the fix closes the gap between the locale mechanism and the component
  library for this call chain. No runtime i18n library is introduced; `t()` is the
  existing pure dictionary accessor from `shared/lib/i18n`.
- **TC-PURE-01:** `StatusPill` and `ChecklistRow` remain framework-free presentational
  components. Adding the `locale` prop does not introduce any Next.js or browser
  dependencies.

## Open question (flagged)

`GroundingBadge` (`src/shared/ui/grounding-badge/ui/GroundingBadge.tsx`) has the same
pattern: hardcoded Ukrainian strings in a `config` map, no `locale` prop. It is not
rendered on the landing checklist and is therefore not visible to EN visitors via the
landing path today. Fixing it is out of scope for this change but SHOULD be a follow-up
before any workspace view is localized.
