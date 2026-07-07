#!/usr/bin/env bats
# Smoke tests for scripts/install.sh. Sources the script so individual
# functions can be exercised without invoking main().

setup() {
  SCRIPT_DIR="$(cd "$(dirname "${BATS_TEST_FILENAME}")" && pwd)"
  INSTALL_SH="$SCRIPT_DIR/install.sh"
  TEMPLATE_PATH="$SCRIPT_DIR/mytv.service.tmpl"
  [ -f "$INSTALL_SH" ] || { echo "install.sh missing at $INSTALL_SH"; return 1; }
  [ -f "$TEMPLATE_PATH" ] || { echo "unit template missing at $TEMPLATE_PATH"; return 1; }
  TMPDIR_TEST="$(mktemp -d)"
}

teardown() {
  rm -rf "$TMPDIR_TEST"
}

# --- helpers ---------------------------------------------------------------

# Source install.sh so we can call its functions in-process. The `if
# [[ "${BASH_SOURCE[0]}" == "${0}" ]]` guard around main() means sourcing
# does not run the deploy.
source_install() {
  # shellcheck disable=SC1090
  source "$INSTALL_SH"
}

# --- 4.2: check_prereqs refuses on darwin ---------------------------------

@test "check_prereqs refuses on macOS (OSTYPE=darwin24)" {
  run env OSTYPE=darwin24 bash "$INSTALL_SH"
  [ "$status" -ne 0 ]
  [[ "$output" == *"unsupported host"* ]]
  [[ "$output" == *"darwin"* ]]
}

# --- 4.3: check_prereqs refuses when systemctl is missing ------------------

@test "check_prereqs refuses when systemctl is not on PATH" {
  # Build a minimal PATH that has node/npm/bash but NOT systemctl.
  local realnode realnpm realbash realusradd realsetcap realgetcap realinstall realmktemp
  realnode="$(command -v node || true)"
  realnpm="$(command -v npm || true)"
  realbash="$(command -v bash)"
  realusradd="$(command -v useradd || true)"
  realsetcap="$(command -v setcap || true)"
  realgetcap="$(command -v getcap || true)"
  realinstall="$(command -v install || true)"
  realmktemp="$(command -v mktemp || true)"

  local shim="$TMPDIR_TEST/bin"
  mkdir -p "$shim"
  [ -n "$realnode" ] && ln -s "$realnode" "$shim/node"
  [ -n "$realnpm" ] && ln -s "$realnpm" "$shim/npm"
  ln -s "$realbash" "$shim/bash"
  [ -n "$realusradd" ] && ln -s "$realusradd" "$shim/useradd" || printf '#!/usr/bin/env bash\necho stub\n' > "$shim/useradd"
  [ -n "$realsetcap" ] && ln -s "$realsetcap" "$shim/setcap" || printf '#!/usr/bin/env bash\necho stub\n' > "$shim/setcap"
  [ -n "$realgetcap" ] && ln -s "$realgetcap" "$shim/getcap" || printf '#!/usr/bin/env bash\necho stub\n' > "$shim/getcap"
  [ -n "$realinstall" ] && ln -s "$realinstall" "$shim/install"
  [ -n "$realmktemp" ] && ln -s "$realmktemp" "$shim/mktemp"
  chmod +x "$shim"/* 2>/dev/null || true

  # Force linux OSTYPE and a PATH that omits systemctl.
  run env -i OSTYPE=linux-gnu HOME="$HOME" PATH="$shim" bash "$INSTALL_SH" --dry-run
  [ "$status" -ne 0 ]
  [[ "$output" == *"systemctl"* ]]
}

# --- 4.4: resolve_paths gives absolute REPO_ROOT and NODE_BIN -------------

@test "resolve_paths resolves REPO_ROOT and NODE_BIN to absolute existing paths" {
  # Skip on non-Linux because check_prereqs would otherwise refuse.
  case "${OSTYPE:-}" in
    darwin*) : ;;   # still runnable — we skip check_prereqs manually below
  esac

  source_install
  resolve_paths
  [ -n "$REPO_ROOT" ]
  [[ "$REPO_ROOT" = /* ]]
  [ -d "$REPO_ROOT/back-end" ]
  [ -d "$REPO_ROOT/front-end" ]
  [ -n "$NODE_BIN" ]
  [[ "$NODE_BIN" = /* ]]
  [ -x "$NODE_BIN" ]
}

# --- 4.5: write_unit renders placeholders --------------------------------

@test "render_unit substitutes @REPO_ROOT@ and @NODE_BIN@" {
  source_install
  REPO_ROOT="/opt/mytv"
  NODE_BIN="/usr/local/bin/node"
  TEMPLATE_PATH="$SCRIPT_DIR/mytv.service.tmpl"
  local out="$TMPDIR_TEST/rendered.service"

  render_unit "$TEMPLATE_PATH" "$out"

  ! grep -qE '@REPO_ROOT@|@NODE_BIN@' "$out"
  grep -q "^WorkingDirectory=/opt/mytv/back-end$" "$out"
  grep -q "^ExecStart=/usr/local/bin/node dist/index.js$" "$out"
}

# --- 4.6: idempotency of the render -------------------------------------

@test "render_unit is byte-stable for the same inputs" {
  source_install
  REPO_ROOT="/opt/mytv"
  NODE_BIN="/usr/local/bin/node"
  TEMPLATE_PATH="$SCRIPT_DIR/mytv.service.tmpl"
  local a="$TMPDIR_TEST/a.service"
  local b="$TMPDIR_TEST/b.service"

  render_unit "$TEMPLATE_PATH" "$a"
  render_unit "$TEMPLATE_PATH" "$b"

  cmp -s "$a" "$b"
}

# --- 4.7: --dry-run prints mutating commands without executing them ------

@test "dry-run flag records mutating commands via run() without executing them" {
  source_install
  DRY_RUN=1
  run run useradd --system --shell /usr/sbin/nologin mytv
  [ "$status" -eq 0 ]
  [[ "$output" == *"[DRY-RUN]"* ]]
  [[ "$output" == *"useradd"* ]]
  # And confirm the same for a systemctl invocation.
  run run systemctl daemon-reload
  [ "$status" -eq 0 ]
  [[ "$output" == *"[DRY-RUN]"* ]]
  [[ "$output" == *"systemctl daemon-reload"* ]]
}

# --- C12 build-install-split: build.sh prereq gate + install.sh dist gate ---

# 5.1: build.sh refuses when node is not on PATH.
@test "build.sh refuses when node is not on PATH" {
  local BUILD_SH="$SCRIPT_DIR/build.sh"
  [ -f "$BUILD_SH" ] || { echo "build.sh missing at $BUILD_SH"; return 1; }

  # Isolate PATH to a shim dir that has bash and mktemp but NO node.
  local realbash realmktemp
  realbash="$(command -v bash)"
  realmktemp="$(command -v mktemp)"
  local shim="$TMPDIR_TEST/bin-nonode"
  mkdir -p "$shim"
  ln -s "$realbash" "$shim/bash"
  [ -n "$realmktemp" ] && ln -s "$realmktemp" "$shim/mktemp"

  run env -i HOME="$HOME" PATH="$shim" bash "$BUILD_SH"
  [ "$status" -ne 0 ]
  [[ "$output" == *"node"* ]]
}

# 5.2: install.sh refuses when back-end/dist/index.js is absent.
@test "install.sh verify_artifacts refuses when back-end dist is absent" {
  source_install
  # Point REPO_ROOT at a synthetic tree with only the front-end dist present.
  REPO_ROOT="$TMPDIR_TEST/repo"
  mkdir -p "$REPO_ROOT/back-end/dist" "$REPO_ROOT/front-end/dist"
  # Front-end dist only.
  echo "<!doctype html>" > "$REPO_ROOT/front-end/dist/index.html"

  run verify_artifacts
  [ "$status" -ne 0 ]
  [[ "$output" == *"back-end/dist/index.js"* ]]
  [[ "$output" == *"build.sh"* ]]
}

# 5.3: install.sh refuses when front-end/dist/index.html is absent.
@test "install.sh verify_artifacts refuses when front-end dist is absent" {
  source_install
  REPO_ROOT="$TMPDIR_TEST/repo"
  mkdir -p "$REPO_ROOT/back-end/dist" "$REPO_ROOT/front-end/dist"
  # Back-end dist only.
  echo "console.log('boot')" > "$REPO_ROOT/back-end/dist/index.js"

  run verify_artifacts
  [ "$status" -ne 0 ]
  [[ "$output" == *"front-end/dist/index.html"* ]]
  [[ "$output" == *"build.sh"* ]]
}

# 5.3b: install.sh verify_artifacts passes when both dists are present.
@test "install.sh verify_artifacts accepts when both dists are present" {
  source_install
  REPO_ROOT="$TMPDIR_TEST/repo"
  mkdir -p "$REPO_ROOT/back-end/dist" "$REPO_ROOT/front-end/dist"
  echo "console.log('boot')" > "$REPO_ROOT/back-end/dist/index.js"
  echo "<!doctype html>" > "$REPO_ROOT/front-end/dist/index.html"

  run verify_artifacts
  [ "$status" -eq 0 ]
  [[ "$output" == *"artefacts present"* ]]
}

# 5.4: build.sh error message names the artefact path on tsc/vite failure.
@test "build.sh back:build failure names back-end/dist/index.js" {
  local BUILD_SH="$SCRIPT_DIR/build.sh"
  # Fake npm that only fails on `run back:build`; succeeds otherwise so
  # install_deps and the leading front:build pass through.
  local shim="$TMPDIR_TEST/bin-fake-be"
  mkdir -p "$shim"
  cat > "$shim/npm" <<'EOF'
#!/usr/bin/env bash
for a in "$@"; do
  if [[ "$a" == "back:build" ]]; then
    echo "TS1005: fake back-end compile error" >&2
    exit 2
  fi
done
exit 0
EOF
  chmod +x "$shim/npm"

  run env PATH="$shim:$PATH" bash "$BUILD_SH"
  [ "$status" -ne 0 ]
  [[ "$output" == *"back-end build failed"* ]]
  [[ "$output" == *"back-end/dist/index.js"* ]]
}

@test "build.sh front:build failure names front-end/dist/index.html" {
  local BUILD_SH="$SCRIPT_DIR/build.sh"
  local shim="$TMPDIR_TEST/bin-fake-fe"
  mkdir -p "$shim"
  cat > "$shim/npm" <<'EOF'
#!/usr/bin/env bash
for a in "$@"; do
  if [[ "$a" == "front:build" ]]; then
    echo "Vite build failed: fake error" >&2
    exit 2
  fi
done
exit 0
EOF
  chmod +x "$shim/npm"

  run env PATH="$shim:$PATH" bash "$BUILD_SH"
  [ "$status" -ne 0 ]
  [[ "$output" == *"front-end build failed"* ]]
  [[ "$output" == *"front-end/dist/index.html"* ]]
}
