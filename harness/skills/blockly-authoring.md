---
name: blockly-authoring
description: Project-specific patterns and decisions for authoring Google Blockly blocks, the toolbox, serialization, and the Zelos renderer in the Transon Visual Editor. Use when defining or generating blocks, building the toolbox/palette, wiring workspace serialization, or configuring the renderer/theme.
disable-model-invocation: true
---

# Blockly authoring

How this project uses Google Blockly. Captures the **locked decisions** and the **anti-staleness
rule**: never copy version-specific API from memory — fetch current Blockly API via the **Context7
MCP** (the project MCP config) or the official docs (links below). Cite the SPEC/AD ID for choices.

## Locked decisions (do not relitigate)

- **JSON serialization is canonical** (AD-003, AD-016). Use Blockly's **JSON serialization API**
  (`Blockly.serialization.workspaces.save/load`), **never** the deprecated XML API (`Blockly.Xml`).
  Workspace state is a *projection*; the Transon JSON is the source of truth.
- **Blocks are generated from metadata** (AD-012, AD-014). Generic block definitions are produced at
  runtime from the engine `get_editor_metadata()` export. Specialized TS overrides are selected by
  `rule_name`/`variant_id` via a registry that resolves specialized over generic — and **generic and
  specialized MUST emit identical Transon JSON per variant**. Do not hand-maintain a block catalog.
- **Variants over hidden modes** (AD-015). One palette block per parameter shape; never a hidden mode
  dropdown. Dropdowns only for small constant choices (operator/function names, enums; FR-058).
- **Zelos renderer by default** (AD-017), exposed/themeable via the theming hook (FR-108).
- **Light DOM + scoped/prefixed CSS** (AD-018) — do not rely on shadow DOM encapsulation by default.
- **UI ≠ semantics** (§21.12). Keep Blockly-only metadata (coordinates, collapsed state, comments)
  out of the executable Transon JSON.

## Authoring workflow

```
- [ ] 1. Read the rule/variant metadata from the engine export; derive inputs from required/modes.
- [ ] 2. Define the block as JSON (define-blocks JSON format); add a specialized override only if the
         generic shape is insufficient — and prove identical JSON output (AD-014).
- [ ] 3. Label with friendly title + rule name, e.g. `Get attribute (attr)` (§12.5).
- [ ] 4. Mark required inputs; a variant missing them is visually invalid and must not export valid
         (FR-056/057). Output types are advisory hints only — never override engine validation (AD-013).
- [ ] 5. Place in the canonical toolbox category (§12.4); honor the advanced flag + palette search (§12.6).
- [ ] 6. Round-trip through editor-core; equivalence is execution-based, not textual (AD-011).
```

When you need exact current API (block JSON fields, field types, mutators/extensions, renderer or
theme options, serialization hooks), **look it up via Context7 first** — the Blockly version is
pinned at M0 (ROADMAP §"Version pins"), so memorized snippets may be stale.

## Reference docs (verify against the pinned version via Context7)

- Blockly home: https://developers.google.com/blockly
- Serialization (JSON): https://developers.google.com/blockly/guides/configure/web/serialization
- Define custom blocks: https://developers.google.com/blockly/guides/create-custom-blocks/define-blocks
- Toolbox: https://developers.google.com/blockly/guides/configure/web/toolbox
- Renderers: https://developers.google.com/blockly/guides/configure/web/renderers
- Themes: https://developers.google.com/blockly/guides/configure/web/themes
- Fields: https://developers.google.com/blockly/guides/create-custom-blocks/fields/built-in-fields
- Extensions & mutators: https://developers.google.com/blockly/guides/create-custom-blocks/extensions

For the round-trip/runtime-safety checklist on Blockly-touching changes, use the
`round-trip-review` skill.
