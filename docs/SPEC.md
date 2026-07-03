# SPEC.md — Transon Visual Template Editor

> **Version:** 2.0 · **Status:** Pre-implementation baseline · **Last updated:** 2026-06-27

> **v2.0 — template-driven projection pivot.** The editor surface (palette, toolbox, encoder,
> decoder) is **derived as Transon-template projections of the engine's editor-metadata**, not
> hand-written. Metadata is the single source; the projections are data (templates) executed by the
> host engine (engine-free preserved). This adds the projection requirements **§7.16 (FR-114…FR-121)**,
> **NFR-046/NFR-047**, **AC-034…AC-036**, and **UC-016**, and ratifies open questions **OQ-010…OQ-017**
> ([`ROADMAP.md`](ROADMAP.md) §"Open questions"): compiler-only codec, build-time codegen + runtime
> execution via the host, `switch` **and** `cond` dispatch, the two-pass generate-then-run model, a
> split (structural + examples) metadata payload, toolbox projected from metadata, no `quote`/`raw`,
> and `include` default-marker inheritance. The behavioral requirements below are unchanged in
> *meaning*; their *realization* moves from hand-written TypeScript to projections
> ([`ARCHITECTURE.md`](ARCHITECTURE.md) AD-026…AD-031, superseding AD-014/AD-016). IDs remain
> append-only (§21.1).

> **v1.1 — ratified decisions.** Open questions OQ-001…OQ-009 are closed
> ([`ROADMAP.md`](ROADMAP.md) §"Open questions"). Two reverse the v1.0 drafts and are folded
> in here: **bidirectional JSON editing is in v1** with strict in-surface gating (§7.15, §12.7,
> FR-005, FR-111…FR-113; reverses OQ-001) and **custom rules must additionally provide
> `title`, `category`, and `examples`** ([`metadata-contract.md`](metadata-contract.md) §2.1;
> tightens OQ-004). IDs remain append-only (§21.1).

This document is the source of truth for the **what**: product behavior, use cases, functional
and non-functional requirements, the conceptual domain model, the UX and block models, rule
coverage, and import/export/round-trip semantics. The **how** (architecture, decisions, public
API, intermediate representation, flows, build) lives in [`ARCHITECTURE.md`](ARCHITECTURE.md);
the metadata **shape** in [`metadata-contract.md`](metadata-contract.md); **verification** in
[`traceability.md`](traceability.md); and **sequencing** (milestones, readiness, open
questions, future work) in [`ROADMAP.md`](ROADMAP.md).

Architecture decisions are recorded once, in [`ARCHITECTURE.md`](ARCHITECTURE.md) §3, and cited
here as `AD-xxx`.

## Conventions

This document uses RFC 2119-style keywords:

- **shall** / **must** — a mandatory requirement; an implementation is non-conforming if it is
  not met.
- **should** — a recommendation; deviations are allowed but must be justified and recorded.
- **may** — genuinely optional.

Several requirements are conditioned on metadata or engine behavior:

- **where metadata exposes / where available / where known** — the behavior is mandatory *when*
  the relevant field is present in the metadata ([`metadata-contract.md`](metadata-contract.md)
  §2), and is otherwise not required.
- **where possible** — the behavior is mandatory unless prevented by a documented limitation
  (e.g. the engine does not provide a template location for error mapping); the limitation must
  be recorded, not used as a silent escape hatch.

---

## 1. Purpose

This project defines a visual, drag-and-drop editor for authoring **Transon templates** using
**Google Blockly**.

The editor lets users assemble Transon templates from interlocking visual blocks, in the style of
visual block editors (Scratch, Blockly), while preserving Transon's core model:

```text
JSON input
+ Transon JSON template
→ Transon engine
→ JSON output / side effects
```

The editor is a visual authoring layer over real Transon templates. It must not create a
separate transformation language and must not hide the generated Transon JSON from users.

The primary product goal is to make Transon more accessible to low-code users while remaining
trustworthy for developers who need exact JSON template control, validation, import/export, and
deterministic round-trip behavior.

---

## 2. Problem Statement

Transon templates are powerful because they are JSON-compatible structures composed from
nestable rules: templates are data, can be stored/generated/validated/diffed/executed,
transformation logic composes from small rule invocations, and the engine stays extensible
through rules, operators, and functions.

However, manually authoring complex Transon templates is difficult for users who are not
comfortable with deeply nested JSON. Common pain points:

- rule invocation syntax is easy to mistype;
- nested templates are hard to read, and rule parameters may themselves be templates;
- dynamic vs constant parameters are not always obvious;
- context-sensitive rules such as `item`, `key`, `value`, `index`, and `parent` require
  understanding the current scope;
- `NO_CONTENT` behavior is powerful but hard to reason about visually;
- variable scoping through `set`/`get` is subtle;
- literal JSON objects and marker-based rule invocations can be confused;
- mutually exclusive parameter groups such as `name` vs `names` need clear UX;
- users need fast feedback from examples, validation, and execution.

This project provides a focused visual editor that makes Transon authoring easier without
weakening the underlying template semantics.

---

## 3. Product Scope

Version 1 supports:

- an embeddable Blockly-based visual editor component;
- a sandbox/playground mode with canvas, palette, template JSON, sample input, output, errors,
  and examples;
- a compact editor mode focused on canvas and palette;
- visual blocks for all built-in Transon rules;
- an editor surface (palette, toolbox, encoder, decoder) **derived from engine metadata by Transon-
  template projections** rather than a hand-written mapping layer (§7.16);
- metadata-driven blocks for custom/new rules where metadata is complete, with no editor code change;
- richer presentation for important rules driven by metadata + projection, not per-rule code;
- visual blocks for JSON literals, arrays, and objects, and for nested templates;
- import from and export to Transon JSON templates;
- strict semantic round-trip for supported templates;
- a generated JSON preview and editable sample input (sandbox mode);
- live execution preview and engine-backed static validation using a host-provided Transon
  engine (§10.4, AD-008);
- display of validation/runtime errors, mapped back to blocks where possible;
- block tooltips and examples derived from engine-generated metadata where possible;
- no backend persistence; manual import/export/copy/download workflows.

The editor is designed as a reusable component that can later be embedded into the Transon
documentation site, an interactive playground, an internal low-code tool, or a larger
transformation-authoring product.

---

## 4. Non-Scope

Version 1 must not become a general workflow automation platform. The following are explicitly
out of scope for v1:

- backend user accounts, persistence, or a project/template database;
- collaborative or real-time multi-user editing;
- template or plugin marketplaces;
- a visual workflow builder unrelated to Transon, or multi-step orchestration outside Transon
  template semantics;
- scheduled execution;
- external API calls except loading documented Transon artifacts;
- arbitrary Python authoring in the UI, or authoring new Python rules/operators/functions
  visually;
- a production execution service for stored templates;
- role-based access control or approval workflows;
- Git-backed storage or public sharing links;
- automatic migration of arbitrary unsupported or future Transon syntax;
- direct bidirectional editing of generated JSON unless explicitly approved later;
- hiding the generated JSON from users;
- replacing the Transon documentation site.

The product remains a visual Transon template editor, not an automation platform, no-code
backend, or general-purpose visual programming environment.

---

## 5. Target Users

### 5.1 Low-Code Template Author

Understands the desired JSON transformation but may not be comfortable writing deeply nested
Transon JSON. Creates templates visually, connects rules and values, provides sample input,
inspects output, fixes errors, and exports the result. Needs visual rule categories, clear
labels, rule blocks projected from metadata, tooltips, examples, safe connections, immediate
feedback, and readable generated JSON.

### 5.2 Developer Integrating Transon

Already understands JSON and needs a safer, faster way to create, debug, explain, or
demonstrate Transon templates. Imports existing templates, verifies generated JSON, tests
against sample inputs, inspects errors, and integrates the component. Needs strict semantic
round-trip, accurate generation, reliable import/export, engine-backed validation, visibility
into rule semantics, a stable component API, and no hidden semantics.

### 5.3 Documentation / Example Maintainer

Keeps Transon examples, documentation, and the playground consistent. Maintains rule docs and
the example corpus, exposes rule metadata to the editor, and keeps the editor aligned with
engine releases. Needs metadata reuse, minimal duplicate documentation, examples attached to
rules/parameters, and compatibility checks against the current engine version.

### 5.4 Rule Author / Extension Author

Adds a new Transon rule, operator, or function. Implements behavior, provides structured
metadata and examples, and ensures the rule can be validated and documented. Needs a clear
metadata contract and automatic editor availability for new rules across all surfaces by metadata
alone — no editor code or projection-template changes — with richer UX driven by richer metadata
(AD-026, FR-120).

### 5.5 Embedding Application Developer

Embeds the editor into another web application. Configures options, provides initial
template/input, receives exported template and execution results, and decides where
import/export controls live. Needs a stable component API, clear input/output contracts,
theming hooks, event callbacks, version-compatibility info, and documented limitations.

---

## 6. Core Use Cases

### UC-001 — Create a simple template visually

A user drags blocks onto the canvas, connects them, and creates a valid Transon template.

```json
{ "$": "attr", "name": "customer" }
```

The editor shows the generated JSON and validates it successfully.

### UC-002 — Build a nested object output

A user visually creates an output object with literal fields and Transon-derived values.

```json
{
  "$": "object",
  "fields": {
    "id": { "$": "attr", "name": "id" },
    "email": { "$": "attr", "names": ["customer", "email"] },
    "source": "crm"
  }
}
```

The editor represents the object as a visual structure, not only as raw text.

### UC-003 — Import existing Transon JSON

A user pastes or uploads a Transon JSON template. If it is within the supported template
surface (§15.7), the workspace is created and the generated JSON is semantically equivalent to
the import. Otherwise the editor reports a clear import error.

### UC-004 — Export generated Transon JSON

A user edits the visual blocks and exports the generated Transon JSON, usable directly with the
engine.

### UC-005 — Round-trip a supported template

A user imports a supported template, makes no changes, and exports it; the result is
semantically equivalent to the import. UI-only/formatting attributes (§11.5) need not be
preserved (beyond object key ordering where it affects Transon behavior, §15.3).

### UC-006 — Validate template with the engine

A user clicks validate or edits the workspace. The editor runs Transon static validation
through the host engine and shows errors linked to JSON paths or blocks where possible.

### UC-007 — Execute template against sample input

A user provides sample JSON input. The editor executes the template through the host engine and
shows the output JSON, or the runtime error with the closest known template location.

### UC-008 — Use documentation examples

A user opens an example from the corpus; the editor loads the template, sample input, expected
output, and rule documentation. The user can modify it and see updated output.

### UC-009 — Learn rule behavior through tooltips

A user hovers a rule block or parameter; the editor shows documentation derived from metadata,
including whether a parameter is dynamic or constant where metadata exposes that distinction.

### UC-010 — Work with context-sensitive iteration rules

A user creates a `map` or `filter` and uses `item`, `key`, `value`, or `index` inside the body.
The editor allows context-specific accessor blocks only where they make sense, or warns when
they are used out of scope.

### UC-011 — Represent a literal object containing the marker key

A user needs to emit a JSON object that contains the marker key, e.g. `{ "$": "literal-value" }`.
Because a dict containing the marker key is normally a rule invocation, the editor represents
this through the `object` rule escape mechanism (§11.4).

### UC-012 — Use all built-in rules

A developer can use any built-in rule through visual blocks, including advanced rules such as
`set`, `get`, `chain`, `zip`, `file`, and `include`. Advanced rules may be visually separated
but must be available in v1.

### UC-013 — Add a new rule without editor code changes

A rule author adds a new rule with complete metadata; the editor reads the metadata and creates
a generic palette block that accepts the declared parameters, marks required inputs, generates
and imports Transon JSON, and participates in validation/execution. Specialized UX may be added
later.

### UC-014 — Use sandbox/playground mode

A user opens the editor in sandbox mode (panels per §12.1), loads an example, edits the
template and input data, runs it, and inspects the generated JSON.

### UC-015 — Use compact embedded editor mode

An embedding application opens the editor in compact mode focused on canvas, palette, and
toolbar, and may expose template JSON separately or via a visual/JSON/split view switch.

### UC-016 — Open the editor's own projection template inside the editor (self-hosting)

A maintainer loads one of the editor's projection templates (e.g. the generated encoder, or a
`G_*` generator) as an ordinary Transon template in the editor. Because the projections are
themselves Transon templates (§7.16), they import into the supported surface and round-trip like
any other template — a self-hosting demonstration and a regression test that the editor describes
itself (FR-121, AC-036).

---

## 7. Functional Requirements

### 7.1 Editor Shell and Modes

- **FR-001** The editor shall provide a Blockly-based visual canvas.
- **FR-002** The editor shall provide a sandbox/playground mode presenting the panels defined
  in §12.1 (canvas, palette, generated template JSON, sample input JSON, output JSON,
  validation/runtime errors, examples, and validate/run controls).
- **FR-003** The editor shall provide a compact embedded editor mode focused on canvas and
  palette.
- **FR-004** The compact mode should support switching between visual, JSON, and split views.
- **FR-005** The JSON view supports direct (bidirectional) editing in v1: it shows generated
  output and accepts edits that sync back to the workspace under the strict in-surface rule of
  §7.15.
- **FR-006** The editor shall display validation and runtime errors.
- **FR-007** The editor shall support manual import of a Transon JSON template.
- **FR-008** The editor shall support manual export, copy, and download of a Transon JSON
  template.
- **FR-009** The editor shall support loading built-in examples.
- **FR-132** The Examples picker (FR-009) shall present the example corpus **tiered and grouped**:
  the engine's curated tiers first — **worked examples**, then **recipes**, each in the
  engine-emitted reference-list order ([`metadata-contract.md`](metadata-contract.md) §2.7) —
  followed by the reference examples grouped by owning rule (from the engine-emitted
  rule→example name references, rule-level first with parameter-level references as the
  fallback; examples owned by no rule group last). Each entry shall be
  **labeled** by the first sentence of its engine `doc` (falling back to the case name when the
  doc is absent), while the unique case **name** remains the selection value and stays visible
  (e.g. as a tooltip). Tiering, grouping, and labels are derived mechanically from the
  engine-emitted corpus data (reference lists and docs; tier and rule membership join on the
  **name references**, never on tag string conventions, per
  [`metadata-contract.md`](metadata-contract.md) §2.7) — never from a hand-maintained
  editor-side list (AD-012) — and are presentation-only: they do not alter corpus contents,
  selection semantics (FR-009, AC-018), or a host-supplied `examples` override, which is
  presented through the same mechanical derivation.
- **FR-010** The editor shall be usable as an embeddable component (§7.14).
- **FR-011** The editor shall expose events/callbacks so an embedding application can observe
  template changes, validation results, and execution results.

### 7.2 Blockly Workspace

- **FR-012** The editor shall represent Transon templates as Blockly blocks.
- **FR-013** The editor shall connect rule outputs into rule parameter inputs.
- **FR-014** The editor shall support nested templates.
- **FR-015** The editor shall provide literal JSON blocks for scalars (string, number, boolean,
  null), arrays, and objects.
- **FR-016** The editor shall visually distinguish rule-invocation objects from literal objects.
- **FR-017** The editor shall support block comments/descriptions without affecting generated
  JSON.
- **FR-018** The editor shall not require editing raw Blockly workspace serialization.

### 7.3 Transon JSON Generation

- **FR-019** The editor shall generate valid JSON-compatible Transon templates from the
  workspace.
- **FR-020** The editor shall generate rule invocations using the configured marker key; the
  default marker is `"$"`.
- **FR-021** A rule block shall generate a dict containing the marker key and the rule name.
- **FR-022** Rule parameters shall be generated as sibling keys of the marker key.
- **FR-023** Dynamic rule parameters shall be generated from connected template blocks.
- **FR-024** Constant rule parameters shall be generated as literal values per the rule
  contract.
- **FR-025** Empty optional parameters shall be omitted unless explicitly set.
- **FR-026** Generated JSON shall be stable enough for human review and snapshot testing.

### 7.4 Import from Transon JSON

- **FR-027** The editor shall parse imported Transon JSON into a workspace when the template is
  within the supported surface (§15.7).
- **FR-028** The editor shall detect rule-invocation dicts using the configured marker key.
- **FR-029** The editor shall treat dicts without the marker key as literal JSON objects.
- **FR-030** The editor shall treat dicts with the marker key as rule invocations unless
  expressed through the literal-marker escape.
- **FR-031** The editor shall reject or clearly report unsupported (out-of-surface) templates.
- **FR-032** The editor shall preserve semantic equivalence during import/export for supported
  templates.
- **FR-033** Import errors shall include a template path/location where possible.
- **FR-034** The editor shall not silently rewrite unsupported templates into a different
  meaning.

### 7.5 Round-trip

- **FR-035** The editor shall support strict semantic round-trip for supported templates
  (Transon JSON → workspace → Transon JSON).
- **FR-036** Round-trip equivalence shall be defined semantically, not textually.
- **FR-037** The editor need not preserve the UI-only attributes listed in §11.5.
- **FR-038** The editor shall clearly report when strict round-trip cannot be guaranteed.
- **FR-039** The editor shall include automated round-trip tests across all built-in rules.

### 7.6 Rule Coverage

- **FR-040** The editor shall support all built-in Transon rules, enumerated in §14 and
  categorized in §12.4: `this`, `parent`, `item`, `index`, `key`, `value`, `set`, `get`,
  `attr`, `object`, `map`, `filter`, `zip`, `join`, `chain`, `expr`, `call`, `format`, `file`,
  `include`, `switch`, `cond`. `switch`/`cond` are first-class authored rules (§14.16) like every
  other rule; the generated codec also uses them internally for dispatch (FR-118), which is
  independent of their availability as authored blocks.
- **FR-041** The editor shall support all built-in `expr` operators (§14.14).
- **FR-042** The editor shall support all built-in `call` functions (§14.15).
- **FR-043** The editor shall derive rule names, parameter names, and help text from engine
  metadata where possible.
- **FR-044** The editor shall visually group rules by category (§12.4).

### 7.7 Rule Parameters and Variants

- **FR-045** The editor shall model required parameters.
- **FR-046** The editor shall model optional parameters.
- **FR-047** The editor shall distinguish dynamic from constant parameters where metadata
  exposes that distinction.
- **FR-048** The editor shall support rule-specific parameter documentation.
- **FR-049** The editor shall support parameter-level examples where available.
- **FR-050** The editor shall not invent parameters undeclared by metadata, and shall reject
  unknown parameters on import unless supported through an extension metadata mechanism.
- **FR-051** The editor shall represent mutually exclusive parameter groups as separate Blockly
  block variants rather than one block exposing conflicting parameters (AD-015).
- **FR-052** A block variant maps to a Transon rule and emits one valid parameter shape;
  multiple variants may map to the same rule.
- **FR-053** Each block variant shall define: rule name, visible/required/optional parameters,
  generated JSON shape, import matcher, and contextual helper blocks where applicable.
- **FR-054** On import, the editor shall select exactly one matching block variant by inspecting
  present parameters.
- **FR-055** The editor shall report ambiguous, zero, or partial variant matches rather than
  silently choosing one.
- **FR-056** Required inputs shall be visually marked; a variant with missing required inputs is
  visually invalid.
- **FR-057** The editor shall not export a template as valid while required parameters are
  missing.
- **FR-058** Dropdowns may be used for small constant choices (operator name, function name,
  enum-like parameters).
- **FR-130** A constant-parameter dropdown (FR-058) may present a **curated menu** declared in the
  editor-owned presentation data (metadata-contract §2.9): each entry names the **canonical token**
  it inserts, a display **label**, and the metadata **alias tokens** it covers (e.g. one `==` entry
  covering `eq`), so equivalent spellings collapse into one menu item. The menu shows only curated
  entries in curated order, but the field shall keep **accepting every metadata-valid token** on
  import/load, **display** a non-menu token verbatim, and **preserve it verbatim** through workspace
  serialization and export — curation is display-only and never rewrites the template (AD-004,
  §21.12). Curation shall be **complete**: every curated/alias token must belong to the parameter's
  metadata `options` domain, no token may appear in two entries, and every metadata option must stay
  reachable (featured or aliased) — gated alongside FR-127 so a new engine token fails loudly rather
  than silently vanishing from the menu. An uncurated constant parameter keeps the full metadata
  domain as its menu (FR-058).

### 7.8 Literal Object and Marker Escaping

- **FR-059** The editor shall support emitting a literal object that contains the marker key.
- **FR-060** The editor shall use the `object` rule escape mechanism for literal marker-key
  objects (§11.4).
- **FR-061** The editor shall distinguish a rule invocation, a normal literal object, and a
  literal object containing the marker key.
- **FR-062** The editor shall include tests for literal objects containing `"$"` when the marker
  is `"$"`.
- **FR-063** The editor shall support custom marker keys when configured.
- **FR-123** The literal marker-key object escape (a JSON object carrying the active marker key
  with a `fields` payload, §11.4) shall be owned by the **codec skeleton** and take **precedence**
  over the `object` rule's `fields` variant **when, and only when, the `fields` payload itself
  contains the active marker key** — the case a plain literal cannot express (§11.4). It matches
  **exactly** marker + `fields` with a **marker-bearing payload**; any additional key falls through
  to ordinary rule/surface handling (an undeclared parameter is out of surface, §15.7). A
  `{<marker>: object, fields: X}` whose payload `X` is **marker-free** is the ordinary `object`/
  `fields` **rule** (it builds a dict, omitting `NoContent` values) and shall be projected as the
  rule block `transon_rule_object__fields`, not the literal-object block — so it round-trips as the
  rule rather than collapsing to a bare literal (§15.1). The structural literal-object block type
  shall be **named to avoid collision** with the `object` rule block (e.g. `transon_object_literal`,
  §13.7). A `{<marker>: object, fields: X}` whose payload `X` is **not a mapping** (a scalar incl.
  boolean, a list, or `null`) is malformed — the engine requires `fields` to be a mapping — and is
  **out of surface**: it is emitted as `transon_unsupported` with exact preservation (§15.7, §13.11),
  never a raw codec error.

### 7.9 Validation

- **FR-064** The editor shall validate templates using the host-provided engine (§10.4);
  validation is unavailable when no host engine is supplied.
- **FR-065** Static validation shall use `Transformer.validate()` or the equivalent engine API.
- **FR-066** Validation results shall be displayed in the UI.
- **FR-067** Validation errors shall include the engine error message.
- **FR-068** Validation errors should be mapped to the corresponding block where possible.
- **FR-069** Blockly structural constraints may pre-empt obviously invalid templates before
  engine validation.
- **FR-070** Engine validation is authoritative (NFR-004); the editor shall not report a
  template valid if engine validation fails.

### 7.10 Execution Preview

- **FR-071** The editor shall execute the current template against sample input JSON through the
  host-provided engine (§10.4).
- **FR-072** The editor shall display transformation output as formatted JSON.
- **FR-073** The editor shall display runtime errors, including the engine error message.
- **FR-074** Runtime errors should be mapped to the corresponding block where the engine
  provides template location.
- **FR-075** The editor shall support examples with expected output.
- **FR-076** The editor should indicate whether actual output matches expected output for
  examples.

### 7.11 Documentation, Metadata, and Block Generation

- **FR-077** The editor shall consume engine-owned metadata where available and handle missing
  metadata gracefully.
- **FR-078** The editor should use metadata for rule and parameter labels and tooltips.
- **FR-079** The editor should load examples from the generated example corpus where available.
- **FR-080** The editor shall expose the engine and metadata schema versions in diagnostics.
- **FR-081** The Transon library shall provide sufficient machine-readable metadata for generic
  block generation; the required fields and the export are specified in
  [`metadata-contract.md`](metadata-contract.md) (AD-012).
- **FR-082** A new rule with complete metadata shall not require editor code changes for basic
  availability.
- **FR-083** The editor shall support custom rules, operators, and functions present in engine
  metadata.
- **FR-084** The editor shall generate generic block definitions and toolbox/palette entries
  from metadata and variant definitions.
- **FR-085** Custom/new rule metadata must declare enough information to render a safe block
  ([`metadata-contract.md`](metadata-contract.md) §2).
- **FR-086** If metadata is incomplete, the editor shall render a limited generic block or
  reject the rule with an actionable error.
- **FR-087** The editor shall not provide a UI for authoring Python rule implementations in v1.
- **FR-088** Richer per-rule presentation, where warranted, is expressed through the projection
  templates and metadata (e.g. `cond`-selected widgets, FR-118), not per-rule TypeScript; the
  default projection renders a complete block from metadata alone whenever metadata is sufficient
  (§7.16, `ARCHITECTURE.md` AD-026/AD-031, superseding the AD-014 specialized-override model).
- **FR-089** Generic metadata-generated blocks shall support block label, description, parameter
  inputs, required-input indicators, optional inputs, mutually exclusive variants, JSON export,
  JSON import where the shape matches one variant, and engine-backed validation/execution.
- **FR-090** Generic metadata-generated blocks provide baseline compatibility, not necessarily
  polished low-code UX.
- **FR-127** Catalog, presentation, category, colour, and domain enumerations consumed by the
  projections shall originate **only** from the engine metadata export or from committed
  **projection-template data**; no such enumeration shall be a hardcoded literal in `packages/*/src`
  TypeScript. **Gate:** a source-scan that fails if the §12.4 category names, the category order, the
  category→colour map, or per-rule title/category/advanced appear as TypeScript literals under
  `packages/*/src`; plus a **completeness check** that every metadata rule has a presentation-data
  entry (loud failure). The committed form of the editor-owned presentation data is
  [`metadata-contract.md`](metadata-contract.md) §2.9.

### 7.12 Error Mapping

- **FR-091** The editor shall maintain a mapping between generated JSON paths and blocks.
- **FR-092** The editor shall use the mapping to highlight blocks related to validation errors.
- **FR-093** The editor shall use the mapping to highlight blocks related to runtime errors
  where the engine provides template location.
- **FR-094** The editor shall show the nearest known parent block when exact mapping is
  impossible.
- **FR-095** Error display shall distinguish the categories in the canonical error taxonomy
  (§16.4).
- **FR-122** The generated encoder shall emit, alongside the workspace, a `JsonPathBlockMap`
  correlating each Transon JSON path to the block representing it — and, where a node has no block
  of its own, the nearest enclosing block — produced **as the codec walks**, not by a separate pass.
  Producing the map is in scope wherever the encoder is; consuming it for highlighting is
  FR-092/FR-093/FR-095.

### 7.13 Import / Export UX

- **FR-096** The editor shall allow users to paste template JSON.
- **FR-097** The editor shall allow users to copy generated template JSON.
- **FR-098** The editor should allow users to download generated template JSON as a file.
- **FR-099** The editor should allow loading sample input JSON from examples.
- **FR-100** The editor shall not require backend storage for import/export in v1.
- **FR-101** The editor shall warn about unsaved local changes before replacing the workspace.

### 7.14 Component Embedding

- **FR-102** The component shall accept initial template JSON.
- **FR-103** The component shall accept initial sample input JSON.
- **FR-104** The component shall expose the current generated template JSON.
- **FR-105** The component shall expose validation status.
- **FR-106** The component shall expose execution status and output.
- **FR-107** The component shall support read-only mode.
- **FR-108** The component should support theming hooks.
- **FR-109** The component should support configurable rule categories.
- **FR-110** The component should support a configurable marker key.
- **FR-128** Theming hooks (FR-108) are exposed as scoped CSS custom properties (`--transon-*`)
  applied to the editor's light-DOM root (AD-018); they theme editor **chrome only** — panels,
  toolbar, typography, and surrounding layout. Block and category colours remain **data-driven**
  from the committed presentation data (FR-127, `metadata-contract.md` §2.9) and are **not**
  overridden by theme props in v1, preserving the single-source presentation contract. Theming a
  block's colour is future work (would require a presentation-data or projection change, not a
  theme prop).
- **FR-129** The editor shall render blocks with a conventional **puzzle-connection** renderer
  (thrasos by default, AD-033; renderer configurable per AD-017) and a committed **block-surface
  theme** — a system font and workspace/flyout **surface** colours aligned with the chrome tokens
  (FR-128). Every projected rule block is a **value/output block**, and all value parameters are
  **external inputs** that connect from the side via puzzle sockets (§13.10); the block body holds
  only **fields** (dropdowns for constant params) and the **mutator +/- controls** — no
  inline-embedded values. The theme sets **presentation surface only**: block and category **colours
  stay data-driven** from the presentation projection (FR-127); it declares **no** `blockStyles` or
  `categoryStyles` (§21.12 UI≠semantics). It is the SVG-canvas counterpart to the chrome CSS vars
  (FR-128), which theme the surrounding React panels rather than the Blockly SVG.

### 7.15 Bidirectional JSON Editing

Direct JSON editing was deferred in v1.0 (OQ-001) and is **approved for v1** with a strict
in-surface contract that protects the canonical-JSON and round-trip invariants (AD-003, AD-004,
AD-024).

- **FR-111** The editor shall allow users to edit the generated Transon JSON directly and sync
  accepted edits back to the Blockly workspace.
- **FR-112** Direct JSON edits shall be applied to the workspace only when the edited text is
  valid JSON **and** within the supported surface (§15.7). When either check fails, the editor
  shall report the error (`json_template` or `import_unsupported`, §16.4) and leave the existing
  workspace unchanged.
- **FR-113** While a direct JSON edit is unparsed or rejected, the editor shall not silently
  alter, partially apply, or discard the user's workspace; it preserves the last valid workspace
  and marks the JSON as out of sync until a valid in-surface edit is accepted or reverted.
- **FR-131** While the user is **actively editing** the JSON panel (its text editor retains
  focus), an **accepted** edit syncs to the workspace (FR-111) **without rewriting the panel
  text**: the user's exact text — including its formatting — is preserved so typing is never
  interrupted by a reformat or cursor jump. The panel reflects the canonical generated JSON only
  when editing ends (the editor loses focus) or when the document changes from another source
  (canvas edit, New / Import / Load-Example — which move focus away); a read-only panel (FR-107)
  always mirrors the generated JSON.

### 7.16 Template-Driven Projection Surface

The editor surface is derived from engine metadata by **Transon-template projections**, not by a
hand-written mapping layer (`ARCHITECTURE.md` AD-026, superseding AD-014/AD-016). This subsection
states the projection requirements; they realize the behavior in §7.3–§7.8 and §7.11 rather than
replacing it. Terminology: a **document** is the user's template (the data moved); a **projection**
is a template that does the moving (palette/toolbox/encoder/decoder); **metadata** is the engine's
editor-metadata catalog ([`metadata-contract.md`](metadata-contract.md) §2).

- **FR-114** The editor shall ship four Transon-template projections that derive the editor surface
  from engine metadata: `G_palette` → block definitions, `G_toolbox` → category/toolbox structure,
  `G_encode` → the encoder, `G_decode` → the decoder. The editor surface is `projection(metadata)`.
- **FR-115** The encoder and decoder shall be **generated** from metadata (the compiler model), not
  hand-written, and shall be derived from the **same** metadata source so that encode and decode are
  inverse by construction (round-trip-by-construction, §15.1, AC-035). The editor ships **no**
  interpreter codec (OQ-010 → compiler-only).
- **FR-116** Generator templates shall be staged with a distinct **meta-level marker** (`@`) that
  emits **object-level** (`$`) codecs: `@`-keyed dicts are evaluated during generation and `$`-keyed
  structure is emitted verbatim (quoting via the configurable marker, `ARCHITECTURE.md` AD-027).
  Generators shall be factored with `include` into per-rule fragments, each a pure function of the
  context value; the engine resolves staged includes with **default-marker inheritance** from the
  parent (OQ-014, [`metadata-contract.md`](metadata-contract.md) §6).
- **FR-117** The generated codec shall be a fixed generic **skeleton** wrapping
  **metadata-projected per-rule arms** (`ARCHITECTURE.md` AD-028). The skeleton owns the invariants
  not derivable from metadata: recursion over nested nodes, literal passthrough of non-rule JSON, the
  marker-escape rule (§11.4), ordering preservation (§13.12, §15.3), the supported-surface check
  (§15.7), and the out-of-surface exact-preserving placeholder (§13.11). Only the per-rule dispatch
  arms, param↔input wiring, and variant selection are projected.
- **FR-118** The generated codec shall dispatch per node using the engine `switch`/`cond` rules
  (`ARCHITECTURE.md` AD-029): `switch` on rule name (encode) / block type (decode), `cond` for
  predicate dispatch such as deriving the input-widget (`input`/`dropdown`/`field`) from the metadata
  facts (`kind` + presence of `options`). Only the selected branch is evaluated (lazy dispatch); the
  widget decision is made in the projection, never baked into the engine export (§10.2, AD-012).
- **FR-119** The projections shall be compiled at **build time** into **committed codec artifacts**
  (encoder/decoder templates + palette/toolbox definitions), and those artifacts shall be executed at
  **runtime** via the host-provided engine using the two-pass generate-then-run model (§10.4,
  `ARCHITECTURE.md` AD-030). The editor shall bundle no engine and shall not `eval` data as a template.
- **FR-120** A new rule (built-in or custom) with complete metadata
  ([`metadata-contract.md`](metadata-contract.md) §2) shall appear across **every** surface —
  palette, toolbox, encoder, decoder, validation, and execution — with **no editor code change and
  no projection-template change**; only metadata changes. This restates and strengthens FR-082 and
  AC-028 for the projection model.
- **FR-121** The projection templates shall themselves be valid Transon templates within the
  supported surface (§15.7), openable and round-trippable in the editor they configure
  (self-hosting; UC-016, AC-036).
- **FR-124** The generated encoder's output shall be valid **Blockly workspace-serialization JSON**
  conforming to a fixed block vocabulary, asserted as a **checked invariant over the round-trip
  corpus (§15.8)** — not only indirectly via round-trip identity (AC-035). The vocabulary:
  - rule invocations as **`transon_rule_<rule>__<variant>`** blocks (`<rule>` ∈ §14; `<variant>` a
    declared variant), with declared params placed as block **fields** (constant params) or **value
    inputs** (dynamic params) per FR-118;
  - the structural block types **`transon_literal`**, **`transon_array`**,
    **`transon_object_literal`**, and **`transon_unsupported`** (the exact-preserving out-of-surface
    placeholder, §13.11).

  The block-type vocabulary and the field-vs-input rule are normative; exact serialization details
  (extra-state for dynamic item counts / object keys, input index naming) are implementation-level.
  The editor shall assert this shape over §15.8 so a malformed-but-loadable block cannot pass
  silently.
- **FR-125** The block definitions produced by `G_palette` shall be **valid, loadable** Blockly
  (Zelos) definitions: every rule with complete metadata (FR-085) yields a definition that loads and
  instantiates without error (consistent message↔args, well-formed input/field/connection types),
  verified by an **automated headless gate**. Incomplete metadata follows FR-086.
- **FR-126** The generated **encoder shall emit, and the decoder shall consume, Blockly
  workspace-serialization JSON directly**: there is **no editor-defined intermediate representation**
  between the codec and the workspace, and the editor ships **no hand-written code that translates
  codec output into workspace JSON or back** (realizes FR-114/FR-117, §5.4,
  [`ARCHITECTURE.md`](ARCHITECTURE.md) AD-026, AD-032). The field-vs-input disposition (FR-118) is
  computed **once**, in the `G_encode` projection arm. The **decoder is the structural inverse**: it
  reads the rule and variant from the `transon_rule_<rule>__<variant>` block type and reconstructs
  params from the block's fields ∪ inputs keyed by param name; it shall **not** re-derive the
  disposition — so it is derived exactly once, in either direction. **Gates:** (a) the FR-124
  workspace-shape validator over the §15.8 corpus; (b) a headless gate that the encoder output loads
  via Blockly's workspace deserialization without error; (c) a **repo-scan** asserting no module
  under `packages/*/src` maps codec artifacts to or from a `{type, inputs, fields}` block structure.

The Blockly **behavior** that JSON cannot express (field validators, custom field widgets, mutator
UI, connection rules, change events) is handled by a finite, **rule-agnostic** runtime that does not
grow per rule (NFR-046, `ARCHITECTURE.md` AD-031); this is the structure/behavior boundary of §13.

---

## 8. Non-Functional Requirements

### 8.1 Correctness

- **NFR-001** The editor shall preserve Transon semantics.
- **NFR-002** The editor shall not silently change template meaning.
- **NFR-003** The generated template shall be executable by the Transon engine.
- **NFR-004** Engine validation shall be the authoritative source of truth. This is the
  canonical statement of the "engine is authoritative" principle referenced by FR-070, AD-003,
  AD-008, and §21.
- **NFR-005** Import/export behavior shall be covered by automated tests.

### 8.2 Usability

- **NFR-006** The editor shall be understandable for low-code users.
- **NFR-007** Common rules shall be easy to discover.
- **NFR-008** Advanced rules shall remain available without overwhelming beginners.
- **NFR-009** Error messages shall be actionable.
- **NFR-010** Users shall always be able to inspect generated JSON.
- **NFR-011** Tooltips shall be available for rules and parameters where documentation exists.
- **NFR-012** Structurally different rule shapes should be represented as separate palette
  blocks instead of hidden dropdown modes.
- **NFR-013** Generic metadata-generated blocks are acceptable for baseline compatibility but
  should not degrade UX for common built-in rules.

### 8.3 Learnability

- **NFR-014** The editor shall support example-driven learning.
- **NFR-015** Examples shall include template, input data, and expected output where available.
- **NFR-016** Rule blocks shall explain how they map to Transon JSON.
- **NFR-017** Documentation shown in the editor should stay synchronized with engine metadata.

### 8.4 Maintainability

- **NFR-018** The editor shall avoid duplicating Transon rule documentation where metadata can
  be generated.
- **NFR-019** The editor shall avoid hardcoding rule behavior beyond what is necessary for block
  shape and UX.
- **NFR-020** Rule/block definitions shall be testable independently.
- **NFR-021** The editor shall have snapshot tests for generated templates.
- **NFR-022** The editor shall have round-trip tests for all built-in rules.
- **NFR-023** The editor shall make it easy to add support for future Transon rules.
- **NFR-024** New rules with complete metadata should be available without editor code changes.
- **NFR-046** The rule-agnostic Blockly behavior runtime (`ARCHITECTURE.md` AD-031) shall remain
  **finite and shall not grow per rule**: a new rule is supported through metadata + projections
  alone, and only a brand-new interaction primitive may touch this runtime. Verified by a check that
  the behavior-runtime surface does not gain per-rule branches as the catalog grows (§19,
  [`traceability.md`](traceability.md)).
- **NFR-047** The metadata consumed by the projections shall stay lean: the export is split into a
  **structural catalog** (consumed by the generators) and a separate **examples/docs payload**
  (OQ-015, [`metadata-contract.md`](metadata-contract.md) §2). Generators read only the structural
  catalog so projection input stays small.
- **NFR-048** The §12.4 category set, its order, and the category→colour mapping shall have
  **exactly one** committed source consumed by all projections (palette, toolbox, colour). **Gate:**
  the FR-127 scan plus assertions that the toolbox and colour projections contain no inline category
  enumeration.

### 8.5 Performance

- **NFR-025** The editor should remain responsive for typical documentation/playground-sized
  templates.
- **NFR-026** Validation should not block editing for long-running operations.
- **NFR-027** Execution preview should debounce frequent edits where auto-run is enabled.
- **NFR-028** Where a host provides an engine runtime, the editor should surface its
  initialization/loading state (§10.4).
- **NFR-029** Large templates should not make the canvas unusable within reasonable limits.

### 8.6 Security

- **NFR-030** The editor shall not execute arbitrary user-provided Python outside the engine
  runtime.
- **NFR-031** The editor shall not transmit user template or input data anywhere except to the
  host-provided engine across the runtime boundary (§10.4); whether that engine is local is a
  property of the host the embedder chooses and must be disclosed by the host.
- **NFR-032** The editor shall not send user data to a backend service of its own in v1.
- **NFR-033** The editor shall not persist user templates remotely in v1.
- **NFR-034** Remotely loaded examples shall be treated as data, not executable application code.
- **NFR-035** The `file` rule shall not write to the local filesystem during browser preview.

### 8.7 Compatibility

- **NFR-036** The editor shall declare compatible Transon engine versions.
- **NFR-037** The editor shall declare compatible metadata schema versions.
- **NFR-038** The editor shall detect version mismatches where possible.
- **NFR-039** The editor should fail safely if rule metadata and engine behavior disagree.
- **NFR-040** The editor shall rely on a stable, versioned editor metadata schema
  ([`metadata-contract.md`](metadata-contract.md) §5).

### 8.8 Deployability

- **NFR-041** The editor shall be buildable as a static frontend artifact.
- **NFR-042** The editor shall not require a backend for v1 operation.
- **NFR-043** The editor shall be embeddable into the documentation site or another React app.
- **NFR-044** The editor shall be usable in a standalone demo application.

### 8.9 Accessibility

- **NFR-045** The editor should meet baseline accessibility: keyboard navigation where Blockly
  supports it, readable contrast, visible focus states, error messaging that does not rely on
  color alone, and screen-reader labels for major panels where feasible (verified by §19.5).

---

## 9. Domain Model

### 9.1 TransonTemplate

The canonical executable template. Conceptual fields: `json`, `marker`, `transon_version`,
`metadata_version`, `created_from_workspace`, `round_trip_status`. The exported artifact is the
JSON template itself; additional metadata may be stored separately but must not be required for
execution.

### 9.2 BlocklyWorkspace

The visual editing model. Conceptual fields: `blocks`, `connections`, `coordinates`,
`collapsed_state`, `comments`, `selection`, `zoom`, `ui_metadata`. Not canonical for execution.

### 9.3 EditorSession

One in-browser editing session: `workspace`, `template_json`, `sample_input_json`,
`execution_output_json`, `validation_status`, `execution_status`, `errors`, `selected_example`,
`marker`, `engine_version`, `metadata_version`, `editor_mode`.

### 9.4 RuleMetadata

Engine metadata describing a rule (shapes per [`metadata-contract.md`](metadata-contract.md)
§2.1): `name`, `title`, `description`, `category`, `advanced`, `params` (each a
`ParameterMetadata`), `required_params` (engine `_required`; the single source of
required-ness), `modes` (engine `_modes`; the single source from which `variants` derive),
`variants` (derived `RuleVariantMetadata`), `examples`, `constraints`. Per-parameter
dynamic/constant lives in `params[].kind`.

### 9.5 ParameterMetadata

Describes a rule parameter (per [`metadata-contract.md`](metadata-contract.md) §2.2): `name`,
`title`, `description`, `kind` (one of `dynamic` or `constant`), `examples`. Required-ness is
derived from the owning rule's `required_params` and `modes`, not stored per parameter.

### 9.6 RuleVariantMetadata

Describes one valid parameter shape for a rule as a **pre-derived variant signature**: `id`,
`rule_name`, `title`, `description`, `required_params`, `optional_params`, `visible_params`,
`contextual_blocks`, `advanced`. Under the projection model these signatures (ordered visible
params, each flagged `required`) are derived **in the engine export** and consumed directly by the
generators ([`metadata-contract.md`](metadata-contract.md) §2.5, FR-116); the editor never derives
them in code, and there is no separate generated-shape or import-matcher structure — the generated
codec dispatches on the signature itself (AD-028, AD-029).

```yaml
rule: attr
variants:
  - id: one_attribute
    title: Get one attribute
    required_params: [name]
    optional_params: [default]
  - id: deep_attribute_path
    title: Get deep attribute path
    required_params: [names]
    optional_params: [default]
```

### 9.7 BlockDefinition

Editor-side block descriptor **projected from metadata** by `G_palette`/`G_toolbox` (AD-026):
`block_type`, `label`, `rule_name`, `variant_id`, `inputs`, `output_type`, `category`, `advanced`,
`tooltip`. Every block is projected the same way — there is no `source` taxonomy and no
generic-vs-specialized split (that was the superseded AD-014 override registry). Block *behavior*
that JSON cannot express is supplied by the finite, rule-agnostic behavior runtime (AD-031, NFR-046),
not by per-rule authored block modules.

### 9.8 ExampleCase

A documentation/playground example: `name`, `doc`, `tags`, `template`, `data`, `result`,
`rule`, `param`.

### 9.9 ValidationResult

`status`, `valid`, `error_type`, `error_message`, `template_path`, `block_id`,
`raw_engine_error`.

### 9.10 ExecutionResult

`status`, `success`, `output`, `error_type`, `error_message`, `template_path`, `block_id`,
`files_written`, `raw_engine_error`.

### 9.11 ImportResult

`status`, `success`, `workspace`, `errors`, `warnings`, `unsupported_paths`,
`round_trip_guaranteed`.

### 9.12 JsonPathBlockMap

`template_path`, `block_id`, `rule_name`, `parameter_name`, `nearest_parent_block_id`.

---

## 10. Configuration and Metadata Model

### 10.1 Metadata Source

The metadata source is Transon itself. The required fields and the engine-owned export are
specified in [`metadata-contract.md`](metadata-contract.md) (AD-012). The editor shall not
independently maintain the authoritative rule catalog. The export is **projection-ready** (it
carries pre-derived variant signatures and resolved enum domains, [`metadata-contract.md`](metadata-contract.md)
§2.5–§2.6) and **split** into a structural catalog + examples/docs payload (NFR-047). The
generators that turn this metadata into the editor surface are implementation detail; see
[`ARCHITECTURE.md`](ARCHITECTURE.md) §5.4–§5.8.

### 10.2 Minimum Metadata Contract

The required rule, parameter, operator, and function metadata fields are defined once in
[`metadata-contract.md`](metadata-contract.md) §2 (rule fields §2.1, parameter fields including
`kind` §2.2, operator §2.3, function §2.4). That document is the single source of truth for the
metadata shape.

### 10.3 Incomplete Metadata

If metadata is incomplete: built-in rules are covered by the engine-owned export (AD-012) and
any residual gap is surfaced in diagnostics and fixed engine-side; custom rules may be rejected
or rendered as limited generic blocks; missing metadata is visible in diagnostics and tracked as
a Transon-library issue, never silently worked around. For a **custom** rule to be rendered as a
safe (non-limited) block, its metadata must additionally provide `title`, `category`, and
`examples` (OQ-004; [`metadata-contract.md`](metadata-contract.md) §2.1) — these are
editor-owned for built-ins but required from custom-rule authors.

### 10.4 Runtime Host Boundary

The editor owns no engine runtime (AD-008). Validation, execution, `include` resolution, and
`file`-write capture are provided by the embedding host through an injected engine across a
single boundary. The interface (`TransonEditorHost`, `EngineProvider`) is defined in
[`ARCHITECTURE.md`](ARCHITECTURE.md) §5.2–§5.3. Behavioral expectations:

- the editor passes the generated template, sample input, marker, and an include resolver to the
  host engine, and consumes `ValidationResult` / `ExecutionResult` (the latter including
  captured `file` writes);
- the **visual ⇄ JSON projection runs the generated codec through the host engine** (AD-026,
  AD-030): generating Transon JSON from the workspace (the decoder, §5.4), syncing edited/imported
  JSON back into blocks (the encoder, §7.15), and producing the `JsonPathBlockMap` (§9.12) are all
  engine-backed. Therefore, without a host engine — or before it reaches `ready` — these are
  unavailable along with validation and execution; what remains is block **authoring** (placing and
  connecting blocks on the canvas) and **raw JSON text** handling (copying or downloading already
  generated text, and typing into the JSON panel without sync). The editor surfaces the engine
  runtime status (idle/loading/ready/failed, NFR-028, AC-023) so the gated actions are explained
  rather than silently inert. *(Earlier drafts described the superseded hand-written-codec model
  (AD-014/AD-016), in which generation/import were engine-free; under the projection model they are
  not.)*
- the host engine is the authoritative validator/executor (NFR-004); the editor must not report
  validity the host did not confirm.

---

## 11. Template / Workspace Model

### 11.1 Canonical Template

The canonical executable artifact is Transon JSON, e.g. `{ "$": "attr", "name": "email" }`.

### 11.2 Rule Invocation

A rule invocation is a JSON object containing the configured marker key (default `"$"`):

```json
{ "$": "attr", "name": "email" }
```

### 11.3 Literal Object

A literal object without the marker key is walked recursively as a JSON object:

```json
{ "name": { "$": "attr", "name": "name" }, "source": "crm" }
```

### 11.4 Literal Object Containing Marker Key (canonical escape)

A literal object that must contain the marker key is emitted through the `object` rule in
`fields` mode. Intended output `{ "$": "literal-value" }` is produced by:

```json
{ "$": "object", "fields": { "$": "literal-value" } }
```

This is the single canonical description of the literal-marker escape, referenced by FR-060,
FR-061, UC-011, §15.5.

The escape applies **only** when the `fields` payload contains the marker key (as above) — that is
the case a plain literal object cannot express directly. A `{ "$": "object", "fields": X }` whose
payload `X` does **not** contain the marker key is the ordinary `object`/`fields` **rule** (it
builds a dict and omits `NoContent` values, which a plain literal does not), and is projected as
the rule block, not the escape (FR-123). Both forms round-trip to `{ "$": "object", "fields": X }`.

### 11.5 Workspace Projection (canonical UI-only attributes)

Blockly workspace state is a projection of the Transon template. The editor may keep UI-only
metadata: block positions, collapsed state, comments, selected block, zoom, visual grouping, and
whitespace/JSON formatting of the generated text. This metadata is not part of the executable
template and need not be preserved across round-trip (§7.5). This is the canonical list of what
the editor treats as UI-only.

### 11.6 Export Contract

Export produces the canonical Transon JSON template. v1 exports the canonical Transon JSON
**only** (OQ-002): no workspace/UI-state bundle is produced, keeping the JSON the single source
of truth (AD-003). A separate editor-state bundle (`{ template, workspace, editor_metadata }`)
remains future work.

### 11.7 Import Contract

Import consumes Transon JSON. For supported templates, it produces a workspace whose generated
JSON is semantically equivalent to the import. For unsupported templates, it fails with a clear
error instead of silently changing meaning.

---

## 12. Editor UX Model

### 12.1 Sandbox / Playground Mode (canonical panel set)

The full playground/dev/demo experience. Recommended layout:

```text
┌──────────────────────┬──────────────────────┐
│ Palette              │ Template JSON         │
├──────────────────────┼──────────────────────┤
│ Blockly Canvas       │ Input JSON            │
│                      ├──────────────────────┤
│                      │ Output / Errors       │
│                      ├──────────────────────┤
│                      │ Files produced        │
└──────────────────────┴──────────────────────┘
```

Sandbox mode includes: canvas, palette, generated template JSON (editable per §7.15, §12.7),
input JSON, output JSON, validation/runtime errors, a "Files produced" panel (§12.11), examples,
and run/validate controls. This is the canonical panel set referenced by FR-002, UC-014, AC-031.
The "Files produced" panel is shown when a template can emit `file` writes; it may be collapsed
or hidden when empty.

### 12.2 Compact Embedded Editor Mode

The embeddable visual editor experience: toolbar plus palette + canvas, with an optional
`Visual | JSON | Split` view switch. The JSON view supports direct editing with strict
in-surface sync back to blocks (§7.15); an embedding may still opt the component into read-only
mode (FR-107).

### 12.3 Toolbar Actions

New; Import Template; Export / Copy Template; Validate; Run; Load Example; Reset Example; Format
JSON; Toggle Advanced Blocks; Toggle View (Visual / JSON / Split) where enabled.

### 12.4 Blockly Toolbox Categories (canonical category set)

This is the single canonical category set and rule-to-category mapping; the rule coverage in §14
references it rather than defining competing taxonomies.

| Category | Rules / blocks |
|----------|----------------|
| Input / Context | `this`, `parent`, `item`, `index`, `key`, `value` |
| Variables | `set`, `get` |
| Data Access | `attr` |
| Objects / Arrays | `object`; literal array and object blocks |
| Iteration | `map`, `filter` |
| Composition | `chain`, `zip`, `join` |
| Computation | `expr`, `call` |
| Control Flow | `switch`, `cond` |
| Formatting | `format` |
| Side Effects | `file` |
| Includes | `include` |
| Literals | string, number, boolean, null literal blocks |
| Custom | custom rules from metadata |

`Advanced` is an orthogonal progressive-disclosure flag (§12.6), not a home category: an
advanced rule still belongs to one category above but may be hidden until advanced blocks are
enabled.

### 12.5 Palette Entries as Block Variants

The palette shows block variants, not only raw rule names, grouped by the canonical categories
(§12.4). Several palette blocks may generate the same rule with different parameter shapes. See
§14 for the canonical `attr`/`object`/`map` variant examples. Block and palette labels show
**both** the friendly title and the rule name, e.g. `Get attribute (attr)` (OQ-008); the rule
name keeps developers oriented and reinforces the JSON mapping (NFR-016).

### 12.6 Progressive Disclosure

Common beginner-friendly blocks are visible by default. Advanced blocks (`set`, `get`, `parent`,
`zip`, `file`, `include`, custom rules) may be available under advanced categories or toggles.
Because per-shape variants enlarge the palette, palette size is managed (OQ-009) with canonical
categories (§12.4), a palette search/filter, an advanced-blocks toggle, and the clear dual labels
of §12.5 — a clearer palette is preferred over hidden mode dropdowns (NFR-012, AD-015).

### 12.7 Generated JSON Panel

Updates when blocks change — but never while the user is actively typing in it (FR-131); shows
formatted JSON; shows an invalid-generation state when the workspace is incomplete; allows
copying; and supports direct (bidirectional) editing per §7.15 — edits sync back to blocks only
when valid and in-surface (§15.7), otherwise the panel shows the error and is marked out of sync
(FR-111…FR-113).

### 12.8 Sample Input Panel

Allows editing JSON input; validates JSON syntax; shows syntax errors; loads from examples when
selected.

### 12.9 Output Panel

Shows the transformation result, runtime errors, and expected-vs-actual result for examples.
Captured `file` writes are shown separately in the "Files produced" panel (§12.11), not inline
with the transformation output (OQ-007).

### 12.10 Tooltips

Rule and parameter tooltips are derived from engine metadata and explain rule/parameter purpose,
whether a parameter is required, whether it is dynamic or constant where known, and common
examples.

### 12.11 Files Produced Panel

A dedicated panel that lists captured `file` writes from preview execution (§16.5), each with its
name and a content preview, kept separate from the transformation output (OQ-007, §17.11, AC-024).
No filesystem write occurs in browser preview (NFR-035, AD-009). The panel may be collapsed or
hidden when the latest execution produced no files.

---

## 13. Blockly Block Model

**Structure vs behavior boundary (§7.16, `ARCHITECTURE.md` AD-031).** Block *structure* — the
shapes, inputs, labels, and variants below — is **projected** from metadata by `G_palette` and the
generated codec, so it grows by metadata alone. Block *behavior* that JSON cannot express (field
validators, custom field widgets, mutator interaction UI, drag/connection rules, change events) is
handled by a finite, **rule-agnostic** runtime that does **not** grow per rule (NFR-046). New rules
ride entirely on metadata + projections; only a brand-new interaction primitive touches code.

### 13.1 Block Output Types

The editor uses advisory output types (`template`, `scalar`, `string`, `number`, `boolean`,
`null`, `array`, `object`, `rule`, `operator`, `function`, `parameter`, `path`). These help the
UI but must not override engine validation.

### 13.2 Rule Blocks

Each rule has one or more Blockly block variants. A rule block variant generates
`{ "$": "<rule-name>", "<param>": "<param-template-or-literal>" }`.

### 13.3 Block Variants

A block variant represents one valid semantic shape of a rule; its matcher derives from the
engine modes ([`ARCHITECTURE.md`](ARCHITECTURE.md) §5.7). See §14 for canonical examples.

### 13.4 Parameter Inputs

Rule parameters are block inputs. Required parameters are visually marked; optional parameters
are addable/removable or visually optional; mutually exclusive groups generally become separate
block variants.

### 13.5 Dynamic Parameters

Dynamic parameters accept templates; a template block can connect into a dynamic parameter:

```json
{ "$": "attr", "name": { "$": "attr", "name": "dynamic_key" } }
```

### 13.6 Constant Parameters

Constant parameters accept literal values or dropdowns; e.g. `op` is selected from known
operators. The dropdown menu may be curated by presentation data (FR-130) — display-only: alias
spellings collapse into one canonical menu entry, while every metadata-valid token stays accepted
and round-trips verbatim:

```json
{ "$": "expr", "op": "add", "value": 1 }
```

### 13.7 Literal Blocks

The editor includes blocks for string, number, boolean, null, array, and object literals. In the
projected workspace vocabulary (FR-124) these are the structural block types `transon_literal`
(scalars), `transon_array`, and `transon_object_literal`. The literal-object block type is named to
avoid collision with the `object` rule block (FR-123); a literal object carrying the marker key uses
the codec-skeleton-owned escape (§11.4) rather than the `object` rule's `fields` variant.

### 13.8 Array Blocks

Array blocks support a dynamic number of items; each item is a template. Items may be added and
removed **on the canvas** through the finite, rule-agnostic behavior runtime's mutator UI (§13.13,
AD-031, NFR-046) — not only by editing the JSON (§7.15).

### 13.9 Object Blocks

Object blocks support a dynamic number of fields (literal key, template value). If the object
contains the marker key, the editor must use or recommend the `object` rule escape (§11.4). Fields
may be added and removed on the canvas through the behavior-runtime mutator UI (§13.13).

### 13.13 Structural Mutators (on-canvas add/remove)

The structural blocks that hold a variable number of children — `transon_array` (items) and
`transon_object_literal` (key/value fields) — expose an on-canvas **add/remove** affordance
(Blockly mutator) so users can grow and shrink them visually, without dropping to the JSON panel.
This affordance lives in the finite, **rule-agnostic** behavior runtime (AD-031) and is keyed to the
structural vocabulary, never to a rule name, so it does **not** grow per rule (NFR-046). The
mutator only changes how many item/field inputs a block exposes; it adds no semantics and is the
visual counterpart of the workspace shape the codec already serializes (FR-124, FR-126) — so a block
edited via the mutator round-trips identically to the same block authored via JSON (AC-038).

### 13.10 Projected Rule Block

Every rule block is projected from metadata by `G_palette` (AD-026); the projection allows the
metadata-declared parameters and disallows undeclared parameters unless explicitly enabled for
debugging. Richer per-rule UX comes from richer metadata plus the finite behavior runtime (AD-031),
never from a separately authored "specialized" block. The projected block is a **value/output block**
with **external inputs** (`inputsInline: false`, FR-129): every value parameter connects from the
side via a puzzle socket, and the block body holds only fields (dropdowns for constant params) and
mutator +/- controls — no inline-embedded values. This is a display-only default in the block
definition and does not affect the codec or round-trip (§21.12). When a variant has **two or more
value inputs**, the block **title takes its own first row** and the named inputs start on the second
row (readability); a variant with ≤1 value input keeps the title and input on one flowing row.
Structural collection blocks (`transon_array`, `transon_object_literal`) follow the same model:
external value inputs plus the +/- mutator.

### 13.11 Invalid / Unsupported Block

If an imported template cannot be represented with available blocks, the editor may create an
unsupported placeholder block only if it preserves the original JSON exactly and blocks edits
that would corrupt it; otherwise import fails. This is the `transon_unsupported` block type in the
projected workspace vocabulary (FR-124).

### 13.12 Statement Ordering and `set`

Most rule blocks are value-producing. `set` is different: it produces `NO_CONTENT` and its
effect is a side effect on the current scope (it defines a variable a later `get` reads), so its
position relative to siblings is semantically significant. The block model therefore represents
ordered evaluation:

- `set` is modeled as a value block that still occupies an ordered position (an `object` field
  value, an array item, or a `chain` step);
- evaluation order follows Transon's literal dict/list walking order and `chain` step order; the
  editor emits object keys and array items in visual order and preserves insertion order on
  import/export so a `set` evaluated before a dependent `get` stays before it (§15.3);
- the editor surfaces this order visually and should warn that moving a `set` across `chain`,
  `map`, `filter`, or object/array siblings may change behavior;
- `get` is value-producing and may appear anywhere a value is expected; correctness of
  set-before-get within a scope is the author's responsibility, made visible by these ordering
  rules.

---

## 14. Transon Rule Coverage

Organized by topic for readability; each rule's canonical toolbox category is in §12.4.

### 14.1 Context Accessors

`this`, `parent`, `item`, `index`, `key`, `value`. These blocks have no parameters; `this` is
always available; `parent` is valid only in non-root scope; `item`, `key`, `value`, `index` are
valid only inside the relevant `map`/`filter` context. Invalid scope should be warned visually or
caught by engine validation.

### 14.2 Variables

`set`, `get`. Variable name is dynamic and must not use the reserved context names `this`,
`item`, `key`, `value`, `index` (validated before engine validation). `get` supports optional
`default`. The editor should explain that variable scope is contextual and order-sensitive, and
warn that moving `set` across `chain`/`map`/`filter`/siblings may change behavior.

### 14.3 Data Access

`attr`. Recommended variants: "Get one attribute" (`name`), "Get deep attribute path"
(`names`); optional `default`. The editor shall support single key/index access, deep path
access, default value, and dynamic path segments.

### 14.4 Object Construction

`object`. Recommended variants: "Build object from fixed fields" (`fields`), "Build object from
dynamic key/value" (`key` + `value`). The editor shall support dynamic key/value creation,
literal fields mode, literal marker-key emission through `fields` (§11.4), and shall show that
`NO_CONTENT` key/value results may omit entries.

### 14.5 Iteration

`map`, `filter`. Recommended `map` variants: "Map list items" (`item`), "Map list items and
flatten" (`items`), "Map dictionary entries" (`key` + `value`). `filter` has a single shape with
a required `cond` (the element is kept when `cond` is truthy). The editor shall support mapping
lists to lists, lists to flattened lists, dicts to dicts, filtering lists/dicts through the
required `cond`, mark `cond` as required, expose iteration context blocks (`item`, `index`,
`key`, `value`) in bodies, and indicate that `NO_CONTENT` results are skipped where applicable.

### 14.6 Zipping

`zip`. Parameter `items`. The editor shall support `items`, show that `zip` transposes iterables
into rows, and show runtime type errors when inputs are not iterable.

### 14.7 Joining

`join`. Parameters `items`, `sep`, `default`. The editor shall support joining strings, lists,
and dicts; show that mixed-type joins are runtime errors; show that `NO_CONTENT` items are
omitted; and support default output when no items remain.

### 14.8 Chaining

`chain`. Parameter `funcs`. The editor shall represent `chain` as an ordered pipeline; allow
add/remove/reorder of steps; explain that each result becomes `this` for the next step; and warn
that variable scoping in `chain` can affect behavior.

### 14.9 Expressions

`expr`. Parameters `op`, optional `value`, optional `values`. Recommended variants: "Apply
operator to current value" (empty mode), "Apply operator with one value" (`value`), "Apply
operator to list of values" (`values`). `op` is selected from known operators. The editor shall
support the current-value/empty mode, binary mode with `value`, reduce mode with `values`, and
aliases/mnemonics where metadata exposes them.

### 14.10 Function Calls

`call`. Parameters `name`, optional `value`, optional `values`. Recommended variants: "Call
function on current value" (empty mode), "Call function with one argument" (`value`), "Call
function with many arguments" (`values`). `name` is selected from known functions where
possible.

### 14.11 Formatting

`format`. Parameters `pattern`, optional `value`, optional `default`. The editor shall support
the format pattern, optional value, optional default, and display runtime errors for invalid
patterns or missing keys.

### 14.12 File Output

`file`. Parameters `name`, `content`. The editor shall support the rule visually; browser
execution shall not write to the local filesystem; file writes shall be captured in preview
output (§16.5) and shown as a side-effect result; the editor shall explain that the rule returns
`NO_CONTENT`.

### 14.13 Include

`include`. Parameters `name`, optional `default`. The editor shall support the rule visually;
require an include loader for execution (sources in §16.6); report a missing loader clearly;
support include examples from the corpus where available; and show include depth/runtime errors.

### 14.14 Operators

Built-in `expr` operators shall be supported:

- comparisons: `lt`, `le`, `eq`, `ne`, `ge`, `gt`, `<`, `<=`, `==`, `!=`, `>=`, `>`;
- arithmetic: `add`, `sub`, `mul`, `div`, `mod`, `+`, `-`, `*`, `/`, `%`;
- logical: `and`, `or`, `not`, `&&`, `||`, `!`.

### 14.15 Functions

Built-in `call` functions shall be supported: `str`, `int`, `float`, `type`. The `type` function
returns the JSON type of a value — one of object, array, string, int, float, boolean, or null — and
is **total** (never raises on well-formed JSON), making it the one operation a switch/cond key can
safely apply to an unknown node; it is the node-type-dispatch primitive the generated codec relies on
([metadata-contract.md](metadata-contract.md) §6.4, FR-118).

### 14.16 Conditional Dispatch

`switch` and `cond` are **lazy multi-way dispatch** rules (engine v0.1.3, `ARCHITECTURE.md`
AD-029), supported as **first-class authored blocks** like every other rule (FR-040, category
*Control Flow* in §12.4):

- `switch` — evaluates `key`, then walks **only** the matching entry of a literal-keyed `cases`
  mapping; an optional `default` covers no-match (including a `NO_CONTENT` key). Variant: `key`+`cases`.
- `cond` — an ordered list of `{when, then}` arms; the first truthy `when` selects its `then`
  (subsuming `if`/`else`), with an optional `default`. Variant: `cases`.

Only the selected branch is evaluated (lazy dispatch). The editor projects them from metadata like
any other rule — including the pre-derived variant signatures ([`metadata-contract.md`](metadata-contract.md)
§2.5) and the optional `default` parameter. Separately, the **generated codec** uses these same
engine rules internally for its own dispatch (FR-118); that internal use is orthogonal to their
availability as authored blocks.

---

## 15. Import / Export / Round-trip Rules

### 15.1 Semantic Equivalence

Semantic equivalence means the imported and exported templates produce the same result for the
same input according to the engine; textual JSON equivalence is not required. "Strict semantic
round-trip" (UC-005, §7.5, AD-004) qualifies *coverage*, not the comparison: equivalence is
always semantic, and "strict" means it must hold for *every* template within the supported
surface (§15.7), with no silently-dropped cases. Where it cannot hold, the editor reports it
(FR-038) rather than degrading equivalence.

**Round-trip by construction (§7.16, FR-115, AC-035).** Because the encoder and decoder are
generated from the **same** metadata source (`ARCHITECTURE.md` AD-026), they are two directions of
one bijection over the supported surface and agree by construction — there is no second
hand-written implementation to drift. Correctness reduces to "both directions have a single source:
the metadata," verified per rule by execution (AD-011).

### 15.2 Stable JSON Formatting

Generated JSON should use two-space indentation, valid JSON, no comments, and deterministic
ordering where possible.

### 15.3 Key Ordering

JSON object key ordering is not semantically meaningful in JSON, but Transon variable scoping can
be affected by sibling evaluation order in literal dict/list walking. The editor shall preserve
insertion order for objects where order can affect Transon behavior.

### 15.4 Marker Handling

The editor uses the configured marker key to identify rule invocations (default `"$"`). If a
custom marker is configured, all import/export logic uses it: the `object` rule is identified by
the configured marker, and the literal-marker escape (§11.4) triggers when a literal field key
equals that same configured marker.

### 15.5 Literal Marker Escape

When a literal output object must contain the marker key, the editor uses the `object` rule in
`fields` mode (canonical mechanism and example: §11.4).

### 15.6 Import Variant Matching

Each rule invocation must match **exactly one** declared variant; zero, multiple, or partial
matches are reported as `import_unsupported` (§16.4, §17.6). This behavioral rule is referenced
by FR-053, FR-054, FR-055, §9.6, and the supported surface (§15.7). Variants are **pre-derived in
the metadata** (the engine computes the variant signatures from `_required`/`_modes` once, in
Python, and emits them as data — FR-116, [`metadata-contract.md`](metadata-contract.md) §2.5); the
generated decoder matches against those signatures. The matcher is part of the generated codec
skeleton + arms, not a hand-written editor algorithm; see [`ARCHITECTURE.md`](ARCHITECTURE.md) §5.7.

### 15.7 Supported Template Surface

The supported template surface is the normative set of templates the editor can import and
round-trip without changing meaning (referenced by FR-027, FR-031, FR-038, UC-003, §17.2).

A template is **in surface** when every node is one of:

- a literal JSON scalar (string, number, boolean, null);
- a literal JSON array whose items are in surface;
- a literal JSON object (no marker key) whose values are in surface;
- a literal object that contains the marker key, expressed through the `object`/`fields` escape
  (§11.4);
- an invocation of a built-in rule (§14) whose present parameters match exactly one declared
  variant/mode and whose parameter values are in surface;
- an invocation of a custom rule that has complete metadata
  ([`metadata-contract.md`](metadata-contract.md) §2) and matches exactly one variant.

A template is **out of surface** (import fails clearly per §17, or falls back to an
exact-preserving unsupported placeholder per §13.11) when any node is: an unknown rule with no
metadata; a rule with an undeclared parameter; a rule whose present parameters match zero or more
than one variant; a custom rule with incomplete metadata that cannot be rendered as a safe
generic block (FR-086); or not valid JSON / otherwise not representable without changing meaning.

The surface is bounded by the engine's rule/operator/function catalog, not a separate editor
list; the engine-parity checks in [`traceability.md`](traceability.md) keep the two aligned. The
in-surface/out-of-surface decision is enforced by the generated codec **skeleton** (FR-117,
`ARCHITECTURE.md` AD-028), so it is sourced from the same metadata as the per-rule arms.

### 15.8 Round-trip Test Corpus

Round-trip tests shall include: simple literals; literal arrays; literal objects; literal
marker-key objects; every built-in rule; every mutually exclusive parameter variant; nested
templates; examples from engine metadata; custom marker configuration; and import-failure cases.

---

## 16. Validation and Execution

The behavioral requirements live here: validation (FR-064..070), execution (FR-071..076), the
runtime host boundary (§10.4), the error taxonomy (§16.4), captured `file` writes (§16.5), and
the include loader (§16.6). The validation flow, execution flow, and runtime
initialization/status model are implementation detail; see [`ARCHITECTURE.md`](ARCHITECTURE.md)
§6.4. Engine initialization/status is a property of the host-provided runtime (AD-008), surfaced
per NFR-028.

### 16.1 Validation

Validation runs through the host engine (FR-064). Engine validation is authoritative (NFR-004);
Blockly constraints may pre-empt obviously invalid templates but do not replace it.

### 16.2 Execution

Execution runs the current template against sample input through the host engine (FR-071), with
output shown as formatted JSON and runtime errors surfaced (FR-072, FR-073).

### 16.3 Validation / Execution Timing

Validation may run manually (Validate button), automatically after debounced edits, or before
execution. Execution may run manually (Run button) or, where the embedding enables it, after
debounced changes. Default recommendation: manual Run in v1, debounced auto-validation, optional
auto-run for examples.

### 16.4 Error Taxonomy (canonical)

The single canonical error taxonomy. FR-095 (error display) and §17 reference this list.

| Code | Category | Raised during |
|------|----------|---------------|
| `json_template` | Invalid JSON in imported template text or in a direct JSON edit (§7.15) | import / JSON edit |
| `json_input` | Invalid JSON in sample input | execution setup |
| `import_unsupported` | Out-of-surface template (§15.7): unknown rule, unknown parameter, ambiguous/partial variant match, ambiguous marker handling, malformed template, or unsupported workspace representation. Also raised when a direct JSON edit (§7.15) is valid JSON but out of surface. | import / JSON edit |
| `template_definition` | Transon definition/validation error (engine `DefinitionError` via `validate()`) | validation |
| `runtime_transformation` | Transon transformation/runtime error (engine `TransformationError` via `transform()`) | execution |
| `include_loader` | Include template could not be resolved (§16.6) | validation/execution |
| `engine_init` | Host engine runtime failed to load or initialize | runtime init |
| `editor_internal` | Unexpected editor error | any |

Captured `file` writes (§16.5) are a side-effect result, not an error category.

### 16.5 Captured File Writes

When preview execution uses the `file` rule: no local file is written; output includes captured
file entries (each with name and content); entries whose name or content is `NO_CONTENT` are
skipped per engine semantics.

### 16.6 Include Loader

For browser preview, the include loader may resolve templates from docs examples, embedding
configuration, a user-provided include map, or a future local workspace library. If no loader is
configured, validation/execution shall report that includes cannot be resolved.

---

## 17. Error Handling

### 17.1 Invalid Imported JSON

Show parse error; do not replace the current workspace; preserve unsaved work.

### 17.2 Unsupported Template Import

If valid JSON but out of surface (§15.7) and not representable: show an unsupported-template
error with a template path where possible; do not silently alter meaning.

### 17.3 Unknown Rule

If metadata for the rule exists, render a custom/generic block; otherwise reject import or create
an unsupported placeholder only if exact preservation is guaranteed.

### 17.4 Unknown Parameter

Reject import or mark the rule block invalid; show the parameter name and template path.

### 17.5 Incomplete Workspace

If required inputs are disconnected: generated JSON status is invalid; validation is not run or
is shown as blocked; the user sees which required input is missing.

### 17.6 Variant Match Failure

No variant match: show rule name, present parameters, and expected variants where possible.
Multiple matches: show rule name and conflicting variants; do not silently choose. Partial
match: show missing required parameters; mark import invalid or create an invalid block state.

### 17.7 Validation Failure

Show error type, message, template path, and highlight the corresponding block when possible.

### 17.8 Runtime Failure

Show error type, message, template path where available, highlight the corresponding block when
possible, and preserve previous successful output but mark it stale.

### 17.9 Engine Runtime Failure

If the host-provided engine runtime (§10.4) fails to load or initialize: show the runtime
initialization error reported by the host; keep block **authoring** (canvas editing) and raw JSON
**text** handling (copy/download, and typing into the JSON panel) available; because the
visual ⇄ JSON projection runs the codec through the engine (AD-026, AD-030), JSON
generation/import-sync are unavailable along with validation/execution until the runtime recovers;
and suggest retrying initialization where the host supports it.

### 17.10 Include Resolution Failure

If an `include` cannot be resolved (sources §16.6): show the include name, where it was
referenced, and explain that browser preview needs an include loader.

### 17.11 File Write Handling

If a template uses `file` (§16.5): browser preview captures file writes; no filesystem write
occurs; captured writes are shown separately from transformation output.

---

## 18. Observability / Diagnostics

### 18.1 User-Facing Diagnostics

Transon engine version; metadata version; marker key; validation status; execution status; host
engine runtime status; current template size; current block count.

### 18.2 Developer Diagnostics

Generated template-path-to-block mapping; raw engine errors; raw validation results;
import/export timing; host engine runtime init timing; metadata load status; projection/codec
artifact version and whether it is up to date with the current metadata (AD-030);
missing-metadata warnings.

### 18.3 Logging

In v1, logs are browser-local developer diagnostics; the editor shall not send logs to a backend
service by default.

### 18.4 Error Reporting

Unexpected editor errors should include enough information for bug reports without exposing user
template/input data unless the user explicitly copies it.

---

## 19. Test Strategy

Requirement-to-test coverage, the engine-parity (anti-drift) checks, and the round-trip corpus
are tracked in [`traceability.md`](traceability.md). Every implemented requirement must be cited
by at least one test there.

### 19.1 Unit Tests

Generator (`G_*`) output on metadata; generated-encoder block-from-document generation; generated-
decoder template-from-workspace parsing; literal scalar/array/object handling; marker detection;
literal marker-key escape; rule parameter generation; required/optional handling; pre-derived
variant signatures and variant matching; operator/function dropdown (resolved-enum) generation;
metadata parsing; codec-skeleton invariants (recursion/ordering/passthrough);
path-to-block mapping.

### 19.2 Round-trip Tests

Each built-in rule and variant; each operator and function; nested templates; corpus templates;
custom marker; literal marker-key object; import-failure cases.

### 19.3 Engine Integration Tests

Host engine adapter initialization; static validation success/failure; transformation
success/failure; `NO_CONTENT` output behavior; captured `file` writes; include loader
success/failure.

### 19.4 UI Tests

Editor renders; block add/connect; generated JSON updates; input editing; output after run;
errors shown; examples load; tooltips visible; import/export actions; sandbox mode renders
expected panels; compact mode hides sandbox-only panels.

### 19.5 Accessibility Tests

Keyboard navigation where Blockly supports it; readable contrast; visible focus states; error
messaging not relying only on color; screen-reader labels for major panels where feasible.

### 19.6 Metadata Compatibility Tests

Complete metadata creates a generic block; incomplete metadata warns or rejects; a new rule
appears in the palette and imports/exports correctly where the variant shape matches; version
mismatch warnings.

### 19.7 Regression Tests

Added for every bug that changes generated JSON, every import/export bug, every metadata
compatibility issue, every engine behavior mismatch, and every round-trip failure.

---

## 20. Acceptance Criteria

Version 1 is acceptable when all criteria below are met.

- **AC-001 — Visual editor loads.** A user can open the editor and see a canvas, generated JSON
  panel, input JSON panel, output panel, and toolbar in sandbox mode.
- **AC-002 — Simple rule template.** A user can create an `attr` rule visually and export valid
  Transon JSON.
- **AC-003 — Nested template.** A user can create nested templates, including a rule parameter
  whose value is another rule.
- **AC-004 — Literal object.** A user can create a literal object output with multiple fields.
- **AC-005 — Literal marker-key object.** A user can create a template that emits a literal
  object containing the marker key.
- **AC-006 — All built-in rules available.** All built-in rules are available as visual or
  metadata-generated blocks.
- **AC-007 — Operators available.** All built-in `expr` operators are selectable.
- **AC-008 — Functions available.** All built-in `call` functions are selectable.
- **AC-009 — Import supported template.** A supported template can be imported into the
  workspace.
- **AC-010 — Export generated template.** A workspace can be exported to Transon JSON.
- **AC-011 — Strict round-trip.** For the supported corpus, import then export preserves semantic
  equivalence.
- **AC-012 — Validation with engine.** The editor validates templates using the host engine.
- **AC-013 — Runtime execution with engine.** The editor executes a template against sample
  input using the host engine.
- **AC-014 — Output preview.** The editor displays transformation output as formatted JSON.
- **AC-015 — Runtime error visibility.** A runtime transformation error is displayed clearly.
- **AC-016 — Validation error visibility.** A validation error is displayed clearly.
- **AC-017 — Error-to-block mapping.** At least common validation/runtime errors can highlight
  the corresponding or nearest block.
- **AC-018 — Example loading.** At least one corpus example can be loaded into the editor.
- **AC-019 — Example expected output.** For loaded examples, the editor can show actual and
  expected output.
- **AC-020 — Tooltip from metadata.** Rule and parameter tooltips are populated from metadata
  where available.
- **AC-021 — No backend persistence.** The editor works without backend accounts or remote
  template storage.
- **AC-022 — Embeddable component.** The editor can be used as an embeddable component with
  initial template/input and change callbacks.
- **AC-023 — Host engine runtime loading state.** The editor shows the host engine runtime's
  idle, loading, ready, and failed states.
- **AC-024 — Captured file writes.** A template using `file` does not write to the filesystem in
  preview; captured outputs are shown in the UI.
- **AC-025 — Include loader behavior.** A template using `include` either resolves through
  configured templates or shows a clear include-loader error.
- **AC-026 — Custom marker.** The editor can be configured to use a non-default marker key and
  import/export accordingly.
- **AC-027 — Tests.** Automated tests cover JSON generation, import, export, round-trip, all
  built-in rules/operators/functions, literal marker-key objects, validation errors, runtime
  errors, example loading, and metadata loading.
- **AC-028 — Metadata-driven generic block.** A new rule with complete metadata appears in the
  palette as a generic block without editor code changes.
- **AC-029 — Block variants for mutually exclusive parameters.** Rules such as `attr`, `object`,
  `map`, `expr`, and `call` use separate visual block variants for structurally different shapes.
- **AC-030 — Variant import matching.** Imported templates select the correct variant by present
  parameters, and ambiguous/partial matches are reported clearly.
- **AC-031 — Sandbox mode.** Sandbox mode shows the panels defined in §12.1.
- **AC-032 — Compact editor mode.** Compact mode can show canvas and palette without requiring
  input/output panels.
- **AC-033 — Bidirectional JSON editing.** A user can edit the generated JSON directly; a valid
  in-surface edit syncs back to the workspace, while an invalid or out-of-surface edit is reported
  and leaves the workspace unchanged (§7.15, FR-111…FR-113).
- **AC-034 — Projection coverage with no editor change.** A new rule with complete metadata appears
  across palette, toolbox, encoder, and decoder, and participates in validation/execution, with no
  editor code change **and** no projection-template change — only metadata (§7.16, FR-120; restates
  AC-028 for the projection model).
- **AC-035 — Round-trip by construction.** For every built-in rule and variant, the encoder and
  decoder generated from the one metadata source round-trip a document to semantic identity via
  engine execution (§7.16, FR-115, §15.1, AD-011).
- **AC-036 — Self-hosting projection template.** At least one of the editor's own projection
  templates loads as a valid in-surface Transon template in the editor and round-trips (§7.16,
  FR-121, UC-016).
- **AC-037 — Presentation from data, not code.** A new rule's title/category/advanced/colour comes
  from metadata or projection-template data (not TypeScript), and the rule appears in palette +
  toolbox with no editor code change (strengthens AC-034), demonstrated by a synthetic-rule
  projection test driving presentation from the data source (§7.11, FR-127, NFR-048).
- **AC-038 — On-canvas structural mutators.** A user can add and remove items of a `transon_array`
  block and key/value fields of a `transon_object_literal` block directly on the canvas via the
  behavior-runtime mutator UI (§13.13); the result round-trips identically to the same structure
  authored via the JSON panel (AD-031, NFR-046, FR-124/126).
- **AC-039 — Accessibility baseline.** The editor passes the §19.5 accessibility suite: the sandbox
  shell has no critical axe violations for contrast or ARIA; the toolbar and panels are
  keyboard-reachable with visible focus states; error state and expected-vs-actual match state are
  conveyed without relying on colour alone; and major panels carry screen-reader labels (binds
  NFR-045 and §19.5 to a checkable DoD).
- **AC-040 — Conventional renderer + external puzzle inputs.** The mounted workspace uses the
  **thrasos** renderer (puzzle-tab connections) and the committed Transon theme (system font,
  chrome-aligned surface); every projected rule-variant block is a value/output block with
  **external inputs** (`inputsInline: false`, §13.10) — sub-expressions connect from the side and the
  body holds only fields + mutator controls. Block/category colours stay data-driven (FR-127) and the
  codec artifacts are unchanged. Verified deterministically (renderer + theme + external-input wiring)
  and visually in a real browser (FR-129, AD-033).

---

## 21. Governance and AI Development Rules

### 21.1 ID stability (from v1.0)

Requirement, non-functional, acceptance-criteria, use-case, architecture-decision, and
open-question IDs are stable and append-only **from v1.0 onward**. Do not renumber existing IDs;
new items take the next free number in their family; deprecated items are marked deprecated, not
reused.

### 21.2 SPEC first

Behavior-changing implementation must be reflected in this `SPEC.md`. If implementation and spec
conflict, the conflict must be identified before coding.

### 21.3 Do not invent Transon semantics

Agents must not invent rule behavior; consult the Transon engine specification, generated
metadata, tests, or source when behavior is unclear.

### 21.4 Engine is authoritative

The Transon engine is authoritative for validation and execution (canonical principle: NFR-004).
Blockly constraints may improve UX but must not replace engine behavior.

### 21.5 Preserve JSON canonicality

Transon JSON is the canonical artifact (AD-003); Blockly workspace serialization must not become
the only source of truth.

### 21.6 Preserve strict round-trip

Do not introduce import/export behavior that silently changes template meaning; a template that
cannot be represented faithfully must take an explicit unsupported-template path.

### 21.7 No backend persistence in v1

Do not add accounts, backend storage, or sharing links in v1 unless the spec is updated.

### 21.8 No new transformation language

Do not introduce a separate DSL, path syntax, inline expression language, or non-Transon
transformation model.

### 21.9 Use metadata where possible

Prefer engine-generated metadata over duplicated handwritten documentation, and do not make new
rule support depend on editor code changes when metadata is sufficient for generic generation.

### 21.10 Prefer block variants over hidden modes

Represent structurally different mutually exclusive parameter shapes as separate block variants
unless a spec update approves a mode-switching UX.

### 21.11 Escalate security ambiguity

If a change affects engine execution, runtime isolation/sandboxing, file writes, include
loading, remote example loading, or user data transmission, treat it as security-sensitive and
propose a spec update.

### 21.12 Keep UI and semantics separate

Do not store UI-only Blockly metadata inside the executable Transon template unless explicitly
approved.

### 21.13 Add tests for every rule block

Every supported rule block must have tests for generation and import.

### 21.14 Do not silently fix engine quirks

If Transon has quirky but documented behavior, the editor must represent or warn about it; agents
must not "fix" engine behavior in the editor without an explicit architecture decision.

### 21.15 Projections, not hand-written mappings

The palette, toolbox, encoder, and decoder are **projections of engine metadata** (§7.16, AD-026).
Do not reintroduce a hand-written codec, typed IR, per-rule block-definition code, or a per-rule
specialized override registry (the superseded AD-014/AD-016 model). New rule support comes from
metadata + the projection templates; only the finite, rule-agnostic behavior runtime (AD-031) and a
genuinely new interaction primitive may add code (NFR-046). The generated codec artifacts are
regenerated at build time (AD-030) — never hand-edit a committed codec artifact; change the metadata
or the generator and regenerate.
