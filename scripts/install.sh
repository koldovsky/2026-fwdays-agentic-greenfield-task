#!/usr/bin/env bash
# mytv — one-shot deploy: build, install as a systemd service, enable autostart.
# Idempotent: re-running is the update path. See docs/capabilities.md → C11.
set -euo pipefail

DRY_RUN=0
UNIT_CHANGED=0
UNIT_PATH="/etc/systemd/system/mytv.service"
SERVICE_USER="mytv"
SERVICE_HOME="/var/lib/mytv"

REPO_ROOT=""
NODE_BIN=""
TEMPLATE_PATH=""

log()  { printf '[install] %s\n' "$*"; }
warn() { printf '[install] WARN: %s\n' "$*" >&2; }
die()  { printf '[install] ERROR: %s\n' "$*" >&2; exit 1; }

run() {
  if (( DRY_RUN )); then
    printf '[DRY-RUN] >> %s\n' "$*"
  else
    "$@"
  fi
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing prerequisite: $1 not on PATH"
}

check_prereqs() {
  case "${OSTYPE:-}" in
    darwin*) die "unsupported host: this script requires systemd-based Linux (detected macOS via OSTYPE=$OSTYPE)" ;;
    linux*|linux-gnu*) : ;;
    *) die "unsupported host: this script requires systemd-based Linux (OSTYPE=${OSTYPE:-unknown})" ;;
  esac

  need_cmd bash
  need_cmd node
  need_cmd npm
  need_cmd systemctl
  need_cmd setcap
  need_cmd getcap
  need_cmd useradd
  need_cmd install
  need_cmd mktemp

  local node_version node_major
  node_version="$(node --version 2>/dev/null || true)"
  node_major="${node_version#v}"
  node_major="${node_major%%.*}"
  if [[ -z "$node_major" || "$node_major" -lt 20 ]]; then
    die "node >= 20 required, found: ${node_version:-none}"
  fi

  if (( DRY_RUN == 0 )) && [[ "$(id -u)" -ne 0 ]]; then
    die "must run as root (use sudo). Pass --dry-run to preview without root."
  fi
}

resolve_paths() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  REPO_ROOT="$(cd "$script_dir/.." && pwd)"
  TEMPLATE_PATH="$script_dir/mytv.service.tmpl"

  [[ -d "$REPO_ROOT/back-end" ]] || die "REPO_ROOT missing back-end/: $REPO_ROOT"
  [[ -d "$REPO_ROOT/front-end" ]] || die "REPO_ROOT missing front-end/: $REPO_ROOT"
  [[ -f "$TEMPLATE_PATH" ]] || die "systemd unit template missing: $TEMPLATE_PATH"

  NODE_BIN="$(readlink -f "$(command -v node)")"
  [[ -x "$NODE_BIN" ]] || die "resolved node binary not executable: $NODE_BIN"

  log "REPO_ROOT=$REPO_ROOT"
  log "NODE_BIN=$NODE_BIN"
}

install_deps() {
  log "installing dependencies (npm run install:all)"
  npm --prefix "$REPO_ROOT" run install:all
}

build() {
  log "building back-end (tsc)"
  npm --prefix "$REPO_ROOT" run back:build
  log "building front-end (vite)"
  npm --prefix "$REPO_ROOT" run front:build

  [[ -f "$REPO_ROOT/back-end/dist/index.js" ]] \
    || die "back-end build did not produce back-end/dist/index.js"
  [[ -f "$REPO_ROOT/front-end/dist/index.html" ]] \
    || die "front-end build did not produce front-end/dist/index.html"
}

grant_port_capability() {
  local current
  current="$(getcap "$NODE_BIN" 2>/dev/null || true)"
  if [[ "$current" == *"cap_net_bind_service"*"ep"* ]]; then
    log "cap_net_bind_service already set on $NODE_BIN"
    return 0
  fi
  log "granting cap_net_bind_service to $NODE_BIN"
  run setcap 'cap_net_bind_service=+ep' "$NODE_BIN"
  if (( DRY_RUN == 0 )); then
    current="$(getcap "$NODE_BIN" 2>/dev/null || true)"
    [[ "$current" == *"cap_net_bind_service"*"ep"* ]] \
      || die "setcap succeeded but capability not present on $NODE_BIN (got: '$current')"
  fi
}

create_service_user() {
  if id "$SERVICE_USER" >/dev/null 2>&1; then
    log "user $SERVICE_USER already exists"
  else
    log "creating system user $SERVICE_USER (home $SERVICE_HOME)"
    run useradd --system --shell /usr/sbin/nologin \
      --home-dir "$SERVICE_HOME" --create-home "$SERVICE_USER"
  fi
  # Token store path resolves to $HOME/.mytv/tokens.json (back-end/src/tv/token-store.ts)
  # because the unit does not set XDG_CONFIG_HOME. Pre-create the directory
  # so the first-boot pairing does not race a missing parent.
  run install -d -o "$SERVICE_USER" -g "$SERVICE_USER" -m 0700 "$SERVICE_HOME/.mytv"
}

render_unit() {
  local template="$1" rendered="$2"
  sed \
    -e "s|@REPO_ROOT@|$REPO_ROOT|g" \
    -e "s|@NODE_BIN@|$NODE_BIN|g" \
    "$template" > "$rendered"
}

write_unit() {
  local rendered
  rendered="$(mktemp)"
  render_unit "$TEMPLATE_PATH" "$rendered"

  if grep -qE '@REPO_ROOT@|@NODE_BIN@' "$rendered"; then
    rm -f "$rendered"
    die "unit render left unsubstituted placeholders in $rendered"
  fi

  if (( DRY_RUN )); then
    printf '[DRY-RUN] rendered unit (%s):\n' "$UNIT_PATH"
    sed 's/^/[DRY-RUN]   /' "$rendered"
    rm -f "$rendered"
    UNIT_CHANGED=1
    return 0
  fi

  if [[ -f "$UNIT_PATH" ]] && cmp -s "$rendered" "$UNIT_PATH"; then
    log "unit file unchanged at $UNIT_PATH"
    UNIT_CHANGED=0
  else
    log "installing unit file at $UNIT_PATH"
    install -m 0644 "$rendered" "$UNIT_PATH"
    UNIT_CHANGED=1
  fi
  rm -f "$rendered"
}

enable_and_start() {
  if (( UNIT_CHANGED )); then
    run systemctl daemon-reload
  else
    log "unit unchanged; skipping daemon-reload"
  fi
  run systemctl enable mytv
  run systemctl restart mytv

  if (( DRY_RUN )); then
    return 0
  fi

  local waited=0
  while (( waited < 10 )); do
    if [[ "$(systemctl is-active mytv 2>/dev/null || true)" == "active" ]]; then
      log "service is active"
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done
  systemctl status mytv --no-pager || true
  die "mytv.service did not become active within 10s"
}

print_status() {
  log "install complete"
  log "REPO_ROOT   : $REPO_ROOT"
  log "NODE_BIN    : $NODE_BIN"
  if (( DRY_RUN == 0 )); then
    log "is-active   : $(systemctl is-active mytv 2>/dev/null || true)"
    log "is-enabled  : $(systemctl is-enabled mytv 2>/dev/null || true)"
    log "URL         : http://mytv.local/"
    log "recent logs (journalctl -u mytv -n 20):"
    journalctl -u mytv --no-pager -n 20 | sed 's/^/[install]   /' || true
  else
    log "URL         : http://mytv.local/  (after real install)"
  fi
}

parse_args() {
  for arg in "$@"; do
    case "$arg" in
      --dry-run) DRY_RUN=1 ;;
      -h|--help)
        cat <<'HELP'
Usage: install.sh [--dry-run]

Builds both packages, grants cap_net_bind_service to node, installs and
enables the mytv systemd service. Idempotent — re-run to update.

  --dry-run   Print mutating commands (useradd, setcap, install into /etc,
              systemctl) without executing them. Non-mutating steps
              (npm install, build) still run.
HELP
        exit 0
        ;;
      *) die "unknown argument: $arg (see --help)" ;;
    esac
  done
}

main() {
  parse_args "$@"
  if (( DRY_RUN )); then
    log "[DRY-RUN] no mutating command will be executed"
  fi
  check_prereqs
  resolve_paths
  install_deps
  build
  grant_port_capability
  create_service_user
  write_unit
  enable_and_start
  print_status
}

# Only run main when executed directly, not when sourced (e.g. by bats tests).
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
