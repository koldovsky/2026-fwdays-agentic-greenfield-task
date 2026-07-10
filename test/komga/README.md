# Komga test server

A throwaway [Komga](https://komga.org) instance for developing and testing
`connector-komga` (ADR-007 — the connector talks to Komga's native REST). It comes
up **pre-seeded** with the repo's [`test-epubs/`](../../test-epubs) and a non-admin
reader account, so the connector has a real server and real books to hit.

## What you get

| | |
|---|---|
| Komga UI / API | http://localhost:25600 |
| Library | **Test EPUBs** → the 2 files in `test-epubs/`, mounted read-only |
| Admin | `admin@edda.test` / `edda-admin-pw` |
| Reader (non-admin) | `reader@edda.test` / `edda-reader-pw` |

The **reader** has only `FILE_DOWNLOAD` + `PAGE_STREAMING` — the realistic, least-
privilege account the connector should authenticate as. The admin exists only to
provision the server.

## Quick start

Requires Docker (Desktop on macOS). From the repo root:

```sh
pnpm komga:up            # start Komga + run the one-shot provisioner
pnpm komga:logs          # follow logs (Ctrl-C to detach; containers keep running)
```

Or without the package scripts:

```sh
docker compose -f test/komga/docker-compose.yml up -d
```

### Using Podman

The `pnpm komga:*` scripts call `docker compose`. With Podman (no Docker CLI) either
`alias docker=podman` (Podman's `compose` subcommand delegates to your compose provider), or run it directly:

```sh
podman machine start                                            # once, if the VM isn't running
podman compose -f test/komga/docker-compose.yml up -d           # start + provision
podman compose -f test/komga/docker-compose.yml run --rm provision   # (re)provision, blocking
podman compose -f test/komga/docker-compose.yml down            # stop
```

Rootless Podman on macOS reads the `test-epubs/` bind mount fine even though the files are `0600`.

`up` starts two containers: `komga` (stays running) and `provision` (a sidecar that
claims the server, creates the reader, creates + scans the library, then exits `0`).
Watch it with `docker compose -f test/komga/docker-compose.yml logs -f provision`.

When provisioning finishes, http://localhost:25600 shows **Test EPUBs** with the two
books indexed.

## Point the connector at it

```
baseUrl:  http://localhost:25600
email:    reader@edda.test
password: edda-reader-pw
```

Komga's REST accepts HTTP Basic auth, so the connector's `probe()` can hit
`GET /api/v1/claim` (public) and authenticated calls can use `Authorization: Basic …`.

## Web CORS (browser `fetch`)

CORS is a **host concern, not a plugin one** — the connector never touches it (it only calls
`HostBridge.http`). On web the bridge is `fetch`, so a browser request to Komga is cross-origin and
the **server** must allowlist the app origin. Add it to Komga's `KOMGA_CORS_ALLOWED_ORIGINS`
(comma-separated). This compose passes the var through, defaulting to Vite's dev/preview origins:

```sh
# test/komga/.env
KOMGA_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
```

Then `pnpm komga:down && pnpm komga:up` for Komga to pick it up. Note: the **Vitest integration suite
needs none of this** — it runs in the Node environment, where `fetch` has no CORS (the same as the
future native client over a native HTTP transport). A missing allowlist surfaces as a *host* transport
error in the browser, never a plugin bug.

## Reset / teardown

```sh
pnpm komga:down          # stop containers, KEEP the Komga DB (fast restart)
pnpm komga:reset         # stop + delete the komga-config volume (clean slate)
```

Provisioning is idempotent, so after `komga:down` a later `komga:up` just re-checks
state. Use `komga:reset` when you want a truly fresh, unclaimed server.

## CI / e2e gating

To block until the server is fully provisioned (exit code propagates):

```sh
docker compose -f test/komga/docker-compose.yml up -d komga
docker compose -f test/komga/docker-compose.yml run --rm provision   # blocks, exits 0 when ready
```

(`pnpm komga:provision` runs that second line.)

## Configuration

Copy [`.env.example`](./.env.example) → `.env` (in this dir) to override the image,
host port, credentials, or library name. See that file for the full list.

## How it works

- [`docker-compose.yml`](./docker-compose.yml) — pins `gotson/komga:1.24.4`, mounts
  `../../test-epubs` read-only at `/data/books`, persists Komga's DB in the
  `komga-config` named volume.
- [`provision.sh`](./provision.sh) — POSIX-sh, no `jq`. Uses Komga's REST:
  `POST /api/v1/claim` (admin), `POST /api/v2/users` (reader),
  `POST /api/v1/libraries` (library + auto-scan), then polls `GET /api/v1/books`
  until both EPUBs are indexed.

## Troubleshooting

- **`provision` exits with 401** — the `komga-config` volume was claimed earlier with
  different credentials. Run `pnpm komga:reset` and try again.
- **0 books indexed** — the scan is async; give it a moment, or check
  `docker compose -f test/komga/docker-compose.yml logs komga`. The EPUBs are mounted
  read-only at `/data/books`.
- **Linux host, permission denied reading EPUBs** — the sample files are `0600`. Make
  them group/other-readable (`chmod o+r test-epubs/*.epub`) or run Komga as your UID by
  adding `user: "${UID}:${GID}"` to the `komga` service. (Not needed on Docker Desktop
  for macOS, which maps bind-mount permissions for you.)
