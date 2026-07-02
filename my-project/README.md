# ForgeFlow Inventory

A locally runnable procurement and manufacturing inventory portal built with Next.js 16, React 19, TypeScript, and JSON-file persistence.

## Features

- Signed local sessions with Admin and Staff authorization
- Inventory valuation and reorder alerts
- Supplier and stock-master administration
- Purchase-order creation and partial/full receiving
- BOM-based manufacturing with stock/status validation
- Immutable stock-movement ledger
- Serialized, atomic JSON-file updates

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the URL printed by Next.js (normally `http://localhost:3000`) and sign in:

- Username: `test`
- Password: `test`

The credentials and default session secret are for local evaluation only.

## Validate

```bash
npm run lint
npm run test:run
npm run build
npx openspec validate --all --strict
```

Data lives in `data/*.json`. To restore the supplied demo state, restore those files from Git.
