# Transon Visual Editor

An embeddable, engine-free [Blockly](https://developers.google.com/blockly) editor for authoring
**[Transon](https://github.com/lig/transon)** templates — JSON-to-JSON transformations built
visually, exported as canonical Transon JSON.

![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)

## What it is

Transon templates are JSON documents that describe JSON-to-JSON transformations. This project
gives them a visual, drag-and-drop authoring surface:

- **JSON is canonical.** The Blockly workspace is a *projection* of the Transon template, never a
  second source of truth. Import → edit → export strictly preserves meaning for supported
  templates; anything outside the supported surface takes an explicit unsupported path instead of
  silently changing meaning.
- **Engine-free.** The editor ships no Transon runtime. Validation, execution, `include`
  resolution, and file capture all cross a single host-provided `EngineProvider` boundary — the
  engine is authoritative.
- **Metadata-driven.** Blocks, palette, toolbox, and the workspace⇄JSON codec are derived from the
  engine's `get_editor_metadata()` export (rules, params, operators, functions). No hand-maintained
  parallel catalog, so the editor tracks the engine instead of drifting from it.
- **Bidirectional editing.** Edit the JSON directly and, when the result is valid and in-surface,
  it syncs back to the canvas; otherwise you get an error and the workspace stays unchanged.

## Packages

| Package | What it is |
| --- | --- |
| `@transon/editor-core` | Pure TypeScript core: the `EngineProvider` port, typed metadata, and the projection codec. Headless — usable without any UI. |
| `@transon/editor-blockly` | Blockly rendering layer (thrasos renderer): metadata-projected palette/toolbox and the rule-agnostic block behavior runtime. |
| `@transon/editor-element` | Framework-agnostic public surface: `createTransonEditor()` plus the `<transon-editor>` custom element (ESM + a self-contained IIFE build). |
| `@transon/editor-react` | Native React surface: `<TransonEditor />` with React as a peer dependency. |
| `editor-ui` | Internal React UI (panels, sandbox/compact modes, session store). Not published — bundled by the element and React packages. |

## Quick start (embedding)

```ts
import { createTransonEditor } from '@transon/editor-element';

const editor = createTransonEditor(document.getElementById('app')!, {
  host: { engine: myEngineProvider }, // you supply the Transon engine
});

const template = editor.getTemplate();   // current canonical Transon JSON
await editor.setTemplate(existingDoc);   // import a template
await editor.validate();                 // validate via the host engine
await editor.run();                      // execute against the sample input
```

The editor never bundles an engine — the host supplies an `EngineProvider`. The reference host in
[`examples/reference-host`](examples/reference-host) shows a complete wiring: it runs the Python
`transon` engine in the browser via Pyodide.

## Running the demo

Requires Node ≥ 20 and [pnpm](https://pnpm.io).

```sh
pnpm install
pnpm --filter @transon/reference-host dev   # or: make demo
```

## Development

```sh
pnpm build       # build all packages (Turborepo)
pnpm test        # run all tests (Vitest)
pnpm typecheck   # typecheck all packages
```

Run `make` for the full menu of workspace and verification targets.

The contract lives in [`docs/`](docs/) — read the relevant section before changing behavior:

- [`docs/SPEC.md`](docs/SPEC.md) — the *what*: requirements, use cases, supported surface, round-trip semantics.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the *how*: architecture decisions, packages, host boundary, projection codec.
- [`docs/metadata-contract.md`](docs/metadata-contract.md) — the engine↔editor metadata shape.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — milestone sequencing and locked decisions.
- [`docs/traceability.md`](docs/traceability.md) — requirement→test coverage.

Contributors should start with [AGENTS.md](AGENTS.md) (the always-on rules and development loop)
and enable the repo's git hooks: `git config core.hooksPath harness/githooks`.

## Status

Pre-release. All roadmap milestones (M0–M5) are implemented — headless round-trip core, full rule
catalog, Blockly rendering, UI shell with host execution, and embedding/self-hosting — but the
packages are not yet published to npm.

## License

[MIT](LICENSE)
