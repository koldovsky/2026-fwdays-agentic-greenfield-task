# ADR-0006 — Build off-box: GitHub Actions → GHCR

*Status: Accepted · Date: 2026-06-28 · Source: requirements.md §7*

## Context
The Linux OOM killer ignores Coolify project boundaries — under memory pressure it kills whatever
process it picks, which could be the **crypto-bot's mysqld**. A `npm install` / `tsc` build on the
box would cause a build-time RAM spike on top of the already-tight ~1.8 GiB headroom. Logical
project isolation is real; physical RAM contention is not.

## Decision
**Build the image off the box.** GitHub Actions runs `npm install` + `tsc` + Docker build and pushes
to **GHCR** (GitHub Container Registry); Coolify only **pulls and runs**. Use a **multi-stage
Dockerfile** so only the slim runtime ships. Combined with hard memory caps (bot **512 MB**,
Postgres **256 MB**), the worst case is the bot or its DB restarts — mysqld stays up.

## Consequences
- **+** No build-time RAM spike on the production host → crypto-bot's mysqld is protected.
- **+** Smaller runtime image (multi-stage) → faster pulls, lower RSS.
- **+** Reproducible CI builds; deploy = pull a tagged image.
- **−** Requires CI setup and a registry; deploys depend on GitHub Actions + GHCR availability.
- **−** Hard caps mean a runaway bot is killed rather than throttled — acceptable (cap = fuse).

## Alternatives considered
- **Build on the box (Coolify Nixpacks/Docker build)** — rejected: build-time RAM spike risks
  OOM-killing the co-resident mysqld.
- **Another registry (Docker Hub, etc.)** — open (requirements §11); GHCR assumed for CI proximity.
