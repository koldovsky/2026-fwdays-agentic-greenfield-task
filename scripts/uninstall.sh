#!/usr/bin/env bash
# mytv — uninstall: stop, disable, and remove the systemd unit.
# Deliberately does NOT delete the mytv system user or /var/lib/mytv so a
# subsequent re-install keeps the same UID and preserves the token store.
# To fully purge, follow the instructions printed at the end.
set -euo pipefail

UNIT_PATH="/etc/systemd/system/mytv.service"
SERVICE_USER="mytv"
SERVICE_HOME="/var/lib/mytv"

log()  { printf '[uninstall] %s\n' "$*"; }
die()  { printf '[uninstall] ERROR: %s\n' "$*" >&2; exit 1; }

check_prereqs() {
  case "${OSTYPE:-}" in
    darwin*) die "unsupported host: this script requires systemd-based Linux (detected macOS via OSTYPE=$OSTYPE)" ;;
    linux*|linux-gnu*) : ;;
    *) die "unsupported host: this script requires systemd-based Linux (OSTYPE=${OSTYPE:-unknown})" ;;
  esac
  command -v systemctl >/dev/null 2>&1 || die "missing prerequisite: systemctl not on PATH"
  if [[ "$(id -u)" -ne 0 ]]; then
    die "must run as root (use sudo)"
  fi
}

main() {
  check_prereqs

  if systemctl list-unit-files mytv.service >/dev/null 2>&1; then
    log "stopping and disabling mytv.service"
    systemctl disable --now mytv 2>/dev/null || true
  else
    log "mytv.service not registered; nothing to stop"
  fi

  if [[ -f "$UNIT_PATH" ]]; then
    log "removing $UNIT_PATH"
    rm -f "$UNIT_PATH"
  else
    log "$UNIT_PATH not present"
  fi

  systemctl daemon-reload

  log "uninstall complete"
  log "user '$SERVICE_USER' and $SERVICE_HOME are preserved."
  log "to remove them (loses stored TV pairing tokens):"
  log "  sudo userdel -r $SERVICE_USER"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
