## Context

Front-end lives at `front-end/src/`, uses React 19 + Vite + TypeScript. The Orbit design system is aliased at `@ds` and its rules live in `DESIGN.md`; the `frontend-design-check` skill gates every edit. The current `App.tsx` renders `DeviceListScreen` inline against `SAMPLE_DEVICES` (see `front-end/src/App.tsx:14-64`). This change rips out the sample data, factors the list screen into its own file, and binds it to the live registry contract that `upnp-tv-discovery` produces (`/api/devices` snapshot + `/ws` `devices` topic).

Two upstream capabilities are the contract:

- `platform-foundation` supplies the `apiClient` module and the WebSocket mount at `/ws`.
- `upnp-tv-discovery` defines the message shape: `{ topic: "devices", event: "snapshot"|"added"|"updated"|"removed"|"offline", device? , devices? }`.

## Goals / Non-Goals

**Goals:**
- Live, self-healing device list: WebSocket-driven when possible, REST-fallback when the WebSocket is slow or fails.
- Every UI atom drawn from Orbit DS primitives — no ad-hoc CSS. See DESIGN.md and the `frontend-design-check` skill.
- English, sentence-case, second-person copy.
- Sensible empty state.

**Non-Goals:**
- Manual add-by-IP (FR gap — flagged in `docs/capabilities.md`).
- Actually opening the remote (the `RemoteScreen` still runs on the same stubs it currently does; a subsequent change wires it to the real connection).
- Optimistic offline UX / retry banners (belongs to `error-surfacing`).

## Decisions

### D1 — `useDevices` hook: WebSocket first, REST fallback

```ts
useDevices() → { devices: Device[], loading: boolean, offline: boolean }
```

Behaviour:

1. On mount, open WebSocket to `/ws`.
2. Kick off a 500 ms timer. If the WebSocket has not delivered a `snapshot` by then, fire `apiClient.get<Device[]>('/api/devices')` in parallel and hydrate from it — but a WebSocket snapshot after the fact still wins.
3. Apply every `added|updated|removed|offline` event to the local state.
4. On WebSocket close: exponential backoff reconnect (1 s → 30 s cap). Set a local `offline: true` flag while disconnected — surfaced as a subtle dot in the header, not a modal. (Full UX belongs to `error-surfacing`.)

Design mirrors the DS UI kit's own state pattern (see `docs/orbit-tv-remote-design-system/ui_kits/tv-remote/DeviceListScreen.jsx` for reference layout — do not import it; it is `window.*`-scoped).

**Alternative considered:** REST polling every N seconds. Rejected — `FR-DISCOVERY-04` and the "instant when a TV joins" UX both require push.

### D2 — DS primitives used

Per the `frontend-design-check` skill / DESIGN.md:

- `@ds/components/core/DeviceCard.jsx` — one per registry entry. Props already match: `name, model, ip, status`.
- `@ds/components/core/Badge.jsx` — inside DeviceCard already; not separately imported.
- `@ds/components/core/Button.jsx` — primary "Add a TV" **disabled** placeholder in the CTA slot, honouring the "one accent per screen" rule; kept for layout so the future change is a drop-in.
- `@ds/components/core/Card.jsx` (if not already imported) — for the empty state; uses `--nm-inset-md` for a subdued look.
- Icons via `<span className="material-symbols-rounded">tv_off</span>` for the empty-state glyph. No emoji.

Every one of these already has a shim in `front-end/src/ds.d.ts` (see the current file). If `Card` is added, extend `ds.d.ts`.

### D3 — Screen composition

`front-end/src/screens/DeviceListScreen.tsx` owns layout. Header overline "LOCAL NETWORK", H1 "Your TVs" (matches DS demo copy). Under it either:

- The `DeviceCard` list (when `devices.length > 0`), or
- The empty-state `Card` with a `tv_off` glyph and "No TVs found. Make sure your TV is on the same Wi-Fi network."

Below the list, the placeholder `Button variant="primary" disabled` with the label "Add a TV" — orange accent, but disabled so it's clearly non-functional. This preserves the "one accent per screen" rule without giving the user a broken button; when the manual-add change lands, this becomes enabled.

### D4 — Removed code

`front-end/src/App.tsx` shrinks to a thin composer: `useDevices()` → passes `devices` into `DeviceListScreen`; retains the `RemoteScreen` route for now with the current stub props. The `SAMPLE_DEVICES` array is deleted outright — no dead code, no fallback.

`front-end/src/App.tsx` currently uses `crypto.randomUUID()` for the local Add-a-TV flow (present only in stub data). That path is gone in this change, so the ID field is no longer needed until the manual-add change lands.

## Risks / Trade-offs

- [WebSocket blocked by an over-eager LAN firewall] → REST fallback + reconnect ensures the list still populates; user sees a stale-ish list until it recovers. Log to console for developer debugging.
- [Offline TV clicked → routes to `RemoteScreen` which fails silently] → Accepted for this change. `tv-connection-lifecycle` introduces the real state transitions; the failure lands there. This keeps this change scoped.
- [DS `DeviceCard` accepts only `online | offline | connecting`; future protocol errors could add more] → Extend the DS, not this consumer. The DS's `Badge` map is authoritative.
- [Empty-state icon uses `tv_off` — semantics OK?] → Material Symbols Rounded ships it; visually reads as "no TV connected", which is exactly the empty state.

## Migration Plan

Not applicable — no prior release. Reverting deletes the two new files and restores `App.tsx` from git.

## Open Questions

- Should the WebSocket URL be constructed from `window.location` (to match the current page's scheme/host) or hard-coded to `/ws`? Design goes with the latter, using `new WebSocket(new URL('/ws', window.location.href))`. Either works given the single-origin rule; pick the one with less string juggling.
