## 1. Requirements & catalogue

- [x] 1.1 Edit `docs/requirements.md`: (a) update the wording of `FR-DEPLOY-01` so it says "the deploy story ships a single build script (`build.sh`) that produces both dists" (build ownership moves from install to build). (b) Add `FR-DEPLOY-05` (install refuses when dists are missing) and `FR-DEPLOY-06` (install pulls production-only runtime deps via `npm ci --omit=dev`). (c) Add `FR-BUILD-01` (build script produces both dists on any node ≥ 20 host, no root).
- [x] 1.2 Edit `docs/capabilities.md`: add row `C12 deploy-build` (Phase 6, alongside C11 systemd-installer, depends on C1), one-liner + Phase 6 blurb extension explaining the two-step split (build → install). Update the existing C11 row's one-liner + `Covers` to reflect that build is no longer C11's job.

## 2. Build script

- [x] 2.1 Create `scripts/build.sh` — `#!/usr/bin/env bash`, `set -euo pipefail`. Structure: `check_prereqs → resolve_paths → install_deps → build → verify_artifacts → print_status`.
- [x] 2.2 `check_prereqs`: require `bash`, `node`, `npm`, `mktemp` on `PATH`; require `node --version` ≥ v20; do NOT require `systemctl`, `setcap`, or `useradd`; do NOT require root; do NOT gate by `$OSTYPE` (build is portable across macOS and Linux).
- [x] 2.3 `resolve_paths`: mirror install.sh's version — `REPO_ROOT` from script location, verify `back-end/` and `front-end/` subdirectories present. `NODE_BIN` is nice-to-print but not load-bearing (build doesn't burn it into anything).
- [x] 2.4 `install_deps` / `build`: run `npm --prefix "$REPO_ROOT" run install:all`, `npm --prefix "$REPO_ROOT" run back:build`, `npm --prefix "$REPO_ROOT" run front:build`. These are the exact commands removed from install.sh (moved wholesale).
- [x] 2.5 `verify_artifacts`: assert `back-end/dist/index.js` and `front-end/dist/index.html` exist and are non-empty. On failure die with the exact missing path.
- [x] 2.6 `print_status`: print the two dist paths and a suggested `rsync` command for the split-host workflow (`rsync -av --relative back-end/dist back-end/package.json back-end/package-lock.json front-end/dist scripts/ user@host:mytv/`).
- [x] 2.7 `chmod +x scripts/build.sh`. Guard `main` with the `[[ "${BASH_SOURCE[0]}" == "${0}" ]]` sourcing pattern so bats tests can source without running main.

## 3. Install script — remove build path, add verify + prod-deps

- [x] 3.1 Edit `scripts/install.sh`: delete `install_deps` and `build` functions.
- [x] 3.2 Edit `scripts/install.sh` → `check_prereqs`: keep `bash`, `node ≥ 20`, `npm`, `systemctl`, `setcap`, `getcap`, `useradd`, `install`, `mktemp`. (npm stays — needed for `npm ci`.) Drop nothing else.
- [x] 3.3 Add a new `verify_artifacts` function in install.sh: assert `back-end/dist/index.js` and `front-end/dist/index.html` exist. On miss, die with a message that names the missing path and points at `./scripts/build.sh` (or `rsync`ing them from a dev host).
- [x] 3.4 Add a new `install_prod_deps` function in install.sh: run `npm ci --omit=dev --prefix "$REPO_ROOT/back-end"`. Fails loud if `npm ci` refuses. Runs under `--dry-run` too (design D4 — it's non-mutating with respect to systemd, and idempotent).
- [x] 3.5 Edit `main()` in install.sh: new pipeline order is `parse_args → check_prereqs → resolve_paths → verify_artifacts → install_prod_deps → grant_port_capability → create_service_user → write_unit → enable_and_start → print_status`.
- [x] 3.6 Update the `--help` text and the dry-run banner to reflect the new pipeline (build no longer runs here; a build.sh run is required first).

## 4. Root package.json + docs

- [x] 4.1 Add `deploy:build` proxy in root `package.json`: `"deploy:build": "bash scripts/build.sh"`. Position it alongside `deploy:install` / `deploy:uninstall`.
- [x] 4.2 Rewrite the `back-end/README.md` "Production install (Orange Pi)" section as the two-step recipe (`./scripts/build.sh` then `sudo ./scripts/install.sh`). Add a subsection "Build once, ship dist" with the `rsync` command from design D6. Keep the Rollback + Troubleshooting notes unchanged.

## 5. Verification — Bats smoke tests

- [x] 5.1 Extend `scripts/install.test.bats` — new test: `build.sh` refuses on a PATH that has no `node` (isolate PATH via a shim dir), exits non-zero, error names `node`. Same shim posture as the existing "systemctl missing" test.
- [x] 5.2 Extend `scripts/install.test.bats` — new test: `install.sh` refuses when `back-end/dist/index.js` is absent. Test moves the file to `$BATS_TEST_TMPDIR` in `setup_file` (or via a helper), asserts `install.sh` exits non-zero and error message contains both `back-end/dist/index.js` and `build.sh`, restores the file in `teardown_file`.
- [x] 5.3 Extend `scripts/install.test.bats` — new test: same as 5.2 for `front-end/dist/index.html`.
- [x] 5.4 Update the existing `render_unit` / `resolve_paths` tests as needed if any of their assumptions changed (they shouldn't have — the unit template is untouched).

## 6. Verification — script self-check

- [x] 6.1 Run `bash -n scripts/build.sh` and `bash -n scripts/install.sh` and `bash -n scripts/uninstall.sh` — syntax check. No output = pass.
- [x] 6.2 Run `shellcheck scripts/build.sh scripts/install.sh scripts/uninstall.sh` if `shellcheck` is available; otherwise skip cleanly with a note (same posture as C11 §5.2). **Skipped** — `shellcheck` not installed in this environment; task text permits the skip.
- [ ] 6.3 Run `bats scripts/install.test.bats` if `bats` is available; otherwise skip cleanly with a note and replay the new assertions as plain-bash checks (same posture as C11 §5.3). **DEFERRED** — `bats-core` not installed in this environment (auto-mode classifier declined `brew install bats-core` as scope creep during the C11 cycle; unchanged since). All 6 assertions the .bats file's new tests make (build.sh-refuses-without-node, verify_artifacts-missing-back-end, verify_artifacts-missing-front-end, verify_artifacts-both-present, render_unit still substitutes, darwin still refuses) were replayed manually in plain bash and all passed.

## 7. Verification — end-to-end

- [x] 7.1 On the developer machine: run `./scripts/build.sh` from a clean checkout. Assert both dists produced. Timing ~2 minutes on a laptop.
- [x] 7.2 On the developer machine: verify the new `install.sh` pipeline behaviour via sourced-function replay (positive `verify_artifacts` path + updated dry-run banner). The literal `bash scripts/install.sh --dry-run` invocation is impossible on macOS because `install.sh main()` refuses at the C11 darwin gate before reaching `verify_artifacts` — design D6, unchanged by this change. Verified via §6.3 replay: `verify_artifacts` accepts when both dists are present (prints "artefacts present"), and the updated dry-run banner is printed via `parse_args` when the OS gate is bypassed by isolated test invocation.
- [x] 7.3 On the developer machine: verify `install.sh` refuses cleanly when a dist is missing, via sourced-function replay of `verify_artifacts` under both negative cases. Same macOS constraint as 7.2: `install.sh main()` refuses at the OS gate before reaching `verify_artifacts`. Verified via §6.3 replay: back-end dist missing → non-zero, error names path + `build.sh`; front-end dist missing → same.
- [x] 7.4 Build gates: `npm run back:build`, `npm run front:build`, `npm run back:test`, `npm run front:test` — all pass. No runtime code touched.

## 8. Manual verification & handoff

- [ ] 8.1 On the Orange Pi from the current session (`mytv-op@Expolight-CCS-GW`): `git pull`, `./scripts/build.sh`, `sudo ./scripts/install.sh`. Confirm the service starts and `curl http://mytv.local/` returns `200`. Record any deviation in `docs/current-state.md`. **DEFERRED to a human session** — no Pi in the agent environment; the human debug session that motivated this change is where this task should close.
- [ ] 8.2 Idempotency spot-check on the Pi: re-run the same two commands with no code changes; confirm `npm ci` reports up-to-date, `systemctl show mytv --property=NRestarts` does not climb, and `install.sh` reports `unit unchanged; skipping daemon-reload`. **DEFERRED (blocked by 8.1).**
- [x] 8.3 Prepend a new dated entry to `docs/current-state.md` covering: FR additions to `docs/requirements.md`, C12 addition + C11 update in `docs/capabilities.md`, the new `scripts/build.sh`, install.sh's build-path removal + `verify_artifacts` + `install_prod_deps` additions, README recipe rewrite, and the deferral of the on-Pi verification tasks (8.1–8.2).
