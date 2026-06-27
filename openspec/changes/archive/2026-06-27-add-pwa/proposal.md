## Why

The product is meant to live on a phone's home screen and survive an offline subway
ride. With the app complete, the last step is packaging it as an installable,
offline-capable PWA — installability only, no background push (FR-PWA-01…03).

## What Changes

- Add a web app manifest enabling install to the home screen: name, icons, theme
  color, `display: standalone` (FR-PWA-01).
- Add a service worker that caches the app shell for offline use after first load (FR-PWA-02).
- Scope the service worker to installability/offline only — no background push (FR-PWA-03).
- Use Serwist (`@serwist/next`), not the unmaintained `next-pwa` (TC-STACK-05).
- Provide brand icons in `public/brand/` feeding the manifest (DESIGN.md).

## Capabilities

### New Capabilities
- `pwa`: manifest + service worker that make the finished app installable and offline-capable.

### Modified Capabilities
<!-- none -->

## Impact

- New code: manifest, Serwist service worker + Next.js config wiring, icons in `public/brand/`.
- New dep: `@serwist/next` (TC-STACK-05).
- Depends on `shell` (the app shell being cached). Supports NFR-PERF-01 (installability check passes).
- No app-data network calls introduced; privacy unchanged (BC-PRIVACY-01).
