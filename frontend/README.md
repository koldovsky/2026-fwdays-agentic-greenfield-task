# Frontend — React + Vite + TypeScript

Minimal SPA that calls the backend health endpoint to prove the stack is wired. Conventions:
[`AGENTS.md`](../AGENTS.md).

## Quick start

```powershell
npm install
npm run dev      # http://localhost:5173
```

The dev server proxies `/health` and `/api` to the backend at `http://localhost:8000`
(see `vite.config.ts`), so run the backend too for a green status.

## Scripts

- `npm run dev` — dev server with HMR
- `npm run build` — TypeScript typecheck (`tsc`) + production bundle
- `npm run preview` — serve the production build locally

## Config

`VITE_API_URL` (see `.env.example`) — leave empty to use the dev proxy; set an absolute URL
for production builds. API calls live in `src/api.ts`.
