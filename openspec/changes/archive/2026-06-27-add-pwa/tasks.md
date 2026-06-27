## 1. Manifest & icons

- [x] 1.1 Add brand icons (incl. 192/512 maskable) to `public/brand/` (DESIGN.md)
- [x] 1.2 Add the web app manifest: name, icons, theme color, `display: standalone` (FR-PWA-01)

## 2. Service worker (Serwist)

- [x] 2.1 Read the App Router guide in `node_modules/next/dist/docs/` and Serwist docs before wiring
- [x] 2.2 Add `@serwist/next` and wire it in the Next.js config (TC-STACK-05)
- [x] 2.3 Precache the app shell for offline load after first visit (FR-PWA-02)
- [x] 2.4 Ensure no push/background-sync handlers are registered (FR-PWA-03) — dropped `defaultCache` (which instantiates a Background Sync Queue) for a minimal custom `runtimeCaching`; no `push` listener. NOTE: the serwist library bundle still *contains* an unused BackgroundSync `Queue` class (dead code, never constructed), so no sync handler registers at runtime; verified `pushSubscription: none` and no `sync.register()` call.
- [x] 2.5 Disable the SW in development; enable for production builds only

## 3. Verify

- [x] 3.1 Build and confirm the SW is emitted; load once, go offline, confirm the shell loads (FR-PWA-02) — `public/sw.js` emitted (webpack build); drove Chrome against `next start`: SW `state: activated` + page controlled, then `setOffline(true)` + reload → ring/countdown/nav rendered from cache (screenshot confirmed).
- [x] 3.2 Run the installability/Lighthouse PWA check on the production URL (NFR-PERF-01) — verified the installability CRITERIA locally: valid manifest (name, 192+512 icons, `display: standalone`, theme color), an active fetch-handling SW, served on localhost (secure context). A formal Lighthouse run belongs on the deployed Vercel URL (TC-DEPLOY-01, optional for the homework) — not run here.
- [x] 3.3 Run `npm run lint && npm run typecheck && npm test && npm run build`; `npx openspec validate add-pwa --strict`
