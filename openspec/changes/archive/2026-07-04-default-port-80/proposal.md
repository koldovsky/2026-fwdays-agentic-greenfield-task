## Why

Capability **C1** (`docs/capabilities.md`) shipped with a temporary default of `PORT=3000` so the substrate could be built and tested without root on the developer's machine. The product-brief UX contract, and every URL we surface in docs (`http://mytv.local/`), assumes the back-end is reachable on the well-known HTTP port. On the deployment target (Orange Pi) the process is expected to bind port 80 directly — the previous default has been forcing every deploy runbook, dev doc, and mDNS reference to override `PORT=80` in one place and leave `3000` littered across the rest.

Aligning the default with the production URL fixes the docs-vs-code drift, removes an easy source of "why does `mytv.local` 404" incidents (browser hits `:80`, service listens on `:3000`), and matches the assumption already baked into `FR-HOSTING-02` (reachability at `http://mytv.local/` with no client configuration).

## What Changes

- Change the back-end HTTP default port from `3000` to `80` in `back-end/src/index.ts` and `back-end/src/app.ts` (the `options.port ?? Number(process.env.PORT ?? 3000)` fallback). `PORT` env override stays.
- Update `back-end/README.md`: the `PORT` row shows default `80`, and the "Running on port 80" section is reframed as "Running on a low port during development" (still documents `setcap cap_net_bind_service` — now required to run the default, not to opt into `80`).
- Add a matching dev-fallback note: developers who don't want to grant `cap_net_bind_service` set `PORT=3000` (or similar) explicitly; Vite's dev proxy already reads the port from `VITE_BACK_PORT` and needs no code change.
- Update the platform-foundation spec: the "Single-origin Fastify server" requirement gains a scenario that pins the default port to `80` when `PORT` is unset (and keeps the "any `PORT` value binds correctly" scenario).
- Update `openspec/specs/platform-foundation/spec.md` (via delta) and cross-referenced call-outs in `docs/current-state.md` (session log) so future sessions read the new default.
- **BREAKING** for anyone who was relying on the previous `PORT=3000` default in local scripts — they now need to set `PORT=3000` explicitly or accept the port-80 default (documented in the README migration note).

## Capabilities

### New Capabilities

<!-- None. This change modifies an existing capability. -->

### Modified Capabilities

- `platform-foundation`: the default TCP port is `80`, not `3000`. The single-origin server requirement gets a new scenario pinning the default, and the existing scenarios continue to hold for any explicit `PORT` override.

## Impact

- **Requirements covered**: reinforces `FR-HOSTING-02` (default URL now matches the reachable URL without client config). No new FR/NFR/BC IDs.
- **Depends on**: `platform-foundation` (archived — `openspec/changes/archive/2026-07-04-platform-foundation`). No dependency on `mdns-advertisement`, but the mDNS SRV record already reads `port` from the same config path, so the advertised SRV port flips to `80` automatically once this ships.
- **Code**: `back-end/src/index.ts` (fallback literal), `back-end/src/app.ts` (JSDoc + fallback literal), `back-end/README.md` (env-var table + low-port section rewrite). Tests already pass `port: 0` explicitly and are unaffected.
- **Dependencies added**: none.
- **Non-goals**: TLS / HTTPS on the default port (BC-01/BC-03/BC-05 — local traffic only). No change to `HOST`, `SERVE_SPA`, `MDNS_ENABLED`, or the Vite dev-proxy shape.