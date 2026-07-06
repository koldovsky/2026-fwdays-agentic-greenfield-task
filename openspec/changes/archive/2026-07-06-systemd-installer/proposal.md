## Why

Beyond the MVP capability catalogue (`docs/capabilities.md` C1–C9) and the first post-MVP capability (C10 tv-browser-launch). The app runs on an Orange Pi per NFR-03 and `docs/product-brief.md`, but nothing in the repo automates the "build + install + autostart" story: today the operator has to manually `npm run install:all`, `npm run back:build`, `npm run front:build`, `setcap` the node binary, then hand-write a systemd unit — every step is a footgun (wrong Node path, wrong working directory, PATH not sourced for the service user, forgotten `WantedBy=multi-user.target`, forgotten `Restart=on-failure`). This change ships **one bash script** that does the whole thing end-to-end so that a fresh Orange Pi flash + git clone + `sudo ./scripts/install.sh` is enough to have `http://mytv.local/` come up on the next reboot without further intervention.

This is a Phase 6 (deployment) capability — orthogonal to the runtime feature set (C1–C10) but load-bearing for the product principle "easy deployment on low-power hardware" (`docs/product-brief.md` → Product principles). Because no `FR-DEPLOY-*` IDs exist yet, this change also **adds four FRs to `docs/requirements.md`** and one row to `docs/capabilities.md` as part of its Impact — per the capabilities.md rule that missing requirements must gain a traceable ID before the change referencing them lands.

## What Changes

- **Requirements** (`docs/requirements.md`): add a new "Deployment" section with
  - `FR-DEPLOY-01` — a single script SHALL build both packages (`npm install` + `npm run back:build` + `npm run front:build`) so the compiled SPA is on disk before the service starts.
  - `FR-DEPLOY-02` — the script SHALL install a systemd unit that runs the back-end (`node back-end/dist/index.js`) with the environment the production configuration needs (`PORT=80`, `NODE_ENV=production`, `SERVE_SPA=1`).
  - `FR-DEPLOY-03` — the installed service SHALL start automatically on boot (`systemctl enable` + `WantedBy=multi-user.target`) and SHALL restart on failure.
  - `FR-DEPLOY-04` — the script SHALL be idempotent: re-running it on an already-installed host SHALL update the build, reload the unit, and restart the service without leaving orphan state.
- **Capabilities** (`docs/capabilities.md`): add row `C11 systemd-installer`, new "Phase 6 — Deployment" section header + one-paragraph blurb, depends on `C1 platform-foundation`.
- **Scripts** (new directory):
  - `scripts/install.sh` — bash script (`#!/usr/bin/env bash`, `set -euo pipefail`). Verifies `bash`, `node ≥ 20`, `npm`, `systemctl` are on `PATH`; refuses to run if not on Linux with systemd (macOS/dev-laptop opt-out with an explicit error). Runs `npm run install:all`, `npm run back:build`, `npm run front:build`. Grants `cap_net_bind_service=+ep` to the resolved `node` binary so the service can bind port 80 without root. Writes `/etc/systemd/system/mytv.service` from `scripts/mytv.service.tmpl` with the repo path substituted. Runs `systemctl daemon-reload`, `systemctl enable mytv`, `systemctl restart mytv`. Prints the final status and the URL (`http://mytv.local/`).
  - `scripts/mytv.service.tmpl` — a systemd unit template with `@REPO_ROOT@` and `@NODE_BIN@` placeholders substituted by `install.sh`. `Type=simple`, `Restart=on-failure`, `RestartSec=5`, `Environment=PORT=80`, `Environment=NODE_ENV=production`, `WorkingDirectory=@REPO_ROOT@/back-end`, `ExecStart=@NODE_BIN@ dist/index.js`, `WantedBy=multi-user.target`. Runs as a dedicated `mytv` system user created by the script (`useradd --system --shell /usr/sbin/nologin --home-dir @REPO_ROOT@ --no-create-home mytv` if the user does not already exist). Token file directory (`~/.mytv/`) is created + chowned to that user so the existing 0600 token store still works from `back-end/src/tv/tokens.ts`.
  - `scripts/uninstall.sh` — companion (`systemctl disable --now mytv`, remove the unit file, `systemctl daemon-reload`). Explicit escape hatch so re-flashing the Orange Pi is not the only rollback path. Leaves the repo checkout alone (operator can `rm -rf` if they want).
- **Root `package.json`**: add `deploy:install` and `deploy:uninstall` proxy scripts (`bash scripts/install.sh` / `bash scripts/uninstall.sh`) — same shape as the existing `back:*` / `front:*` proxies. `install:all` is already there and is what the install script itself invokes.
- **Docs**: extend `back-end/README.md` with a "Production install (Orange Pi)" section that documents `sudo ./scripts/install.sh` as the supported deploy path, and reduces the current "Running on the default port 80 (Linux)" section to a pointer at the script (the script does the `setcap` step).

## Capabilities

### New Capabilities

- `systemd-installer`: end-to-end deploy story for the Orange Pi. One bash script that builds both packages, grants the port-80 capability, writes and enables a systemd unit, and starts the service — idempotent so the same script is also the update path. Establishes the deploy template for any future post-MVP capability that ships a background daemon.

### Modified Capabilities

<!-- None. This capability is orthogonal to the runtime feature set (C1–C10); it consumes their build outputs but does not change any spec-level runtime behaviour. -->

## Impact

- **Requirements added**: `FR-DEPLOY-01`, `FR-DEPLOY-02`, `FR-DEPLOY-03`, `FR-DEPLOY-04` (this change edits `docs/requirements.md`).
- **Catalogue added**: `C11 systemd-installer`, Phase 6 (this change edits `docs/capabilities.md` — adds the row and a short Phase 6 blurb).
- **Requirements covered**: `FR-DEPLOY-01`, `FR-DEPLOY-02`, `FR-DEPLOY-03`, `FR-DEPLOY-04`. Also serves `NFR-03` ("shall run on Orange Pi") and `NFR-08` ("shall start within 15 s") by making the boot path deterministic; and the product principle "easy deployment on low-power hardware" from `docs/product-brief.md`.
- **Depends on**: `platform-foundation` (C1) — the script builds the very server platform C1 defined; the script would have nothing to install without it. All C1–C10 changes are already archived as of the current state.
- **Code**:
  - New: `scripts/install.sh`, `scripts/uninstall.sh`, `scripts/mytv.service.tmpl`. Directory did not previously exist.
  - Modified: root `package.json` (two proxy scripts), `back-end/README.md` (production-install section).
- **Non-goals** (quoted from `docs/product-brief.md` → "Future scope" and this change's Non-Goals):
  - **Firmware updates** for the Orange Pi itself — the script installs a service, not an OS upgrade path.
  - **Auto-update of the mytv checkout** from `git pull` on a schedule. Out of scope; re-run the install script by hand or via cron if the operator wants that.
  - **Docker / container packaging.** The product principle is "runs on Orange Pi" bare metal; adding a container layer trades startup time for isolation the single-user product does not need. Deliberately not shipped.
  - **Non-systemd init systems** (SysV, OpenRC, runit). Orange Pi's stock Armbian ships systemd; supporting alternatives is scope creep.
  - **Non-Linux hosts.** The script refuses on macOS / non-systemd Linux — the dev workflow (`npm run back:dev` + `npm run front:dev`) already covers that case.
  - **User authentication for the install path.** Anyone with `sudo` on the box can run it; that matches BC-04 (no auth in MVP).
  - Explicitly still deferred (from product brief): user authentication, cloud connectivity, mobile applications, macros / automation, scheduling, HDMI-CEC, voice assistants, plugin system.
- **House rules** (re-affirmed): no cloud (BC-05), no auth (BC-04), no internet at runtime (NFR-06). The installed service runs as a dedicated non-login `mytv` system user (not root) after `setcap` grants port-80 binding to the node binary — same posture as the current README's manual instructions. Tokens stay on disk under the `mytv` user's home directory with `0600` (the existing `back-end/src/tv/tokens.ts` behaviour); nothing leaves the LAN.
