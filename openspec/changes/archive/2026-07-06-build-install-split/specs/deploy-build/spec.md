## ADDED Requirements

### Requirement: Standalone build script

The repo SHALL ship `scripts/build.sh` — a Bash script that, given a source checkout with `node >= 20` and `npm` on `PATH`, produces `back-end/dist/index.js` and `front-end/dist/index.html` from source. The script SHALL NOT require root, SHALL NOT touch systemd state, and SHALL be runnable on macOS or Linux (build artefacts are pure JS and portable). Covers `FR-BUILD-01`.

#### Scenario: Fresh checkout produces both dists

- **WHEN** an operator runs `./scripts/build.sh` on a machine with `node >= 20` and `npm` in a freshly cloned repo
- **THEN** on exit `back-end/dist/index.js` and `front-end/dist/index.html` both exist and were regenerated during the run

#### Scenario: Build refuses without node

- **WHEN** `./scripts/build.sh` is invoked on a host where `command -v node` returns nothing
- **THEN** the script exits non-zero, prints an error naming `node` as the missing prerequisite, and does not run `npm install` or Vite

#### Scenario: Build does not require root

- **WHEN** an unprivileged user runs `./scripts/build.sh`
- **THEN** the script executes normally and never attempts `useradd`, `setcap`, `systemctl`, or writes under `/etc/` or `/var/lib/`

### Requirement: Build failure surfaces the missing artefact

If either the back-end (`tsc`) or the front-end (`vite build`) step exits non-zero, or if the expected output file (`back-end/dist/index.js` / `front-end/dist/index.html`) is not present on completion, the script SHALL exit non-zero with an error message that names the missing artefact.

#### Scenario: Back-end compile failure names the missing entrypoint

- **WHEN** `tsc` fails during the back-end build
- **THEN** the script exits non-zero and the error message contains the path `back-end/dist/index.js`

#### Scenario: Front-end build failure names the missing entrypoint

- **WHEN** Vite fails during the front-end build
- **THEN** the script exits non-zero and the error message contains the path `front-end/dist/index.html`
