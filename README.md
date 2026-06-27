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

- Product intent: [docs/product-brief.md](docs/product-brief.md)
- Requirements: [docs/requirements.md](docs/requirements.md)
- Design system: [DESIGN.md](DESIGN.md)
- Living specs: [openspec/specs/](openspec/specs/)
