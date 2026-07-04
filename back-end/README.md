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

## Running on the default port 80 (Linux)

The default `PORT=80` matches the URL the product surfaces (`http://mytv.local/`). Binding a low port on Linux requires either running as root or granting the Node binary the capability to bind low ports without root — the standard deploy step on the Orange Pi:

```bash
sudo setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")"
```

Alternative: set `PORT=8080` (or similar) and redirect port 80 with `iptables`/`nftables`.

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

Per-TV IP Control sessions are managed by `src/tv/manager.ts` (creates one `Session` per discovered UDN, subscribes to the discovery registry so an `offline` device tears its session down, `online` puts it back in `Disconnected`). Each session owns exactly one `undici.Pool` to `https://<ip>:<port>` and a per-TV FIFO queue for state-changing commands (`p-queue` concurrency 1 — batching is not supported by the Samsung protocol).

HTTP surface (all under `/api`, all client-visible state collapses `Reconnecting` to `Connecting`):

| Method | Path                            | Behavior                                                       |
| ------ | ------------------------------- | -------------------------------------------------------------- |
| GET    | `/api/devices/:udn/session`     | Snapshot of the current session state.                         |
| POST   | `/api/devices/:udn/connect`     | Idempotent; creates the session if needed and drives it up.    |
| POST   | `/api/devices/:udn/disconnect`  | Tears the session down; state becomes `Disconnected`.          |

WebSocket: the `/ws` `devices` topic now also carries `{ event: 'session', udn, state }` on every transition.

### AccessToken storage

Tokens live in `$XDG_CONFIG_HOME/mytv/tokens.json` (or `~/.mytv/tokens.json`) with mode `0600` — the file is written atomically (`.tmp` sibling + chmod + rename) so no reader ever sees a world-readable copy. The token is loaded once at connect time and merged into every JSON-RPC `params` object; the redacting logger strips it from every log line regardless of nesting depth. The token NEVER leaves the back-end — no HTTP response body, WebSocket message, or log carries it. If you need to preload a token per TV, set `MYTV_TOKEN_<UDN>=<token>` in the environment; the env value takes precedence over the on-disk store.

### Manual repro without a real TV

Samsung's IP Control protocol provisions the AccessToken out-of-band and has no documented `getAccessToken` JSON-RPC method (the current design uses `getAccessToken` speculatively; on a stock TV the call maps to `TvNotSupported` and the session ends in `Disconnected`). Practical smoke testing without a paired TV goes through the stub integration suite:

```bash
npm run back:test
```

`src/tv/session-integration.test.ts` boots the full Fastify app with a stub SSDP transport + a stub JSON-RPC transport, exercises `POST /connect` → `Connected`, `GET /session`, the WebSocket `session` events, and the `heartbeat fails → Reconnecting → Disconnected after cap` flow. That's the documented manual gate — the assertions cover the state transitions, the `Reconnecting → Connecting` client-side collapse, and the "no AccessToken in the wire payload" contract.

On real hardware you can drive the routes directly (Samsung UE40KU6000 verified reachable in the implementer's environment):

```bash
UDN=<uuid from GET /api/devices>
curl http://localhost:3000/api/devices/$UDN/session       # → {"state":"Disconnected"}
curl -X POST http://localhost:3000/api/devices/$UDN/connect
# Expect: {"state":"Disconnected"} for now — the pairing method is protocol-speculative;
# preload a real token via MYTV_TOKEN_$UDN=<token> to get past this and reach Connected.
```

## Logging

`src/logger.ts` builds the Pino configuration (`loggerOptions`) that Fastify uses to construct its own request logger — this keeps Fastify's built-in `req`/`res` serializers intact. Every log line goes through a recursive formatter that strips any `AccessToken` or `authorization` key regardless of nesting depth before serialization (pino's own `redact` option only supports single-level wildcards, not arbitrary depth, so a formatter is used instead). `createLogger()` is exported separately for use outside a Fastify request lifecycle and for unit-testing the redaction in isolation.

Deliberately **no in-process pretty-printing transport**: `pino-pretty`'s worker-thread transport is a common source of hangs in sandboxed/CI environments. Pipe the raw NDJSON output through `pino-pretty` at the shell level instead when you want readable output.
