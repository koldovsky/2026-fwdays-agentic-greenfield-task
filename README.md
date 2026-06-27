# Pause — break reminder

Small local-first PWA that reminds you to take breaks while the app is open.
Settings are stored in `localStorage`; break stats are stored in IndexedDB.

## Requirements

- Node.js 20 or newer
- npm

## Install

```bash
npm install
```

## Run in development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Notes:

- Development uses Next.js Turbopack.
- The service worker is disabled in development, so offline/PWA behavior should
  be checked from a production build.

## Production build and local preview

```bash
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000).

The production build uses webpack (`next build --webpack`) because Serwist
generates the service worker during the build.

## Agentic Engineering practices

This is a course project: the goal is a full engineering loop run through an
agent. The practices applied, and where to see each one:

| Practice | Evidence in this repo |
| --- | --- |
| Context engineering (static vs dynamic) | `AGENTS.md`, `DESIGN.md`, `docs/` (static); `docs/current-state.md` (dynamic); `.mcp.json` / skills (tooling) |
| Loop engineering | one commit per capability in dependency order; the `npm run` harness as the loop's exit condition |
| Verification | 58 tests over pure `lib/` logic, `openspec validate`, `fallow audit` |
| maker ≠ checker | recorded checker pass in `docs/current-state.md` (incl. a mutation gate) |
| Specifications first (SDD) | `openspec/changes/*` → `openspec/specs/*` |

Full write-up: [docs/agentic-engineering.md](docs/agentic-engineering.md).

## Verify the project

Run the same checks used by the project harness:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx openspec validate --all --strict
npx fallow audit
```

## Useful docs

- Agentic Engineering practices: [docs/agentic-engineering.md](docs/agentic-engineering.md)
- Product intent: [docs/product-brief.md](docs/product-brief.md)
- Requirements: [docs/requirements.md](docs/requirements.md)
- Design system: [DESIGN.md](DESIGN.md)
- Living specs: [openspec/specs/](openspec/specs/)
