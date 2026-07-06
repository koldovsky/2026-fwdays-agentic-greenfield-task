## MODIFIED Requirements

### Requirement: One-shot build script

The repo SHALL ship a single Bash script at `scripts/install.sh` that, when executed with root privileges on a systemd-based Linux host, installs the systemd unit for a repo whose back-end and front-end have already been built (`back-end/dist/index.js` and `front-end/dist/index.html` present on disk). The install script SHALL NOT build either package itself; the build step lives in the sibling `scripts/build.sh` (see the `deploy-build` capability). The install script SHALL verify both artefacts exist before touching any systemd state, and SHALL install production-only runtime dependencies for the back-end (via `npm ci --omit=dev` inside `back-end/`) before granting the port-80 capability, so the dev toolchain (tsc, Vite, vitest) does not need to be installed on the target device. Covers `FR-DEPLOY-01`.

#### Scenario: Prebuilt checkout installs cleanly

- **WHEN** an operator runs `sudo ./scripts/install.sh` on a systemd Linux host from a repo where `./scripts/build.sh` (or an equivalent rsynced artefact set) has already produced `back-end/dist/index.js` and `front-end/dist/index.html`
- **THEN** the script exits `0`, `back-end/node_modules/` is populated with the production dependency tree, `/etc/systemd/system/mytv.service` is present, `systemctl is-active mytv` prints `active`, and no `tsc` or Vite invocation happens during the run

#### Scenario: Dev toolchain not required on the target

- **WHEN** the script runs on a target host that has `node >= 20`, `npm`, `systemctl`, `setcap`, `useradd`, and no other build tooling installed (no global `tsc`, no `vite`, no `vitest`)
- **THEN** the script completes successfully and the service starts (the dev toolchain lives only in devDependencies which `--omit=dev` skips)

## ADDED Requirements

### Requirement: Install refuses when dists are missing

The install script SHALL fail loud with a non-zero exit if `back-end/dist/index.js` or `front-end/dist/index.html` is not present on disk when it runs. The error message SHALL name the missing path and point the operator at `./scripts/build.sh`. No systemd state SHALL be modified on this failure path (no unit written, no `daemon-reload`, no `systemctl enable/restart`). Covers `FR-DEPLOY-05`.

#### Scenario: Missing back-end dist rejects install

- **WHEN** `sudo ./scripts/install.sh` is run in a repo where `back-end/dist/index.js` does not exist
- **THEN** the script exits non-zero, the error message contains `back-end/dist/index.js` and the string `build.sh`, and `/etc/systemd/system/mytv.service` is not present afterwards (assuming a previous install did not already write it)

#### Scenario: Missing front-end dist rejects install

- **WHEN** `sudo ./scripts/install.sh` is run in a repo where `front-end/dist/index.html` does not exist
- **THEN** the script exits non-zero, the error message contains `front-end/dist/index.html` and the string `build.sh`, and systemd state is not modified during the failed run

### Requirement: Install pulls production-only runtime deps

The install script SHALL run `npm ci --omit=dev --prefix "$REPO_ROOT/back-end"` after `verify_artifacts` and before `grant_port_capability`. This SHALL install the back-end's production dependency tree (`Fastify`, `ws`, `node-ssdp`, `undici`, `bonjour-service`, `fast-xml-parser`, `p-queue`, `pino`, `@fastify/*`) without the dev toolchain (tsc, Vite, vitest, bats, eslint). The invocation SHALL use `npm ci` (not `npm install`) so drift between the on-disk `package-lock.json` and the resolved tree causes a hard error. Covers `FR-DEPLOY-06`.

#### Scenario: Production deps installed, dev toolchain absent

- **WHEN** the install script completes successfully on a fresh target
- **THEN** `back-end/node_modules/fastify/` exists (a production dep) and `back-end/node_modules/vite/` does not (a devDependency skipped by `--omit=dev`)

#### Scenario: Lockfile drift halts the install

- **WHEN** the install script runs against a repo whose `back-end/package-lock.json` is out of sync with `back-end/package.json`
- **THEN** `npm ci` exits non-zero, `install.sh` propagates that failure, and no systemd state is modified during the failed run
