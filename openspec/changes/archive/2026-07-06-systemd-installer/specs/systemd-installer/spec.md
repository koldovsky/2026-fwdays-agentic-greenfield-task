## ADDED Requirements

### Requirement: One-shot build script

The repo SHALL ship a single Bash script at `scripts/install.sh` that, when executed with root privileges on a systemd-based Linux host, builds both the back-end and the front-end packages before touching any systemd state. The build phase SHALL invoke `npm run install:all` (installing root, back-end, and front-end dependencies) followed by `npm run back:build` and `npm run front:build`, in that order. Covers `FR-DEPLOY-01`.

#### Scenario: Fresh checkout builds both packages

- **WHEN** an operator runs `sudo ./scripts/install.sh` on a systemd Linux host from a freshly cloned repo
- **THEN** on completion `back-end/dist/index.js` and `front-end/dist/index.html` both exist and were regenerated during the run

#### Scenario: Build failure halts before systemd changes

- **WHEN** `npm run back:build` or `npm run front:build` exits non-zero during the run
- **THEN** the script exits non-zero without writing `/etc/systemd/system/mytv.service`, without running `systemctl enable`, and without running `systemctl restart`

### Requirement: Systemd unit installed

The script SHALL write a systemd service unit to `/etc/systemd/system/mytv.service` that runs the compiled back-end (`node back-end/dist/index.js`) as a dedicated non-login `mytv` system user, with `WorkingDirectory` set to the absolute path of `back-end/` inside the repo checkout and `ExecStart` referencing the absolute path of the resolved `node` binary. The unit SHALL export the production environment variables the back-end expects (`NODE_ENV=production`, `PORT=80`, `HOST=0.0.0.0`, `LOG_LEVEL=info`, `SERVE_SPA=1`, `HOME=/var/lib/mytv`). The unit SHALL NOT export `XDG_CONFIG_HOME` — omitting it makes `back-end/src/tv/token-store.ts` resolve tokens to `$HOME/.mytv/tokens.json`, matching the path the spec's uninstall scenario and the README both reference. The script SHALL grant `CAP_NET_BIND_SERVICE` to the resolved `node` binary via `setcap` so the unprivileged service user can bind port 80. Covers `FR-DEPLOY-02`.

#### Scenario: Unit file rendered with absolute paths

- **WHEN** the script completes successfully
- **THEN** `/etc/systemd/system/mytv.service` exists and its `WorkingDirectory=` and `ExecStart=` lines carry absolute paths (no `@REPO_ROOT@` / `@NODE_BIN@` placeholders remain)

#### Scenario: Service runs as the dedicated mytv user

- **WHEN** the script completes successfully
- **THEN** `id mytv` resolves to a system user (UID < 1000) whose shell is `/usr/sbin/nologin`, `/var/lib/mytv/` exists and is owned by `mytv:mytv` with mode `0700` on the `.mytv/` subdirectory

#### Scenario: Node binary can bind port 80

- **WHEN** the script completes successfully
- **THEN** `getcap "$(readlink -f "$(which node)")"` reports `cap_net_bind_service=ep`

### Requirement: Autostart on boot

The installed unit SHALL be enabled (`systemctl enable mytv`) with `WantedBy=multi-user.target` so it starts automatically after the host reboots, and SHALL be configured with `Restart=on-failure` and `RestartSec=5` so a crash re-launches without operator intervention. On completion the script SHALL start (or restart) the service so it is running immediately without waiting for a reboot. Covers `FR-DEPLOY-03`.

#### Scenario: Unit enabled and active after run

- **WHEN** the script completes successfully
- **THEN** `systemctl is-enabled mytv` prints `enabled` and `systemctl is-active mytv` prints `active`

#### Scenario: Service survives reboot

- **WHEN** the host reboots after a successful install
- **THEN** `mytv.service` is started by systemd during boot without operator intervention (verified via `systemctl is-active mytv` in the boot follow-up)

#### Scenario: Service restarts on failure

- **WHEN** the running back-end process is killed with a non-zero exit code (`kill -9`)
- **THEN** systemd re-launches it within `RestartSec` (5 s), matching `Restart=on-failure`

### Requirement: Idempotent re-run

The script SHALL be safe to re-run on an already-installed host without leaving orphan state. A subsequent run SHALL update dependencies + build artefacts, re-render the unit file (`daemon-reload` only if the file content changed), and restart the service so the fresh build is picked up. The dedicated `mytv` user SHALL NOT be re-created if it already exists (`useradd` SHALL be gated by `id mytv`). The `setcap` step SHALL be a no-op when the correct capability is already present (`getcap` gate). Covers `FR-DEPLOY-04`.

#### Scenario: Second run is a no-op update

- **WHEN** the script is executed a second time with no source changes
- **THEN** it exits `0`, the `mytv` user is not re-created, no new UID is issued, `setcap` is not re-invoked (or is invoked idempotently), the unit file byte-content is unchanged, `systemctl daemon-reload` is skipped, and the service is restarted so any new binary would be picked up

#### Scenario: Second run picks up a new build

- **WHEN** the script is executed a second time after the operator has changed source code
- **THEN** `back-end/dist/index.js` is rebuilt, the service is restarted, and the running process's start time (`systemctl show mytv --property=ActiveEnterTimestamp`) is after the script's own start time

### Requirement: Refuses to run outside supported hosts

The script SHALL refuse to run on hosts that are not systemd-based Linux (e.g. macOS, non-systemd Linux, WSL without systemd) and SHALL exit non-zero with a clear error message before touching the filesystem. Prerequisite checks (`bash`, `node ≥ 20`, `npm`, `systemctl`, `setcap`, `useradd`) SHALL run first; a missing prerequisite SHALL cause the script to exit non-zero without any partial state.

#### Scenario: macOS invocation refused

- **WHEN** the script is executed on a host where `$OSTYPE` matches `darwin*`
- **THEN** it exits non-zero and prints an error naming the unsupported host, without invoking `npm install`, `useradd`, `setcap`, or `systemctl`

#### Scenario: Non-systemd Linux refused

- **WHEN** the script is executed on a Linux host where `systemctl` is not on `PATH`
- **THEN** it exits non-zero and prints an error naming the missing prerequisite, without invoking any mutating command

### Requirement: Dry-run preview

The script SHALL accept a `--dry-run` flag that prints every mutating command it would execute (`useradd`, `setcap`, `mkdir` under `/etc` or `/var/lib`, `cp`/`install` into `/etc/systemd/system/`, `systemctl daemon-reload`, `systemctl enable`, `systemctl restart`) without invoking them. Non-mutating steps (dependency install, TypeScript / Vite build) MAY still run so the operator can preview the full flow.

#### Scenario: Dry run does not modify systemd state

- **WHEN** the script is executed with `--dry-run` on a systemd Linux host that has never installed the service
- **THEN** `/etc/systemd/system/mytv.service` does not exist afterwards, `id mytv` still fails, and `getcap` on the node binary does not include `cap_net_bind_service`

### Requirement: Uninstall path

The repo SHALL ship `scripts/uninstall.sh` that stops, disables, and removes the systemd unit and reloads systemd, without touching the repo checkout or the `mytv` system user or its `/var/lib/mytv` home directory (so a subsequent re-install picks up the same UID and the token store still resolves).

#### Scenario: Uninstall removes the unit

- **WHEN** `sudo ./scripts/uninstall.sh` is executed on a host with the service installed
- **THEN** `systemctl is-active mytv` prints `inactive`, `systemctl is-enabled mytv` prints `disabled` or `masked`, and `/etc/systemd/system/mytv.service` no longer exists

#### Scenario: Uninstall preserves user and tokens

- **WHEN** `sudo ./scripts/uninstall.sh` is executed
- **THEN** the `mytv` system user still exists (`id mytv` succeeds) and `/var/lib/mytv/.mytv/tokens.json` (if it existed) is unchanged
