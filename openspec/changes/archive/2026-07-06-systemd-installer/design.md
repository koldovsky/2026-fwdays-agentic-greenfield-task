## Context

First Phase-6 (deployment) capability. Orthogonal to C1–C10 runtime features — the script consumes their build outputs but changes no runtime behaviour. Before this change the "install on the Orange Pi" story lives only in prose (`back-end/README.md` → "Running on the default port 80 (Linux)") and requires the operator to compose seven or eight commands by hand: `npm run install:all`, `npm run back:build`, `npm run front:build`, `setcap`, write a unit file, `daemon-reload`, `enable`, `start`. This change collapses that into one script and one systemd unit template, and codifies the deploy story as a capability with tests.

Target hardware: Armbian on Orange Pi (or any systemd-based Linux). `AGENTS.md` calls out the single-origin production stance — the back-end serves `front-end/dist/` from the same port as the API and WebSocket, so the script's build step MUST run `npm run front:build` **before** the service starts. `NFR-08` ("shall start within 15 s") is what the systemd unit's `Type=simple` + `Restart=on-failure` posture is measured against on boot; the Fastify boot cost we own is small (a handful of ms), so the budget is almost entirely `node` startup + module resolution.

Port 80 needs special handling. On Linux, binding a privileged port (`< 1024`) as a non-root process requires the `CAP_NET_BIND_SERVICE` capability. The script grants that capability to the resolved node binary (`sudo setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")"`) so the service can run as an unprivileged `mytv` system user and still bind port 80. This mirrors the manual instruction already in `back-end/README.md` — the script just automates it.

Token storage: the back-end reads/writes tokens under `$XDG_CONFIG_HOME/mytv/tokens.json` when `XDG_CONFIG_HOME` is set, otherwise `$HOME/.mytv/tokens.json` (`back-end/src/tv/token-store.ts`, `back-end/README.md` → "Token storage"). Because the service runs as the `mytv` user, `$HOME` is `/var/lib/mytv` (created by the script via `useradd --system --home-dir /var/lib/mytv --create-home`), and the unit deliberately does NOT set `XDG_CONFIG_HOME` so the fallback path `/var/lib/mytv/.mytv/tokens.json` is what the deployed service actually uses (matching the path referenced in the spec's uninstall scenario, the README, and the handoff). The install script pre-creates `/var/lib/mytv/.mytv/` with `0700` owned by the service user so the first-boot pairing does not race a missing directory.

This change respects every house rule (`AGENTS.md`): the service still never talks to the front-end without going through the back-end, the token file stays out of every log line, and there is no cloud dependency introduced — the script performs no network access after `npm install` (and even that reads only the local `package-lock.json` for existing installations if `--offline` is passed).

## Goals / Non-Goals

**Goals:**
- One `sudo ./scripts/install.sh` run from a fresh Orange Pi checkout brings the service up on `http://mytv.local/` and enables it to survive a reboot.
- Idempotent: re-running the script pulls in a newer build, reloads systemd, and restarts the service without piling up state.
- Runs the service as a dedicated unprivileged `mytv` system user, not root — port 80 access comes from `setcap`, not from running as root.
- Deterministic boot: `Type=simple`, `Restart=on-failure`, `RestartSec=5`, `WorkingDirectory=<repo>/back-end`, `ExecStart=<abs-node> dist/index.js`. `WantedBy=multi-user.target` for autostart.
- Explicit uninstall path (`scripts/uninstall.sh`) so re-flashing is not the only rollback.
- Refuses to run on non-systemd / non-Linux hosts with a clear error, so a developer running it on macOS by mistake gets a hard stop rather than a broken half-install.
- Requirements traceable: adds `FR-DEPLOY-01…04` to `docs/requirements.md` and `C11` to `docs/capabilities.md` in the same change.

**Non-Goals:**
- **OS upgrades / kernel updates.** Not our lane; the operator flashes Armbian.
- **Auto-update via `git pull`.** Out of scope; the same install script re-run is the update path, but scheduling that is up to the operator.
- **Docker / containers.** The product principle is bare-metal on Orange Pi; a container layer would trade startup budget for isolation the single-user product does not need.
- **Alternative init systems** (SysV, OpenRC, runit). Armbian ships systemd; a second init story would double the maintenance surface.
- **A GUI installer or a curl-bash one-liner.** The MVP install audience is technical (`docs/product-brief.md` → "AV installers, integrators, home users with a Pi"). A cloned repo + one bash command matches that audience.
- **Signed release artefacts / apt package.** Nice-to-have; out of MVP scope.
- **User authentication for the deploy path.** Anyone with `sudo` on the box can install; matches BC-04 (no auth in MVP).
- **Systemd-user services** (`systemctl --user`). Requires lingering + XDG_RUNTIME_DIR setup on headless Pi; system-level service is simpler.
- **Front-end dev-server as a systemd unit.** Only the compiled SPA served from the back-end is in scope; `front:dev` stays a developer command.

## Decisions

### D1 — One script, three duties: build, install, activate

`scripts/install.sh` does all three in order — no split into `build.sh` + `install-service.sh` + `enable.sh`. Alternatives:

- Split into per-duty scripts. Rejected: the operator's mental model is "install the app", not "compose the app from pieces." Splitting invites out-of-order execution (an operator who runs `install-service.sh` before `build.sh` gets a service that fails to start because `dist/` is empty).
- Make it a Node.js script (`scripts/install.mjs`). Rejected: the target host is a fresh Orange Pi — Node might not be installed at all, and the script has to be able to bail out before it discovers that. Bash is universally present on Armbian.

The script is structured as `main()` calling in order: `check_prereqs`, `resolve_paths`, `install_deps`, `build`, `grant_port_capability`, `create_service_user`, `write_unit`, `enable_and_start`, `print_status`. Each function is self-contained so an operator can eyeball the flow. `set -euo pipefail` at the top; every external command wrapped in a way that surfaces its stderr to the operator.

### D2 — Idempotency posture

Re-running the script on an already-installed host must be a supported operation (the "update" path). Concretely:

- `install_deps`: `npm run install:all` — npm already treats this as idempotent.
- `build`: `npm run back:build` + `npm run front:build` — TypeScript / Vite rebuild only what changed.
- `grant_port_capability`: `setcap` is idempotent by definition (replaces the capability set), but only re-run if `getcap` shows the wrong value, so re-runs are silent.
- `create_service_user`: `id mytv &>/dev/null || useradd …` — skip creation if the user exists.
- `write_unit`: always write `/etc/systemd/system/mytv.service` (freshly rendered from the template), only `daemon-reload` if the file changed (`cmp` before + after into a temp file). This avoids gratuitous `daemon-reload` invocations while still ensuring the unit content is authoritative.
- `enable_and_start`: `systemctl enable mytv` (idempotent), `systemctl restart mytv` (always, so a fresh build takes effect). Restart, not start, so a running service picks up the new `dist/`.

The whole path is safe to run in a loop; the "update the app on the Pi" recipe becomes `cd ~/mytv && git pull && sudo ./scripts/install.sh`.

### D3 — Service user + port-80 posture

The service runs as a dedicated `mytv` system user (UID from `useradd --system`), not root, not the operator's login user. Rationale:

- Running as root is a blast-radius problem — the back-end already touches the network and does file I/O for tokens; a bug in either would run as root without this decision.
- Running as the operator's login user is fragile — the service dies on `usermod`, `userdel`, or when the operator's home directory moves.
- A dedicated system user gives us a stable home (`/var/lib/mytv`), a stable UID, and clean uninstall semantics.

Port 80 is granted to the resolved node binary via `setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(which node)")"`. Alternatives:

- Run the service as root and drop privileges after `.listen()`. Rejected: Fastify doesn't offer a "drop after listen" hook; would need a wrapper. Adds complexity.
- Use systemd's `AmbientCapabilities=CAP_NET_BIND_SERVICE` on the unit. Rejected: works, but the operator can also run the app manually via `npm start` on the Pi for debugging, and the manual path benefits from `setcap` anyway. Doing both is redundant; we pick `setcap` so the two paths behave the same.
- Redirect port 80 to `PORT=8080` via `iptables`/`nftables`. Rejected: adds an OS-level moving part for every deploy. The `setcap` recipe is one command and self-contained. The README still documents the `nftables` fallback as an opt-out.

`setcap` caveat: if the operator later runs `sudo apt upgrade` and node is replaced, the capability is lost. The uninstall script does not currently detect that — mentioned in Risks; re-running `install.sh` fixes it.

### D4 — systemd unit shape

`scripts/mytv.service.tmpl`:

```ini
[Unit]
Description=mytv — self-hosted Samsung TV remote
Documentation=https://github.com/AntoniPetrenko/2026-fwdays-agentic-greenfield-task-AP
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=mytv
Group=mytv
WorkingDirectory=@REPO_ROOT@/back-end
ExecStart=@NODE_BIN@ dist/index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=80
Environment=HOST=0.0.0.0
Environment=LOG_LEVEL=info
Environment=SERVE_SPA=1
# HOME drives back-end/src/tv/token-store.ts's fallback path
# ($HOME/.mytv/tokens.json). XDG_CONFIG_HOME is deliberately NOT set —
# setting it would shift the token file to $XDG_CONFIG_HOME/mytv/tokens.json
# and desync from the path the docs and uninstall recipe reference.
Environment=HOME=/var/lib/mytv
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mytv

[Install]
WantedBy=multi-user.target
```

Alternatives considered:

- `Type=notify` with `sd_notify`. Rejected: requires a Node bridge (`sd-notify` npm package); adds a dependency solely to gain a marginally better ready-signal. `Type=simple` is fine given the fast boot and `Restart=on-failure`.
- `After=network.target` (not `network-online.target`). Rejected: mDNS needs the interface actually up before it advertises; `network-online.target` is the correct one for a mDNS-advertising service.
- `Restart=always`. Rejected: `on-failure` is the right posture — if the operator explicitly stops the service (`systemctl stop mytv`) it should stay stopped.
- `RestartSec=1`. Rejected: too aggressive; a genuinely failing service would spam journal. `5s` is enough breathing room, matches the internal reconnect posture.
- Hardening options (`ProtectSystem=strict`, `NoNewPrivileges=true`, `PrivateTmp=true`). Deferred to a follow-up. Adding them without testing would risk breaking token persistence or mDNS binding; a Phase-6.5 change can layer them on with per-option verification.

### D5 — Requirements & catalogue edit

Same posture as C10: this change edits `docs/requirements.md` (adds FR-DEPLOY-01…04) and `docs/capabilities.md` (adds C11 row + Phase 6 blurb) in the same commit as the code. Rationale identical to C10 D7 — the FRs are load-bearing on this change's acceptance and would be dead references otherwise.

### D6 — Verification strategy

Bash scripts are notoriously untested; the risk of a broken install path is exactly the reason for the capability. Approach:

1. **Bats-core smoke tests** — `scripts/install.test.bats`. Bats is a bash test framework (`brew install bats-core` on the developer laptop; the CI check runs it locally in this repo). Not adding a `bats` dependency to `package.json` — the test file runs under whatever bats is on PATH, and CI (if we add one later) can install it in one line. Coverage:
   - `check_prereqs` refuses on macOS (`OSTYPE=darwin*`) and on a Linux host with no `systemctl` on PATH.
   - `resolve_paths` finds the absolute node binary via `readlink -f`.
   - `write_unit` produces a unit file whose `@REPO_ROOT@` / `@NODE_BIN@` placeholders are fully substituted.
   - Idempotency: running the "render + compare" logic twice with the same inputs produces byte-identical output.
2. **Dry-run mode** — `./scripts/install.sh --dry-run` prints every command it would run (without executing anything that mutates the system: `useradd`, `setcap`, `systemctl`, `mkdir` under `/etc` or `/var/lib`, `cp` into `/etc/systemd/system/`). npm/build commands still run — they are safe. This gives the operator a way to preview the changes before consenting, and the tests a way to exercise the full flow without a real Linux host.
3. **No claim of a "verified boot on real Orange Pi"** without one — mirrors the C10 stance. Task 7 in `tasks.md` will explicitly defer the on-hardware smoke test to a human session on the actual Pi and instruct them to add the model/firmware to `docs/current-state.md`.

### D7 — Docs surface

- `back-end/README.md`: add a "Production install (Orange Pi)" section that reads `sudo ./scripts/install.sh` as the supported path, and reduces the current "Running on the default port 80 (Linux)" section to a pointer at that section (the script does the `setcap`).
- Root `package.json`: expose `npm run deploy:install` and `npm run deploy:uninstall` proxies so the workflow reads consistently with `back:*` and `front:*`. Not required for the install path itself (the script is directly runnable), but nice for muscle memory.
- No `AGENTS.md` change needed; the house rules already cover the runtime posture the service inherits.

## Risks / Trade-offs

- **[Node gets replaced by an OS upgrade → `setcap` is lost → the service fails to bind port 80]** → The failure is loud (`EACCES`), the journal will show it, and re-running `install.sh` restores the capability. Documented in the README's "Troubleshooting" note.
- **[`useradd` UID collision with a pre-existing `mytv` user of a different intent]** → The script uses `id mytv &>/dev/null` before creating; if the user already exists it is reused as-is (matches "idempotent" posture). If a hostile pre-existing `mytv` user matters, that is a bigger operator-security problem than a script can fix.
- **[Bats tests unavailable in CI]** → The tests are runnable locally on any macOS/Linux dev machine with `bats-core` on PATH. Not gating CI on bats until we introduce a CI pipeline (out of scope). The test file is committed regardless so the assertions are visible.
- **[Dry-run drift]** → `--dry-run` gates only mutating commands, not `npm install`/`npm run build`. So a dry run does still write to `node_modules` and `dist`. Acceptable — those are the operator's own repo; anything under `/etc`, `/var/lib`, and any `systemctl` call is guarded.
- **[Fastify boot takes longer than 15 s on a cold Orange Pi]** → NFR-08 target. Modern Orange Pi 3B/5 hits it comfortably; older single-core boards might not. Not a script problem per se, but if it fires, the `Restart=on-failure` posture keeps trying, and the operator sees a delay, not a failure. Documented in the README.
- **[Operator forgets to `git pull` before re-running the script]** → The script does no `git pull` itself (deliberate — deploy vs. update is a separate axis). Re-running with a stale checkout is a no-op update, which is fine.
- **[The `mytv` user's `HOME=/var/lib/mytv` differs from the operator's login user's `~/.mytv` in the current README]** → An operator who paired TVs manually via `npm start` on their login user would find those tokens are not visible to the service. Mitigation: the install-script log prints the token path (`/var/lib/mytv/.mytv/tokens.json`) so the operator knows where to migrate them; and the pairing UX is user-driven at the TV screen anyway, so re-pairing is a one-tap operation. Documented in the README.
- **[Environment variables in the unit are not encrypted]** → No secrets are placed there in the current design (`PORT`, `HOST`, `LOG_LEVEL`, `NODE_ENV`, `SERVE_SPA`, `HOME`, `XDG_CONFIG_HOME`). If a follow-up ever adds a secret to the environment, this decision needs revisiting.

## Migration Plan

Additive. Rollback = `sudo ./scripts/uninstall.sh` which stops + disables + removes the unit file and reloads systemd. The repo checkout itself is left alone (the operator can `rm -rf` if they want). The `mytv` system user is NOT removed by uninstall — deliberate, so a re-install picks up the same UID and the token store still resolves. If the operator wants the user gone: `sudo userdel -r mytv` (documented in the README as a manual step).

## Open Questions

- **Do we want the script to write a `mytv.default` file under `/etc/default/` for env-var overrides?** — Would let the operator tweak `PORT` without editing the unit. Leaning no for MVP (`PORT=80` is the one right answer for the product URL); revisit if we ever ship a "custom port" story.
- **Should the script emit `journalctl -u mytv -n 50 --no-pager` at the end so the operator sees the first 50 lines of service log immediately?** — Nice for the "did it actually start?" moment. Leaning yes; will confirm during implementation whether it drowns the useful "your URL is `http://mytv.local/`" summary.
- **`bats-core` in CI?** — Deferred with the CI question in general. The test file lives in the repo regardless.
