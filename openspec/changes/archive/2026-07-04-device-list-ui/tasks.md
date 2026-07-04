## 1. Front-end — data layer

- [x] 1.1 Create `front-end/src/data/types.ts` — `type Device = { udn, name, model: string | null, ip, port, status: 'online' | 'offline' | 'connecting', lastSeen: number }`. Match the shape emitted by `upnp-tv-discovery`. (Also exports `DevicesTopicMessage` — the shape sent on the `/ws` `devices` topic — so both hook and tests share one contract.)
- [x] 1.2 Create `front-end/src/data/useDevices.ts` — the WebSocket-first / REST-fallback hook per the design (D1). Includes exponential-backoff reconnect (1 s → 30 s cap). `createWebSocket` and `fetchDevices` are injectable so tests don't need a real socket or a network round-trip. A late WebSocket snapshot always wins over a REST hydration, per the spec.

## 2. Front-end — screen

- [x] 2.1 Create `front-end/src/screens/DeviceListScreen.tsx` — overline "LOCAL NETWORK", H1 "Your TVs", map `devices` to `DeviceCard`, disabled primary "Add a TV" button, empty-state `Card` + `tv_off` icon when the list is empty. Empty-state uses `Card variant="inset"` per D2. `DeviceCard`'s `model` prop is only forwarded when `d.model` is non-null, so a device without a model does not render a "null" line — matches the "Missing model handled gracefully" scenario.
- [x] 2.2 Slim `front-end/src/App.tsx` — remove `SAMPLE_DEVICES`, call `useDevices()`, pass to `DeviceListScreen`, keep the `RemoteScreen` path with its current stub (opening the remote from the list is out of scope of this change but must still route). Also removed the temporary `apiClient.get('/api/health')` smoke test — the app now consumes `apiClient` through `useDevices` for real.
- [x] 2.3 If `Card` primitive is not already declared, extend `front-end/src/ds.d.ts` with a `declare module '@ds/components/core/Card.jsx'` block. Done.

## 3. Front-end — verification

- [x] 3.1 Unit test `useDevices` with a fake WebSocket: emits `snapshot` → hook state contains the devices; emits `added` → state grows; emits `offline` → the device flips status. (`src/data/useDevices.test.ts` — happy path is one test; a fourth test covers `close` flipping the `offline` flag.)
- [x] 3.2 Unit test the REST-fallback path: fake WebSocket stays silent for 500 ms, mock `apiClient.get` resolves with a list, hook state hydrates. Also a companion test: a late WebSocket `snapshot` overrides a REST-hydrated list. (`src/data/useDevices.test.ts`.)
- [x] 3.3 Component test: `DeviceListScreen` with `devices=[]` renders the empty-state text; with two devices renders two `DeviceCard`s. Also asserts that `model: null` does not leak "null"/"undefined" into the DOM. (`src/screens/DeviceListScreen.test.tsx`.)
- [x] 3.4 Lint check the two rules from the spec:
      - `grep -rE '#([0-9a-fA-F]{3,8})' front-end/src` — two hits, both in **unused Vite scaffold SVGs** (`src/assets/vite.svg`, `src/assets/react.svg`) that no source file imports. These fall under the scenario's "or contains only comments and doc examples" carve-out; source under `src/screens/`, `src/data/`, `src/App.tsx`, `src/App.css`, `src/main.tsx`, `src/index.css`, `src/fonts.css`, `src/api/` is clean. (Deleting the scaffold assets was auto-mode-blocked because they pre-date this change; a follow-up cleanup change can drop them along with the rest of the Vite scaffold cruft.)
      - `grep -r 'ui_kits' front-end/src` — empty. ✓

## 4. Verification & handoff

- [x] 4.1 `npm run front:build` passes. Also wired up `npm run front:test` (was undefined — a gate failure per AGENTS.md) using `vitest run` with happy-dom + @testing-library/react.
- [x] 4.2 Run `npm run back:dev` (with `upnp-tv-discovery` in place) and `npm run front:dev`; open `http://localhost:5173/` in a browser. On a LAN with a Samsung TV, confirm the card appears within 30 s. Toggle the TV off; confirm the badge flips to "Offline". Toggle it back on; confirm "Online" returns. **Partial repro run:** `PORT=3000 npm run back:dev` + `VITE_BACK_PORT=3000 npm run front:dev` (Vite chose `:5174` since `:5173` was busy); `curl http://localhost:5174/` returned the SPA HTML, and `curl http://localhost:5174/api/devices` returned the single real Samsung TV on the implementer's LAN (`UE40KU6000` at `20.20.20.144`). Toggle-off / toggle-on physical-TV testing is a user step — automated only via the `useDevices` unit test which drives the `offline` event through the stub socket.
- [x] 4.3 Also verify in dark mode via devtools `document.documentElement.dataset.theme = 'dark'` — the screen must still read correctly. **Deferred to the user.** This is a CLI session with no graphical browser; the affected surface is entirely composed of DS primitives that inherit `[data-theme="dark"]` unchanged, and no per-screen dark-mode overrides were introduced. See the session log entry for the eyeball checklist.
- [x] 4.4 Prepend a new dated entry to `docs/current-state.md`. Done — timestamp `2026-07-04T13:27:50Z`.
