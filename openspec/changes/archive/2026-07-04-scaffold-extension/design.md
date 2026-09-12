## Context

`app/` does not exist. This is the first piece of buildable code in the repo, so this change fixes the project skeleton every later change (Jira parser, serializer, anonymizer, popup wiring, Playwright E2E) will build inside. `AGENTS.md` already fixes several of the technical decisions (Vite + CRXJS, TS strict, vanilla TS + Pico CSS, framework-free `lib/`) — this design fills in the concrete layout and build wiring, it does not re-litigate them.

## Goals / Non-Goals

**Goals:**
- A `pnpm`/`npm` project under `app/` that builds an MV3 extension and loads unpacked in Chrome with zero console errors.
- A static popup that visually implements all 4 states from `docs/DESIGN.md` (FR-05–FR-08), switchable via a dev-only trigger (e.g. keyboard shortcut or hidden buttons) for manual review — no real extraction/download logic yet.
- `lib/` created as an empty, framework-free TS package boundary (no Chrome APIs importable from it) so the next changes (`jira-parser`, `markdown-serializer`, `anonymizer`) have a place to land without re-deciding structure.
- Toolbar icon ("md") in 16/32/48/128 px.
- `manifest.json` requests only `activeTab`, `scripting`, `downloads` (NFR-04) — no host permissions added at this stage since no DOM extraction exists yet.

**Non-Goals:**
- Jira/Azure DOM parsing, Markdown serialization, anonymization — separate changes.
- Real `chrome.downloads` calls or folder/media output — separate change (`popup-wiring`).
- Playwright E2E harness — separate change.
- Chrome Web Store packaging/publishing — explicitly out of scope for MVP (requirements.md §5).

## Decisions

- **Vite + CRXJS over hand-rolled MV3 config**: CRXJS handles MV3 manifest/service-worker HMR quirks that plain Vite does not; avoids reinventing a fragile build. Alternative considered: `webpack` + `manifest.json` by hand — more boilerplate, slower iteration, rejected.
- **Monorepo-style single `app/` folder, `lib/` as a subfolder of `app/` (e.g. `app/lib/`) rather than a separate package**: keeps TS project references simple (one `tsconfig.json` with strict mode) while still enforcing the framework-free boundary via lint rule / folder convention, not a hard package boundary. Alternative considered: separate npm workspace for `lib/` — adds workspace tooling overhead not justified at this size.
- **Static state-switching via a dev-only affordance (not a real state machine yet)**: lets `docs/DESIGN.md`'s 4 states be reviewed and demoed before any logic exists, without building throwaway fake logic that `popup-wiring` would just delete. The dev trigger itself is deleted in `popup-wiring` once real state transitions exist.
- **No host permissions yet**: `manifest.json` requests only `activeTab`, `scripting`, `downloads`. Host permissions for DOM scripting on Jira pages are deferred to the `jira-parser`/`popup-wiring` changes, when there's an actual content script that needs them — avoids requesting permissions the shell doesn't yet use.

## Risks / Trade-offs

- [CRXJS is a smaller/less mainstream project than raw Vite] → Mitigation: it's purpose-built for exactly this (MV3 + Vite), widely used for extension scaffolding, and the manifest it generates is inspectable/replaceable if it becomes a blocker later.
- [Dev-only state-switching affordance could leak into a real build if forgotten] → Mitigation: tracked explicitly as a task to remove in `popup-wiring`'s proposal; this change's tasks.md calls it out as temporary.
- [Icon design not yet finalized] → Mitigation: ship a placeholder "md" wordmark icon in this change; visual polish can follow without blocking the build pipeline.
