# marketing-landing (delta)

## MODIFIED Requirements

### Requirement: Static honest demo renders status pills in the resolved locale

The landing checklist demo SHALL render each status pill label in the visitor's
resolved locale. When the locale is English, the pill labels SHALL be the English
strings from `en.checklist.statusLabel` (Met, Partial, Coverable, Gap, Overclaim
risk). When the locale is Ukrainian, the labels SHALL be the Ukrainian strings from
`ua.checklist.statusLabel`. The locale SHALL be threaded from `ChecklistPreview`
through `ChecklistRow` to `StatusPill` without relying on a hard-imported dictionary
inside the component. Implements NFR-I18N-01, FR-SALES-02, FR-CHECKLIST-02.

#### Scenario: EN visitor sees English pill labels

- **WHEN** a visitor with a `locale=en` cookie opens the landing page
- **THEN** the checklist demo status pills show English labels: "Met", "Partial",
  "Coverable", "Gap", "Overclaim risk"
- **AND** no Ukrainian text appears in the status pills

#### Scenario: UA visitor sees Ukrainian pill labels

- **WHEN** a visitor with no `locale` cookie (or `locale=ua`) opens the landing page
- **THEN** the checklist demo status pills show Ukrainian labels from
  `ua.checklist.statusLabel`
- **AND** the default behavior is unchanged from before this fix

#### Scenario: StatusPill without a locale prop defaults to Ukrainian

- **WHEN** `StatusPill` is rendered without a `locale` prop (any non-landing caller)
- **THEN** it resolves labels from `ua.checklist.statusLabel`, preserving the
  existing Ukrainian-first default for all existing call sites
- **AND** no TypeScript error is introduced (the prop is optional)

#### Scenario: Locale threading does not alter pill appearance

- **WHEN** the locale changes from `ua` to `en` or back
- **THEN** only the text label of the pill changes; color, dot, size, and spacing
  remain identical across both locales
