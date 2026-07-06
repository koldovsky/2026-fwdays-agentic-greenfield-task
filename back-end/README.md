# back-end

Fastify 5 + TypeScript service for **mytv**. Serves the HTTP API under `/api`, a WebSocket channel at `/ws`, and (in production) the compiled front-end SPA from `front-end/dist/` — all from one origin and one port.

## Running

From the repo root:

```bash
npm run back:dev     # tsx watch, restarts on change, plain NDJSON logs
npm run back:build   # tsc -> dist/
npm run back:test    # runs src/**/*.test.ts via node's test runner
npm start             # node dist/index.js (after a build)
```

`back:dev` prints structured JSON logs (no pretty-printer is embedded in the process — see "Logging" below). For a human-readable stream during local development:

```bash
npm run back:dev | npx pino-pretty
```

## Environment variables

| Variable    | Default   | Purpose                                                                 |
| ----------- | --------- | ------------------------------------------------------------------------ |
| `PORT`      | `80`      | TCP port to listen on. Matches the reachable URL `http://mytv.local/`. See "Running on the default port 80" below for the Linux capability requirement, and "Development on macOS / non-privileged shells" for the standard opt-out. |
| `HOST`      | `0.0.0.0` | Interface to bind.                                                       |
| `LOG_LEVEL` | `info`    | Pino log level.                                                          |
| `SERVE_SPA` | on        | Set to `0` to disable serving `front-end/dist/` (e.g. running the back-end alone during front-end development via `npm run front:dev`'s own dev server). |

Copy `.env.example` to `.env` to override locally; `tsx`/`node` do not auto-load `.env` files here, so export these into your shell or use a tool like `dotenv-cli` if you want file-based overrides.

## Production install (Orange Pi)

The supported deploy path for the Orange Pi (or any systemd-based Linux host) is a single script that builds both packages, grants port-80 capability, writes a systemd unit, and starts the service:

```bash
sudo ./scripts/install.sh
```

The script is idempotent — re-running it is also the "update after `git pull`" path. Preview what it will do without touching systemd state:

```bash
./scripts/install.sh --dry-run
```

Rollback (stops + disables + removes the unit; keeps the `mytv` user and `/var/lib/mytv/` so a re-install preserves stored pairing tokens):

```bash
sudo ./scripts/uninstall.sh
```

See `openspec/changes/archive/*-systemd-installer/design.md` for the full decision set (service-user posture, `Restart=on-failure`, `network-online.target` ordering).

## Running on the default port 80 (Linux)

The default `PORT=80` matches the URL the product surfaces (`http://mytv.local/`). Binding a low port on Linux requires either running as root or granting the Node binary the `cap_net_bind_service` capability. The production install script (`scripts/install.sh` above) does this automatically. If you are running the back-end by hand instead (e.g. debugging), grant the capability directly:

```bash
sudo setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")"
```

Alternative: set `PORT=8080` (or similar) and redirect port 80 with `iptables`/`nftables`.

**Troubleshooting**: If a system upgrade replaces the node binary (e.g. `apt upgrade` after a NodeSource release), the `setcap` grant is lost and the service will fail with `EACCES` on port 80. Re-run `sudo ./scripts/install.sh` to restore the capability.

## Development on macOS / non-privileged shells

On a developer laptop where the Node binary cannot be granted `cap_net_bind_service` (e.g. macOS, or a Linux user without `sudo`), the standard opt-out is to pick any high port and pass it through the env:

```bash
PORT=3000 npm run back:dev
```

The Vite dev proxy reads the same value from `VITE_BACK_PORT` (defaulting to `3000`), so `npm run front:dev` keeps working with no further configuration.

## mDNS

On startup the back-end advertises itself as `mytv.local` (`_http._tcp` service record, TXT `path=/`) so any peer on the LAN can reach the SPA at `http://mytv.local/` without knowing the host's IP address. The advertisement is re-issued automatically when the host's non-loopback IPv4 interface set changes (interface flap, DHCP lease with a new address, SSID switch).

| Variable        | Default | Purpose                                                                                            |
| --------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `INSTANCE_NAME` | `mytv`  | Service instance name announced over mDNS (leave as `mytv` in single-instance MVP deployments).    |
| `MDNS_ENABLED`  | on      | Set to `0` to skip advertising (useful in some test/dev setups).                                    |

Manual repro:

```bash
# macOS
dns-sd -B _http._tcp .

# Linux
avahi-browse -r _http._tcp
```

Both should list an instance called `mytv` and resolve `mytv.local` to the host's LAN IPv4 address. If mDNS fails to bind port 5353 (e.g. Avahi/mDNSResponder is already running on Linux), the app keeps serving HTTP but `/api/health` reports `mdns.state: "error"` with a diagnostic hint — stop the conflicting daemon or run the app with `AVAHI_COMPAT=1`.

## TV connection lifecycle

Per-TV sessions are managed by `src/tv/manager.ts` (creates one `Session` per discovered UDN, subscribes to the discovery registry so an `offline` device tears its session down, `online` puts it back in `Disconnected`). Each session owns exactly one Samsung **Smart View WebSocket** connection and a per-TV FIFO queue for state-changing commands (`p-queue` concurrency 1 — batching is not supported).

**Transport**: consumer Tizen TVs (2016+) do not speak the hotel-TV IP Control protocol (`docs/samsung-ip-control-protocol/` — that reference is for commercial/hotel hardware, not the consumer sets this repo targets). They speak the **Samsung Smart View WebSocket API** on port `8001`:

```
ws://<ip>:8001/api/v2/channels/samsung.remote.control?name=<base64(client-name)>[&token=<token>]
```

Commands are fire-and-forget text frames — no per-call response id:

```json
{ "method": "ms.remote.control", "params": { "Cmd": "Click", "DataOfCmd": "KEY_VOLUP" } }
```

**Pairing**: first connect for a UDN with no stored token opens the WS with only `name=<...>` (no `token`) and logs `"awaiting pairing confirmation on TV screen"` — the user must accept the on-screen prompt on the physical remote. The TV then sends `{"event":"ms.channel.connect","data":{"token":"..."}}`, which is persisted (see "Token storage" below). A declined prompt sends `{"event":"ms.channel.unauthorized"}`; both outcomes are mapped to the domain error union via `mapWsError` (`src/tv/errors.ts`). Subsequent connects append `&token=<token>`; the TV re-confirms without issuing a new one. Heartbeat is a WebSocket-level `ping()`/`pong()`, not an application-layer command.

**Control port is a constant, not derived** from the UPnP description (`device.port` is the *description* port, not the control port — the manager ignores it): `SMART_VIEW_PORT = 8001` in `src/tv/manager.ts`, overridable per-UDN via `MYTV_CONTROL_PORT_<UDN>` for firmware that needs a different port (e.g. `8002`'s TLS variant, not implemented — see Non-Goals in `openspec/changes/archive/*-smart-view-ws-transport/design.md` once archived).

| Variable                 | Default        | Purpose                                                                                   |
| ------------------------ | -------------- | ------------------------------------------------------------------------------------------ |
| `MYTV_TOKEN_<UDN>`       | (none)         | Preload a pairing token for a specific TV, bypassing the on-screen accept and the on-disk store. Takes precedence over the token store. |
| `MYTV_CONTROL_PORT_<UDN>`| `8001`         | Override the Smart View control port for a specific TV (e.g. a firmware that only accepts `8002`'s TLS variant — not implemented, connection would still fail without a WSS-capable transport). |

HTTP surface (all under `/api`, all client-visible state collapses `Reconnecting` to `Connecting`):

| Method | Path                            | Behavior                                                       |
| ------ | ------------------------------- | -------------------------------------------------------------- |
| GET    | `/api/devices/:udn/session`     | Snapshot of the current session state.                         |
| POST   | `/api/devices/:udn/connect`     | Idempotent; creates the session if needed and drives it up.    |
| POST   | `/api/devices/:udn/disconnect`  | Tears the session down; state becomes `Disconnected`.          |

WebSocket: the `/ws` `devices` topic now also carries `{ event: 'session', udn, state }` on every transition.

### Token storage

Tokens live in `$XDG_CONFIG_HOME/mytv/tokens.json` (or `~/.mytv/tokens.json`) with mode `0600` — the file is written atomically (`.tmp` sibling + chmod + rename) so no reader ever sees a world-readable copy. The token is loaded once at connect time and passed in the Smart View WS connection URL; the redacting logger strips the `token` key (any depth) and `token=...` query fragments from every log line. The token NEVER leaves the back-end — no HTTP response body, WebSocket message, or log carries it. If you need to preload a token per TV, set `MYTV_TOKEN_<UDN>=<token>` in the environment; the env value takes precedence over the on-disk store.

### Manual repro without a real TV

```bash
npm run back:test
```

`src/tv/session-integration.test.ts` boots the full Fastify app with a stub SSDP transport and a real `ws.WebSocketServer` standing in for the TV (mimicking the `ms.channel.connect` pairing ack) — exercising `POST /connect` → `Connected`, `GET /session`, the WebSocket `session` events, and the `heartbeat fails → Reconnecting → Disconnected after cap` flow through the *actual* transport, not a hand-rolled stub. `src/tv/jsonrpc.test.ts` covers the transport itself the same way (real `ws.WebSocketServer` on `127.0.0.1:0`). That's the documented manual gate — the assertions cover the state transitions, the `Reconnecting → Connecting` client-side collapse, and the "no token in the wire payload" contract.

On real hardware you can drive the routes directly (Samsung UE40KU6000 verified reachable in the implementer's environment):

```bash
UDN=<uuid from GET /api/devices>
curl http://localhost:3000/api/devices/$UDN/session       # → {"state":"Disconnected"}
curl -X POST http://localhost:3000/api/devices/$UDN/connect
# Watch the TV screen for the pairing prompt and accept it; the log prints
# "awaiting pairing confirmation on TV screen" while it waits (30 s timeout).
# After accept: {"state":"Connected"}, and the token is persisted to
# ~/.mytv/tokens.json. MYTV_TOKEN_$UDN=<token> still preloads a token to
# skip the on-screen step entirely.
```

## Logging

`src/logger.ts` builds the Pino configuration (`loggerOptions`) that Fastify uses to construct its own request logger — this keeps Fastify's built-in `req`/`res` serializers intact. Every log line goes through a recursive formatter that strips any `AccessToken` or `authorization` key regardless of nesting depth before serialization (pino's own `redact` option only supports single-level wildcards, not arbitrary depth, so a formatter is used instead). `createLogger()` is exported separately for use outside a Fastify request lifecycle and for unit-testing the redaction in isolation.

Deliberately **no in-process pretty-printing transport**: `pino-pretty`'s worker-thread transport is a common source of hangs in sandboxed/CI environments. Pipe the raw NDJSON output through `pino-pretty` at the shell level instead when you want readable output.
