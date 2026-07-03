## 1. Front-end — data layer

- [ ] 1.1 Create `front-end/src/data/types.ts` — `type Device = { udn, name, model: string | null, ip, port, status: 'online' | 'offline' | 'connecting', lastSeen: number }`. Match the shape emitted by `upnp-tv-discovery`.
- [ ] 1.2 Create `front-end/src/data/useDevices.ts` — the WebSocket-first / REST-fallback hook per the design (D1). Includes exponential-backoff reconnect (1 s → 30 s cap).

## 2. Front-end — screen

- [ ] 2.1 Create `front-end/src/screens/DeviceListScreen.tsx` — overline "LOCAL NETWORK", H1 "Your TVs", map `devices` to `DeviceCard`, disabled primary "Add a TV" button, empty-state `Card` + `tv_off` icon when the list is empty.
- [ ] 2.2 Slim `front-end/src/App.tsx` — remove `SAMPLE_DEVICES`, call `useDevices()`, pass to `DeviceListScreen`, keep the `RemoteScreen` path with its current stub (opening the remote from the list is out of scope of this change but must still route).
- [ ] 2.3 If `Card` primitive is not already declared, extend `front-end/src/ds.d.ts` with a `declare module '@ds/components/core/Card.jsx'` block.

## 3. Front-end — verification

- [ ] 3.1 Unit test `useDevices` with a fake WebSocket: emits `snapshot` → hook state contains the devices; emits `added` → state grows; emits `offline` → the device flips status.
- [ ] 3.2 Unit test the REST-fallback path: fake WebSocket stays silent for 500 ms, mock `apiClient.get` resolves with a list, hook state hydrates.
- [ ] 3.3 Component test: `DeviceListScreen` with `devices=[]` renders the empty-state text; with two devices renders two `DeviceCard`s.
- [ ] 3.4 Lint check the two rules from the spec:
      - `grep -rE '#([0-9a-fA-F]{3,8})' front-end/src` returns nothing
      - `grep -r 'ui_kits' front-end/src` returns nothing.

## 4. Verification & handoff

- [ ] 4.1 `npm run front:build` passes.
- [ ] 4.2 Run `npm run back:dev` (with `upnp-tv-discovery` in place) and `npm run front:dev`; open `http://localhost:5173/` in a browser. On a LAN with a Samsung TV, confirm the card appears within 30 s. Toggle the TV off; confirm the badge flips to "Offline". Toggle it back on; confirm "Online" returns.
- [ ] 4.3 Also verify in dark mode via devtools `document.documentElement.dataset.theme = 'dark'` — the screen must still read correctly.
- [ ] 4.4 Prepend a new dated entry to `docs/current-state.md`.
