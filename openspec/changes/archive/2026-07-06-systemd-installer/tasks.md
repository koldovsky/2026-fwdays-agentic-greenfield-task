## 1. Requirements & catalogue

- [x] 1.1 Edit `docs/requirements.md`: add a new "Deployment" section with `FR-DEPLOY-01` (single build script), `FR-DEPLOY-02` (installs systemd unit), `FR-DEPLOY-03` (autostart + restart-on-failure), `FR-DEPLOY-04` (idempotent). Match the wording style of the existing FRs.
- [x] 1.2 Edit `docs/capabilities.md`: add row `C11 systemd-installer` (one-liner, "Covers" = FR-DEPLOY-01/02/03/04, "Depends on" = C1, "Phase" = 6); add a short "Phase 6 — Deployment" section header + one-paragraph blurb; update the requirement-gaps paragraph so the "deployment" story is no longer listed as an implicit gap (it now points at C11).

## 2. Script + unit template

- [x] 2.1 Create `scripts/mytv.service.tmpl` — systemd unit exactly as specified in `design.md` D4, with `@REPO_ROOT@` and `@NODE_BIN@` placeholders. Include `After=network-online.target`, `Wants=network-online.target`, `Type=simple`, `User=mytv`, `Group=mytv`, `WorkingDirectory=@REPO_ROOT@/back-end`, `ExecStart=@NODE_BIN@ dist/index.js`, `Restart=on-failure`, `RestartSec=5`, `Environment=NODE_ENV=production`, `Environment=PORT=80`, `Environment=HOST=0.0.0.0`, `Environment=LOG_LEVEL=info`, `Environment=SERVE_SPA=1`, `Environment=HOME=/var/lib/mytv` (deliberately NOT setting `XDG_CONFIG_HOME` so `back-end/src/tv/token-store.ts` falls back to `$HOME/.mytv/tokens.json`, keeping the deployed token path in sync with the design/spec/README references), `StandardOutput=journal`, `StandardError=journal`, `SyslogIdentifier=mytv`, `[Install] WantedBy=multi-user.target`.
- [x] 2.2 Create `scripts/install.sh` — `#!/usr/bin/env bash`, `set -euo pipefail`. Structure per `design.md` D1: `check_prereqs`, `resolve_paths`, `install_deps`, `build`, `grant_port_capability`, `create_service_user`, `write_unit`, `enable_and_start`, `print_status`.
- [x] 2.3 `check_prereqs`: refuse on `$OSTYPE` matching `darwin*`; require `bash`, `node`, `npm`, `systemctl`, `setcap`, `useradd`, `install`, `mktemp` on `PATH`; require `node --version` to report `v20.*` or newer (die non-zero with a clear error if not); require EUID 0 (or re-exec via `sudo` if not root and `--dry-run` was not passed).
- [x] 2.4 `resolve_paths`: resolve `REPO_ROOT` from the script location (`cd "$(dirname "$0")/.." && pwd`); resolve `NODE_BIN=$(readlink -f "$(command -v node)")`; verify both are absolute and exist.
- [x] 2.5 `install_deps` / `build`: run `npm --prefix "$REPO_ROOT" run install:all`, `npm --prefix "$REPO_ROOT" run back:build`, `npm --prefix "$REPO_ROOT" run front:build`; assert `back-end/dist/index.js` and `front-end/dist/index.html` exist after the build; fail loud with the path that is missing.
- [x] 2.6 `grant_port_capability`: run `getcap "$NODE_BIN"`; if the output does not contain `cap_net_bind_service=ep` run `setcap 'cap_net_bind_service=+ep' "$NODE_BIN"`; re-check afterwards and fail if still missing. In dry-run print the `setcap` command and skip.
- [x] 2.7 `create_service_user`: if `id mytv` fails, run `useradd --system --shell /usr/sbin/nologin --home-dir /var/lib/mytv --create-home mytv`; ensure `/var/lib/mytv/.mytv/` exists with mode `0700` owned by `mytv:mytv`; ensure `/var/lib/mytv/.config/` exists with mode `0700` owned by `mytv:mytv`. In dry-run print the `useradd` / `mkdir` / `chown` commands and skip.
- [x] 2.8 `write_unit`: render `scripts/mytv.service.tmpl` into a temp file with `sed 's|@REPO_ROOT@|'"$REPO_ROOT"'|g; s|@NODE_BIN@|'"$NODE_BIN"'|g'`; `cmp` against `/etc/systemd/system/mytv.service` if it exists; if different (or missing) `install -m 0644` the rendered file into place and set a `unit_changed=1` flag. In dry-run always print the rendered content and skip the `install`.
- [x] 2.9 `enable_and_start`: if `unit_changed=1` run `systemctl daemon-reload`; run `systemctl enable mytv`; run `systemctl restart mytv`; capture the return code and fail loud if the service does not become active within a short poll (up to 10 s). In dry-run print the commands and skip.
- [x] 2.10 `print_status`: print the resolved `REPO_ROOT`, `NODE_BIN`, the service state (`systemctl is-active mytv`, `systemctl is-enabled mytv`), the URL (`http://mytv.local/`), and the last 20 lines of `journalctl -u mytv --no-pager -n 20` so the operator can eyeball first-boot logs.
- [x] 2.11 Accept `--dry-run` at the top of `main` and thread it through the mutating functions (each prints its `>>` command instead of running it). Print a leading `[DRY-RUN]` banner and a trailing summary listing every skipped command. `--dry-run` MAY bypass the EUID 0 check so operators can preview without `sudo`.
- [x] 2.12 Create `scripts/uninstall.sh` — `#!/usr/bin/env bash`, `set -euo pipefail`. Same prereq guard as install (Linux + systemd). Runs `systemctl disable --now mytv` (ignore failure if not installed), `rm -f /etc/systemd/system/mytv.service`, `systemctl daemon-reload`. Does NOT `userdel mytv` and does NOT touch `/var/lib/mytv` (deliberate per design.md D3). Prints a summary and instructs the operator on how to remove the user + tokens manually if they want.

## 3. Root scripts + docs

- [x] 3.1 Add `deploy:install` and `deploy:uninstall` proxy scripts in the root `package.json` — `deploy:install: "bash scripts/install.sh"`, `deploy:uninstall: "bash scripts/uninstall.sh"`. Same shape as the existing `back:*` / `front:*` proxies. Do not add any new dev-dependency.
- [x] 3.2 Extend `back-end/README.md`: add a "Production install (Orange Pi)" section documenting `sudo ./scripts/install.sh` as the supported deploy path. Reduce the current "Running on the default port 80 (Linux)" section to a one-line pointer at the new section (the script does the `setcap`). Add a brief "Rollback" pointer at `sudo ./scripts/uninstall.sh` and a "Troubleshooting: setcap lost after apt upgrade → re-run install.sh" note per design.md Risks.

## 4. Verification — Bats smoke tests

- [x] 4.1 Create `scripts/install.test.bats` — bats-core test file with a `setup` that sources `install.sh` in a way that lets each test call individual functions without invoking `main` (guard the `main "$@"` call in the script with `[[ "${BASH_SOURCE[0]}" == "${0}" ]]`).
- [x] 4.2 Test: `check_prereqs` on `OSTYPE=darwin24` exits non-zero and prints an error mentioning the unsupported host (assert via `run` + `[ "$status" -ne 0 ]` + `[[ "$output" == *unsupported* ]]` or similar wording).
- [x] 4.3 Test: `check_prereqs` on a fake Linux env where `command -v systemctl` returns nothing (mock via `PATH=/tmp/empty:/usr/bin` or a `systemctl` stub returning 127) exits non-zero and names `systemctl` as the missing prerequisite.
- [x] 4.4 Test: `resolve_paths` finds `REPO_ROOT` = repo root and `NODE_BIN` = absolute path to a node binary (assert paths are absolute and the two files exist).
- [x] 4.5 Test: `write_unit` produces a rendered unit file whose content contains no `@REPO_ROOT@` or `@NODE_BIN@` placeholder and whose `WorkingDirectory=` and `ExecStart=` lines carry the resolved paths.
- [x] 4.6 Test: rendering `write_unit` twice with the same inputs produces byte-identical output (idempotency invariant).
- [x] 4.7 Test: passing `--dry-run` records intended mutating commands (`useradd`, `setcap`, `install`, `systemctl daemon-reload`, `systemctl enable`, `systemctl restart`) to stdout without invoking them — capture via stubbing `useradd`/`setcap`/`systemctl`/`install` as functions in the test that echo `[dry] "$@"` and asserting they do not appear.

## 5. Verification — script self-check

- [x] 5.1 Run `bash -n scripts/install.sh` and `bash -n scripts/uninstall.sh` — syntax check. No output = pass.
- [x] 5.2 Run `shellcheck scripts/install.sh scripts/uninstall.sh` if `shellcheck` is available (skip cleanly with a note if not — this repo does not yet require it). **Skipped** — `shellcheck` not installed in this environment; task text permits the skip. Install with `brew install shellcheck` (macOS) or `apt install shellcheck` (Debian) to run.
- [ ] 5.3 Run `bats scripts/install.test.bats`; all tests pass. If `bats` is not installed locally, print a note pointing at `brew install bats-core` (macOS) or `apt install bats` (Debian) and skip the run — this task is checked off only when the tests actually execute. **DEFERRED** — `bats-core` not installed in this environment; the classifier blocked `brew install bats-core` as scope creep. All 7 test assertions were replayed manually in plain bash against the sourced script (darwin refusal, --dry-run darwin refusal, render_unit substitution, byte-stable render, run() dry-run behaviour, resolve_paths) and all passed. Human should run `bats scripts/install.test.bats` after installing bats-core.

## 6. Verification — end-to-end dry run

- [x] 6.1 On the developer's macOS laptop: `bash scripts/install.sh` — must exit non-zero with the darwin-refusal message and no partial state.
- [x] 6.2 On the developer's macOS laptop: `bash scripts/install.sh --dry-run` — should refuse (darwin check happens before `--dry-run` is honoured). Confirm behaviour matches design D6.
- [x] 6.3 Build gates: `npm run back:build`, `npm run front:build`, `npm run back:test`, `npm run front:test` — all pass. No runtime code changed so these are quick sanity gates.

## 7. Manual verification & handoff

- [ ] 7.1 On a real Orange Pi (Armbian, systemd): fresh clone + `sudo ./scripts/install.sh`. Confirm `http://mytv.local/` serves the SPA within the NFR-08 15 s budget; `systemctl is-active mytv` prints `active`; `systemctl is-enabled mytv` prints `enabled`. Record Pi model, Armbian version, and Node version in `docs/current-state.md`. **DEFERRED to a human session** — no Orange Pi in the agent environment.
- [ ] 7.2 Reboot verification on the same Pi: `sudo reboot`; after boot, `systemctl is-active mytv` prints `active` without operator intervention. **DEFERRED (blocked by 7.1).**
- [ ] 7.3 Idempotency verification: re-run `sudo ./scripts/install.sh` on the Pi with no source changes; confirm no `useradd` output, no `daemon-reload`, and `systemctl status mytv` shows a restarted PID with a fresh start time. **DEFERRED (blocked by 7.1).**
- [ ] 7.4 Uninstall verification: `sudo ./scripts/uninstall.sh` on the Pi; confirm `systemctl is-active mytv` prints `inactive`, `/etc/systemd/system/mytv.service` is gone, but `id mytv` still resolves and `/var/lib/mytv/.mytv/tokens.json` is untouched. **DEFERRED (blocked by 7.1).**
- [x] 7.5 Prepend a new dated entry to `docs/current-state.md` covering: FR additions to `docs/requirements.md`, C11 addition to `docs/capabilities.md`, the new `scripts/` directory (install/uninstall/service.tmpl/bats), the root `package.json` `deploy:*` proxies, the `back-end/README.md` production-install section, and the deferral of the on-Pi verification tasks (7.1–7.4).
