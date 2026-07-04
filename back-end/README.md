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
| `PORT`      | `3000`    | TCP port to listen on.                                                   |
| `HOST`      | `0.0.0.0` | Interface to bind.                                                       |
| `LOG_LEVEL` | `info`    | Pino log level.                                                          |
| `SERVE_SPA` | on        | Set to `0` to disable serving `front-end/dist/` (e.g. running the back-end alone during front-end development via `npm run front:dev`'s own dev server). |

Copy `.env.example` to `.env` to override locally; `tsx`/`node` do not auto-load `.env` files here, so export these into your shell or use a tool like `dotenv-cli` if you want file-based overrides.

## Running on port 80 (Orange Pi)

Binding to `PORT=80` requires either running as root or granting the Node binary the capability to bind low ports without root:

```bash
sudo setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")"
```

Alternative: keep `PORT=8080` (or similar) and redirect port 80 with `iptables`/`nftables`.

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

## Logging

`src/logger.ts` builds the Pino configuration (`loggerOptions`) that Fastify uses to construct its own request logger — this keeps Fastify's built-in `req`/`res` serializers intact. Every log line goes through a recursive formatter that strips any `AccessToken` or `authorization` key regardless of nesting depth before serialization (pino's own `redact` option only supports single-level wildcards, not arbitrary depth, so a formatter is used instead). `createLogger()` is exported separately for use outside a Fastify request lifecycle and for unit-testing the redaction in isolation.

Deliberately **no in-process pretty-printing transport**: `pino-pretty`'s worker-thread transport is a common source of hangs in sandboxed/CI environments. Pipe the raw NDJSON output through `pino-pretty` at the shell level instead when you want readable output.
