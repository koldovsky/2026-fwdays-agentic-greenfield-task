#!/usr/bin/env bash
# mytv — build both packages. No root, no systemd, no target-side effects.
# Consumers of the output: scripts/install.sh (on a systemd Linux host) or a
# rsync/scp of dist/ + scripts/ + back-end/package{,-lock}.json to the target.
# See docs/capabilities.md → C12.
set -euo pipefail

REPO_ROOT=""
NODE_BIN=""

log()  { printf '[build] %s\n' "$*"; }
die()  { printf '[build] ERROR: %s\n' "$*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing prerequisite: $1 not on PATH"
}

check_prereqs() {
  need_cmd bash
  need_cmd node
  need_cmd npm
  need_cmd mktemp

  local node_version node_major
  node_version="$(node --version 2>/dev/null || true)"
  node_major="${node_version#v}"
  node_major="${node_major%%.*}"
  if [[ -z "$node_major" || "$node_major" -lt 20 ]]; then
    die "node >= 20 required, found: ${node_version:-none}"
  fi
}

resolve_paths() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  REPO_ROOT="$(cd "$script_dir/.." && pwd)"

  [[ -d "$REPO_ROOT/back-end" ]] || die "REPO_ROOT missing back-end/: $REPO_ROOT"
  [[ -d "$REPO_ROOT/front-end" ]] || die "REPO_ROOT missing front-end/: $REPO_ROOT"

  NODE_BIN="$(command -v node)"

  log "REPO_ROOT=$REPO_ROOT"
  log "NODE_BIN=$NODE_BIN"
}

install_deps() {
  log "installing dependencies (npm run install:all)"
  npm --prefix "$REPO_ROOT" run install:all
}

build() {
  local be="$REPO_ROOT/back-end/dist/index.js"
  local fe="$REPO_ROOT/front-end/dist/index.html"

  log "building back-end (tsc)"
  if ! npm --prefix "$REPO_ROOT" run back:build; then
    die "back-end build failed; expected artefact would be $be"
  fi

  log "building front-end (vite)"
  if ! npm --prefix "$REPO_ROOT" run front:build; then
    die "front-end build failed; expected artefact would be $fe"
  fi
}

verify_artifacts() {
  local be="$REPO_ROOT/back-end/dist/index.js"
  local fe="$REPO_ROOT/front-end/dist/index.html"
  [[ -s "$be" ]] || die "back-end build did not produce $be"
  [[ -s "$fe" ]] || die "front-end build did not produce $fe"
  log "produced $be"
  log "produced $fe"
}

print_status() {
  log "build complete"
  log ""
  log "next steps:"
  log "  # single-host (on the same Pi): install the service"
  log "  sudo ./scripts/install.sh"
  log ""
  log "  # split-host (build here, ship to a Pi): rsync only what install.sh needs"
  log "  rsync -av --relative \\"
  log "    back-end/dist back-end/package.json back-end/package-lock.json \\"
  log "    front-end/dist \\"
  log "    scripts/ \\"
  log "    user@pi.local:mytv/"
  log "  ssh user@pi.local"
  log "  sudo ./mytv/scripts/install.sh"
}

main() {
  check_prereqs
  resolve_paths
  install_deps
  build
  verify_artifacts
  print_status
}

# Only run main when executed directly, not when sourced (e.g. by bats tests).
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
