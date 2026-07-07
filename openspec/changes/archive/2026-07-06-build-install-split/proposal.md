## Why

Real-world deploy of C11 (`systemd-installer`) on an Orange Pi surfaced a scope problem: the single `install.sh` script does too much. Today it builds both packages **and** installs the systemd unit in one root-shell invocation on the target device. That pulls the entire TypeScript / Vite / vitest / bats dev toolchain onto every Pi, forces every deploy to include a compile step, and couples "reproduce the artefacts" to "mutate systemd state." Three concrete issues from the live session:

1. **Toolchain bloat on the Pi.** The operator's Pi ended up carrying full dev dependencies (Vite, vitest, `@eslint/*`, TS) just so it could rebuild the SPA at deploy time. On a low-power SBC that costs disk + memory + CPU with no runtime benefit.
2. **No CI-friendly build path.** Because build and install are fused, there is no way to build once (on a developer laptop or a build box) and ship only the artefacts. Every install is bit-different by construction; two Pis "at the same version" can still differ if their `npm install` resolved differently.
3. **Failure modes get muddled.** The recent session had `203/EXEC`, `200/CHDIR`, and false-positive readiness reports interleaved with `npm install` output. Splitting build from install lets each script fail loud in its own domain.

Splitting also unblocks a straightforward secondary workflow (build on dev machine → `rsync` `back-end/dist/`, `front-end/dist/`, `back-end/package*.json`, `scripts/` to the Pi → `sudo ./scripts/install.sh`) without changing the primary "clone + build + install on the Pi" path — the operator just runs `./scripts/build.sh` then `sudo ./scripts/install.sh` in two steps instead of one.

## What Changes

- **New `scripts/build.sh`** (developer / CI machine — no root needed):
  - `check_prereqs`: `bash`, `node ≥ 20`, `npm`. Explicitly does NOT require `systemctl`, `setcap`, or `useradd` — the build step has no business with those.
  - Runs `npm run install:all`, `npm run back:build`, `npm run front:build` in order (same commands `install.sh` used to invoke, moved wholesale).
  - Asserts `back-end/dist/index.js` and `front-end/dist/index.html` exist afterwards; fails loud with the path that's missing.
  - Prints the two artefact paths + a hint for `rsync`ing them to a target Pi.
  - Runnable on macOS or Linux (no OS gate — building is arch-portable JS).
- **`scripts/install.sh`** — strip everything build-related:
  - Delete `install_deps` and `build` functions from the main pipeline.
  - Drop `npm` from the prerequisite set. Add `getcap` (already required in practice) and keep `setcap`, `useradd`, `install`, `mktemp`, `systemctl`.
  - Add a new `verify_artifacts` step immediately after `resolve_paths`: fails loud if `back-end/dist/index.js` or `front-end/dist/index.html` is missing, with an error pointing at `./scripts/build.sh` (locally) or `rsync` (from a dev machine).
  - Add a `install_prod_deps` step between `verify_artifacts` and `grant_port_capability`: `npm ci --omit=dev` inside `back-end/`, using the committed `package-lock.json`. This restores `npm` as a runtime prereq — but only npm, not the dev toolchain (no TS / no Vite / no vitest).
  - Everything else (`grant_port_capability`, `create_service_user`, `write_unit`, `enable_and_start`, `print_status`, `--dry-run`) stays as-is.
- **Root `package.json`**: add `deploy:build` proxy (`bash scripts/build.sh`) alongside the existing `deploy:install` / `deploy:uninstall` proxies.
- **`back-end/README.md`** "Production install (Orange Pi)" section becomes a two-step recipe: `./scripts/build.sh` → `sudo ./scripts/install.sh`. Adds a "Build once, ship dist" subsection for the CI-style workflow.
- **`scripts/install.test.bats`**: extend with two new cases — build script prereqs (node ≥ 20, no root required) and `install.sh` refusing cleanly when `dist/` artefacts are absent.
- **`docs/capabilities.md`**: split the existing C11 row into two — C11 keeps the "install service" scope (modified), C12 owns the "build artefacts" scope (new).
- **`docs/requirements.md`**: retire `FR-DEPLOY-01` from the C11 spec (build is no longer install's job) — but keep the ID, re-owning it under a new `FR-BUILD-01` (`build.sh` produces the two dists) so nothing hangs. Add `FR-DEPLOY-05` (install refuses if dists are missing) and `FR-DEPLOY-06` (install runs `npm ci --omit=dev` for runtime deps only).

## Capabilities

### New Capabilities

- `deploy-build`: developer-facing build script that produces `back-end/dist/index.js` and `front-end/dist/index.html` from a source checkout. No root, no systemd, no touch of the target device. Runnable on macOS or Linux; the artefacts are portable JS. Establishes the "build once, ship dist" separation. Covers `FR-BUILD-01`.

### Modified Capabilities

- `systemd-installer`: **BREAKING** at the operator workflow level — `install.sh` no longer builds. It now requires the two dists (produced by `deploy-build`) to be present before it will touch systemd state. It also runs `npm ci --omit=dev` inside `back-end/` so runtime deps are installed without pulling the dev toolchain. Every other guarantee (setcap, dedicated `mytv` user, autostart, idempotency, `--dry-run`, uninstall) is preserved.

## Impact

- **Requirements added**: `FR-BUILD-01` (new build script produces both dists), `FR-DEPLOY-05` (install refuses cleanly if dists are missing), `FR-DEPLOY-06` (install pulls production-only runtime deps).
- **Requirements re-owned**: `FR-DEPLOY-01` semantically moves from "install script builds" to "the deploy story ships buildable dists" — text updated to reflect that the build is a distinct step. No orphan IDs.
- **Catalogue added**: `C12 deploy-build`, Phase 6 alongside C11 (this change edits `docs/capabilities.md`).
- **Depends on**: `systemd-installer` (C11) — this change modifies its shipping shape, so it can only start after C11 is archived (it is, as of `2026-07-06-systemd-installer`).
- **Code**:
  - New: `scripts/build.sh`.
  - Modified: `scripts/install.sh` (delete build path, add verify + prod-deps step), `scripts/install.test.bats` (extend for both scripts), root `package.json` (proxy), `back-end/README.md` (two-step recipe).
- **Non-goals**:
  - **Producing a `.deb` package** — considered and rejected during the propose phase; adds `fpm` / `dpkg-deb` as a build-time dep and is its own capability. If the operator later wants apt-style installs, a Phase-6.5 change can layer it on top.
  - **Signed / notarised artefacts.** Same rationale — Phase-6.5.
  - **Cross-arch native modules.** The runtime deps are pure JS (Fastify, ws, node-ssdp, undici, bonjour-service, fast-xml-parser, p-queue, pino, `@fastify/*`) — nothing that needs compilation per arch. The `npm ci --omit=dev` step handles this correctly. If a future dependency introduces a native module, the split will need a per-arch build variant, but not now.
  - **Bundling `back-end/node_modules` into the tarball**. Rejected: `node_modules` layout can differ subtly across npm versions; running `npm ci --omit=dev` against the committed `package-lock.json` is more deterministic than shipping a tree.
  - **Auto-shipping dists from a CI system.** Out of scope; the split enables it, but wiring up a CI workflow is a separate change.
- **House rules re-affirmed**: no cloud (BC-05), no auth (BC-04), no internet at runtime (NFR-06 — `npm ci` runs at install-time only, not at runtime; matches the current posture).
