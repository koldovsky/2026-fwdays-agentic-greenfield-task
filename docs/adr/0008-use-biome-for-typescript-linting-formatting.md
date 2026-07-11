# Use Biome for TypeScript/JavaScript linting and formatting

## Context and Problem Statement

The frontend TypeScript/Next.js codebase currently uses ESLint for linting and Prettier for formatting — two tools, two config files, and two passes on every save/CI run. As the SPA grows we want a single fast tool that combines linting and formatting, especially for large generated/test trees where the current toolchain's latency is noticeable. Which tool should replace the ESLint + Prettier pair?

## Considered Options

* ESLint + Prettier (current default)
* Biome (single Rust-based tool covering both)
* dprint (formatter-only, still needs ESLint)

## Decision Outcome

Chosen option: "Biome", because it is significantly faster than ESLint + Prettier, processing files 10-20 times quicker, and consolidates linting and formatting into a single tool, reducing complexity and setup time. This makes it particularly appealing for large projects where speed and simplicity are crucial.

### Consequences

* Good, because one `biome.json` replaces `.eslintrc.*` and `.prettierrc.*` — fewer config files to maintain.
* Good, because the dev loop (save → re-lint) and CI run drop from seconds to sub-second on most files.
* Good, because a single binary removes the ESLint/Prettier plugin-version drift that currently blocks dependency bumps.
* Bad, because some niche ESLint plugins (project-specific or framework-specific) have no Biome equivalent and would need to be re-implemented as Biome rules or dropped.
* Bad, because migrating an existing ESLint config requires running `biome migrate eslint` and re-validating rule parity.
