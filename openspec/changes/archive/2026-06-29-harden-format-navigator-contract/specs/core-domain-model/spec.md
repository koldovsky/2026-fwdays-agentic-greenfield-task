## ADDED Requirements

### Requirement: Reading preferences vocabulary

The model SHALL define a platform-neutral, serializable `ReadingPreferences` shape — the
reading-experience settings a `Navigator` applies (via `applyPreferences`) and a later capability
persists and syncs: an optional reading `theme` (exactly one of `light`, `sepia`, `dark`, `parchment`),
an optional `fontFamily`, an optional numeric `fontSize` (px), an optional numeric `lineHeight`, an
optional `scroll` flag (scrolled flow when true, paginated otherwise), and an optional `rtl` flag. Every
field SHALL be optional so a partial preference update is valid. The type MUST carry no DOM and no
network types so the native client re-expresses it identically; the web-only mapping of these values to
readium-css/foliate styles SHALL live in the format plugin, not in the model.

#### Scenario: ReadingPreferences is plain and serializable

- **WHEN** a `ReadingPreferences` value is constructed
- **THEN** it carries only JSON-native fields (`theme`, `fontFamily`, `fontSize`, `lineHeight`,
  `scroll`, `rtl`), each optional
- **AND** it survives a `structuredClone` / JSON round-trip unchanged and references no DOM or network
  type

#### Scenario: theme is a closed set

- **WHEN** a `ReadingPreferences.theme` is set
- **THEN** the value is exactly one of `light`, `sepia`, `dark`, or `parchment`

#### Scenario: Partial preferences are valid

- **WHEN** only a subset of fields is supplied (e.g. just `fontSize`)
- **THEN** the value is a valid `ReadingPreferences`
- **AND** the navigator applies only the supplied fields, leaving the rest unchanged
