# Use Yarn for frontend package management

## Context and Problem Statement

The frontend workspace needs a package manager for the static SPA artifact. We must choose between the mainstream JavaScript package managers and apply the same choice in CI. Which one should we use?

## Considered Options

* npm
* pnpm
* yarn

## Decision Outcome

Chosen option: "yarn", because it offers performance and security features — particularly in large projects — with faster installations and better reliability than npm. Its modern versions also include advanced features like Plug'n'Play, which can improve workspace management.

### Consequences

* Good, because faster, more reliable installs in CI and local dev.
* Good, because Plug'n'Play can eliminate phantom dependencies and improve workspace hygiene.
* Bad, because Plug'n'Play is not compatible with every package, so some toolchains may need `nodeLinker: node-modules` fallback.
