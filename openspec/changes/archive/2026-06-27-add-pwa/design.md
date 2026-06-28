## Context

PWA packaging comes last because it caches the finished shell. The repo runs a modified
Next.js (App Router), so the Serwist + Next integration must follow the guide in
`node_modules/next/dist/docs/` and the Serwist docs rather than training-data memory.
Scope is deliberately narrow: installability and offline shell, no push (FR-PWA-03).

## Goals / Non-Goals

**Goals:**
- A valid manifest (name, icons, theme color, `display: standalone`) that passes the installability check.
- A Serwist service worker caching the app shell for offline load after first visit.
- Brand icons wired from `public/brand/`.

**Non-Goals:**
- No background push, periodic sync, or closed-app reminders (out of scope).
- No new app-data network calls — privacy posture unchanged.

## Decisions

- **Serwist (`@serwist/next`), not `next-pwa`.** Rationale: `next-pwa` is unmaintained (TC-STACK-05);
  Serwist is the supported path for the App Router. Alternative rejected explicitly by the PRD.
- **Precache the app shell; runtime-cache static assets.** Shell-first so the breathing-ring view
  loads offline; app data already lives in IndexedDB/localStorage, so no data caching is needed.
- **Theme color and icons come from DESIGN.md tokens/assets** so the installed app matches Still Water.
- **Disable the SW in development** to avoid stale-cache confusion; enable for production builds only.

## Risks / Trade-offs

- [Stale shell after deploy] → versioned precache + skipWaiting/clientsClaim per Serwist defaults; document update behavior.
- [Modified Next.js integration drift] → read `node_modules/next/dist/docs/` before wiring; verify the build output includes the SW.
- [Installability check nuances] → validate against the production URL (NFR-PERF-01), not just localhost.

## Open Questions

- Confirm final icon sizes required for the install check (e.g. 192/512 maskable); source from `public/brand/`.
