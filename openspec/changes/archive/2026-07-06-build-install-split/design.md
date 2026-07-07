## Context

Follow-up to C11 (`systemd-installer`), driven by a real deploy session on an Orange Pi where the fused build+install workflow produced three concrete failure modes (see proposal Why). This change splits `install.sh` into two scripts along a clean seam: **build produces artefacts, install consumes artefacts**. The seam is the two `dist/` directories the back-end and front-end already produce; neither is touched by this change.

Sibling context: `AGENTS.md` mandates single-origin production (back-end serves `front-end/dist/`), no cloud, no auth. NFR-08 ("start within 15 s") is measured from `systemctl start` to `Server listening`; splitting out the compile step tightens that budget on cold boots because the service no longer competes with `npm install`. C11's `mytv` service-user posture, port-80 capability grant, autostart posture, and idempotency guarantees are all preserved — the split is orthogonal to those.

The runtime dep set of the back-end is pure JS (Fastify, ws, node-ssdp, undici, bonjour-service, fast-xml-parser, p-queue, pino, `@fastify/*`). No `node-gyp` compilation. That is the load-bearing fact behind D2 below.

## Goals / Non-Goals

**Goals:**
- One `./scripts/build.sh` on any machine with `node ≥ 20` and `npm` produces `back-end/dist/index.js` and `front-end/dist/index.html` — nothing else. No root, no systemd, no `setcap`.
- One `sudo ./scripts/install.sh` on a systemd-based Linux host installs the systemd unit, runs `npm ci --omit=dev` in `back-end/`, and starts the service — assuming the two dists already exist. Refuses fast with a clear pointer at `build.sh` if they don't.
- Preserve every C11 guarantee that isn't tied to the build step: idempotent re-runs, `--dry-run` on install, dedicated `mytv` user with UID stability across re-installs, `cap_net_bind_service` on the resolved node binary, `WantedBy=multi-user.target`, `Restart=on-failure`, `RestartSec=5`.
- Support two operator workflows without branching the scripts:
  - **Single-host (Pi only):** `git clone` on the Pi → `./scripts/build.sh` → `sudo ./scripts/install.sh`.
  - **Split-host (CI or dev laptop → Pi):** `./scripts/build.sh` on the developer machine → `rsync -a --relative back-end/dist back-end/package.json back-end/package-lock.json front-end/dist scripts/ mytv-op@pi:mytv/` → `sudo ./scripts/install.sh` on the Pi.
- Extend the bats suite to cover the build-side prereq gate and the install-side "no dist" refusal.

**Non-Goals:**
- **A `.deb` package or `fpm` output.** Distinct capability. Not now.
- **A tarball artefact + separate `deploy.sh` that pushes it.** Overkill for MVP; `rsync` already covers the split-host workflow and the operator's tool. If the operator later wants a checksum'd artefact, that's a follow-up.
- **Cross-arch native modules.** Runtime dep set is pure JS today; if that changes, the split will need per-arch variants.
- **Auto-fetch prebuilt artefacts from GitHub Releases.** Same rationale as `.deb` — distinct capability.
- **Removing `npm` from the Pi entirely.** Would require shipping `back-end/node_modules` in the tarball; considered and rejected under D2.
- **A `--fetch` mode on `install.sh` that downloads dists from a URL.** Introduces a network dep during install; against the local-first product posture. If needed later, it's an opt-in flag on a follow-up change.
- **Any change to the systemd unit template.** The unit is stable across the split — `WorkingDirectory` and `ExecStart` still point at `<repo>/back-end` and the resolved node binary, both of which are exactly what a `rsync`ed target has.

## Decisions

### D1 — Two scripts, one seam

Split into `build.sh` (build) and `install.sh` (install). The seam is the two `dist/` directories. Alternatives considered:

- **Keep `install.sh` monolithic, add a `--skip-build` flag.** Rejected: leaves the compile toolchain requirement on every prereq check even when it's not being used, and the flag is easy to forget. A dedicated file is a stronger signal.
- **Ship a single `deploy.sh` that composes `build` and `install` internally with subcommands (`deploy.sh build`, `deploy.sh install`).** Rejected: adds an argv-parse layer and doesn't buy anything — two files are as discoverable as one file with two subcommands and are easier to `chmod +x` from source control.

### D2 — Runtime deps via `npm ci --omit=dev` on the target, not bundled `node_modules`

The install script runs `npm ci --omit=dev` inside `back-end/` after `verify_artifacts` and before `grant_port_capability`. That gives the Pi the production dep tree (Fastify + friends) without the dev toolchain (tsc, vite, vitest, eslint, bats). Alternatives:

- **Bundle `back-end/node_modules/` in the build output.** Rejected: (a) `node_modules` layout can vary subtly across npm versions and (b) it locks the tarball to the build host's arch/OS in the rare case a transitive dep introduces a native module. `npm ci` against a committed `package-lock.json` is more deterministic and self-repairing.
- **Vendor runtime deps as `esbuild --bundle`.** Rejected: forces a bundler dep at build time and hides source paths in the journal. Optional future optimisation, not now.
- **Skip `npm ci` and require the operator to run it manually.** Rejected: too easy to forget, would immediately re-open the "did the deploy actually finish" question the readiness poll already struggles with.

### D3 — `verify_artifacts` runs before anything mutating

Placed immediately after `resolve_paths` in `main()`, before `install_prod_deps`, `grant_port_capability`, `create_service_user`, `write_unit`, and `enable_and_start`. Rationale: the classic failure mode this split targets is "someone forgot to build" — that failure should never leave partial systemd state. The check has to be first because every downstream step is mutating.

Failure message names both possible missing paths (`back-end/dist/index.js`, `front-end/dist/index.html`) and points at `./scripts/build.sh` and/or `rsync` for the split-host workflow.

### D4 — `install_prod_deps` posture

`npm ci --omit=dev --prefix "$REPO_ROOT/back-end"` — same-flavour invocation as the existing `install:all` script but scoped to back-end and production-only. Invariants:

- Uses `npm ci`, not `npm install`. `ci` respects the lockfile exactly and errors on drift — matches the "reproducible" spirit of the split.
- `--omit=dev` drops tsc / vite / vitest / bats / @eslint / etc. — that's roughly 100 → 35 packages on this repo's back-end.
- `--prefix "$REPO_ROOT/back-end"` scopes to the back-end alone; the front-end doesn't need any runtime deps on the target (the SPA is static under `front-end/dist/`).
- Runs after `verify_artifacts` so we know dists are present, and before `grant_port_capability` so the node the operator sees granted is definitely the one that will run.
- No dry-run bypass — `npm ci` is idempotent and cheap enough to always run (~10 s on a Pi). The DRY_RUN banner still prints on entry so the operator knows what's about to happen.

### D5 — Bats test expansion

Add two cases:

1. **build.sh refuses without node.** Same shim posture as the existing "systemctl missing" test — build with an isolated PATH that lacks `node`, assert `bash scripts/build.sh` exits non-zero and names `node`.
2. **install.sh refuses without dists.** Move the current `back-end/dist/index.js` aside (via a helper that `mv`s it into `$BATS_TEST_TMPDIR` and restores it in `teardown`), invoke a helper that calls only `check_prereqs` + `resolve_paths` + `verify_artifacts` from a sourced `install.sh`, assert failure with a message naming `build.sh`.

Reuse the existing setup / teardown scaffolding.

### D6 — README shape after the split

`back-end/README.md` "Production install (Orange Pi)" becomes:

```
## Production install (Orange Pi)

Two steps. Run once on any machine with node ≥ 20 to build:

    ./scripts/build.sh

Then on the Pi (as root):

    sudo ./scripts/install.sh

### Build once, ship dist (CI / dev-laptop workflow)

Build on your laptop, then push only the artefacts + scripts to the Pi:

    rsync -av --relative \
      back-end/dist back-end/package.json back-end/package-lock.json \
      front-end/dist \
      scripts/ \
      mytv-op@pi.local:mytv/

    ssh mytv-op@pi.local
    sudo ./mytv/scripts/install.sh
```

Rollback + troubleshooting sections stay as-is.

### D7 — Requirements & catalogue edits

Same posture as C10 and C11: this change edits `docs/requirements.md` and `docs/capabilities.md` in the same commit as the code. New IDs added, C11's `FR-DEPLOY-01` text updated (build moves out of scope), C12 gets its own row.

## Risks / Trade-offs

- **[Operator forgets step 1 and runs `install.sh` first]** → `verify_artifacts` prints a clear error naming `scripts/build.sh`. The failure happens before any systemd state changes, so re-running the correct sequence recovers.
- **[Split-host `rsync` misses a file]** → same failure mode as above (`verify_artifacts` triggers). The README's recommended `rsync` command names every path explicitly so operators can copy-paste.
- **[`npm ci --omit=dev` still needs npm on the Pi]** → yes, this is a deliberate compromise vs. bundling `node_modules`. If npm becomes a burden, D2 revisits with a bundler. Not now.
- **[`build.sh` on macOS produces subtly different output vs. building on Linux]** → the two dists are pure JS from tsc + Vite; identical bytes across platforms for the same repo state. If we ever add a native module or platform-conditional import, this claim needs revisiting.
- **[Idempotency guarantee has a new participant]** → `install_prod_deps` re-runs `npm ci` on every install invocation. `npm ci` is idempotent by design (it rebuilds `node_modules/` from `package-lock.json`) but the wall-clock cost is ~10 s each run. Acceptable given the update-path story.
- **[C11's `--dry-run` semantic]** → `--dry-run` still skips the mutating systemd/setcap/useradd steps; the new `install_prod_deps` is treated the same way as the removed `install_deps` / `build` were — it *does* run under `--dry-run` because it doesn't touch systemd, it just populates `node_modules/`. Documented in the dry-run banner.
- **[Backward compat with the archived C11 workflow]** → operators using the C11 recipe (one command) will hit `verify_artifacts` and see the "run build.sh first" pointer. This is a **BREAKING** operator-workflow change and is called out as such in the proposal.

## Migration Plan

Additive at the file level (new `build.sh`), destructive at the workflow level (single-command install stops working). Rollback = revert this change; `install.sh` reabsorbs the build step.

Operator migration:

1. `git pull` on the target.
2. Run `./scripts/build.sh` once to produce the two dists.
3. Run `sudo ./scripts/install.sh` — the unit content is unchanged, so `daemon-reload` is skipped, `mytv` user is preserved, `setcap` is a no-op, and the service is restarted with the freshly-built `dist/index.js`.
4. Confirm `systemctl is-active mytv` prints `active`.

No token / state migration needed — the token file at `/var/lib/mytv/.mytv/tokens.json` stays put across the split.

## Open Questions

- **Should `install.sh` also fail if `back-end/node_modules` exists but `back-end/package-lock.json` doesn't (i.e. `npm ci` would refuse)?** Leaning yes; would add one line to `verify_artifacts`. Confirming during implementation whether the extra clarity is worth the line.
- **Should `build.sh` print a `sha256sum` of the two dists at exit so operators can eyeball parity between build host and target?** Nice to have; leaning yes if it's one line of shell. Not blocking.
- **Should the CI-workflow `rsync` example include `--delete`?** Leaning no — a stray file on the target is a nuisance, not a hazard, and `--delete` is a footgun if the operator picks the wrong source path. Documented as an opt-in.
