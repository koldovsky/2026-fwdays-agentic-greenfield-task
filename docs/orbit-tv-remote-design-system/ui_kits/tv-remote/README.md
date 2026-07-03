# TV Remote — UI Kit

Two-screen click-through: device discovery list → per-TV remote control.

- `index.html` — mounts both screens with real state transitions (theme toggle, add-TV modal, list → remote navigation).
- `DeviceListScreen.jsx` — nearby TVs list + "Add a TV by IP" modal.
- `RemoteScreen.jsx` — D-pad, transport buttons, volume, power, app shortcuts.

Both screens are plain global-scope components (`window.DeviceListScreen` / `window.RemoteScreen`) that consume the design system's real components from `window.OrbitTVRemoteDesignSystem_08e5b7` — no new primitives are defined here.
